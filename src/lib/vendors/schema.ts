import { z } from "zod";
import { zRequired, zOptional, zMobile, zEmail } from "@/lib/zod";

export const vendorCreateSchema = z.object({
  // Quick Fill
  company_name: zRequired("Vendor company"),
  contact_name: zRequired("Contact person"),
  mobile: zMobile,

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
