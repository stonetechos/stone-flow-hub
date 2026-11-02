/**
 * Site settings helper — fetches and updates site settings.
 *
 * Uses TanStack Start server functions (with supabaseAdmin) so that
 * both anonymous landing-page visitors and authenticated staff can read and
 * persist settings without being blocked by client-side Supabase RLS.
 * Falls back to direct client access and hard-coded defaults if offline.
 */
import { supabase } from "@/integrations/supabase/client";
import type { SiteSettings, SiteReview } from "./types";
import { SITE_SETTINGS_DEFAULTS } from "./types";
import {
  fetchPublicSiteSettingsServerFn,
  upsertSiteSettingServerFn,
} from "./site-settings.functions";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function fetchSiteSettings(): Promise<SiteSettings> {
  // 1. Try server function (uses service_role supabaseAdmin, bypasses RLS for both anon and authenticated)
  try {
    const res = await fetchPublicSiteSettingsServerFn();
    if (res && typeof res === "object") {
      return res;
    }
  } catch (err) {
    console.warn(
      "[site-settings] fetchPublicSiteSettingsServerFn failed, trying client fallback:",
      err,
    );
  }

  // 2. Client fallback: Try reading from site_settings or app_settings
  let rows: RawRow[] = [];
  try {
    const { data, error } = await db.from("site_settings").select("key, value");
    if (!error && data && Array.isArray(data) && data.length > 0) {
      rows = data as RawRow[];
    }
  } catch {
    /* ignore */
  }

  if (rows.length === 0) {
    try {
      const { data, error } = await supabase.from("app_settings").select("key, value");
      if (!error && data && Array.isArray(data)) {
        rows = (data as RawRow[]).map((r) => ({
          key: r.key.startsWith("site.") ? r.key.replace("site.", "") : r.key,
          value: r.value,
        }));
      }
    } catch {
      /* ignore */
    }
  }

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
    website_landing_content: parseSetting(
      rows,
      "website_landing_content",
      SITE_SETTINGS_DEFAULTS.website_landing_content ?? {},
    ),
  };
}

export async function upsertSiteSetting(key: string, value: unknown): Promise<void> {
  // 1. Try server function (uses service_role supabaseAdmin, bypasses client RLS)
  try {
    const res = await upsertSiteSettingServerFn({ data: { key, value } });
    if (res?.success) return;
  } catch (err) {
    console.warn(
      "[site-settings] upsertSiteSettingServerFn failed, attempting client fallback:",
      err,
    );
  }

  // 2. Client fallback: site_settings table
  try {
    const { error } = await db
      .from("site_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (!error) return;
  } catch {
    /* fallback to app_settings */
  }

  // 3. Client fallback: app_settings table
  try {
    await supabase.from("app_settings").upsert(
      {
        key: `site.${key}`,
        value: value as never,
        description: `Site setting for ${key}`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
  } catch {
    /* ignore */
  }
}
