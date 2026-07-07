import { z } from "zod";

export const VENDOR_PAYMENT_TYPES = [
  "advance",
  "part",
  "full",
  "retention",
  "credit_note",
  "debit_note",
  "refund",
] as const;
export type VendorPaymentType = (typeof VENDOR_PAYMENT_TYPES)[number];

export const VENDOR_PAYMENT_METHODS = [
  "bank_transfer",
  "neft",
  "rtgs",
  "imps",
  "upi_manual",
  "cheque",
  "cash",
  "other",
] as const;
export type VendorPaymentMethod = (typeof VENDOR_PAYMENT_METHODS)[number];

export const vendorPaymentCreateSchema = z.object({
  vendor_id: z.string().uuid("Select a vendor"),
  purchase_order_id: z.string().uuid().nullable().optional(),
  grn_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  payment_type: z.enum(VENDOR_PAYMENT_TYPES),
  amount: z.number().positive("Amount must be > 0"),
  currency_code: z.string().default("INR"),
  method: z.enum(VENDOR_PAYMENT_METHODS).nullable().optional(),
  reference_no: z.string().nullable().optional(),
  paid_at: z.string().min(1, "Payment date required"),
  notes: z.string().nullable().optional(),
});
export type VendorPaymentCreateInput = z.infer<typeof vendorPaymentCreateSchema>;
