/**
 * Estimate Studio — the shape of the wall-cladding calculator worksheet
 * persisted on `quotes.wall_estimate` (jsonb). This is the source of truth
 * for that column's shape; `quoteCreateSchema.wall_estimate` itself stays
 * loosely typed (`z.record(z.unknown())`) to avoid coupling the write path
 * to a schema that may need to evolve per future product categories
 * (pebbles, boulders, murals — see EstimateStudioCalculator.tsx header).
 */
import { z } from "zod";
import { LENGTH_UNITS } from "./estimateCatalog";

export const estimateWallSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1),
  height: z.number().nonnegative(),
  length: z.number().nonnegative(),
  unit: z.enum(LENGTH_UNITS),
  sqft: z.number().nonnegative(),
});
export type EstimateWall = z.infer<typeof estimateWallSchema>;

export const estimateProductSchema = z.object({
  id: z.string(),
  wallId: z.string(),
  /** Value from MATERIAL_OPTIONS (customers/schema.ts) — e.g. "natural_stone_interlocking_panels". */
  materialCategory: z.string(),
  /** Free text — the exact product, e.g. `Mint Sandstone RF-SB 2"/1"`. */
  productName: z.string(),
  priceUnit: z.enum(["sqft", "unit"]),
  pricePerUnit: z.number().nonnegative(),
  /** Wastage percentage (e.g. 5 for 5%), used when priceUnit === "sqft". */
  wastagePct: z.number().nonnegative().default(5).optional(),
  /** Auto (sqft mode: wall sqft + wastage%, rounded up to next integer) or manually entered (unit mode). */
  quantityToOrder: z.number().nonnegative(),
  amount: z.number().nonnegative(),
  /** Data-URL thumbnail only — not persisted to storage, PDF-embed use only. */
  imageDataUrl: z.string().nullable().optional(),
});
export type EstimateProduct = z.infer<typeof estimateProductSchema>;

export const estimateAdhesiveLineSchema = z.object({
  /** Catalog key, or "other" for the free-text custom adhesive. */
  key: z.string(),
  label: z.string(),
  customName: z.string().optional(),
  units: z.number().nonnegative(),
  unitLabel: z.string(),
  pricePerUnit: z.number().nonnegative(),
  amount: z.number().nonnegative(),
});
export type EstimateAdhesiveLine = z.infer<typeof estimateAdhesiveLineSchema>;

export const estimateSealerSchema = z.object({
  key: z.string(),
  label: z.string(),
  bottles: z.number().nonnegative(),
  pricePerLtr: z.number().nonnegative(),
  amount: z.number().nonnegative(),
});
export type EstimateSealer = z.infer<typeof estimateSealerSchema>;

export const estimateWorksheetSchema = z.object({
  version: z.literal(1),
  unit: z.enum(LENGTH_UNITS),
  walls: z.array(estimateWallSchema),
  products: z.array(estimateProductSchema),
  installation: z.object({
    labour: z.object({
      ratePerSqft: z.number().nonnegative(),
      amount: z.number().nonnegative(),
    }),
    adhesives: z.array(estimateAdhesiveLineSchema),
    sealer: estimateSealerSchema.nullable(),
    sealerLabour: z.object({
      ratePerSqft: z.number().nonnegative(),
      amount: z.number().nonnegative(),
    }),
  }),
  discount: z.object({
    applied: z.boolean(),
    eligible: z.boolean(),
    pct: z.number().nonnegative(),
    amount: z.number().nonnegative(),
  }),
  timeToComplete: z.string().optional(),
  carting: z
    .object({
      location: z.string().optional(),
      amount: z.number().nonnegative(),
    })
    .optional(),
  totalWallSqft: z.number().nonnegative(),
  materialAmount: z.number().nonnegative(),
  installationAmount: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
  total: z.number().nonnegative(),
});
export type EstimateWorksheet = z.infer<typeof estimateWorksheetSchema>;

export const estimateMuralWorksheetSchema = z.object({
  version: z.literal(1),
  scenario: z.literal("stone_mural"),
  unit: z.enum(LENGTH_UNITS),
  wall: z.object({
    height: z.number().nonnegative(),
    length: z.number().nonnegative(),
    sqft: z.number().nonnegative(),
  }),
  slab: z.object({
    height: z.number().nonnegative(),
    length: z.number().nonnegative(),
    sqft: z.number().nonnegative(),
    thicknessMm: z.number().nonnegative(),
    stoneType: z.string(),
    sourcing: z.enum(["stone_tech", "client_provided"]).default("stone_tech").optional(),
    slabsRequired: z.number().nonnegative(),
    gridCols: z.number().nonnegative(),
    gridRows: z.number().nonnegative(),
    totalSlabSqft: z.number().nonnegative(),
    pricePerSqft: z.number().nonnegative(),
    amount: z.number().nonnegative(),
  }),
  cnc: z.object({
    selectedKey: z.string(),
    label: z.string(),
    ratePerSqft: z.number().nonnegative(),
    amount: z.number().nonnegative(),
  }),
  overlay: z
    .object({
      enabled: z.boolean(),
      stoneType: z.string(),
      thicknessMm: z.number().nonnegative(),
      sourcing: z.enum(["stone_tech", "client_provided"]),
      sqft: z.number().nonnegative(),
      length: z.number().nonnegative().optional(),
      height: z.number().nonnegative().optional(),
      stonePricePerSqft: z.number().nonnegative(),
      stoneAmount: z.number().nonnegative(),
      cncKey: z.string().optional(),
      cncLabel: z.string().optional(),
      cncRatePerSqft: z.number().nonnegative().optional(),
      cncAmount: z.number().nonnegative().optional(),
      pastingRatePerSqft: z.number().nonnegative(),
      pastingAmount: z.number().nonnegative(),
      totalAmount: z.number().nonnegative(),
    })
    .optional(),
  rubbing: z.object({
    enabled: z.boolean(),
    ratePerSqft: z.number().nonnegative(),
    amount: z.number().nonnegative(),
  }),
  polishing: z.object({
    enabled: z.boolean(),
    ratePerSqft: z.number().nonnegative(),
    amount: z.number().nonnegative(),
  }),
  installationLabour: z.object({
    ratePerSqft: z.number().nonnegative(),
    amount: z.number().nonnegative(),
  }),
  adhesives: z.array(estimateAdhesiveLineSchema),
  adhesivesAmount: z.number().nonnegative(),
  touchUp: z.object({
    enabled: z.boolean(),
    ratePerSqft: z.number().nonnegative(),
    amount: z.number().nonnegative(),
  }),
  carting: z.object({
    location: z.string().optional(),
    amount: z.number().nonnegative(),
  }),
  sceneDescription: z.string().optional(),
  timeToComplete: z.string().optional(),
  imageDataUrl: z.string().nullable().optional(),
  subtotal: z.number().nonnegative(),
  total: z.number().nonnegative(),
});
export type EstimateMuralWorksheet = z.infer<typeof estimateMuralWorksheetSchema>;
