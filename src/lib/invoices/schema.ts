import { z } from "zod";
import { zOptional, zUuid } from "@/lib/zod";

export const recordPaymentSchema = z.object({
  invoice_id: zUuid,
  amount: z.coerce.number().positive("Amount must be > 0"),
  method: z.enum(["razorpay", "bank_transfer", "upi_manual", "cheque", "cash", "other"]),
  paid_at: zOptional(),
  reference_no: zOptional(),
  notes: zOptional(),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const setInvoiceStatusSchema = z.object({
  invoice_id: zUuid,
  status: z.enum(["draft", "sent", "cancelled", "overdue"]),
});
export type SetInvoiceStatusInput = z.infer<typeof setInvoiceStatusSchema>;
