import { z } from "zod";

export const PAYMENT_METHODS = [
  "razorpay",
  "bank_transfer",
  "upi_manual",
  "upi_bob_current",
  "upi_personal",
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

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  razorpay: "Razorpay",
  bank_transfer: "Bank Transfer",
  upi_manual: "UPI",
  upi_bob_current: "UPI – Stone Tech BOB Current A/c",
  upi_personal: "UPI – Personal Account",
  neft: "NEFT",
  rtgs: "RTGS",
  imps: "IMPS",
  cheque: "Cheque",
  cash: "Cash Received",
  card: "Card",
  gateway: "Gateway",
  other: "Other",
};

export const paymentCreateSchema = z.object({
  invoice_id: z.string().uuid("Pick an invoice"),
  amount: z.number().positive("Amount must be greater than 0"),
  method: z.enum(PAYMENT_METHODS),
  paid_at: z.string().min(1, "Payment date required"),
  reference_no: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
