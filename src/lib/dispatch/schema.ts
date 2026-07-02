import { z } from "zod";

export const DISPATCH_STATUSES = ["planned", "in_transit", "delivered", "cancelled"] as const;
export type DispatchStatus = (typeof DISPATCH_STATUSES)[number];

export const dispatchCreateSchema = z.object({
  sales_order_id: z.string().uuid().nullable().optional(),
  status: z.enum(DISPATCH_STATUSES).default("planned"),
  dispatch_date: z.string().min(1, "Dispatch date required"),
  carrier: z.string().nullable().optional(),
  tracking_no: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type DispatchCreateInput = z.infer<typeof dispatchCreateSchema>;
