import { describe, expect, it } from "bun:test";
import {
  isMaterialInterestEnumError,
  sanitizeForPendingDbEnum,
  hydrateMaterialInterests,
  PENDING_MATERIAL_NOTE_TAG,
} from "./material-interests";

describe("material-interests fallback helpers", () => {
  it("detects material_interest enum errors", () => {
    expect(
      isMaterialInterestEnumError({
        code: "22P02",
        message: 'invalid input value for enum material_interest: "natural_stone_cladding_tiles"',
      }),
    ).toBe(true);

    expect(
      isMaterialInterestEnumError({
        message: "some other database error",
      }),
    ).toBe(false);

    expect(isMaterialInterestEnumError(null)).toBe(false);
  });

  it("sanitizes material interests by filtering pending enum and noting in notes", () => {
    const result = sanitizeForPendingDbEnum(
      ["natural_stone_cladding_tiles", "natural_stone_mosaics"],
      "Customer requested sample catalog.",
    );

    expect(result.filteredInterests).toEqual(["natural_stone_mosaics"]);
    expect(result.hasPending).toBe(true);
    expect(result.sanitizedNotes).toContain("Customer requested sample catalog.");
    expect(result.sanitizedNotes).toContain(PENDING_MATERIAL_NOTE_TAG);
  });

  it("creates notes with tag when notes was null", () => {
    const result = sanitizeForPendingDbEnum(["natural_stone_cladding_tiles"], null);

    expect(result.filteredInterests).toEqual([]);
    expect(result.hasPending).toBe(true);
    expect(result.sanitizedNotes).toBe(PENDING_MATERIAL_NOTE_TAG);
  });

  it("removes tag from notes when user deselects pending interest", () => {
    const initialNotes = `Some existing notes\n${PENDING_MATERIAL_NOTE_TAG}`;
    const result = sanitizeForPendingDbEnum(["stone_murals"], initialNotes);

    expect(result.filteredInterests).toEqual(["stone_murals"]);
    expect(result.hasPending).toBe(false);
    expect(result.sanitizedNotes).toBe("Some existing notes");
  });

  it("hydrates material interests from notes tag if absent from array", () => {
    const hydrated = hydrateMaterialInterests(
      ["natural_stone_mosaics"],
      `Interested in tiles\n${PENDING_MATERIAL_NOTE_TAG}`,
    );

    expect(hydrated).toContain("natural_stone_mosaics");
    expect(hydrated).toContain("natural_stone_cladding_tiles");
  });

  it("does not duplicate if already in array", () => {
    const hydrated = hydrateMaterialInterests(
      ["natural_stone_cladding_tiles"],
      `Interested in tiles\n${PENDING_MATERIAL_NOTE_TAG}`,
    );

    expect(hydrated.filter((i) => i === "natural_stone_cladding_tiles").length).toBe(1);
  });

  it("sanitizes and hydrates clay_veneers seamlessly", () => {
    const sanitized = sanitizeForPendingDbEnum(
      ["clay_veneers", "stone_veneer"],
      "Discussed exterior facade",
    );
    expect(sanitized.filteredInterests).toEqual(["stone_veneer"]);
    expect(sanitized.hasPending).toBe(true);
    expect(sanitized.sanitizedNotes).toContain("[Products of Interest: Clay Veneers]");

    const hydrated = hydrateMaterialInterests(["stone_veneer"], sanitized.sanitizedNotes);
    expect(hydrated).toContain("stone_veneer");
    expect(hydrated).toContain("clay_veneers");
  });
});
