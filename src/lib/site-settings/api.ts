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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const { data, error } = await db.from("site_settings").select("key, value");

  if (error || !data) {
    console.warn("[site-settings] fetch failed, using defaults:", error?.message);
    return SITE_SETTINGS_DEFAULTS;
  }

  const rows = data as RawRow[];

  return {
    google_rating: parseSetting(rows, "google_rating", SITE_SETTINGS_DEFAULTS.google_rating),
    reviews: parseSetting<"reviews">(rows, "reviews", SITE_SETTINGS_DEFAULTS.reviews) as SiteReview[],
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
  };
}

export async function upsertSiteSetting(key: string, value: unknown): Promise<void> {
  const { error } = await db.from("site_settings").upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
}
