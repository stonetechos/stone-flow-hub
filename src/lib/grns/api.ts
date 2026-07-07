import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { sanitizeSearch } from "@/lib/zod";
import {
  grnCreateSchema,
  grnItemCreateSchema,
  grnInspectionSchema,
  type GrnCreateInput,
  type GrnItemCreateInput,
  type GrnInspectionInput,
} from "./schema";

export type GrnRow = {
  id: string;
  grn_no: string;
  purchase_order_id: string | null;
  vendor_id: string;
  project_id: string | null;
  received_date: string;
  received_by: string | null;
  vehicle_no: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  delivery_challan_no: string | null;
  status: string;
  overall_acceptance: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type GrnListItem = GrnRow & {
  vendor: { id: string; company_name: string } | null;
  purchase_order: { id: string; po_no: string } | null;
  project: { id: string; name: string } | null;
};

export type GrnItemRow = {
  id: string;
  grn_id: string;
  product_id: string | null;
  description: string | null;
  quantity_ordered: number | null;
  quantity_received: number;
  quantity_accepted: number;
  quantity_rejected: number;
  unit: string | null;
  unit_cost: number;
  batch_no: string | null;
  lot_no: string | null;
  slab_no: string | null;
  bundle_no: string | null;
  crate_no: string | null;
  location: string | null;
  inventory_item_id: string | null;
  notes: string | null;
  created_at: string;
};

export type GrnInspectionRow = {
  id: string;
  grn_item_id: string;
  thickness_ok: boolean | null;
  size_ok: boolean | null;
  surface_finish_ok: boolean | null;
  edge_finish_ok: boolean | null;
  shade_ok: boolean | null;
  breakage_count: number;
  cracks_count: number;
  chips_count: number;
  moisture_pct: number | null;
  packaging_condition: string | null;
  outcome: string;
  remarks: string | null;
  inspector_id: string | null;
  inspected_at: string | null;
};

const SELECT =
  "*, vendor:vendors!grns_vendor_id_fkey(id,company_name), purchase_order:purchase_orders!grns_purchase_order_id_fkey(id,po_no), project:projects!grns_project_id_fkey(id,name)";

export async function listGrns(query = ""): Promise<GrnListItem[]> {
  let q = supabase
    .from("grns" as never)
    .select(SELECT)
    .order("received_date", { ascending: false })
    .limit(200);
  const s = sanitizeSearch(query);
  if (s) q = q.or(`grn_no.ilike.%${s}%,delivery_challan_no.ilike.%${s}%,vehicle_no.ilike.%${s}%`);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as GrnListItem[];
}

export async function getGrn(id: string): Promise<GrnListItem | null> {
  const { data, error } = await supabase
    .from("grns" as never)
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as GrnListItem | null) ?? null;
}

export async function listGrnItems(grnId: string): Promise<GrnItemRow[]> {
  const { data, error } = await supabase
    .from("grn_items" as never)
    .select("*")
    .eq("grn_id", grnId)
    .order("created_at");
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as GrnItemRow[];
}

export async function listInspections(grnItemIds: string[]): Promise<GrnInspectionRow[]> {
  if (grnItemIds.length === 0) return [];
  const { data, error } = await supabase
    .from("grn_inspections" as never)
    .select("*")
    .in("grn_item_id", grnItemIds);
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as GrnInspectionRow[];
}

export async function createGrn(input: GrnCreateInput): Promise<GrnRow> {
  const p = grnCreateSchema.parse(input);
  const { data, error } = await supabase
    .from("grns" as never)
    .insert({
      grn_no: "",
      purchase_order_id: p.purchase_order_id ?? null,
      vendor_id: p.vendor_id,
      project_id: p.project_id ?? null,
      received_date: p.received_date,
      vehicle_no: p.vehicle_no ?? null,
      driver_name: p.driver_name ?? null,
      driver_phone: p.driver_phone ?? null,
      delivery_challan_no: p.delivery_challan_no ?? null,
      status: p.status,
      overall_acceptance: p.overall_acceptance,
      notes: p.notes ?? null,
    } as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as GrnRow;
}

export async function updateGrn(id: string, input: Partial<GrnCreateInput>): Promise<GrnRow> {
  const patch = grnCreateSchema.partial().parse(input);
  const { data, error } = await supabase
    .from("grns" as never)
    .update(patch as never)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as GrnRow;
}

export async function deleteGrn(id: string): Promise<void> {
  const { error } = await supabase.from("grns" as never).delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

export async function addGrnItem(input: GrnItemCreateInput): Promise<GrnItemRow> {
  const p = grnItemCreateSchema.parse(input);
  const { data, error } = await supabase
    .from("grn_items" as never)
    .insert(p as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as GrnItemRow;
}

export async function deleteGrnItem(id: string): Promise<void> {
  const { error } = await supabase.from("grn_items" as never).delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

export async function upsertInspection(input: GrnInspectionInput): Promise<GrnInspectionRow> {
  const p = grnInspectionSchema.parse(input);
  const { data, error } = await supabase
    .from("grn_inspections" as never)
    .upsert(p as never, { onConflict: "grn_item_id" })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as GrnInspectionRow;
}
