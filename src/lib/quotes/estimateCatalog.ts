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
 * rule: any fractional sq ft (e.g. 0.1, 0.9, or 101.0000001) is rounded UP
 * to the next integer, because stone suppliers do not sell fractional sq ft.
 * Only microscopic IEEE 754 precision noise (< 1e-12) is snapped to exact integer.
 */
export function ceilWhole(value: number): number {
  if (!isFinite(value) || value <= 0) return 0;
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-12) {
    return rounded;
  }
  return Math.ceil(value);
}

export const DEFAULT_WASTAGE_PCT = 5;

/**
 * Calculates material to order given wall coverage sqft and wastage percentage.
 * Formula: wallSqft + wastage% = wallSqft * (1 + wastagePct / 100).
 *
 * The result is ALWAYS rounded up to the next integer sq ft
 * (e.g. 101.0000001 -> 102 sqft), because you cannot buy 0.1 or 0.9 sq ft from suppliers.
 */
export function materialQuantityToOrder(
  rawSqft: number,
  wastagePct: number = DEFAULT_WASTAGE_PCT,
): number {
  if (!isFinite(rawSqft) || rawSqft <= 0) return 0;
  const pct = isFinite(wastagePct) && wastagePct >= 0 ? wastagePct : 0;
  return ceilWhole(rawSqft * (1 + pct / 100));
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
