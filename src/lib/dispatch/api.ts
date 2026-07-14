import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { sanitizeSearch } from "@/lib/zod";
import type { DbTable } from "@/lib/types";
import {
  dispatchCreateSchema,
  dispatchItemInputSchema,
  type DispatchCreateInput,
  type DispatchItemInput,
  type DispatchStatus,
} from "./schema";

export type DispatchRow = DbTable<"dispatches">;
export type DispatchItemRow = DbTable<"dispatch_items">;
export type DispatchListItem = DispatchRow & {
  sales_order: { id: string; so_no: string } | null;
  customer: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
};

const SELECT =
  "*, sales_order:sales_orders!dispatches_sales_order_id_fkey(id,so_no), customer:customers!dispatches_customer_id_fkey(id,name), project:projects!dispatches_project_id_fkey(id,name)";

function toPayload(p: DispatchCreateInput) {
  return {
    sales_order_id: p.sales_order_id ?? null,
    customer_id: p.customer_id ?? null,
    project_id: p.project_id ?? null,
    status: p.status,
    dispatch_date: p.dispatch_date,
    carrier: p.carrier ?? null,
    tracking_no: p.tracking_no ?? null,
    site_address: p.site_address ?? null,
    vehicle_no: p.vehicle_no ?? null,
    driver_name: p.driver_name ?? null,
    driver_phone: p.driver_phone ?? null,
    lr_no: p.lr_no ?? null,
    delivered_by: p.delivered_by ?? null,
    received_by: p.received_by ?? null,
    carting_charge: Number(p.carting_charge ?? 0),
    remarks: p.remarks ?? null,
    notes: p.notes ?? null,
  };
}

export async function listDispatches(query = "", status = ""): Promise<DispatchListItem[]> {
  let q = supabase
    .from("dispatches")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(200);
  const s = sanitizeSearch(query);
  if (s)
    q = q.or(
      `dispatch_no.ilike.%${s}%,carrier.ilike.%${s}%,tracking_no.ilike.%${s}%,vehicle_no.ilike.%${s}%,lr_no.ilike.%${s}%,notes.ilike.%${s}%,remarks.ilike.%${s}%`,
    );
  if (status) q = q.eq("status", status as DispatchStatus);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as DispatchListItem[];
}

