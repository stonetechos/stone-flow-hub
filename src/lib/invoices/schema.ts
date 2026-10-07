import { z } from "zod";
import { zHsn, zOptional, zUuid } from "@/lib/zod";

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
  status: z.enum(["draft", "issued", "sent", "cancelled", "overdue"]),
});
export type SetInvoiceStatusInput = z.infer<typeof setInvoiceStatusSchema>;

export const invoiceUpdateSchema = z.object({
  due_date: zOptional(),
  notes: zOptional(),
  terms: zOptional(),
});
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;

export const invoiceItemPatchSchema = z.object({
  description: z.string().trim().min(1, "Description is required").optional(),
  quantity: z.coerce.number().positive("Qty must be > 0").optional(),
  unit: zOptional(),
  unit_price: z.coerce.number().nonnegative().optional(),
  tax_pct: z.coerce.number().min(0).max(100).optional(),
  hsn_sac: zHsn,
  sort_order: z.coerce.number().optional(),
});
export type InvoiceItemPatchInput = z.infer<typeof invoiceItemPatchSchema>;

export const invoiceItemAddSchema = z.object({
  invoice_id: zUuid,
  product_id: z.string().uuid().nullable().optional(),
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Qty must be > 0"),
  unit: zOptional(),
  unit_price: z.coerce.number().nonnegative(),
  tax_pct: z.coerce.number().min(0).max(100).default(0),
  hsn_sac: zHsn,
  sort_order: z.coerce.number().optional(),
});
export type InvoiceItemAddInput = z.infer<typeof invoiceItemAddSchema>;
