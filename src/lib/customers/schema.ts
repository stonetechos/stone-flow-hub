import { z } from "zod";
import { zRequired, zOptional, zMobile, zEmail, normalizeMobile } from "@/lib/zod";
import type { DbEnum } from "@/lib/types";

export const CUSTOMER_TYPES: ReadonlyArray<{ value: DbEnum<"customer_type">; label: string }> = [
  { value: "individual", label: "Individual" },
  { value: "company", label: "Company" },
  { value: "builder", label: "Builder" },
  { value: "architect", label: "Architect" },
  { value: "interior_designer", label: "Interior Designer" },
  { value: "contractor", label: "Contractor" },
  { value: "government", label: "Government" },
  { value: "other", label: "Other" },
];

export const customerCreateSchema = z.object({
  // Quick Fill
  name: zRequired("Customer name"),
  mobile: zMobile,

  // More Details
  email: zEmail,
  city: zOptional(),
  customer_type: z
    .enum([
      "individual",
      "company",
      "builder",
      "architect",
      "interior_designer",
      "contractor",
      "government",
      "other",
    ])
    .default("individual"),

  // Advanced
  whatsapp: zOptional(),
  billing_address: zOptional(),
  state: zOptional(),
  pincode: zOptional(),
  gst_number: zOptional(),
  notes: zOptional(),
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;

export function normalizeForDedup(input: CustomerCreateInput) {
  return { mobile_normalized: normalizeMobile(input.mobile) };
}
