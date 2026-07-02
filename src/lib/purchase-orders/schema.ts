import { z } from "zod";

export const PURCHASE_ORDER_STATUSES = [
  "draft","sent","acknowledged","partially_received","received","cancelled",
] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export const purchaseOrderCreateSchema = z.object({
  vendor_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  status: z.enum(PURCHASE_ORDER_STATUSES).default("draft"),
  order_date: z.string().min(1, "Order date required"),
  expected_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type PurchaseOrderCreateInput = z.infer<typeof purchaseOrderCreateSchema>;
