import { z } from "zod";

export const SALES_ORDER_STATUSES = [
  "draft","confirmed","in_production","ready","shipped","delivered","cancelled",
] as const;
export type SalesOrderStatus = (typeof SALES_ORDER_STATUSES)[number];

export const salesOrderCreateSchema = z.object({
  quote_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  customer_id: z.string().uuid().nullable().optional(),
  status: z.enum(SALES_ORDER_STATUSES).default("draft"),
  order_date: z.string().min(1, "Order date required"),
  delivery_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type SalesOrderCreateInput = z.infer<typeof salesOrderCreateSchema>;
