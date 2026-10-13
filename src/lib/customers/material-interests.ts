import type { Database } from "@/integrations/supabase/types";

export type MaterialInterest = Database["public"]["Enums"]["material_interest"];

export const PENDING_MATERIAL_INTERESTS: readonly (MaterialInterest | string)[] = [
  "natural_stone_cladding_tiles",
  "clay_veneers",
  "italian_marble_slabs",
  "indian_marble_slabs",
  "granite_slabs",
  "limestone_slabs",
  "cobblestone",
  "pebblestone",
  "boulders",
  "sculptures",
  "custom_stone_basins",
  "agate_stone_articles",
  "waterfall",
  "fountain",
  "temple_work_handcrafting",
];

export const PENDING_NOTE_TAGS: Record<string, string> = {
  natural_stone_cladding_tiles: "[Products of Interest: Natural Stone Cladding Tiles]",
  clay_veneers: "[Products of Interest: Clay Veneers]",
  italian_marble_slabs: "[Products of Interest: Italian Marble Slabs]",
  indian_marble_slabs: "[Products of Interest: Indian Marble Slabs]",
  granite_slabs: "[Products of Interest: Granite Slabs]",
  limestone_slabs: "[Products of Interest: Limestone Slabs]",
  cobblestone: "[Products of Interest: Cobblestone]",
  pebblestone: "[Products of Interest: Pebblestone]",
  boulders: "[Products of Interest: Boulders]",
  sculptures: "[Products of Interest: Sculptures]",
  custom_stone_basins: "[Products of Interest: Custom Stone Basins]",
  agate_stone_articles: "[Products of Interest: Agate Stone Articles]",
  waterfall: "[Products of Interest: Waterfall]",
  fountain: "[Products of Interest: Fountain]",
  temple_work_handcrafting: "[Products of Interest: Temple Work Handcrafting]",
};

export const PENDING_MATERIAL_NOTE_TAG = PENDING_NOTE_TAGS.natural_stone_cladding_tiles;

/**
 * Checks whether a database error is due to Postgres rejecting an un-migrated
 * enum value for `public.material_interest` (PostgreSQL 22P02).
 */
export function isMaterialInterestEnumError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const msg =
    "message" in err && typeof (err as { message?: unknown }).message === "string"
      ? (err as { message: string }).message
      : "";
  const code =
    "code" in err && typeof (err as { code?: unknown }).code === "string"
      ? (err as { code: string }).code
      : "";
  const details =
    "details" in err && typeof (err as { details?: unknown }).details === "string"
      ? (err as { details: string }).details
      : "";

  return (
    msg.includes("material_interest") ||
    details.includes("material_interest") ||
    (code === "22P02" && (msg.includes("enum") || details.includes("enum")))
  );
}

/**
 * Normalizes material interests and notes when the database enum hasn't been migrated yet.
 * - If pending values like `clay_veneers` or `natural_stone_cladding_tiles` are present,
 *   filters them out from the DB array and persists them safely into `notes` using structured tags.
 * - If deselecting, any corresponding tags in `notes` are cleaned up.
 */
export function sanitizeForPendingDbEnum(
  materialInterests: (MaterialInterest | string)[] | undefined | null,
  notes: string | null | undefined,
): {
  filteredInterests: MaterialInterest[];
  sanitizedNotes: string | null;
  hasPending: boolean;
} {
  const interests = (materialInterests ?? []) as string[];
  const pendingPresent = interests.filter((i) => PENDING_MATERIAL_INTERESTS.includes(i));
  const filteredInterests = interests.filter(
    (i) => !PENDING_MATERIAL_INTERESTS.includes(i),
  ) as MaterialInterest[];
  const hasPending = pendingPresent.length > 0;

  let sanitizedNotes = notes ? notes.trim() : null;

  for (const pendingKey of PENDING_MATERIAL_INTERESTS) {
    const tag = PENDING_NOTE_TAGS[pendingKey];
    if (!tag) continue;

    if (interests.includes(pendingKey)) {
      if (!sanitizedNotes) {
        sanitizedNotes = tag;
      } else if (!sanitizedNotes.includes(tag)) {
        sanitizedNotes = `${sanitizedNotes}\n${tag}`;
      }
    } else if (sanitizedNotes && sanitizedNotes.includes(tag)) {
      // User deselected it — strip the tag from notes
      const escapedTag = tag.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      sanitizedNotes =
        sanitizedNotes.replace(new RegExp(`(?:\\r?\\n)?${escapedTag}`, "g"), "").trim() || null;
    }
  }

  return {
    filteredInterests,
    sanitizedNotes,
    hasPending,
  };
}

/**
 * Hydrates material interests from the notes tags if absent from the PostgreSQL column.
 * Ensures the UI accurately displays all expanded stone products and preselects checkboxes.
 */
export function hydrateMaterialInterests(
  materialInterests: (MaterialInterest | string)[] | undefined | null,
  notes: string | null | undefined,
): (MaterialInterest | string)[] {
  const result = [...((materialInterests ?? []) as (MaterialInterest | string)[])];
  if (!notes) return result;

  for (const pendingKey of PENDING_MATERIAL_INTERESTS) {
    const tag = PENDING_NOTE_TAGS[pendingKey];
    if (tag && notes.includes(tag) && !result.includes(pendingKey)) {
      result.push(pendingKey);
    }
  }

  return result;
}
