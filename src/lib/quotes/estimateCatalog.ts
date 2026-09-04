/**
 * Estimate Studio — wall-cladding calculator catalogs and pure calculation
 * helpers. Business rules and pricing here are fixed values supplied
 * directly by Stone Tech (2026-09-04), scoped to natural-stone wall
 * cladding only (pebbles/boulders/murals/etc. are separate future work).
 *
 * Every price below is a starting default shown in the UI — the person
 * preparing the estimate can always override it inline before sending.
 * (`pu_based`'s per-bucket price was not given by the business and is
 * marked NEEDS_CONFIRMATION below; it defaults to the same rate as the
 * No-Limit chemical adhesives purely as a placeholder.)
 */

export const LENGTH_UNITS = ["ft", "m", "in", "mm"] as const;
export type LengthUnit = (typeof LENGTH_UNITS)[number];

export const LENGTH_UNIT_LABELS: Record<LengthUnit, string> = {
  ft: "Feet",
  m: "Meter",
  in: "Inches",
  mm: "Millimeter",
};

/** Multiply a value in `unit` by this to get feet. */
const TO_FEET: Record<LengthUnit, number> = {
  ft: 1,
  m: 3.280839895013123,
  in: 1 / 12,
  mm: 1 / 304.8,
};

export function toFeet(value: number, unit: LengthUnit): number {
  if (!isFinite(value)) return 0;
  return value * TO_FEET[unit];
}

/** Height × Length (in whatever unit) → raw coverage area in sq ft. */
export function wallSqft(height: number, length: number, unit: LengthUnit): number {
  return toFeet(height, unit) * toFeet(length, unit);
}

/**
 * Round a fractional quantity UP to the next whole unit, per the business
 * rule "a calculated 1.1–1.99 result becomes 2 — decimals never shown".
 * The small epsilon guards against an exact integer (e.g. 25/25 = 1.0)
 * being pushed up by floating-point error.
 */
export function ceilWhole(value: number): number {
  if (!isFinite(value) || value <= 0) return 0;
  return Math.ceil(value - 1e-9);
}

export const MATERIAL_QUANTITY_BUFFER_PCT = 10;

/**
 * "The system adds 10% to the wall size and enters that directly as the
 * quantity to be ordered." Worked example: 108in × 48in → 36 sqft raw →
 * 39.6 → 40 sqft to order.
 */
export function materialQuantityToOrder(rawSqft: number): number {
  return ceilWhole(rawSqft * (1 + MATERIAL_QUANTITY_BUFFER_PCT / 100));
}

export type AdhesiveUnit = "bag" | "bucket";

export interface AdhesiveCatalogItem {
  key: string;
  label: string;
  unit: AdhesiveUnit;
  /** Default price — editable per-quote in the UI. */
  defaultPricePerUnit: number;
  coverageSqftPerUnit: number;
  needsPriceConfirmation?: boolean;
}

export const ADHESIVE_CATALOG: AdhesiveCatalogItem[] = [
  {
    key: "standard_cement_white",
    label: "Standard Cement Based Stone Adhesive White",
    unit: "bag",
    defaultPricePerUnit: 900,
    coverageSqftPerUnit: 25,
  },
  {
    key: "standard_cementitious_grey",
    label: "Standard Cementitious Stone Adhesive Grey",
    unit: "bag",
    defaultPricePerUnit: 800,
    coverageSqftPerUnit: 25,
  },
  {
    key: "no_limit_grey",
    label: "No-Limit Grey",
    unit: "bag",
    defaultPricePerUnit: 1650,
    coverageSqftPerUnit: 25,
  },
  {
    key: "no_limit_white",
    label: "No-Limit White",
    unit: "bag",
    defaultPricePerUnit: 1650,
    coverageSqftPerUnit: 25,
  },
  {
    key: "pu_based",
    label: "PU Based Adhesive",
    unit: "bucket",
    defaultPricePerUnit: 1650,
    coverageSqftPerUnit: 20,
    needsPriceConfirmation: true,
  },
];

export interface SealerCatalogItem {
  key: string;
  label: string;
  defaultPricePerLtr: number;
  coverageSqftPerLtr: number;
}

export const SEALER_CATALOG: SealerCatalogItem[] = [
  {
    key: "water_based_repellent",
    label: "Water Based Water Repellent",
    defaultPricePerLtr: 1700,
    coverageSqftPerLtr: 550,
  },
  {
    key: "solvent_based_oil_dust_repellent",
    label: "Solvent Based Water Oil and Dust Repellent",
    defaultPricePerLtr: 2500,
    coverageSqftPerLtr: 50,
  },
  {
    key: "wetlook_sealer",
    label: "Wetlook Sealer",
    defaultPricePerLtr: 3000,
    coverageSqftPerLtr: 60,
  },
  {
    key: "back_coat",
    label: "Back Coat",
    defaultPricePerLtr: 3000,
    coverageSqftPerLtr: 100,
  },
  {
    key: "film_forming_surface_sealers",
    label: "Film Forming Surface Sealers",
    defaultPricePerLtr: 3000,
    coverageSqftPerLtr: 60,
  },
  {
    key: "anti_graffiti",
    label: "Anti-Graffiti",
    defaultPricePerLtr: 5500,
    coverageSqftPerLtr: 60,
  },
];

export const DEFAULT_SEALER_APPLICATION_RATE_PER_SQFT = 10;

export const DISCOUNT_SQFT_THRESHOLD = 500;
export const DISCOUNT_PCT = 7.5;
