import { z } from "zod";
import { zRequired, zOptional, zUuid } from "@/lib/zod";

export const projectCreateSchema = z.object({
  // Quick Fill
  customer_id: zUuid,
  name: zRequired("Project name"),
  city: zRequired("City"),

  // More Details
  type: z.enum(["residential", "commercial", "hospitality", "institutional", "other"]).default("residential"),
  address: zOptional(),
  state: zOptional(),
  pincode: zOptional(),

  // Advanced
  budget: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().nonnegative().nullable().optional(),
  ),
  area_sqft: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().nonnegative().nullable().optional(),
  ),
  expected_close_date: zOptional(),
  notes: zOptional(),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
