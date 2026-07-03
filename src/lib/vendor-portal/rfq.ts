/** Vendor-scoped RFQ inbox + detail reads. RLS enforces vendor isolation. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";

export type VendorRequestRow = DbTable<"vendor_requests">;
export type RfqRow = DbTable<"rfqs">;
export type RfqItemRow = DbTable<"rfq_items">;

export interface InboxItem {
  request: VendorRequestRow;
  rfq: RfqRow;
  projectName: string | null;
  itemCount: number;
  unread: boolean;
  overdue: boolean;
  hasDraft: boolean;
  submitted: boolean;
}

export type InboxFilter = "all" | "new" | "draft" | "submitted" | "overdue";

export async function listVendorInbox(): Promise<InboxItem[]> {
  const { data, error } = await supabase
    .from("vendor_requests")
    .select(
      `id, rfq_id, vendor_id, response_status, sent_at, first_viewed_at,
       reminder_count, revision_requested_at, notes,
       rfqs:rfq_id ( id, rfq_no, status, due_date, notes, project_id, created_at ),
       vendor_quotes ( id, submitted_at, is_approved, rejected_at )
      `,
    )
    .order("sent_at", { ascending: false, nullsFirst: false })
    .limit(200);
  if (error) throw new AppError(mapDbError(error));
  const rows = (data ?? []) as Array<
    VendorRequestRow & {
      rfqs: RfqRow | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vendor_quotes: any[];
    }
  >;

  const projectIds = Array.from(new Set(rows.map((r) => r.rfqs?.project_id).filter(Boolean))) as string[];
  const projects = new Map<string, string>();
  if (projectIds.length) {
    const { data: pj } = await supabase.from("projects").select("id, name").in("id", projectIds);
    (pj ?? []).forEach((p) => projects.set(p.id, p.name));
  }

  const rfqIds = Array.from(new Set(rows.map((r) => r.rfq_id)));
  const itemCounts = new Map<string, number>();
  if (rfqIds.length) {
    const { data: items } = await supabase.from("rfq_items").select("rfq_id").in("rfq_id", rfqIds);
    (items ?? []).forEach((i) => itemCounts.set(i.rfq_id, (itemCounts.get(i.rfq_id) ?? 0) + 1));
  }

  const today = new Date().toISOString().slice(0, 10);
  return rows
    .filter((r) => r.rfqs)
    .map<InboxItem>((r) => {
      const submitted = r.vendor_quotes.some((q) => !!q.submitted_at);
      const draft = r.vendor_quotes.some((q) => !q.submitted_at);
      return {
        request: r,
        rfq: r.rfqs as RfqRow,
        projectName: projects.get((r.rfqs as RfqRow).project_id) ?? null,
        itemCount: itemCounts.get(r.rfq_id) ?? 0,
        unread: !r.first_viewed_at,
        overdue: !submitted && !!r.rfqs?.due_date && r.rfqs.due_date < today,
        hasDraft: draft && !submitted,
        submitted,
      };
    });
}

export function applyFilter(items: InboxItem[], filter: InboxFilter, q: string): InboxItem[] {
  const term = q.trim().toLowerCase();
  return items.filter((it) => {
    if (filter === "new" && !it.unread) return false;
    if (filter === "draft" && !it.hasDraft) return false;
    if (filter === "submitted" && !it.submitted) return false;
    if (filter === "overdue" && !it.overdue) return false;
    if (term) {
      const hay = `${it.rfq.rfq_no} ${it.projectName ?? ""}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
}

export interface VendorRfqDetail {
  request: VendorRequestRow;
  rfq: RfqRow;
  items: RfqItemRow[];
  projectName: string | null;
}

export async function getVendorRfqDetail(vendorRequestId: string): Promise<VendorRfqDetail | null> {
  const { data: req, error } = await supabase
    .from("vendor_requests")
    .select("*")
    .eq("id", vendorRequestId)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  if (!req) return null;
  const [{ data: rfq }, { data: items }] = await Promise.all([
    supabase.from("rfqs").select("*").eq("id", req.rfq_id).maybeSingle(),
    supabase.from("rfq_items").select("*").eq("rfq_id", req.rfq_id).order("sort_order"),
  ]);
  if (!rfq) return null;
  let projectName: string | null = null;
  if (rfq.project_id) {
    const { data: pj } = await supabase
      .from("projects")
      .select("name")
      .eq("id", rfq.project_id)
      .maybeSingle();
    projectName = pj?.name ?? null;
  }
  return { request: req, rfq, items: items ?? [], projectName };
}

/** Marks an RFQ viewed for the current user; sets first_viewed_at once. */
export async function markRfqViewed(vendorRequestId: string): Promise<void> {
  const { data: sess } = await supabase.auth.getUser();
  const uid = sess.user?.id;
  if (!uid) return;
  await supabase
    .from("vendor_rfq_views")
    .upsert(
      { vendor_request_id: vendorRequestId, user_id: uid },
      { onConflict: "vendor_request_id,user_id", ignoreDuplicates: true },
    );
  const { data: req } = await supabase
    .from("vendor_requests")
    .select("first_viewed_at")
    .eq("id", vendorRequestId)
    .maybeSingle();
  if (req && !req.first_viewed_at) {
    await supabase
      .from("vendor_requests")
      .update({ first_viewed_at: new Date().toISOString() })
      .eq("id", vendorRequestId);
  }
}
