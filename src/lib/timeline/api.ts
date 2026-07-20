/**
 * Business Timeline — query-time aggregation.
 *
 * Phase G.10. Every function here is read-only and writes nothing. Each
 * one unions several existing tables' own timestamp/status columns (plus
 * `activity_log`, already populated by DB triggers for customers,
 * enquiries, followups, projects, rfqs and vendors) into one normalized,
 * chronologically-sorted `TimelineEvent[]`. This is the same pattern
 * `lib/vendors/timeline.ts` already established for vendors — this module
 * generalizes it to customers and projects, and factors out the generic
 * single-entity fallback every document detail page's "Timeline" tab used
 * before this phase (components/entity/DetailPanels.tsx's TimelinePanel).
 *
 * Audited and deliberately NOT included: "Task completed" is included
 * (tasks.entity_type/entity_id is a real polymorphic link), but
 * "Executive Insight generated/resolved" is not. Insights are computed
 * live by the Insight Provider registry and never stored; insight_states
 * (lib/insights/state/api.ts) records a user's lifecycle action on an
 * insight but has no entity_type/entity_id column of its own, so a
 * resolved insight's original customer/project can't be reliably
 * recovered after the fact without risking a wrong attribution. Adding
 * that column is a real option for a future phase, not invented here.
 */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import type { TimelineEvent, TimelineEventKind, TimelineScope } from "./types";

const LIMIT = 100;

function pushEvent(out: TimelineEvent[], e: TimelineEvent) {
  out.push(e);
}

/** activity_log rows for one polymorphic entity — the backbone source,
 *  already populated automatically by DB triggers (log_customers_activity,
 *  log_enquiries_activity, log_followups_activity, log_projects_activity,
 *  log_rfqs_activity, log_vendors_activity) plus a handful of explicit
 *  application-logged actions (quote/invoice/payment milestones). */
async function fetchActivity(
  entityType: string,
  entityId: string,
  relatedCustomerId: string | null,
  relatedProjectId: string | null,
): Promise<TimelineEvent[]> {
  const { data, error } = await getDb()
    .from("activity_log")
    .select("id,action,summary,field_name,actor_id,project_id,created_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []).map((a) => ({
    id: `activity:${a.id}`,
    at: a.created_at,
    kind: "activity" as TimelineEventKind,
    title: a.summary ?? `${entityType} ${a.action}`.replace(/_/g, " "),
    detail: a.field_name,
    refNo: null,
    status: a.action,
    route: null,
    amount: null,
    userId: a.actor_id,
    relatedCustomerId,
    relatedProjectId: a.project_id ?? relatedProjectId,
    severity: null,
    aiContext: `${a.summary ?? a.action} on ${entityType} at ${a.created_at}`,
  }));
}

/** Completed/overdue tasks linked via the polymorphic tasks.entity_type/
 *  entity_id columns — "Task completed" from the phase's own example
 *  list. Only completed tasks are meaningful business history; open
 *  tasks belong on a worklist, not in a memory of what already happened. */
async function fetchTasks(
  entityType: "customer" | "project",
  entityId: string,
  relatedCustomerId: string | null,
  relatedProjectId: string | null,
): Promise<TimelineEvent[]> {
  const { data, error } = await getDb()
    .from("tasks")
    .select("id,title,status,priority,completed_at,assigned_to")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("status", "completed")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(LIMIT);
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []).map((t) => ({
    id: `task:${t.id}`,
    at: t.completed_at as string,
    kind: "task" as TimelineEventKind,
    title: `Task completed · ${t.title}`,
    detail: null,
    refNo: null,
    status: "completed",
    route: "/tasks",
    amount: null,
    userId: t.assigned_to,
    relatedCustomerId,
    relatedProjectId,
    severity: null,
    aiContext: `Task "${t.title}" completed at ${t.completed_at}`,
  }));
}

