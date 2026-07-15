/**
 * Manufacturing helpers — Sales Order → Production Orders automation
 * plus dashboard KPIs. Uses the `send_to_manufacturing` RPC added in
 * migration 20260706_module3c.
 */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";

export type ProductionOrderRow = DbTable<"production_orders">;

export type ProductionOrderCard = ProductionOrderRow & {
  products: { id: string; name: string; product_code: string } | null;
};

/** Kick off manufacturing for every product line of a Sales Order. Idempotent. */
export async function sendSalesOrderToManufacturing(
  salesOrderId: string,
): Promise<ProductionOrderRow[]> {
  const { data, error } = await getDb().rpc(
    "send_to_manufacturing" as never,
    { p_sales_order_id: salesOrderId } as never,
  );
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as ProductionOrderRow[];
}

/** All production orders for a Sales Order — powers the SO detail Production panel. */
export async function listProductionOrdersForSalesOrder(
  salesOrderId: string,
): Promise<ProductionOrderCard[]> {
  const { data, error } = await getDb()
    .from("production_orders")
    .select("*, products(id,name,product_code)")
    .eq("sales_order_id", salesOrderId)
    .order("created_at", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as ProductionOrderCard[];
}

export type ManufacturingStatsRow = {
  planned: number;
  in_progress: number;
  on_hold: number;
  completed_today: number;
  overdue: number;
  qc_pending: number;
  total: number;
};

/** Aggregate stats for the Manufacturing dashboard header cards. */
export async function getManufacturingStats(): Promise<ManufacturingStatsRow> {
  const today = new Date().toISOString().slice(0, 10);
  const [all, completedToday, overdue] = await Promise.all([
    getDb().from("production_orders").select("status", { count: "exact", head: false }).limit(1000),
    getDb()
      .from("production_orders")
      .select("id", { count: "exact", head: true })
      .gte("completed_at", `${today}T00:00:00`)
      .lte("completed_at", `${today}T23:59:59`),
    getDb()
      .from("production_orders")
      .select("id", { count: "exact", head: true })
      .lt("planned_end", today)
      .in("status", ["planned", "in_progress", "on_hold"]),
  ]);
  if (all.error) throw new AppError(mapDbError(all.error));

  const rows = (all.data ?? []) as { status: string }[];
  const byStatus = new Map<string, number>();
  for (const r of rows) byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);

  // QC pending: production_stages where stage code is 'QC' and status pending/in_progress.
  // `production_orders!inner` is required here too — without it, stage rows
  // left behind by a deleted/archived production order are still counted,
  // which is how this card could show a nonzero value while "Total Orders"
  // (queried straight from production_orders) reads 0.
  const { count: qcPending } = await getDb()
    .from("production_stages")
    .select("id, manufacturing_stages!inner(code), production_orders!inner(id)", {
      count: "exact",
      head: true,
    })
    .in("status", ["pending", "in_progress"])
    .filter("manufacturing_stages.code", "ilike", "QC%");

  return {
    planned: byStatus.get("planned") ?? 0,
    in_progress: byStatus.get("in_progress") ?? 0,
    on_hold: byStatus.get("on_hold") ?? 0,
    completed_today: completedToday.count ?? 0,
    overdue: overdue.count ?? 0,
    qc_pending: qcPending ?? 0,
    total: rows.length,
  };
}

/* ------------------------------------------------------------------ */
/* Bulk reads (Phase G.4 — Operations Intelligence)                    */
/* ------------------------------------------------------------------ */

export type ProductionOrderListItem = ProductionOrderRow & {
  products: { id: string; name: string; product_code: string } | null;
  sales_orders: { id: string; so_no: string } | null;
};

/** All production orders (not scoped to one Sales Order) — mirrors
 *  `listProductionOrdersForSalesOrder` but across the whole board, for
 *  producers that need to reason about every open order at once. */
export async function listProductionOrders(): Promise<ProductionOrderListItem[]> {
  const { data, error } = await getDb()
    .from("production_orders")
    .select("*, products(id,name,product_code), sales_orders(id,so_no)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as ProductionOrderListItem[];
}

export type ProductionStageListItem = {
  id: string;
  production_order_id: string;
  stage_id: string;
  status: string;
  sort_order: number;
  planned_start: string | null;
  planned_date: string | null;
  started_at: string | null;
  actual_start: string | null;
  actual_completed_at: string | null;
  delay_reason: string | null;
  manufacturing_stages: { name: string; code: string; typical_days: number } | null;
  production_orders: {
    id: string;
    mfg_no: string;
    status: string;
    sales_order_id: string | null;
    project_id: string | null;
  } | null;
};

/** Every not-yet-finished production stage across all orders (excludes
 *  `completed`/`skipped`) — the bulk counterpart of the per-order stage
 *  fetch already inline in `routes/manufacturing/$id.tsx`. */
export async function listActiveProductionStages(): Promise<ProductionStageListItem[]> {
  const { data, error } = await getDb()
    .from("production_stages")
    .select(
      "id,production_order_id,stage_id,status,sort_order,planned_start,planned_date,started_at,actual_start,actual_completed_at,delay_reason,manufacturing_stages(name,code,typical_days),production_orders(id,mfg_no,status,sales_order_id,project_id)",
    )
    .in("status", ["pending", "in_progress", "on_hold"])
    .order("sort_order", { ascending: true })
    .limit(1000);
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as ProductionStageListItem[];
}
