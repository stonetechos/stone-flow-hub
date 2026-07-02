import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { sanitizeSearch } from "@/lib/zod";
import type { DbTable } from "@/lib/types";
import { dispatchCreateSchema, type DispatchCreateInput, type DispatchStatus } from "./schema";

export type DispatchRow = DbTable<"dispatches">;
export type DispatchListItem = DispatchRow & {
  sales_order: { id: string; so_no: string } | null;
};

const SELECT = "*, sales_order:sales_orders!dispatches_sales_order_id_fkey(id,so_no)";

export async function listDispatches(query = "", status = ""): Promise<DispatchListItem[]> {
  let q = supabase.from("dispatches").select(SELECT).order("created_at", { ascending: false }).limit(200);
  const s = sanitizeSearch(query);
  if (s) q = q.or(`dispatch_no.ilike.%${s}%,carrier.ilike.%${s}%,tracking_no.ilike.%${s}%,notes.ilike.%${s}%`);
  if (status) q = q.eq("status", status as DispatchStatus);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as DispatchListItem[];
}

export async function getDispatch(id: string): Promise<DispatchListItem | null> {
  const { data, error } = await supabase.from("dispatches").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as DispatchListItem | null) ?? null;
}

export async function createDispatch(input: DispatchCreateInput): Promise<DispatchRow> {
  const p = dispatchCreateSchema.parse(input);
  const { data, error } = await supabase
    .from("dispatches")
    .insert({
      dispatch_no: "",
      sales_order_id: p.sales_order_id ?? null,
      status: p.status,
      dispatch_date: p.dispatch_date,
      carrier: p.carrier ?? null,
      tracking_no: p.tracking_no ?? null,
      notes: p.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updateDispatch(id: string, input: DispatchCreateInput): Promise<DispatchRow> {
  const p = dispatchCreateSchema.parse(input);
  const { data, error } = await supabase
    .from("dispatches")
    .update({
      sales_order_id: p.sales_order_id ?? null,
      status: p.status,
      dispatch_date: p.dispatch_date,
      carrier: p.carrier ?? null,
      tracking_no: p.tracking_no ?? null,
      notes: p.notes ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deleteDispatch(id: string): Promise<void> {
  const { error } = await supabase.from("dispatches").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}
