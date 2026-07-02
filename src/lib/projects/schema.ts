import { z } from "zod";
import { zRequired, zOptional, zUuid } from "@/lib/zod";
import type { DbEnum } from "@/lib/types";

export const PROJECT_TYPES: ReadonlyArray<{ value: DbEnum<"project_type">; label: string }> = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "hospitality", label: "Hospitality" },
  { value: "healthcare", label: "Healthcare" },
  { value: "institutional", label: "Institutional" },
  { value: "industrial", label: "Industrial" },
  { value: "villa", label: "Villa" },
  { value: "apartment", label: "Apartment" },
  { value: "other", label: "Other" },
];

export const projectCreateSchema = z.object({
  // Quick Fill
  customer_id: zUuid,
  name: zRequired("Project name"),
  city: zRequired("City"),

  // More Details
  project_type: z
    .enum([
      "residential",
      "commercial",
      "hospitality",
      "healthcare",
      "institutional",
      "industrial",
      "villa",
      "apartment",
      "other",
    ])
    .default("residential"),
  site_address: zOptional(),
  state: zOptional(),
  pincode: zOptional(),

  // Advanced
  expected_value_inr: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().nonnegative().nullable().optional(),
  ),
  expected_start_date: zOptional(),
  expected_completion_date: zOptional(),
  notes: zOptional(),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
