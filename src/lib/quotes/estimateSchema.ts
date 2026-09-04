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
  /** Auto (sqft mode: wall sqft + 10%, rounded up) or manually entered (unit mode). */
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
  totalWallSqft: z.number().nonnegative(),
  materialAmount: z.number().nonnegative(),
  installationAmount: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
  total: z.number().nonnegative(),
});
export type EstimateWorksheet = z.infer<typeof estimateWorksheetSchema>;
