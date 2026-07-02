import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { sanitizeSearch } from "@/lib/zod";
import type { DbTable } from "@/lib/types";
import { purchaseOrderCreateSchema, type PurchaseOrderCreateInput, type PurchaseOrderStatus } from "./schema";

export type PurchaseOrderRow = DbTable<"purchase_orders">;
export type PurchaseOrderListItem = PurchaseOrderRow & {
  vendor: { id: string; company_name: string; vendor_code: string } | null;
  project: { id: string; name: string; project_code: string } | null;
};

const SELECT = "*, vendor:vendors!purchase_orders_vendor_id_fkey(id,company_name,vendor_code), project:projects!purchase_orders_project_id_fkey(id,name,project_code)";


export async function listPurchaseOrders(query = "", status = ""): Promise<PurchaseOrderListItem[]> {
  let q = supabase.from("purchase_orders").select(SELECT).order("created_at", { ascending: false }).limit(200);
  const s = sanitizeSearch(query);
  if (s) q = q.or(`po_no.ilike.%${s}%,notes.ilike.%${s}%`);
  if (status) q = q.eq("status", status as PurchaseOrderStatus);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as PurchaseOrderListItem[];
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrderListItem | null> {
  const { data, error } = await supabase.from("purchase_orders").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as PurchaseOrderListItem | null) ?? null;
}

export async function createPurchaseOrder(input: PurchaseOrderCreateInput): Promise<PurchaseOrderRow> {
  const p = purchaseOrderCreateSchema.parse(input);
  const { data, error } = await supabase
    .from("purchase_orders")
    .insert({
      po_no: "",
      vendor_id: p.vendor_id ?? null,
      project_id: p.project_id ?? null,
      status: p.status,
      order_date: p.order_date,
      expected_date: p.expected_date ?? null,
      notes: p.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updatePurchaseOrder(id: string, input: PurchaseOrderCreateInput): Promise<PurchaseOrderRow> {
  const p = purchaseOrderCreateSchema.parse(input);
  const { data, error } = await supabase
    .from("purchase_orders")
    .update({
      vendor_id: p.vendor_id ?? null,
      project_id: p.project_id ?? null,
      status: p.status,
      order_date: p.order_date,
      expected_date: p.expected_date ?? null,
      notes: p.notes ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}
