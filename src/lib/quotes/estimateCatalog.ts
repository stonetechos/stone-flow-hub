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

// ============================================================================
// Stone Murals Estimate Studio Catalog & Formulas
// ============================================================================

export const DEFAULT_MURAL_THICKNESS_MM = 50;
export const DEFAULT_MURAL_STONE_TYPE = "Sandstone";
export const DEFAULT_MURAL_SANDSTONE_50MM_RATE = 550; // Rs 550 per sq ft
export const DEFAULT_MURAL_RUBBING_RATE = 25; // Rs 25 per sq ft
export const DEFAULT_MURAL_POLISHING_RATE = 300; // Rs 300 per sq ft (optional)
export const DEFAULT_MURAL_INSTALLATION_LABOUR_RATE = 200; // Rs 200 per sq ft
export const DEFAULT_MURAL_TOUCH_UP_RATE = 200; // Rs 200 per sq ft

export interface MuralCncOption {
  key: string;
  category: "engraving_dipping" | "embossing";
  label: string;
  depthLabel: string;
  defaultRatePerSqft: number;
}

export const MURAL_CNC_OPTIONS: MuralCncOption[] = [
  {
    key: "engraving_6mm",
    category: "engraving_dipping",
    label: "Engraving / Dipping Work (uptil 6 mm)",
    depthLabel: "uptil 6 mm",
    defaultRatePerSqft: 450,
  },
  {
    key: "engraving_12mm",
    category: "engraving_dipping",
    label: "Engraving / Dipping Work (uptil 12 mm)",
    depthLabel: "uptil 12 mm",
    defaultRatePerSqft: 650,
  },
  {
    key: "embossing_10mm",
    category: "embossing",
    label: "Embossing Work (uptil 10 mm)",
    depthLabel: "uptil 10 mm",
    defaultRatePerSqft: 850,
  },
  {
    key: "embossing_30mm",
    category: "embossing",
    label: "Embossing Work (uptil 30 mm)",
    depthLabel: "uptil 30 mm",
    defaultRatePerSqft: 1050,
  },
];

/**
 * Returns default slab price in Rs / sq ft.
 * Business rule: If stone is 50 mm thick and is a sandstone,
 * the default price of the slab is Rs 550 per sq ft.
 */
export function getDefaultSlabPrice(stoneType: string, thicknessMm: number): number {
  const isSandstone = (stoneType || "").trim().toLowerCase().includes("sandstone");
  const is50mm = Math.abs(thicknessMm - 50) < 1;
  if (isSandstone && is50mm) {
    return DEFAULT_MURAL_SANDSTONE_50MM_RATE;
  }
  return 550;
}

export interface MuralSlabCalculation {
  wallSqft: number;
  slabSqft: number;
  slabsRequired: number;
  slabsGrid: { cols: number; rows: number; total: number };
  slabsByArea: number;
  totalSlabSqft: number;
}

/**
 * Calculates the number of stone slabs required to complete a mural wall.
 * Considers both rectangular tile/slab grid layout and area coverage.
 */
export function calculateMuralSlabs(params: {
  wallHeight: number;
  wallLength: number;
  slabHeight: number;
  slabLength: number;
  unit: LengthUnit;
  slabsCountOverride?: number | null;
}): MuralSlabCalculation {
  const wallArea = wallSqft(params.wallHeight, params.wallLength, params.unit);
  const slabArea = wallSqft(params.slabHeight, params.slabLength, params.unit);

  if (slabArea <= 0 || wallArea <= 0) {
    return {
      wallSqft: wallArea,
      slabSqft: slabArea,
      slabsRequired: 0,
      slabsGrid: { cols: 0, rows: 0, total: 0 },
      slabsByArea: 0,
      totalSlabSqft: 0,
    };
  }

  const wallL = toFeet(params.wallLength, params.unit);
  const wallH = toFeet(params.wallHeight, params.unit);
  const slabL = toFeet(params.slabLength, params.unit);
  const slabH = toFeet(params.slabHeight, params.unit);

  // Normal grid layout
  const colsA = ceilWhole(wallL / slabL);
  const rowsA = ceilWhole(wallH / slabH);
  const totalA = colsA * rowsA;

  // 90-degree rotated layout
  const colsB = ceilWhole(wallL / slabH);
  const rowsB = ceilWhole(wallH / slabL);
  const totalB = colsB * rowsB;

  const bestGrid =
    totalA <= totalB
      ? { cols: colsA, rows: rowsA, total: totalA }
      : { cols: colsB, rows: rowsB, total: totalB };

  const slabsByArea = ceilWhole(wallArea / slabArea);

  const slabsRequired =
    params.slabsCountOverride && params.slabsCountOverride > 0
      ? params.slabsCountOverride
      : bestGrid.total > 0
        ? bestGrid.total
        : slabsByArea;

  const totalSlabSqft = ceilWhole(slabsRequired * slabArea);

  return {
    wallSqft: wallArea,
    slabSqft: slabArea,
    slabsRequired,
    slabsGrid: bestGrid,
    slabsByArea,
    totalSlabSqft,
  };
}
