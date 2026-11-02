/**
 * Public Site Settings API Route
 *
 * Provides high-speed, direct HTTP access to public site settings for both
 * anonymous visitors on stonetech.in and authenticated staff in the CMS.
 *
 * Uses supabaseAdmin (service role) on the server to read and persist:
 * - website_catalog_order (custom drag & drop sequence)
 * - website_catalog_items (custom products uploaded or edited)
 * - website_catalog_prices (custom prices / benchmarks)
 * - website_deleted_product_ids (products hidden or removed)
 * - website_landing_content (custom copy and section text)
 * - google_rating, reviews, etc.
 */
import { createFileRoute } from "@tanstack/react-router";
import type { SiteSettings, SiteReview } from "@/lib/site-settings/types";
import { SITE_SETTINGS_DEFAULTS } from "@/lib/site-settings/types";

interface RawRow {
  key: string;
  value: unknown;
}

function parseSetting<K extends keyof SiteSettings>(
  rows: RawRow[],
  key: K,
  fallback: SiteSettings[K],
): SiteSettings[K] {
  const row = rows.find(
    (r) =>
      r.key === key ||
      (key === "website_landing_content" &&
        (r.key === "website.landing_content" || r.key === "website_landing_content")),
  );
  if (!row) return fallback;
  return (row.value as SiteSettings[K]) ?? fallback;
}

export const Route = createFileRoute("/api/public/site-settings")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin
            .from("app_settings" as never)
            .select("key, value" as never);

          if (error || !data || !Array.isArray(data)) {
            return Response.json(SITE_SETTINGS_DEFAULTS, {
              headers: {
                "Cache-Control": "public, max-age=15, stale-while-revalidate=120",
              },
            });
          }

          const rows: RawRow[] = (data as { key: string; value: unknown }[]).map((r) => ({
            key: r.key.startsWith("site.") ? r.key.replace("site.", "") : r.key,
            value: r.value,
          }));

          const settings: SiteSettings = {
            google_rating: parseSetting(
              rows,
              "google_rating",
              SITE_SETTINGS_DEFAULTS.google_rating,
            ),
            reviews: parseSetting<"reviews">(
              rows,
              "reviews",
              SITE_SETTINGS_DEFAULTS.reviews,
            ) as SiteReview[],
            estimate_card_heading: parseSetting(
              rows,
              "estimate_card_heading",
              SITE_SETTINGS_DEFAULTS.estimate_card_heading,
            ),
            estimate_card_subtext: parseSetting(
              rows,
              "estimate_card_subtext",
              SITE_SETTINGS_DEFAULTS.estimate_card_subtext,
            ),
            cladding_products: parseSetting(
              rows,
              "cladding_products",
              SITE_SETTINGS_DEFAULTS.cladding_products,
            ),
            sidebar_tab_renames: parseSetting(
              rows,
              "sidebar_tab_renames",
              SITE_SETTINGS_DEFAULTS.sidebar_tab_renames ?? {},
            ),
            website_catalog_items: parseSetting(
              rows,
              "website_catalog_items",
              SITE_SETTINGS_DEFAULTS.website_catalog_items ?? [],
            ),
            website_catalog_prices: parseSetting(
              rows,
              "website_catalog_prices",
              SITE_SETTINGS_DEFAULTS.website_catalog_prices ?? {},
            ),
            website_catalog_order: parseSetting(
              rows,
              "website_catalog_order",
              SITE_SETTINGS_DEFAULTS.website_catalog_order ?? [],
            ),
            website_deleted_product_ids: parseSetting(
              rows,
              "website_deleted_product_ids",
              SITE_SETTINGS_DEFAULTS.website_deleted_product_ids ?? [],
            ),
            website_landing_content: parseSetting(
              rows,
              "website_landing_content",
              SITE_SETTINGS_DEFAULTS.website_landing_content ?? {},
            ),
          };

          return Response.json(settings, {
            headers: {
              "Cache-Control": "public, max-age=15, stale-while-revalidate=120",
            },
          });
        } catch (err) {
          console.warn("[api/public/site-settings] GET error:", err);
          return Response.json(SITE_SETTINGS_DEFAULTS, {
            status: 200,
            headers: {
              "Cache-Control": "no-store",
            },
          });
        }
      },

      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { key?: string; value?: unknown };
          const { key, value } = body;

          if (!key || typeof key !== "string") {
            return Response.json({ error: "Missing or invalid 'key'" }, { status: 400 });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Upsert into app_settings with 'site.' prefix
          const { error: appErr } = await supabaseAdmin.from("app_settings" as never).upsert(
            {
              key: `site.${key}`,
              value: value as never,
              description: `Site setting for ${key}`,
              updated_at: new Date().toISOString(),
            } as never,
            { onConflict: "key" },
          );

          if (appErr) {
            console.warn("[api/public/site-settings] app_settings error:", appErr.message);
          }

          // Also mirror legacy key if website_landing_content
          if (key === "website_landing_content") {
            try {
              await supabaseAdmin.from("app_settings" as never).upsert(
                {
                  key: "website.landing_content",
                  value: value as never,
                  description: "Public Website Landing Page Matter & CMS Content",
                  updated_at: new Date().toISOString(),
                } as never,
                { onConflict: "key" },
              );
            } catch {
              /* ignore */
            }
          }

          return Response.json({ success: true });
        } catch (err) {
          console.warn("[api/public/site-settings] POST error:", err);
          return Response.json({ error: String(err) }, { status: 500 });
        }
      },
    },
  },
});
