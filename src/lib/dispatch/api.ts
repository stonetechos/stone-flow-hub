import { getDb } from "@/integrations/supabase/server-context";
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
import { compareQuoteAndDispatchItems, type FlaggedChallanDiscrepancy } from "./variance";

export type DispatchRow = DbTable<"dispatches">;
export type DispatchItemRow = DbTable<"dispatch_items">;
export type DispatchListItem = DispatchRow & {
  sales_order: {
    id: string;
    so_no: string;
    delivery_date?: string | null;
    quote_id?: string | null;
  } | null;
  customer: {
    id: string;
    name: string;
    primary_phone?: string | null;
    whatsapp?: string | null;
  } | null;
  project: { id: string; name: string } | null;
};

const SELECT =
  "*, sales_order:sales_orders!dispatches_sales_order_id_fkey(id,so_no,delivery_date,quote_id), customer:customers!dispatches_customer_id_fkey(id,name,primary_phone,whatsapp), project:projects!dispatches_project_id_fkey(id,name)";

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
  let q = getDb()
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
  const { data, error } = await getDb()
    .from("dispatches")
    .select(SELECT)
    .eq("sales_order_id", soId)
    .order("dispatch_date", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as DispatchListItem[];
}

export async function listDispatchesByCustomer(customerId: string): Promise<DispatchListItem[]> {
  const { data, error } = await getDb()
    .from("dispatches")
    .select(SELECT)
    .eq("customer_id", customerId)
    .order("dispatch_date", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as DispatchListItem[];
}

export async function listDispatchesByProject(projectId: string): Promise<DispatchListItem[]> {
  const { data, error } = await getDb()
    .from("dispatches")
    .select(SELECT)
    .eq("project_id", projectId)
    .order("dispatch_date", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as DispatchListItem[];
}

export async function getDispatch(id: string): Promise<DispatchListItem | null> {
  const { data, error } = await getDb()
    .from("dispatches")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as DispatchListItem | null) ?? null;
}

export async function createDispatch(input: DispatchCreateInput): Promise<DispatchRow> {
  const p = dispatchCreateSchema.parse(input);
  const { data, error } = await getDb()
    .from("dispatches")
    .insert({ dispatch_no: "", ...toPayload(p) })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));

  if (data) {
    try {
      const { broadcastMaterialDispatched } = await import("@/lib/notifications/broadcast");
      broadcastMaterialDispatched({
        id: data.id,
        dispatch_no: data.dispatch_no,
        carrier: data.carrier,
      });
    } catch (e) {
      console.warn("[dispatch] broadcast failed", e);
    }
  }

  return data;
}

export async function updateDispatch(id: string, input: DispatchCreateInput): Promise<DispatchRow> {
  const p = dispatchCreateSchema.parse(input);
  const { data, error } = await getDb()
    .from("dispatches")
    .update(toPayload(p))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));

  if (data && (p.status === "in_transit" || p.status === "delivered")) {
    try {
      const { broadcastMaterialDispatched } = await import("@/lib/notifications/broadcast");
      broadcastMaterialDispatched({
        id: data.id,
        dispatch_no: data.dispatch_no,
        carrier: data.carrier,
      });
    } catch (e) {
      console.warn("[dispatch] broadcast failed", e);
    }
  }

  return data;
}

