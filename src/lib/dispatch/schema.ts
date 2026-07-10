import { z } from "zod";

export const DISPATCH_STATUSES = ["planned", "in_transit", "delivered", "cancelled"] as const;
export type DispatchStatus = (typeof DISPATCH_STATUSES)[number];

export const dispatchItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  sales_order_item_id: z.string().uuid().nullable().optional(),
  product_id: z.string().uuid().nullable().optional(),
  product_name: z.string().nullable().optional(),
  description: z.string().min(1, "Description required"),
  unit: z.string().nullable().optional(),
  quantity: z.coerce.number().min(0, "Quantity must be ≥ 0"),
  sort_order: z.number().int().optional(),
});
export type DispatchItemInput = z.infer<typeof dispatchItemInputSchema>;

export const dispatchCreateSchema = z.object({
  sales_order_id: z.string().uuid().nullable().optional(),
  customer_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  status: z.enum(DISPATCH_STATUSES).default("planned"),
  dispatch_date: z.string().min(1, "Dispatch date required"),
  carrier: z.string().nullable().optional(),
  tracking_no: z.string().nullable().optional(),
  site_address: z.string().nullable().optional(),
  vehicle_no: z.string().nullable().optional(),
  driver_name: z.string().nullable().optional(),
  driver_phone: z.string().nullable().optional(),
  lr_no: z.string().nullable().optional(),
  delivered_by: z.string().nullable().optional(),
  received_by: z.string().nullable().optional(),
  carting_charge: z.coerce.number().min(0).default(0),
  remarks: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type DispatchCreateInput = z.infer<typeof dispatchCreateSchema>;
