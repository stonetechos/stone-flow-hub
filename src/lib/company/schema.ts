/** Company Profile form validation. */
import { z } from "zod";
import { zRequired, zOptional, zEmail, zMobile, zGstin, zPan, zIfsc } from "@/lib/zod";

export const companyProfileSchema = z.object({
  company_name: zRequired("Company name"),
  gstin: zGstin,
  legal_business_name: zOptional(),
  trade_name: zOptional(),

  address_line1: zOptional(),
  address_line2: zOptional(),
  city: zOptional(),
  state: zOptional(),
  pincode: zOptional(),
  country: zRequired("Country"),

  phone: zOptional(),
  // Mobile reuses the stricter 10-digit check other domain schemas use
  // (e.g. vendors), but stays optional here — a landline-only office is
  // legitimate for a Company Profile.
  mobile: z.union([zMobile, z.literal("")]).optional(),
  email: zEmail,
  website: zOptional(),
  logo_url: zOptional(),

  pan: zPan,
  cin: zOptional(),

  bank_name: zOptional(),
  bank_branch: zOptional(),
  bank_account_number: zOptional(),
  bank_ifsc: zIfsc,
  upi_id: zOptional(),

  authorized_signatory: zOptional(),
  signature_url: zOptional(),
  stamp_url: zOptional(),
});

export type CompanyProfileFormValues = z.infer<typeof companyProfileSchema>;
