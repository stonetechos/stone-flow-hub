import { z } from "zod";

export const GRN_STATUSES = ["received", "partial", "closed", "cancelled"] as const;
export type GrnStatus = (typeof GRN_STATUSES)[number];

export const GRN_ACCEPTANCE = [
  "pending",
  "accepted",
  "rejected",
  "accepted_with_remarks",
] as const;
export type GrnAcceptance = (typeof GRN_ACCEPTANCE)[number];

export const grnCreateSchema = z.object({
  purchase_order_id: z.string().uuid().nullable().optional(),
  vendor_id: z.string().uuid("Select a vendor"),
  project_id: z.string().uuid().nullable().optional(),
  received_date: z.string().min(1, "Received date required"),
  vehicle_no: z.string().nullable().optional(),
  driver_name: z.string().nullable().optional(),
  driver_phone: z.string().nullable().optional(),
  delivery_challan_no: z.string().nullable().optional(),
  status: z.enum(GRN_STATUSES).default("received"),
  overall_acceptance: z.enum(GRN_ACCEPTANCE).default("pending"),
  notes: z.string().nullable().optional(),
});
export type GrnCreateInput = z.infer<typeof grnCreateSchema>;

export const grnItemCreateSchema = z.object({
  grn_id: z.string().uuid(),
  product_id: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
  quantity_ordered: z.number().nullable().optional(),
  quantity_received: z.number().nonnegative().default(0),
  quantity_accepted: z.number().nonnegative().default(0),
  quantity_rejected: z.number().nonnegative().default(0),
  unit: z.string().nullable().optional(),
  unit_cost: z.number().nonnegative().default(0),
  batch_no: z.string().nullable().optional(),
  lot_no: z.string().nullable().optional(),
  slab_no: z.string().nullable().optional(),
  bundle_no: z.string().nullable().optional(),
  crate_no: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type GrnItemCreateInput = z.infer<typeof grnItemCreateSchema>;

export const grnInspectionSchema = z.object({
  grn_item_id: z.string().uuid(),
  thickness_ok: z.boolean().nullable().optional(),
  size_ok: z.boolean().nullable().optional(),
  surface_finish_ok: z.boolean().nullable().optional(),
  edge_finish_ok: z.boolean().nullable().optional(),
  shade_ok: z.boolean().nullable().optional(),
  breakage_count: z.number().int().nonnegative().default(0),
  cracks_count: z.number().int().nonnegative().default(0),
  chips_count: z.number().int().nonnegative().default(0),
  moisture_pct: z.number().nullable().optional(),
  packaging_condition: z.string().nullable().optional(),
  outcome: z.enum(GRN_ACCEPTANCE).default("pending"),
  remarks: z.string().nullable().optional(),
});
export type GrnInspectionInput = z.infer<typeof grnInspectionSchema>;
