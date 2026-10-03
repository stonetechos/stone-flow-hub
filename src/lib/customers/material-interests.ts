import type { Database } from "@/integrations/supabase/types";

export type MaterialInterest = Database["public"]["Enums"]["material_interest"];

export const PENDING_MATERIAL_INTERESTS: readonly MaterialInterest[] = [
  "natural_stone_cladding_tiles",
];

export const PENDING_MATERIAL_NOTE_TAG = "[Products of Interest: Natural Stone Cladding Tiles]";

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
 * - If `natural_stone_cladding_tiles` is present, filters it out from the DB array and
 *   persists it safely into `notes` using a structured tag.
 * - If it is NOT present, any previous tag in `notes` is cleaned up so deselecting works.
 */
export function sanitizeForPendingDbEnum(
  materialInterests: MaterialInterest[] | undefined | null,
  notes: string | null | undefined,
): {
  filteredInterests: MaterialInterest[];
  sanitizedNotes: string | null;
  hasPending: boolean;
} {
  const interests = (materialInterests ?? []) as MaterialInterest[];
  const hasPending = interests.includes("natural_stone_cladding_tiles");
  const filteredInterests = interests.filter((i) => i !== "natural_stone_cladding_tiles");

  let sanitizedNotes = notes ? notes.trim() : null;

  if (hasPending) {
    if (!sanitizedNotes) {
      sanitizedNotes = PENDING_MATERIAL_NOTE_TAG;
    } else if (!sanitizedNotes.includes(PENDING_MATERIAL_NOTE_TAG)) {
      sanitizedNotes = `${sanitizedNotes}\n${PENDING_MATERIAL_NOTE_TAG}`;
    }
  } else if (sanitizedNotes && sanitizedNotes.includes(PENDING_MATERIAL_NOTE_TAG)) {
    // User deselected it — strip the tag from notes
    const escapedTag = PENDING_MATERIAL_NOTE_TAG.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    sanitizedNotes =
      sanitizedNotes.replace(new RegExp(`(?:\\r?\\n)?${escapedTag}`, "g"), "").trim() || null;
  }

  return {
    filteredInterests,
    sanitizedNotes,
    hasPending,
  };
}

/**
 * Hydrates material interests from the notes tag if absent from the PostgreSQL column.
 * Ensures the UI accurately displays "Natural Stone Cladding Tiles" and preselects its checkbox.
 */
export function hydrateMaterialInterests(
  materialInterests: (MaterialInterest | string)[] | undefined | null,
  notes: string | null | undefined,
): MaterialInterest[] {
  const result = [...((materialInterests ?? []) as MaterialInterest[])];
  if (
    notes?.includes(PENDING_MATERIAL_NOTE_TAG) &&
    !result.includes("natural_stone_cladding_tiles")
  ) {
    result.push("natural_stone_cladding_tiles");
  }
  return result;
}
