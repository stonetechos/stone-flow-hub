/**
 * Server functions for public and administrative site settings.
 *
 * Runs on the server with supabaseAdmin (service role) so that:
 * 1. Anonymous landing page visitors can load the latest custom catalog order,
 *    reviews, ratings, and catalog metadata without encountering RLS blocks.
 * 2. Authenticated administrators can persist site settings (such as drag-and-drop
 *    product order) directly to public.app_settings.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SiteSettings, SiteReview } from "./types";
import { SITE_SETTINGS_DEFAULTS } from "./types";

interface RawRow {
  key: string;
  value: unknown;
}

function parseSetting<K extends keyof SiteSettings>(
  rows: RawRow[],
  key: K,
  fallback: SiteSettings[K],
): SiteSettings[K] {
  const row = rows.find((r) => r.key === key);
  if (!row) return fallback;
  return (row.value as SiteSettings[K]) ?? fallback;
}

export const fetchPublicSiteSettingsServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteSettings> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // 1. Try reading from app_settings
      const { data, error } = await supabaseAdmin
        .from("app_settings" as never)
        .select("key, value" as never);

      if (error || !data || !Array.isArray(data)) {
        return SITE_SETTINGS_DEFAULTS;
      }

      const rows: RawRow[] = (data as { key: string; value: unknown }[]).map((r) => ({
        key: r.key.startsWith("site.") ? r.key.replace("site.", "") : r.key,
        value: r.value,
      }));

      return {
        google_rating: parseSetting(rows, "google_rating", SITE_SETTINGS_DEFAULTS.google_rating),
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
      };
    } catch (err) {
      console.warn("[site-settings.functions] error fetching settings:", err);
      return SITE_SETTINGS_DEFAULTS;
    }
  },
);

const upsertInputSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

export const upsertSiteSettingServerFn = createServerFn({ method: "POST" })
  .validator((data: { key: string; value: unknown }) => upsertInputSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { key, value } = data;

      // 1. Upsert into app_settings with 'site.' prefix (present in schema cache)
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
        console.warn("[upsertSiteSettingServerFn] app_settings error:", appErr.message);
      }

      // 2. Also attempt writing to site_settings table if available
      try {
        await supabaseAdmin.from("site_settings" as never).upsert(
          {
            key,
            value: value as never,
            updated_at: new Date().toISOString(),
          } as never,
          { onConflict: "key" },
        );
      } catch {
        /* ignore if table does not exist */
      }

      return { success: true };
    } catch (err) {
      console.warn("[upsertSiteSettingServerFn] failed:", err);
      return { success: false, error: String(err) };
    }
  });