function enquiryEvent(e: {
  id: string;
  enquiry_no: string;
  stage: string;
  customer_id: string;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}): TimelineEvent {
  return {
    id: `enquiry:${e.id}`,
    at: e.updated_at ?? e.created_at,
    kind: "enquiry",
    title: `Enquiry ${e.enquiry_no} · ${e.stage.replace(/_/g, " ")}`,
    detail: null,
    refNo: e.enquiry_no,
    status: e.stage,
    route: `/enquiries/${e.id}`,
    amount: null,
    userId: null,
    relatedCustomerId: e.customer_id,
    relatedProjectId: e.project_id,
    severity: null,
    aiContext: `Enquiry ${e.enquiry_no} is at stage "${e.stage}" (last updated ${e.updated_at})`,
  };
}

function quoteEvent(q: {
  id: string;
  quote_no: string;
  status: string;
  customer_id: string;
  project_id: string | null;
  total: number;
  issue_date: string;
  updated_at: string;
}): TimelineEvent {
  return {
    id: `quote:${q.id}`,
    at: q.updated_at ?? q.issue_date,
    kind: "quote",
    title: `Quotation ${q.quote_no} · ${q.status.replace(/_/g, " ")}`,
    detail: null,
    refNo: q.quote_no,
    status: q.status,
    route: `/quotes/${q.id}`,
    amount: Number(q.total) || null,
    userId: null,
    relatedCustomerId: q.customer_id,
    relatedProjectId: q.project_id,
    severity: null,
    aiContext: `Quotation ${q.quote_no} (₹${q.total}) status "${q.status}" as of ${q.updated_at}`,
  };
}

function salesOrderEvent(s: {
  id: string;
  so_no: string;
  status: string;
  customer_id: string | null;
  project_id: string | null;
  total: number;
  order_date: string;
  updated_at: string;
}): TimelineEvent {
  return {
    id: `sales_order:${s.id}`,
    at: s.updated_at ?? s.order_date,
    kind: "sales_order",
    title: `Sales Order ${s.so_no} · ${s.status.replace(/_/g, " ")}`,
    detail: null,
    refNo: s.so_no,
    status: s.status,
    route: `/sales-orders/${s.id}`,
    amount: Number(s.total) || null,
    userId: null,
    relatedCustomerId: s.customer_id,
    relatedProjectId: s.project_id,
    severity: null,
    aiContext: `Sales Order ${s.so_no} (₹${s.total}) status "${s.status}" as of ${s.updated_at}`,
  };
}

function invoiceEvent(i: {
  id: string;
  invoice_no: string;
  status: string;
  customer_id: string;
  project_id: string | null;
  total: number;
  balance_due: number;
  issue_date: string;
  updated_at: string;
}): TimelineEvent {
  const isCancelled = i.status === "cancelled";
  return {
    id: `invoice:${i.id}`,
    at: i.updated_at ?? i.issue_date,
    kind: "invoice",
    title: isCancelled
      ? `Invoice ${i.invoice_no} cancelled`
      : `Invoice ${i.invoice_no} issued · ${i.status.replace(/_/g, " ")}`,
    detail: Number(i.balance_due) > 0 ? `₹${i.balance_due} outstanding` : null,
    refNo: i.invoice_no,
    status: i.status,
    route: `/invoices/${i.id}`,
    amount: Number(i.total) || null,
    userId: null,
    relatedCustomerId: i.customer_id,
    relatedProjectId: i.project_id,
    severity: isCancelled ? "warning" : null,
    aiContext: `Invoice ${i.invoice_no} (₹${i.total}) status "${i.status}", balance due ₹${i.balance_due}, as of ${i.updated_at}`,
  };
}

