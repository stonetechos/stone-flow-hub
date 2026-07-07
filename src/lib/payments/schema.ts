import { z } from "zod";

export const PAYMENT_METHODS = [
  "razorpay",
  "bank_transfer",
  "upi_manual",
  "neft",
  "rtgs",
  "imps",
  "cheque",
  "cash",
  "card",
  "gateway",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const paymentCreateSchema = z.object({
  invoice_id: z.string().uuid("Pick an invoice"),
  amount: z.number().positive("Amount must be greater than 0"),
  method: z.enum(PAYMENT_METHODS),
  paid_at: z.string().min(1, "Payment date required"),
  reference_no: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
