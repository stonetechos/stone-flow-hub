import { z } from "zod";

export const PAYMENT_METHODS = [
  "upi_stone_tech",
  "cash",
  "current_bob",
  "upi_raman",
  "upi_rishi",
  "razorpay",
  "bank_transfer",
  "upi_manual",
  "upi_bob_current",
  "upi_personal",
  "neft",
  "rtgs",
  "imps",
  "cheque",
  "card",
  "gateway",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  upi_stone_tech: "Stone Tech UPI",
  cash: "Cash",
  current_bob: "Current Account BOB",
  upi_raman: "Personal UPI – Raman",
  upi_rishi: "Personal UPI – Rishi",
  razorpay: "Razorpay",
  bank_transfer: "Bank Transfer",
  upi_manual: "UPI",
  upi_bob_current: "UPI – Stone Tech BOB Current A/c",
  upi_personal: "UPI – Personal Account",
  neft: "NEFT",
  rtgs: "RTGS",
  imps: "IMPS",
  cheque: "Cheque",
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

import type { Database } from "@/integrations/supabase/types";
export type DbPaymentMethod = Database["public"]["Enums"]["payment_method"];

export function toDbPaymentMethod(method: string): {
  method: DbPaymentMethod;
  accountUsed?: string;
} {
  switch (method) {
    case "upi_stone_tech":
      return { method: "upi_bob_current", accountUsed: "Stone Tech UPI" };
    case "current_bob":
      return { method: "bank_transfer", accountUsed: "Current Account BOB" };
    case "upi_raman":
      return { method: "upi_personal", accountUsed: "Personal UPI - Raman" };
    case "upi_rishi":
      return { method: "upi_personal", accountUsed: "Personal UPI - Rishi" };
    default:
      return { method: method as DbPaymentMethod };
  }
}