export async function deleteDispatch(id: string): Promise<void> {
  const { error } = await getDb().from("dispatches").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

/* ------------------------------------------------------------------ */
/* Dispatch (delivery challan) line items                              */
/* ------------------------------------------------------------------ */

export async function listDispatchItems(dispatchId: string): Promise<DispatchItemRow[]> {
  const { data, error } = await getDb()
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

  const { error: delErr } = await getDb()
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

  const { data, error } = await getDb().from("dispatch_items").insert(rows).select("*");
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
    getDb()
      .from("sales_order_items")
      .select("id,product_name,description,unit,quantity")
      .eq("sales_order_id", soId)
      .order("sort_order", { ascending: true }),
    getDb().from("dispatches").select("id,status").eq("sales_order_id", soId),
  ]);
  if (iErr) throw new AppError(mapDbError(iErr));
  if (dErr) throw new AppError(mapDbError(dErr));

  const activeDispatchIds = (dispatches ?? [])
    .filter((d) => d.status !== "cancelled")
    .map((d) => d.id);

  let delivered: Record<string, number> = {};
  if (activeDispatchIds.length > 0) {
    const { data: di, error: diErr } = await getDb()
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
  const { data: openOrders, error: soErr } = await getDb()
    .from("sales_orders")
    .select("id")
    .not("status", "in", "(delivered,cancelled)")
    .limit(500);
  if (soErr) throw new AppError(mapDbError(soErr));
  const openIds = (openOrders ?? []).map((o) => o.id);
  if (openIds.length === 0) return [];

  const [itemsRes, dispatchesRes] = await Promise.all([
    getDb()
      .from("sales_order_items")
      .select("id,product_id,quantity")
      .in("sales_order_id", openIds),
    getDb()
      .from("dispatches")
      .select("id")
      .in("sales_order_id", openIds)
      .neq("status", "cancelled"),
  ]);
  if (itemsRes.error) throw new AppError(mapDbError(itemsRes.error));
  if (dispatchesRes.error) throw new AppError(mapDbError(dispatchesRes.error));

  const activeDispatchIds = (dispatchesRes.data ?? []).map((d) => d.id);
  const deliveredByItem = new Map<string, number>();
  if (activeDispatchIds.length > 0) {
    const { data: di, error: diErr } = await getDb()
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
  for (const item of (itemsRes.data ?? []) as Array<{
    id: string;
    product_id: string | null;
    quantity: number;
  }>) {
    if (!item.product_id) continue;
    const delivered = deliveredByItem.get(item.id) ?? 0;
    const remaining = Math.max(0, Number(item.quantity) - delivered);
    if (remaining <= 0) continue;
    committedByProduct.set(
      item.product_id,
      (committedByProduct.get(item.product_id) ?? 0) + remaining,
    );
  }
  return [...committedByProduct.entries()].map(([product_id, committed_qty]) => ({
    product_id,
    committed_qty,
  }));
}

/* ------------------------------------------------------------------ */
/* Quotation & Invoice Delivery Challan Linkage & Variance Queries    */
/* ------------------------------------------------------------------ */

/**
 * Batch-lookup dispatches (delivery challans) linked to quotes via
 * document_lineage, sales_orders, or direct quote references in notes/remarks.
 */
export async function getDispatchesForQuotes(
  quoteIds: string[],
): Promise<Record<string, DispatchListItem[]>> {
  if (quoteIds.length === 0) return {};
  const map: Record<string, DispatchListItem[]> = {};
  for (const qid of quoteIds) map[qid] = [];

  try {
    const db = getDb();

    // 1. Lineage lookup: quote -> dispatch
    const { data: lineage } = await db
      .from("document_lineage")
      .select("source_id, target_id")
      .eq("source_type", "quote")
      .in("source_id", quoteIds)
      .eq("target_type", "dispatch");

    const lineageDispatchIds = (lineage ?? []).map((l) => l.target_id).filter(Boolean);

    // 2. Sales Order lookup: quotes -> sales_orders -> dispatches
    const { data: soRows } = await db
      .from("sales_orders")
      .select("id, quote_id")
      .in("quote_id", quoteIds);

    const soToQuote = new Map<string, string>();
    for (const so of soRows ?? []) {
      if (so.quote_id) soToQuote.set(so.id, so.quote_id);
    }
    const soIds = Array.from(soToQuote.keys());

    // 3. Fetch dispatches
    const promises: Array<PromiseLike<{ data: unknown; error: unknown }>> = [];

    if (lineageDispatchIds.length > 0) {
      promises.push(
        db
          .from("dispatches")
          .select(SELECT)
          .in("id", lineageDispatchIds)
          .neq("status", "cancelled"),
      );
    }
    if (soIds.length > 0) {
      promises.push(
        db.from("dispatches").select(SELECT).in("sales_order_id", soIds).neq("status", "cancelled"),
      );
    }

    // Also look up recent dispatches to match by quote ID or QUO tag in notes
    promises.push(
      db
        .from("dispatches")
        .select(SELECT)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(150),
    );

    const results = await Promise.all(promises);

    const addDispatch = (quoteId: string, disp: DispatchListItem) => {
      if (!map[quoteId]) map[quoteId] = [];
      if (!map[quoteId].some((d) => d.id === disp.id)) {
        map[quoteId].push(disp);
      }
    };

    const lineageMap = new Map<string, string>();
    for (const l of lineage ?? []) {
      lineageMap.set(l.target_id, l.source_id);
    }

    for (const res of results) {
      const rows = (res.data ?? []) as DispatchListItem[];
      for (const d of rows) {
        // Lineage match
        const fromLineage = lineageMap.get(d.id);
        if (fromLineage && map[fromLineage]) {
          addDispatch(fromLineage, d);
        }

        // Sales order match
        if (d.sales_order_id && soToQuote.has(d.sales_order_id)) {
          const qId = soToQuote.get(d.sales_order_id)!;
          addDispatch(qId, d);
        }

        // Notes / remarks match
        if (d.notes || d.remarks) {
          const text = `${d.notes || ""} ${d.remarks || ""}`;
          for (const qId of quoteIds) {
            if (text.includes(qId)) {
              addDispatch(qId, d);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("[dispatch] getDispatchesForQuotes error", err);
  }

  return map;
}

/**
 * Batch-lookup dispatches linked to sales invoices.
 */
export async function getDispatchesForInvoices(
  invoices: Array<{ id: string; quote_id?: string | null; lr_no?: string | null }>,
): Promise<Record<string, DispatchListItem[]>> {
  if (invoices.length === 0) return {};
  const map: Record<string, DispatchListItem[]> = {};
  for (const inv of invoices) map[inv.id] = [];

  try {
    const quoteIds = Array.from(
      new Set(invoices.map((i) => i.quote_id).filter((id): id is string => Boolean(id))),
    );

    const dispatchesByQuote = await getDispatchesForQuotes(quoteIds);

    for (const inv of invoices) {
      if (inv.quote_id && dispatchesByQuote[inv.quote_id]?.length) {
        map[inv.id] = dispatchesByQuote[inv.quote_id];
      }
    }
  } catch (err) {
    console.warn("[dispatch] getDispatchesForInvoices error", err);
  }

  return map;
}

/**
 * Scans all active Quotation <-> Delivery Challan pairings and computes
 * material product/quantity discrepancies. Gated to Super Admins on the dashboard.
 */
export async function listQuoteChallanDiscrepancies(): Promise<FlaggedChallanDiscrepancy[]> {
  const db = getDb();
  const { data: dispatches, error: dispErr } = await db
    .from("dispatches")
    .select(SELECT)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(150);

  if (dispErr) throw new AppError(mapDbError(dispErr));
  if (!dispatches || dispatches.length === 0) return [];

  const dispatchList = dispatches as unknown as DispatchListItem[];
  const dispatchIds = dispatchList.map((d) => d.id);

  // Lineage lookup
  const { data: lineageRows } = await db
    .from("document_lineage")
    .select("source_id, source_type, target_id, meta")
    .eq("target_type", "dispatch")
    .in("target_id", dispatchIds);

  const lineageQuoteByDispatch = new Map<string, string>();
  for (const l of lineageRows ?? []) {
    if (l.source_type === "quote" && l.source_id) {
      lineageQuoteByDispatch.set(l.target_id, l.source_id);
    }
  }

  // Find linked quote for each dispatch
  const pairs: Array<{ dispatch: DispatchListItem; quoteId: string }> = [];
  const neededQuoteIds = new Set<string>();

  for (const d of dispatchList) {
    let quoteId: string | null = null;
    if (lineageQuoteByDispatch.has(d.id)) {
      quoteId = lineageQuoteByDispatch.get(d.id)!;
    } else if (d.sales_order?.quote_id) {
      quoteId = d.sales_order.quote_id;
    } else if (d.notes || d.remarks) {
      const match = `${d.notes || ""} ${d.remarks || ""}`.match(
        /\[(?:QuoteId|QUO_ID):\s*([a-f0-9-]{36})\]/i,
      );
      if (match) {
        quoteId = match[1];
      }
    }

    if (quoteId) {
      pairs.push({ dispatch: d, quoteId });
      neededQuoteIds.add(quoteId);
    }
  }

  if (pairs.length === 0) return [];

  const quoteIdList = Array.from(neededQuoteIds);
  const [quotesRes, quoteItemsRes, dispatchItemsRes] = await Promise.all([
    db
      .from("quotes")
      .select("id, quote_no, workflow_state, customer:customers(id, name)")
      .in("id", quoteIdList),
    db
      .from("quote_items")
      .select("id, quote_id, product_id, description, quantity, unit")
      .in("quote_id", quoteIdList),
    db
      .from("dispatch_items")
      .select("id, dispatch_id, product_id, product_name, description, quantity, unit")
      .in(
        "dispatch_id",
        pairs.map((p) => p.dispatch.id),
      ),
  ]);

  interface QuoteInfoRow {
    id: string;
    quote_no: string;
    workflow_state?: unknown;
    customer?: { id: string; name: string } | null;
  }
  interface DiscrepancyQuoteItem {
    id: string;
    quote_id: string;
    product_id: string | null;
    description: string;
    quantity: number | string | null;
    unit: string | null;
  }
  interface DiscrepancyDispatchItem {
    id: string;
    dispatch_id: string;
    product_id: string | null;
    product_name: string | null;
    description: string | null;
    quantity: number | string | null;
    unit: string | null;
  }

  const quoteInfoById = new Map<string, QuoteInfoRow>();
  for (const q of (quotesRes.data ?? []) as unknown as QuoteInfoRow[]) {
    quoteInfoById.set(q.id, q);
  }

  const quoteItemsByQuoteId = new Map<string, DiscrepancyQuoteItem[]>();
  for (const qi of (quoteItemsRes.data ?? []) as unknown as DiscrepancyQuoteItem[]) {
    const arr = quoteItemsByQuoteId.get(qi.quote_id) ?? [];
    arr.push(qi);
    quoteItemsByQuoteId.set(qi.quote_id, arr);
  }

  const dispatchItemsByDispatchId = new Map<string, DiscrepancyDispatchItem[]>();
  for (const di of (dispatchItemsRes.data ?? []) as unknown as DiscrepancyDispatchItem[]) {
    const arr = dispatchItemsByDispatchId.get(di.dispatch_id) ?? [];
    arr.push(di);
    dispatchItemsByDispatchId.set(di.dispatch_id, arr);
  }

  const flagged: FlaggedChallanDiscrepancy[] = [];
  for (const { dispatch, quoteId } of pairs) {
    const qInfo = quoteInfoById.get(quoteId);
    const qItems = quoteItemsByQuoteId.get(quoteId) ?? [];
    const dItems = dispatchItemsByDispatchId.get(dispatch.id) ?? [];

    const report = compareQuoteAndDispatchItems(qItems, dItems);
    if (report.hasVariance) {
      const qWf = (qInfo?.workflow_state as Record<string, unknown> | null) ?? {};
      const isCash = qWf.sale_mode === "cash";
      flagged.push({
        quoteId,
        quoteNo: qInfo?.quote_no || "Quote",
        dispatchId: dispatch.id,
        dispatchNo: dispatch.dispatch_no,
        customerId: dispatch.customer_id,
        customerName: dispatch.customer?.name || qInfo?.customer?.name || "Customer",
        dispatchDate: dispatch.dispatch_date,
        dealType: isCash ? "cash" : "invoiced",
        report,
      });
    }
  }

  return flagged;
}
