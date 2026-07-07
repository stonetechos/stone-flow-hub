import { z } from "zod";

export const RECEIPT_METHODS = [
  "cash",
  "upi_manual",
  "neft",
  "rtgs",
  "imps",
  "bank_transfer",
  "cheque",
  "card",
  "razorpay",
  "gateway",
  "other",
] as const;
export type ReceiptMethod = (typeof RECEIPT_METHODS)[number];

export const receiptAllocationSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.number().positive(),
});

export const receiptCreateSchema = z.object({
  customer_id: z.string().uuid("Customer required"),
  received_at: z.string().min(1, "Date required"),
  amount: z.number().positive("Amount must be greater than 0"),
  method: z.enum(RECEIPT_METHODS),
  bank_name: z.string().nullable().optional(),
  account_used: z.string().nullable().optional(),
  reference_no: z.string().nullable().optional(),
  cheque_no: z.string().nullable().optional(),
  cheque_date: z.string().nullable().optional(),
  tds_amount: z.number().min(0).default(0),
  bank_charges: z.number().min(0).default(0),
  remarks: z.string().nullable().optional(),
  attachment_file_id: z.string().uuid().nullable().optional(),
  provider: z.string().nullable().optional(),
  provider_ref: z.string().nullable().optional(),
  allocations: z.array(receiptAllocationSchema).default([]),
});
export type ReceiptCreateInput = z.infer<typeof receiptCreateSchema>;

export const receiptUpdateSchema = receiptCreateSchema.partial().extend({
  status: z.enum(["active", "void"]).optional(),
});
export type ReceiptUpdateInput = z.infer<typeof receiptUpdateSchema>;
