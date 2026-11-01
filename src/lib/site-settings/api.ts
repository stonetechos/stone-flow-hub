/**
 * Client-side helper — fetches site_settings directly from Supabase.
 * Falls back to hard-coded defaults so the landing page still renders
 * when the DB is unreachable or the table hasn't been migrated yet.
 *
 * NOTE: The `site_settings` table is created by migration
 * 20260919000000_site_settings.sql. Until that migration is applied and the
 * Supabase types are regenerated the client is cast via `as any` to avoid
 * TypeScript errors — the runtime behaviour is identical.
 */
import { supabase } from "@/integrations/supabase/client";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function fetchSiteSettings(): Promise<SiteSettings> {
  let rows: RawRow[] = [];

  // 1. Try reading from site_settings
  try {
    const { data, error } = await db.from("site_settings").select("key, value");
    if (!error && data && Array.isArray(data) && data.length > 0) {
      rows = data as RawRow[];
    }
  } catch (err) {
    console.warn("[site-settings] fetch from site_settings failed:", err);
  }

  // 2. Fall back to app_settings if site_settings is empty or not in schema cache
  if (rows.length === 0) {
    try {
      const { data, error } = await supabase.from("app_settings").select("key, value");
      if (!error && data && Array.isArray(data)) {
        rows = (data as RawRow[]).map((r) => ({
          key: r.key.startsWith("site.") ? r.key.replace("site.", "") : r.key,
          value: r.value,
        }));
      }
    } catch (err) {
      console.warn("[site-settings] fetch from app_settings fallback failed:", err);
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
  };
}

export async function upsertSiteSetting(key: string, value: unknown): Promise<void> {
  // 1. Try upserting to site_settings table
  try {
    const { error } = await db
      .from("site_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (!error) return;
  } catch {
    /* fallback to app_settings */
  }

  // 2. Fall back to app_settings table (present in Supabase schema cache)
  try {
    const { error: appErr } = await supabase.from("app_settings").upsert(
      {
        key: `site.${key}`,
        value: value as never,
        description: `Site setting for ${key}`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (!appErr) return;
    console.warn("[site-settings] app_settings fallback:", appErr.message);
  } catch (err) {
    console.warn("[site-settings] app_settings fallback caught error:", err);
  }
}
