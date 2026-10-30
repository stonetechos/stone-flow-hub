import { getDb } from "@/integrations/supabase/server-context";
import type { Database } from "@/integrations/supabase/types";
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
import {
  correlateDispatchesToQuotes,
  findBestQuoteForCustomer,
  type DispatchMatchCandidate,
  type QuoteMatchCandidate,
} from "./matching";

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

type DispatchInsert = Database["public"]["Tables"]["dispatches"]["Insert"];
type DispatchUpdate = Database["public"]["Tables"]["dispatches"]["Update"];

function toPayload(p: DispatchCreateInput): DispatchUpdate {
  return {
    sales_order_id: p.sales_order_id ?? null,
    customer_id: p.customer_id ?? null,
    project_id: p.project_id ?? null,
    quote_id: p.quote_id ?? null,
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
  const payload = toPayload(p);
  let res = await getDb()
    .from("dispatches")
    .insert({ ...payload, dispatch_no: "" })
    .select("*")
    .single();

  if (
    res.error &&
    String(res.error.message || "")
      .toLowerCase()
      .includes("quote_id")
  ) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.quote_id;
    res = await getDb()
      .from("dispatches")
      .insert({ ...fallbackPayload, dispatch_no: "" })
      .select("*")
      .single();
  }

  if (res.error) throw new AppError(mapDbError(res.error));
  const data = res.data;

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
  const payload = toPayload(p);
  let res = await getDb().from("dispatches").update(payload).eq("id", id).select("*").single();

  if (
    res.error &&
    String(res.error.message || "")
      .toLowerCase()
      .includes("quote_id")
  ) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.quote_id;
    res = await getDb()
      .from("dispatches")
      .update(fallbackPayload)
      .eq("id", id)
      .select("*")
      .single();
  }

  if (res.error) throw new AppError(mapDbError(res.error));
  const data = res.data;

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
 * multi-tier matching:
 *  1. Direct quote_id foreign key column
 *  2. document_lineage (quote <-> dispatch)
 *  3. Sales orders (quote_id -> so_id -> dispatch)
 *  4. Notes / remarks / tags containing quote ID or quote number
 *  5. Customer & project matching with date & amount proximity
 *
 * Automatically heals lineage in the background for matched records.
 */
