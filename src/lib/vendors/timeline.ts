/**
 * Vendor Timeline.
 *
 * Chronological event stream for a vendor, unioned client-side from the four
 * event sources that are unambiguously vendor-scoped today:
 *   - activity_log (entity_type='vendor')
 *   - vendor_requests (RFQ sent / status)
 *   - vendor_quotes (via vendor_requests join)
 *   - purchase_orders
 *
 * Later slices can extend `TimelineEvent` by pushing rows from:
 *   - vendor_ledger_entries (payments, GRNs, DN/CN)
 *   - message_queue / message_delivery_events (once vendor_id is added)
 * without changing the render surface — event kinds are pluggable.
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export type TimelineKind =
  | "activity"
  | "rfq_sent"
  | "vendor_quote"
  | "purchase_order"
  | "ledger";

export interface TimelineEvent {
  id: string;
  at: string;                 // ISO timestamp
  kind: TimelineKind;
  title: string;
  detail: string | null;
  ref_no: string | null;
  status: string | null;
  route: string | null;       // deep link when the source doc has a UI page
  amount: number | null;
}

export async function getVendorTimeline(vendorId: string): Promise<TimelineEvent[]> {
  const [
    activityRes,
    requestsRes,
    quotesRes,
    posRes,
    ledgerRes,
  ] = await Promise.all([
    supabase
      .from("activity_log")
      .select("id,action,summary,field_name,created_at")
      .eq("entity_type", "vendor")
      .eq("entity_id", vendorId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("vendor_requests")
      .select("id,rfq_id,response_status,sent_at,created_at,rfq:rfqs!vendor_requests_rfq_id_fkey(rfq_no)")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("vendor_quotes")
      .select(
        "id,quote_no,total_inr,submitted_at,is_approved,remarks,vendor_request:vendor_requests!vendor_quotes_vendor_request_id_fkey(vendor_id,rfq:rfqs!vendor_requests_rfq_id_fkey(rfq_no))",
      )
      .order("submitted_at", { ascending: false })
      .limit(200),
    supabase
      .from("purchase_orders")
      .select("id,po_no,status,order_date,expected_date,created_at,notes")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("vendor_ledger_entries" as never)
      .select("id,entry_date,source_type,ref_no,description,debit,credit,route,status,created_at")
      .eq("vendor_id" as never, vendorId as never)
      .order("entry_date", { ascending: false })
      .limit(200),
  ]);

  if (activityRes.error) throw new AppError(mapDbError(activityRes.error));
  if (requestsRes.error) throw new AppError(mapDbError(requestsRes.error));
  if (quotesRes.error)   throw new AppError(mapDbError(quotesRes.error));
  if (posRes.error)      throw new AppError(mapDbError(posRes.error));
  if (ledgerRes.error)   throw new AppError(mapDbError(ledgerRes.error));

  const out: TimelineEvent[] = [];

  for (const a of activityRes.data ?? []) {
    out.push({
      id: `act:${a.id}`,
      at: a.created_at,
      kind: "activity",
      title: a.summary ?? `Vendor ${a.action}`,
      detail: a.field_name,
      ref_no: null,
      status: a.action,
      route: null,
      amount: null,
    });
  }

  for (const r of requestsRes.data ?? []) {
    const rfqNo = (r as { rfq?: { rfq_no?: string } | null }).rfq?.rfq_no ?? null;
    out.push({
      id: `vr:${r.id}`,
      at: r.sent_at ?? r.created_at,
      kind: "rfq_sent",
      title: rfqNo ? `RFQ sent · ${rfqNo}` : "RFQ sent",
      detail: r.response_status ? `Response: ${r.response_status}` : null,
      ref_no: rfqNo,
      status: r.response_status ?? null,
      route: "/rfqs",
      amount: null,
    });
  }

  for (const q of quotesRes.data ?? []) {
    const req = (q as { vendor_request?: { vendor_id?: string; rfq?: { rfq_no?: string } } })
      .vendor_request;
    if (req?.vendor_id !== vendorId) continue; // client-side filter (RLS-safe select)
    const rfqNo = req?.rfq?.rfq_no ?? null;
    out.push({
      id: `vq:${q.id}`,
      at: q.submitted_at,
      kind: "vendor_quote",
      title: q.quote_no
        ? `Quote submitted · ${q.quote_no}`
        : rfqNo ? `Quote for ${rfqNo}` : "Vendor quote submitted",
      detail: q.remarks ?? null,
      ref_no: q.quote_no ?? rfqNo,
      status: q.is_approved ? "approved" : "submitted",
      route: "/rfqs",
      amount: Number(q.total_inr ?? 0) || null,
    });
  }

  for (const p of posRes.data ?? []) {
    out.push({
      id: `po:${p.id}`,
      at: p.created_at ?? p.order_date,
      kind: "purchase_order",
      title: `Purchase Order · ${p.po_no}`,
      detail: p.expected_date ? `Expected ${p.expected_date}` : p.notes ?? null,
      ref_no: p.po_no,
      status: p.status,
      route: "/purchase-orders",
      amount: null,
    });
  }

  for (const e of (ledgerRes.data ?? []) as Array<{
    id: string;
    entry_date: string;
    source_type: string;
    ref_no: string | null;
    description: string | null;
    debit: number | string;
    credit: number | string;
    route: string | null;
    status: string | null;
    created_at: string;
  }>) {
    const d = Number(e.debit) || 0;
    const c = Number(e.credit) || 0;
    out.push({
      id: `vle:${e.id}`,
      at: e.created_at ?? e.entry_date,
      kind: "ledger",
      title: `${e.source_type.replace(/_/g, " ")} · ${e.ref_no ?? ""}`.trim(),
      detail: e.description,
      ref_no: e.ref_no,
      status: e.status,
      route: e.route,
      amount: d - c,
    });
  }

  out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return out;
}