export async function listDispatchesBySalesOrder(soId: string): Promise<DispatchListItem[]> {
  const { data, error } = await supabase
    .from("dispatches")
    .select(SELECT)
    .eq("sales_order_id", soId)
    .order("dispatch_date", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as DispatchListItem[];
}

export async function listDispatchesByCustomer(customerId: string): Promise<DispatchListItem[]> {
  const { data, error } = await supabase
    .from("dispatches")
    .select(SELECT)
    .eq("customer_id", customerId)
    .order("dispatch_date", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as DispatchListItem[];
}

export async function listDispatchesByProject(projectId: string): Promise<DispatchListItem[]> {
  const { data, error } = await supabase
    .from("dispatches")
    .select(SELECT)
    .eq("project_id", projectId)
    .order("dispatch_date", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as DispatchListItem[];
}

export async function getDispatch(id: string): Promise<DispatchListItem | null> {
  const { data, error } = await supabase
    .from("dispatches")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as DispatchListItem | null) ?? null;
}

export async function createDispatch(input: DispatchCreateInput): Promise<DispatchRow> {
  const p = dispatchCreateSchema.parse(input);
  const { data, error } = await supabase
    .from("dispatches")
    .insert({ dispatch_no: "", ...toPayload(p) })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updateDispatch(id: string, input: DispatchCreateInput): Promise<DispatchRow> {
  const p = dispatchCreateSchema.parse(input);
  const { data, error } = await supabase
    .from("dispatches")
    .update(toPayload(p))
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

/* ------------------------------------------------------------------ */
/* Dispatch (delivery challan) line items                              */
/* ------------------------------------------------------------------ */

export async function listDispatchItems(dispatchId: string): Promise<DispatchItemRow[]> {
  const { data, error } = await supabase
    .from("dispatch_items")
    .select("*")
    .eq("dispatch_id", dispatchId)
    .order("sort_order", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function replaceDispatchItems(
  dispatchId: string,
  items: DispatchItemInput[],
): Promise<DispatchItemRow[]> {
  const parsed = items
    .map((it, idx) => dispatchItemInputSchema.parse({ ...it, sort_order: it.sort_order ?? idx }))
    .filter((it) => Number(it.quantity) > 0);

  const { error: delErr } = await supabase
    .from("dispatch_items")
    .delete()
    .eq("dispatch_id", dispatchId);
  if (delErr) throw new AppError(mapDbError(delErr));

  if (parsed.length === 0) return [];

  const rows = parsed.map((it) => ({
    dispatch_id: dispatchId,
    sales_order_item_id: it.sales_order_item_id ?? null,
    product_id: it.product_id ?? null,
    product_name: it.product_name ?? null,
    description: it.description,
    unit: it.unit ?? null,
    quantity: Number(it.quantity),
    sort_order: it.sort_order ?? 0,
  }));

  const { data, error } = await supabase.from("dispatch_items").insert(rows).select("*");
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

/* ------------------------------------------------------------------ */
/* Delivery status against a sales order                               */
/* ------------------------------------------------------------------ */
export type DeliveryLine = {
  sales_order_item_id: string;
  product_name: string;
  description: string;
  unit: string | null;
  ordered: number;
  delivered: number;
  remaining: number;
};
export type DeliveryStatus = {
  lines: DeliveryLine[];
  challanCount: number;
  totalOrdered: number;
  totalDelivered: number;
  totalRemaining: number;
};

export async function getSalesOrderDeliveryStatus(soId: string): Promise<DeliveryStatus> {
  const [{ data: items, error: iErr }, { data: dispatches, error: dErr }] = await Promise.all([
    supabase
      .from("sales_order_items")
      .select("id,product_name,description,unit,quantity")
      .eq("sales_order_id", soId)
      .order("sort_order", { ascending: true }),
    supabase.from("dispatches").select("id,status").eq("sales_order_id", soId),
  ]);
  if (iErr) throw new AppError(mapDbError(iErr));
  if (dErr) throw new AppError(mapDbError(dErr));

  const activeDispatchIds = (dispatches ?? [])
    .filter((d) => d.status !== "cancelled")
    .map((d) => d.id);

  let delivered: Record<string, number> = {};
  if (activeDispatchIds.length > 0) {
    const { data: di, error: diErr } = await supabase
      .from("dispatch_items")
      .select("sales_order_item_id,quantity")
      .in("dispatch_id", activeDispatchIds);
    if (diErr) throw new AppError(mapDbError(diErr));
    delivered = (di ?? []).reduce<Record<string, number>>((acc, row) => {
      if (!row.sales_order_item_id) return acc;
      acc[row.sales_order_item_id] = (acc[row.sales_order_item_id] ?? 0) + Number(row.quantity);
      return acc;
    }, {});
  }

  const lines: DeliveryLine[] = (items ?? []).map((it) => {
    const ordered = Number(it.quantity);
    const d = delivered[it.id] ?? 0;
    return {
      sales_order_item_id: it.id,
      product_name: it.product_name ?? it.description,
      description: it.description,
      unit: it.unit,
      ordered,
      delivered: d,
      remaining: Math.max(0, ordered - d),
    };
  });

  return {
    lines,
    challanCount: (dispatches ?? []).length,
    totalOrdered: lines.reduce((s, l) => s + l.ordered, 0),
    totalDelivered: lines.reduce((s, l) => s + l.delivered, 0),
    totalRemaining: lines.reduce((s, l) => s + l.remaining, 0),
  };
}

/* ------------------------------------------------------------------ */
/* Committed demand by product (Phase G.4 — Operations Intelligence)   */
/* ------------------------------------------------------------------ */
export type CommittedDemandRow = {
  product_id: string;
  committed_qty: number;
};

/**
 * Bulk counterpart of `getSalesOrderDeliveryStatus` — same computation
 * (ordered - delivered = remaining, via the same dispatch_items join),
 * just aggregated by product across every open Sales Order instead of
 * one order's line items. No bulk "committed demand" API exists yet, so
 * this generalises the existing per-order calculation rather than
 * inventing a new one.
 */
export async function listCommittedDemandByProduct(): Promise<CommittedDemandRow[]> {
  const { data: openOrders, error: soErr } = await supabase
    .from("sales_orders")
    .select("id")
    .not("status", "in", "(delivered,cancelled)")
    .limit(500);
  if (soErr) throw new AppError(mapDbError(soErr));
  const openIds = (openOrders ?? []).map((o) => o.id);
  if (openIds.length === 0) return [];

  const [itemsRes, dispatchesRes] = await Promise.all([
    supabase.from("sales_order_items").select("id,product_id,quantity").in("sales_order_id", openIds),
    supabase.from("dispatches").select("id").in("sales_order_id", openIds).neq("status", "cancelled"),
  ]);
  if (itemsRes.error) throw new AppError(mapDbError(itemsRes.error));
  if (dispatchesRes.error) throw new AppError(mapDbError(dispatchesRes.error));

  const activeDispatchIds = (dispatchesRes.data ?? []).map((d) => d.id);
  const deliveredByItem = new Map<string, number>();
  if (activeDispatchIds.length > 0) {
    const { data: di, error: diErr } = await supabase
      .from("dispatch_items")
      .select("sales_order_item_id,quantity")
      .in("dispatch_id", activeDispatchIds);
    if (diErr) throw new AppError(mapDbError(diErr));
    for (const row of di ?? []) {
      if (!row.sales_order_item_id) continue;
      deliveredByItem.set(
        row.sales_order_item_id,
        (deliveredByItem.get(row.sales_order_item_id) ?? 0) + Number(row.quantity),
      );
    }
  }

  const committedByProduct = new Map<string, number>();
  for (const item of (itemsRes.data ?? []) as Array<{ id: string; product_id: string | null; quantity: number }>) {
    if (!item.product_id) continue;
    const delivered = deliveredByItem.get(item.id) ?? 0;
    const remaining = Math.max(0, Number(item.quantity) - delivered);
    if (remaining <= 0) continue;
    committedByProduct.set(item.product_id, (committedByProduct.get(item.product_id) ?? 0) + remaining);
  }
  return [...committedByProduct.entries()].map(([product_id, committed_qty]) => ({ product_id, committed_qty }));
}
