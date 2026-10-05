import { z } from "zod";
import { zRequired, zOptional, zMobile, zEmail } from "@/lib/zod";

export const VENDOR_WORK_TYPES = [
  { value: "handcrafter", label: "Handcrafter" },
  { value: "cnc_works", label: "CNC Works" },
  { value: "polishing_work", label: "Polishing Work" },
  { value: "artwork", label: "Artwork" },
] as const;

export type VendorWorkType = (typeof VENDOR_WORK_TYPES)[number]["value"];

export const vendorCreateSchema = z.object({
  // Quick Fill
  company_name: zRequired("Vendor company"),
  contact_name: zRequired("Contact person"),
  mobile: zMobile,

  // Products Dealt In & Capabilities
  products_dealt: z.array(z.string()).default([]),
  work_types: z.array(z.string()).default([]),

  // More Details
  email: zEmail,
  city: zOptional(),

  // Advanced
  address: zOptional(),
  state: zOptional(),
  pincode: zOptional(),
  gst_number: zOptional(),
  payment_terms: zOptional(),
  notes: zOptional(),
});

export type VendorCreateInput = z.infer<typeof vendorCreateSchema>;
