import { z } from "zod";
import { zRequired, zOptional, zMobile, zEmail, normalizeMobile } from "@/lib/zod";

/** Customer Quick Fill: just name + mobile. Everything else is optional. */
export const customerCreateSchema = z.object({
  // Quick Fill
  name: zRequired("Customer name"),
  mobile: zMobile,

  // More Details
  email: zEmail,
  city: zOptional(),
  type: z.enum(["individual", "company", "builder", "architect", "designer", "other"]).default("individual"),

  // Advanced
  alt_mobile: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().nullable().optional(),
  ),
  address: zOptional(),
  state: zOptional(),
  pincode: zOptional(),
  gstin: zOptional(),
  notes: zOptional(),
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;

export function normalizeForDedup(input: CustomerCreateInput) {
  return { mobile_normalized: normalizeMobile(input.mobile) };
}
