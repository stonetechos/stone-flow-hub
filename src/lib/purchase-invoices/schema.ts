import { z } from "zod";

export const PURCHASE_INVOICE_STATUSES = ["draft", "recorded", "disputed", "cancelled"] as const;
export type PurchaseInvoiceStatus = (typeof PURCHASE_INVOICE_STATUSES)[number];

export const purchaseInvoiceCreateSchema = z.object({
  vendor_id: z.string().uuid("Select a vendor"),
  purchase_order_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  vendor_invoice_no: z.string().nullable().optional(),
  status: z.enum(PURCHASE_INVOICE_STATUSES).default("recorded"),
  invoice_date: z.string().min(1, "Invoice date required"),
  due_date: z.string().nullable().optional(),
  subtotal: z.number().nonnegative().default(0),
  tax_amount: z.number().nonnegative().default(0),
  other_charges: z.number().nonnegative().default(0),
  total_amount: z.number().nonnegative().default(0),
  currency_code: z.string().default("INR"),
  notes: z.string().nullable().optional(),
});
export type PurchaseInvoiceCreateInput = z.infer<typeof purchaseInvoiceCreateSchema>;