export async function getDispatchesForQuotes(
  quoteIds: string[],
): Promise<Record<string, DispatchListItem[]>> {
  if (quoteIds.length === 0) return {};
  const map: Record<string, DispatchListItem[]> = {};
  for (const qid of quoteIds) map[qid] = [];

  try {
    const db = getDb();

    // 1. Fetch metadata for the requested quotes
    const { data: quotesData } = await db
      .from("quotes")
      .select("id, quote_no, customer_id, project_id, total, status, created_at")
      .in("id", quoteIds);

    const quotesList: QuoteMatchCandidate[] = (quotesData ?? []).map((q) => ({
      id: q.id,
      quote_no: q.quote_no,
      customer_id: q.customer_id,
      project_id: q.project_id,
      total: q.total,
      status: q.status,
      created_at: q.created_at,
    }));

    // For any quote IDs missing from DB query, populate minimal stubs
    for (const qid of quoteIds) {
      if (!quotesList.some((q) => q.id === qid)) {
        quotesList.push({ id: qid, quote_no: qid });
      }
    }

    const customerIds = Array.from(
      new Set(quotesList.map((q) => q.customer_id).filter((c): c is string => Boolean(c))),
    );

    // 2. Fetch document lineage specifically for requested quotes
    const lineageQuery = db
      .from("document_lineage")
      .select("source_id, source_type, target_id, target_type");

    if (quoteIds.length <= 10) {
      lineageQuery.or(
        `and(source_type.eq.quote,source_id.in.(${quoteIds.join(",")})),and(target_type.eq.quote,target_id.in.(${quoteIds.join(",")}))`,
      );
    } else {
      lineageQuery
        .or(
          `and(source_type.eq.quote,target_type.eq.dispatch),and(source_type.eq.dispatch,target_type.eq.quote)`,
        )
        .limit(300);
    }
    const { data: lineageRows } = await lineageQuery;

    const lineageLinks = (lineageRows ?? []).map((l) => ({
      source_id: l.source_id,
      source_type: l.source_type,
      target_id: l.target_id,
      target_type: l.target_type,
    }));

    // 3. Sales Order lookup: quotes -> sales_orders
    const { data: soRows } = await db
      .from("sales_orders")
      .select("id, quote_id")
      .in("quote_id", quoteIds);

    const soToQuote = new Map<string, string>();
    for (const so of soRows ?? []) {
      if (so.quote_id) soToQuote.set(so.id, so.quote_id);
    }
    const soIds = Array.from(soToQuote.keys());

    // 4. Fetch candidate dispatches with targeted indexing
    const promises: Array<PromiseLike<{ data: unknown; error: unknown }>> = [];

    // Direct link by quote_id
    promises.push(
      db.from("dispatches").select(SELECT).in("quote_id", quoteIds).neq("status", "cancelled"),
    );

    // By customer ID (crucial for Stallion Realities and customer challans)
    if (customerIds.length > 0) {
      promises.push(
        db
          .from("dispatches")
          .select(SELECT)
          .in("customer_id", customerIds)
          .neq("status", "cancelled")
          .order("created_at", { ascending: false })
          .limit(quoteIds.length <= 5 ? 20 : 100),
      );
    }

    // By Sales Orders
    if (soIds.length > 0) {
      promises.push(
        db.from("dispatches").select(SELECT).in("sales_order_id", soIds).neq("status", "cancelled"),
      );
    }

    // Only query recent dispatches pool if resolving multiple quotes in bulk
    if (quoteIds.length > 5) {
      promises.push(
        db
          .from("dispatches")
          .select(SELECT)
          .neq("status", "cancelled")
          .order("created_at", { ascending: false })
          .limit(100),
      );
    }

    const results = await Promise.all(promises);

    const dispatchMap = new Map<string, DispatchListItem>();
    for (const res of results) {
      const rows = (res.data ?? []) as DispatchListItem[];
      for (const d of rows) {
        if (!dispatchMap.has(d.id)) {
          dispatchMap.set(d.id, d);
        }
      }
    }

    const candidateDispatches = Array.from(dispatchMap.values());

    // 5. Run the correlation engine
    const correlated = correlateDispatchesToQuotes(quotesList, candidateDispatches, {
      lineage: lineageLinks,
      soToQuoteMap: soToQuote,
    });

    for (const [qid, disps] of Object.entries(correlated)) {
      map[qid] = disps;
    }

    // 6. Background auto-healing: persist linkage for matched customer dispatches
    for (const [qid, disps] of Object.entries(correlated)) {
      const qObj = quotesList.find((q) => q.id === qid);
      if (!qObj || disps.length === 0) continue;

      for (const d of disps) {
        const isLineageRecorded = lineageLinks.some(
          (l) =>
            (l.source_id === qid && l.target_id === d.id) ||
            (l.source_id === d.id && l.target_id === qid),
        );

        if (!isLineageRecorded) {
          void import("@/lib/lineage/api")
            .then(({ recordConversion }) =>
              recordConversion({
                sourceType: "quote",
                sourceId: qid,
                targetType: "dispatch",
                targetId: d.id,
                customerId: qObj.customer_id,
                projectId: qObj.project_id,
                meta: {
                  quote_no: qObj.quote_no,
                  dispatch_no: d.dispatch_no,
                  autoHealed: true,
                },
              }),
            )
            .catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn("[dispatch] getDispatchesForQuotes error", err);
  }

  return map;
}

/**
 * Manually links or reassigns a Delivery Challan to a Quotation.
 */
export async function linkQuoteToDispatch(params: {
  quoteId: string;
  dispatchId: string;
  customerId?: string | null;
  projectId?: string | null;
  quoteNo?: string | null;
  dispatchNo?: string | null;
}): Promise<void> {
  const db = getDb();
  const { recordConversion } = await import("@/lib/lineage/api");
  await recordConversion({
    sourceType: "quote",
    sourceId: params.quoteId,
    targetType: "dispatch",
    targetId: params.dispatchId,
    customerId: params.customerId ?? null,
    projectId: params.projectId ?? null,
    meta: {
      quote_no: params.quoteNo,
      dispatch_no: params.dispatchNo,
      manuallyLinked: true,
    },
  });

  try {
    const { data: disp } = await db
      .from("dispatches")
      .select("notes")
      .eq("id", params.dispatchId)
      .maybeSingle();

    const tag = `[Quote: ${params.quoteNo || "Quotation"} | QUO_ID:${params.quoteId}]`;
    const newNotes = disp?.notes?.includes(tag)
      ? disp.notes
      : disp?.notes
        ? `${disp.notes}\n${tag}`
        : tag;

    await db
      .from("dispatches")
      .update({ quote_id: params.quoteId, notes: newNotes })
      .eq("id", params.dispatchId);
  } catch (err) {
    console.warn("[dispatch] linkQuoteToDispatch db update warning", err);
  }
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
    .select("source_id, source_type, target_id, target_type, meta")
    .or("target_type.eq.dispatch,source_type.eq.dispatch")
    .limit(300);

  const lineageLinks = (lineageRows ?? []).map((l) => ({
    source_id: l.source_id,
    source_type: l.source_type,
    target_id: l.target_id,
    target_type: l.target_type,
  }));

  // Fetch recent active quotes for correlation
  const { data: quotesRows } = await db
    .from("quotes")
    .select(
      "id, quote_no, workflow_state, customer_id, project_id, total, status, created_at, customer:customers(id, name)",
    )
    .neq("status", "rejected")
    .order("created_at", { ascending: false })
    .limit(150);

  const quotesList = (quotesRows ?? []).map((q) => ({
    id: q.id,
    quote_no: q.quote_no,
    workflow_state: q.workflow_state,
    customer_id: q.customer_id,
    project_id: q.project_id,
    total: q.total,
    status: q.status,
    created_at: q.created_at,
    customer: q.customer,
  }));

  // Correlate dispatches to quotes
  const correlation = correlateDispatchesToQuotes(quotesList, dispatchList, {
    lineage: lineageLinks,
  });

  const pairs: Array<{ dispatch: DispatchListItem; quoteId: string }> = [];
  const neededQuoteIds = new Set<string>();

  for (const [quoteId, disps] of Object.entries(correlation)) {
    for (const d of disps) {
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
