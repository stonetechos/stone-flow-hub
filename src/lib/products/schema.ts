import { z } from "zod";
import { zRequired, zOptional, zUuid } from "@/lib/zod";

export const productCreateSchema = z.object({
  name: zRequired("Product name"),
  category_id: zUuid,
  unit: z.enum(["sqft", "sqm", "piece", "slab", "kg"]).default("sqft"),
  finish: zOptional(),
  thickness_mm: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().nonnegative().nullable().optional(),
  ),
  origin: zOptional(),
  notes: zOptional(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
