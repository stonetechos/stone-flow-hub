import { z } from "zod";
import { zRequired, zOptional, zMobile, zEmail, normalizeMobile } from "@/lib/zod";
import type { DbEnum } from "@/lib/types";

/** "Type of Customer" — Step 1 simplification (2026-09-03). This is the
 *  list shown in the New Customer form's dropdown going forward. The DB
 *  enum also still contains the older values (builder, individual, company,
 *  government, other) so existing customers created before this change keep
 *  displaying correctly — they just aren't offered for new customers. */
export const CUSTOMER_TYPES: ReadonlyArray<{ value: DbEnum<"customer_type">; label: string }> = [
  { value: "walk_in", label: "Walk-in" },
  { value: "b2b", label: "B2B" },
  { value: "architect", label: "Architect" },
  { value: "interior_designer", label: "Interior Designer" },
  { value: "contractor", label: "Contractor" },
  { value: "google_search", label: "Google Search" },
  { value: "reference", label: "Reference" },
];

/** "Type of space" at the customer's site. */
export const SPACE_TYPES: ReadonlyArray<{ value: DbEnum<"space_type">; label: string }> = [
  { value: "bungalow", label: "Bungalow" },
  { value: "apartment", label: "Apartment" },
  { value: "farmhouse", label: "Farmhouse" },
  { value: "commercial_space", label: "Commercial Space" },
  { value: "resort", label: "Resort" },
  { value: "residential_building", label: "Residential Building" },
  { value: "educational_institution", label: "Educational Institution" },
  { value: "holy_place", label: "Holy Place" },
  { value: "garden", label: "Garden" },
  { value: "exhibition", label: "Exhibition" },
  { value: "showroom", label: "Showroom" },
  { value: "spa", label: "Spa" },
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Hotel" },
  { value: "govt_institution", label: "Govt Institution" },
  { value: "college", label: "College" },
  { value: "hostel", label: "Hostel" },
  { value: "mall", label: "Mall" },
];

/** "Material In" — multi-select product interest list. */
export const MATERIAL_OPTIONS: ReadonlyArray<{
  value: DbEnum<"material_interest">;
  label: string;
}> = [
  { value: "natural_stone_interlocking_panels", label: "Natural Stone Interlocking Panels" },
  { value: "natural_stone_mosaics", label: "Natural Stone Mosaics" },
  { value: "stone_murals", label: "Stone Murals" },
  { value: "inlay_work", label: "Inlay Work" },
  { value: "table_top", label: "Table Top" },
  { value: "custom_stone_cladding", label: "Custom Stone Cladding" },
  { value: "crazy_pattern_in_stone", label: "Crazy Pattern in Stone" },
  { value: "general_flooring", label: "General Flooring" },
  { value: "custom_flooring", label: "Custom Flooring" },
  { value: "stepping_stone", label: "Stepping Stone" },
  { value: "stone_veneer", label: "Stone Veneer" },
  { value: "pu_panels", label: "PU Panels" },
  { value: "stone_veneer_artwork", label: "Stone Veneer Artwork" },
  { value: "agate_slabs", label: "Agate Slabs" },
];

export const customerCreateSchema = z
  .object({
    // Quick Fill — Step 1 simplified Customer Registration fields
    name: zRequired("Customer name"),
    // Validation stays permissive across the FULL db enum (old values included)
    // because other create paths — the enquiry auto-create flow, the VIE
    // voice/AI planner — still legitimately pass legacy values like
    // "individual". CUSTOMER_TYPES above (7 values) is what the manual New
    // Customer form's dropdown actually offers; this schema just has to not
    // reject what those other callers still send.
    customer_type: z
      .enum([
        "walk_in",
        "b2b",
        "architect",
        "interior_designer",
        "contractor",
        "google_search",
        "reference",
        "builder",
        "individual",
        "company",
        "government",
        "other",
      ])
      .default("walk_in"),
    // Only meaningful (and required) when customer_type === "reference".
    referred_by: zOptional(),
    mobile: zMobile,
    site_address: zOptional(),
    space_type: z
      .enum([
        "bungalow",
        "apartment",
        "farmhouse",
        "commercial_space",
        "resort",
        "residential_building",
        "educational_institution",
        "holy_place",
        "garden",
        "exhibition",
        "showroom",
        "spa",
        "restaurant",
        "hotel",
        "govt_institution",
        "college",
        "hostel",
        "mall",
      ])
      .nullable()
      .optional(),
    material_interests: z
      .array(
        z.enum([
          "natural_stone_interlocking_panels",
          "natural_stone_mosaics",
          "stone_murals",
          "inlay_work",
          "table_top",
          "custom_stone_cladding",
          "crazy_pattern_in_stone",
          "general_flooring",
          "custom_flooring",
          "stepping_stone",
          "stone_veneer",
          "pu_panels",
          "stone_veneer_artwork",
          "agate_slabs",
        ]),
      )
      .default([]),
    notes: zOptional(),

    // More details / Advanced — kept from the original form so GST, email,
    // and address data used elsewhere (invoicing, tax) is never lost.
    email: zEmail,
    city: zOptional(),
    whatsapp: zOptional(),
    billing_address: zOptional(),
    state: zOptional(),
    pincode: zOptional(),
    gst_number: zOptional(),
  })
  .superRefine((val, ctx) => {
    if (val.customer_type === "reference" && !val.referred_by?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["referred_by"],
        message: "Enter who referred this customer",
      });
    }
  });

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;

export function normalizeForDedup(input: CustomerCreateInput) {
  return { mobile_normalized: normalizeMobile(input.mobile) };
}