function receiptEvent(r: {
  id: string;
  receipt_no: string;
  amount: number;
  customer_id: string;
  received_at: string;
}): TimelineEvent {
  return {
    id: `receipt:${r.id}`,
    at: r.received_at,
    kind: "receipt",
    title: `Payment received · ${r.receipt_no}`,
    detail: null,
    refNo: r.receipt_no,
    status: "received",
    route: `/receipts/${r.id}`,
    amount: Number(r.amount) || null,
    userId: null,
    relatedCustomerId: r.customer_id,
    relatedProjectId: null,
    severity: null,
    aiContext: `Payment of ₹${r.amount} received via receipt ${r.receipt_no} on ${r.received_at}`,
  };
}

function dispatchEvent(d: {
  id: string;
  dispatch_no: string;
  status: string;
  customer_id: string | null;
  project_id: string | null;
  dispatch_date: string;
}): TimelineEvent {
  const completed = d.status === "delivered";
  return {
    id: `dispatch:${d.id}`,
    at: d.dispatch_date,
    kind: "dispatch",
    title: completed
      ? `Dispatch ${d.dispatch_no} delivered`
      : `Dispatch ${d.dispatch_no} · ${d.status.replace(/_/g, " ")}`,
    detail: null,
    refNo: d.dispatch_no,
    status: d.status,
    route: `/dispatch/${d.id}`,
    amount: null,
    userId: null,
    relatedCustomerId: d.customer_id,
    relatedProjectId: d.project_id,
    severity: null,
    aiContext: `Dispatch ${d.dispatch_no} status "${d.status}" on ${d.dispatch_date}`,
  };
}

function installationEvent(i: {
  id: string;
  installation_no: string | null;
  status: string;
  customer_id: string | null;
  project_id: string | null;
  planned_start_date: string | null;
  actual_end_date: string | null;
  updated_at: string;
}): TimelineEvent {
  const completed = i.status === "completed" || i.status === "signed_off";
  return {
    id: `installation:${i.id}`,
    at: (completed ? i.actual_end_date : i.planned_start_date) ?? i.updated_at,
    kind: "installation",
    title: completed
      ? `Installation completed${i.installation_no ? ` · ${i.installation_no}` : ""}`
      : `Installation ${i.status.replace(/_/g, " ")}${i.installation_no ? ` · ${i.installation_no}` : ""}`,
    detail: null,
    refNo: i.installation_no,
    status: i.status,
    route: `/installations/${i.id}`,
    amount: null,
    userId: null,
    relatedCustomerId: i.customer_id,
    relatedProjectId: i.project_id,
    severity: null,
    aiContext: `Installation ${i.installation_no ?? i.id} status "${i.status}" as of ${i.updated_at}`,
  };
}

function followupEvent(f: {
  id: string;
  project_id: string | null;
  status: string;
  scheduled_at: string;
  completed_at: string | null;
  notes: string | null;
}): TimelineEvent {
  const completed = f.status === "completed";
  return {
    id: `followup:${f.id}`,
    at: (completed ? f.completed_at : f.scheduled_at) ?? f.completed_at ?? f.scheduled_at,
    kind: "followup",
    title: completed ? "Follow-up completed" : `Follow-up ${f.status.replace(/_/g, " ")}`,
    detail: f.notes,
    refNo: null,
    status: f.status,
    route: "/followups",
    amount: null,
    userId: null,
    relatedCustomerId: null,
    relatedProjectId: f.project_id,
    severity: null,
    aiContext: `Follow-up status "${f.status}"${f.notes ? `: ${f.notes}` : ""}`,
  };
}

