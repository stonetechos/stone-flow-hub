/** Vendor quote comparison for procurement. Staff-only via RLS (has_staff_access). */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";

export type VendorQuoteRow = DbTable<"vendor_quotes">;
export type VendorRequestRow = DbTable<"vendor_requests">;
export type VendorRow = DbTable<"vendors">;
export type PerfRow = DbTable<"vendor_performance_cache">;
export type FileRow = DbTable<"file_objects">;

export interface QuoteComparisonRow {
  request: VendorRequestRow;
  quote: VendorQuoteRow | null;
  vendor: VendorRow;
  perf: PerfRow | null;
  pdf: FileRow | null;
  totalCost: number;
  responseHours: number | null;
  highlights: {
    lowestPrice: boolean;
    fastestDispatch: boolean;
    preferred: boolean;
    topRated: boolean;
    recommended: boolean;
  };
}

export interface RfqCompareBundle {
  rfqId: string;
  rfqNo: string;
  dueDate: string | null;
  status: string;
  projectId: string | null;
  projectName: string | null;
  enquiryId: string | null;
  rows: QuoteComparisonRow[];
}

export async function getRfqComparison(rfqId: string): Promise<RfqCompareBundle> {
  const { data: rfq, error: rfqErr } = await supabase
    .from("rfqs")
    .select("id, rfq_no, due_date, status, project_id, projects:project_id(id,name)")
    .eq("id", rfqId)
    .maybeSingle();
  if (rfqErr) throw new AppError(mapDbError(rfqErr));
  if (!rfq) throw new AppError("RFQ not found");

  const { data: requests, error: reqErr } = await supabase
    .from("vendor_requests")
    .select("*")
    .eq("rfq_id", rfqId);
  if (reqErr) throw new AppError(mapDbError(reqErr));

  const reqRows = (requests ?? []) as VendorRequestRow[];
  const vendorIds = Array.from(new Set(reqRows.map((r) => r.vendor_id)));
  const reqIds = reqRows.map((r) => r.id);

  const [vendorsRes, quotesRes, perfRes] = await Promise.all([
    vendorIds.length
      ? supabase.from("vendors").select("*").in("id", vendorIds)
      : Promise.resolve({ data: [], error: null }),
    reqIds.length
      ? supabase
          .from("vendor_quotes")
          .select("*")
          .in("vendor_request_id", reqIds)
          .is("revision_of", null)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    vendorIds.length
      ? supabase.from("vendor_performance_cache").select("*").in("vendor_id", vendorIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const r of [vendorsRes, quotesRes, perfRes]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((r as any).error) throw new AppError(mapDbError((r as any).error));
  }

  const vendors = new Map<string, VendorRow>();
  (vendorsRes.data ?? []).forEach((v) => vendors.set((v as VendorRow).id, v as VendorRow));
  const perf = new Map<string, PerfRow>();
  (perfRes.data ?? []).forEach((p) => perf.set((p as PerfRow).vendor_id, p as PerfRow));
  // Newest quote per request wins.
  const quoteByReq = new Map<string, VendorQuoteRow>();
  ((quotesRes.data ?? []) as VendorQuoteRow[]).forEach((q) => {
    if (!quoteByReq.has(q.vendor_request_id)) quoteByReq.set(q.vendor_request_id, q);
  });

  // Fetch PDFs referenced by quotes in one round-trip.
  const fileIds = Array.from(quoteByReq.values())
    .map((q) => q.quote_pdf_file_id)
    .filter((x): x is string => !!x);
  const pdfs = new Map<string, FileRow>();
  if (fileIds.length) {
    const { data: files } = await supabase.from("file_objects").select("*").in("id", fileIds);
    (files ?? []).forEach((f) => pdfs.set(f.id, f as FileRow));
  }

  // Assemble rows.
  const rows: QuoteComparisonRow[] = reqRows.map((r) => {
    const q = quoteByReq.get(r.id) ?? null;
    const v = vendors.get(r.vendor_id)!;
    const p = perf.get(r.vendor_id) ?? null;
    const totalCost = q ? Number(q.total_inr ?? 0) + Number(q.freight_inr ?? 0) : 0;
    const responseHours =
      q?.submitted_at && r.sent_at
        ? (new Date(q.submitted_at).getTime() - new Date(r.sent_at).getTime()) / 3_600_000
        : null;
    return {
      request: r,
      quote: q,
      vendor: v,
      perf: p,
      pdf: q?.quote_pdf_file_id ? pdfs.get(q.quote_pdf_file_id) ?? null : null,
      totalCost,
      responseHours,
      highlights: {
        lowestPrice: false,
        fastestDispatch: false,
        preferred: !!p?.is_preferred,
        topRated: false,
        recommended: false,
      },
    };
  });

  // Compute highlights against submitted rows only.
  const submitted = rows.filter((r) => !!r.quote?.submitted_at);
  if (submitted.length) {
    const minCost = Math.min(...submitted.map((r) => r.totalCost || Infinity));
    const minDispatch = Math.min(
      ...submitted.map((r) => r.quote?.dispatch_days ?? Infinity),
    );
    const maxRating = Math.max(...submitted.map((r) => Number(r.vendor.rating ?? 0)));
    for (const r of submitted) {
      r.highlights.lowestPrice = r.totalCost === minCost && r.totalCost > 0;
      r.highlights.fastestDispatch =
        (r.quote?.dispatch_days ?? Infinity) === minDispatch && minDispatch !== Infinity;
      r.highlights.topRated = Number(r.vendor.rating ?? 0) === maxRating && maxRating > 0;
      // Simple recommendation: lowest price AND submitted AND stock available (fallback: lowest price).
      r.highlights.recommended =
        r.highlights.lowestPrice && (r.quote?.stock_available ?? false);
    }
    // If no row satisfied the strict recommendation, fall back to cheapest.
    if (!submitted.some((r) => r.highlights.recommended)) {
      const cheapest = submitted.find((r) => r.highlights.lowestPrice);
      if (cheapest) cheapest.highlights.recommended = true;
    }
  }

  // Sort: recommended first, then by total cost asc, submitted before pending.
  rows.sort((a, b) => {
    if (a.highlights.recommended !== b.highlights.recommended)
      return a.highlights.recommended ? -1 : 1;
    const aSub = !!a.quote?.submitted_at;
    const bSub = !!b.quote?.submitted_at;
    if (aSub !== bSub) return aSub ? -1 : 1;
    return (a.totalCost || Infinity) - (b.totalCost || Infinity);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proj = (rfq as any).projects as { id: string; name: string } | null;
  return {
    rfqId: rfq.id,
    rfqNo: rfq.rfq_no,
    dueDate: rfq.due_date,
    status: rfq.status,
    projectId: rfq.project_id,
    projectName: proj?.name ?? null,
    rows,
  };
}

export async function approveVendorQuote(quoteId: string): Promise<void> {
  const { data: sess } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("vendor_quotes")
    .update({
      is_approved: true,
      approved_by: sess.user?.id ?? null,
      approved_at: new Date().toISOString(),
      rejected_at: null,
      rejected_by: null,
    })
    .eq("id", quoteId);
  if (error) throw new AppError(mapDbError(error));
  await supabase.rpc("log_notification_event", {
    _event: "QUOTE_APPROVED",
    _entity_type: "vendor_quote",
    _entity_id: quoteId,
    _payload: {},
  });
}

export async function rejectVendorQuote(quoteId: string, reason?: string): Promise<void> {
  const { data: sess } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("vendor_quotes")
    .update({
      is_approved: false,
      rejected_at: new Date().toISOString(),
      rejected_by: sess.user?.id ?? null,
    })
    .eq("id", quoteId);
  if (error) throw new AppError(mapDbError(error));
  await supabase.rpc("log_notification_event", {
    _event: "QUOTE_REJECTED",
    _entity_type: "vendor_quote",
    _entity_id: quoteId,
    _payload: { reason: reason ?? null },
  });
}

export async function requestQuoteRevision(
  vendorRequestId: string,
  note: string,
): Promise<void> {
  const clean = note.trim();
  if (!clean) throw new AppError("Please describe what needs to change.");
  const { error } = await supabase
    .from("vendor_requests")
    .update({
      revision_requested_at: new Date().toISOString(),
      revision_note: clean,
      response_status: "pending",
    })
    .eq("id", vendorRequestId);
  if (error) throw new AppError(mapDbError(error));
  await supabase.rpc("log_notification_event", {
    _event: "REVISION_REQUESTED",
    _entity_type: "vendor_request",
    _entity_id: vendorRequestId,
    _payload: { note: clean },
  });
}
