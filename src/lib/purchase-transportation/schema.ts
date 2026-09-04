import { z } from "zod";

export const PURCHASE_TRANSPORT_STATUSES = [
  "planned",
  "in_transit",
  "delivered",
  "cancelled",
] as const;
export type PurchaseTransportStatus = (typeof PURCHASE_TRANSPORT_STATUSES)[number];

export const purchaseTransportItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid().nullable().optional(),
  product_name: z.string().nullable().optional(),
  description: z.string().min(1, "Description required"),
  unit: z.string().nullable().optional(),
  quantity: z.coerce.number().min(0, "Quantity must be ≥ 0"),
  sort_order: z.number().int().optional(),
});
export type PurchaseTransportItemInput = z.infer<typeof purchaseTransportItemInputSchema>;

export const purchaseTransportCreateSchema = z.object({
  purchase_order_id: z.string().uuid().nullable().optional(),
  vendor_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  carting_agency_id: z.string().uuid().nullable().optional(),
  status: z.enum(PURCHASE_TRANSPORT_STATUSES).default("planned"),
  transport_date: z.string().min(1, "Transport date required"),
  vehicle_no: z.string().nullable().optional(),
  driver_name: z.string().nullable().optional(),
  driver_phone: z.string().nullable().optional(),
  lr_no: z.string().nullable().optional(),
  delivered_by: z.string().nullable().optional(),
  received_by: z.string().nullable().optional(),
  freight_amount: z.coerce.number().min(0).default(0),
  amount_paid: z.coerce.number().min(0).default(0),
  remarks: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type PurchaseTransportCreateInput = z.infer<typeof purchaseTransportCreateSchema>;