function sortDesc(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

/** Every interaction with one customer — enquiries, quotations, sales
 *  orders, invoices, payments, dispatches, installations, completed
 *  tasks, and the customer's own activity_log trail. Answers "what
 *  happened with this customer" (Task 4's own example query). */
export async function getCustomerTimeline(customerId: string): Promise<TimelineEvent[]> {
  const [
    activity,
    tasks,
    enquiries,
    quotes,
    salesOrders,
    invoices,
    receipts,
    dispatches,
    installations,
  ] = await Promise.all([
    fetchActivity("customer", customerId, customerId, null),
    fetchTasks("customer", customerId, customerId, null),
    getDb()
      .from("enquiries")
      .select("id,enquiry_no,stage,customer_id,project_id,created_at,updated_at")
      .eq("customer_id", customerId)
      .order("updated_at", { ascending: false })
      .limit(LIMIT),
    getDb()
      .from("quotes")
      .select("id,quote_no,status,customer_id,project_id,total,issue_date,updated_at")
      .eq("customer_id", customerId)
      .order("updated_at", { ascending: false })
      .limit(LIMIT),
    getDb()
      .from("sales_orders")
      .select("id,so_no,status,customer_id,project_id,total,order_date,updated_at")
      .eq("customer_id", customerId)
      .order("updated_at", { ascending: false })
      .limit(LIMIT),
    getDb()
      .from("invoices")
      .select("id,invoice_no,status,customer_id,project_id,total,balance_due,issue_date,updated_at")
      .eq("customer_id", customerId)
      .order("updated_at", { ascending: false })
      .limit(LIMIT),
    getDb()
      .from("receipts")
      .select("id,receipt_no,amount,customer_id,received_at")
      .eq("customer_id", customerId)
      .order("received_at", { ascending: false })
      .limit(LIMIT),
    getDb()
      .from("dispatches")
      .select("id,dispatch_no,status,customer_id,project_id,dispatch_date")
      .eq("customer_id", customerId)
      .order("dispatch_date", { ascending: false })
      .limit(LIMIT),
    getDb()
      .from("installations" as never)
      .select(
        "id,installation_no,status,customer_id,project_id,planned_start_date,actual_end_date,updated_at",
      )
      .eq("customer_id" as never, customerId as never)
      .order("updated_at", { ascending: false })
      .limit(LIMIT),
  ]);

  for (const r of [enquiries, quotes, salesOrders, invoices, receipts, dispatches]) {
    if (r.error) throw new AppError(mapDbError(r.error));
  }
  if (installations.error) throw new AppError(mapDbError(installations.error));

  const out: TimelineEvent[] = [...activity, ...tasks];
  for (const e of enquiries.data ?? []) pushEvent(out, enquiryEvent(e));
  for (const q of quotes.data ?? []) pushEvent(out, quoteEvent(q));
  for (const s of salesOrders.data ?? []) pushEvent(out, salesOrderEvent(s));
  for (const i of invoices.data ?? []) pushEvent(out, invoiceEvent(i));
  for (const r of receipts.data ?? []) pushEvent(out, receiptEvent(r));
  for (const d of dispatches.data ?? []) pushEvent(out, dispatchEvent(d));
  for (const i of (installations.data ?? []) as unknown as Parameters<
    typeof installationEvent
  >[0][]) {
    pushEvent(out, installationEvent(i));
  }
  return sortDesc(out);
}

/** Every interaction tied to one project — same source set as the
 *  customer timeline plus purchase orders and follow-ups (both are
 *  project-scoped, not customer-scoped, in this schema). Answers
 *  "summarize this project's history" (Task 4's own example query). */
export async function getProjectTimeline(projectId: string): Promise<TimelineEvent[]> {
  const [
    activity,
    tasks,
    enquiries,
    quotes,
    salesOrders,
    purchaseOrders,
    invoices,
    dispatches,
    installations,
    followups,
  ] = await Promise.all([
    fetchActivity("project", projectId, null, projectId),
    fetchTasks("project", projectId, null, projectId),
    getDb()
      .from("enquiries")
      .select("id,enquiry_no,stage,customer_id,project_id,created_at,updated_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(LIMIT),
    getDb()
      .from("quotes")
      .select("id,quote_no,status,customer_id,project_id,total,issue_date,updated_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(LIMIT),
    getDb()
      .from("sales_orders")
      .select("id,so_no,status,customer_id,project_id,total,order_date,updated_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(LIMIT),
    getDb()
      .from("purchase_orders")
      .select("id,po_no,status,project_id,order_date,updated_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(LIMIT),
    getDb()
      .from("invoices")
      .select("id,invoice_no,status,customer_id,project_id,total,balance_due,issue_date,updated_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(LIMIT),
    getDb()
      .from("dispatches")
      .select("id,dispatch_no,status,customer_id,project_id,dispatch_date")
      .eq("project_id", projectId)
      .order("dispatch_date", { ascending: false })
      .limit(LIMIT),
    getDb()
      .from("installations" as never)
      .select(
        "id,installation_no,status,customer_id,project_id,planned_start_date,actual_end_date,updated_at",
      )
      .eq("project_id" as never, projectId as never)
      .order("updated_at", { ascending: false })
      .limit(LIMIT),
    getDb()
      .from("followups")
      .select("id,project_id,status,scheduled_at,completed_at,notes")
      .eq("project_id", projectId)
      .order("scheduled_at", { ascending: false })
      .limit(LIMIT),
  ]);

  for (const r of [
    enquiries,
    quotes,
    salesOrders,
    purchaseOrders,
    invoices,
    dispatches,
    followups,
  ]) {
    if (r.error) throw new AppError(mapDbError(r.error));
  }
  if (installations.error) throw new AppError(mapDbError(installations.error));

  const out: TimelineEvent[] = [...activity, ...tasks];
  for (const e of enquiries.data ?? []) pushEvent(out, enquiryEvent(e));
  for (const q of quotes.data ?? []) pushEvent(out, quoteEvent(q));
  for (const s of salesOrders.data ?? []) pushEvent(out, salesOrderEvent(s));
  for (const p of purchaseOrders.data ?? []) {
    pushEvent(out, {
      id: `purchase_order:${p.id}`,
      at: p.updated_at ?? p.order_date,
      kind: "purchase_order",
      title: `Purchase Order ${p.po_no} · ${p.status.replace(/_/g, " ")}`,
      detail: null,
      refNo: p.po_no,
      status: p.status,
      route: `/purchase-orders/${p.id}`,
      amount: null,
      userId: null,
      relatedCustomerId: null,
      relatedProjectId: projectId,
      severity: null,
      aiContext: `Purchase Order ${p.po_no} status "${p.status}" as of ${p.updated_at}`,
    });
  }
  for (const i of invoices.data ?? []) pushEvent(out, invoiceEvent(i));
  for (const d of dispatches.data ?? []) pushEvent(out, dispatchEvent(d));
  for (const i of (installations.data ?? []) as unknown as Parameters<
    typeof installationEvent
  >[0][]) {
    pushEvent(out, installationEvent(i));
  }
  for (const f of followups.data ?? []) pushEvent(out, followupEvent(f));
  return sortDesc(out);
}

/** Generic single-entity fallback — activity_log only, scoped to exactly
 *  one entity_type/entity_id. This is the same query every document
 *  detail page's "Timeline" tab already ran inline
 *  (components/entity/DetailPanels.tsx's TimelinePanel); factored out
 *  here so there is exactly one implementation, per "no duplicate
 *  timeline implementations." */
export async function getEntityTimeline(
  entityType: string,
  entityId: string,
): Promise<TimelineEvent[]> {
  return sortDesc(await fetchActivity(entityType, entityId, null, null));
}

/** Single dispatch entry point — resolves a TimelineScope to the right
 *  fetcher. Vendor scope reuses the existing lib/vendors/timeline.ts
 *  aggregator unchanged rather than re-implementing vendor-specific joins
 *  here (reuse first, one source of truth). */
export async function getBusinessTimeline(scope: TimelineScope): Promise<TimelineEvent[]> {
  if ("customerId" in scope) return getCustomerTimeline(scope.customerId);
  if ("projectId" in scope) return getProjectTimeline(scope.projectId);
  if ("vendorId" in scope) {
    const { getVendorTimeline } = await import("@/lib/vendors/timeline");
    return getVendorTimeline(scope.vendorId);
  }
  return getEntityTimeline(scope.entityType, scope.entityId);
}
