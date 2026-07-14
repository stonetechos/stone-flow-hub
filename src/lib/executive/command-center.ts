/**
 * Executive Command Center — aggregator for owner morning brief.
 * Reuses existing queries (executive KPIs, dashboard KPIs, customer/vendor intel)
 * and adds a handful of additive slices (quote outcomes, inactivity buckets,
 * advances, bank vs cash, material shortage, biggest delayed project,
 * payment requiring attention). No business logic — read-only aggregation.
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

const startOfDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const startOfMonth = () => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; };

export interface QuoteOutcomes {
  pipelineInr: number;
  pendingCount: number;
  acceptedMtd: number;
  acceptedInrMtd: number;
  lostMtd: number;
  newEnquiriesMtd: number;
}

export interface CustomerActivityBuckets {
  inactive30: number;
  inactive60: number;
  inactive90: number;
  followupsToday: number;
  overdueFollowups: number;
}

export interface FinanceBreakdown {
  todaysCollectionsInr: number;
  bankInr: number;
  cashInr: number;
  advancesReceivedInr: number;
  advancesCount: number;
  mtdCollectionsInr: number;
  overduePaymentsCount: number;
  overduePaymentsInr: number;
}

export interface OperationsExtras {
  dispatchDueToday: number;
  challansAwaitingInvoice: number;
  productionPending: number;
  installationPending: number;
}

export interface OwnerInsight {
  kind: "risk" | "opportunity" | "action" | "warning";
  title: string;
  detail: string;
  to?: string;
}

export interface CommandCenterData {
  quotes: QuoteOutcomes;
  customerActivity: CustomerActivityBuckets;
  finance: FinanceBreakdown;
  ops: OperationsExtras;
  insights: OwnerInsight[];
}

const BANK_METHODS = new Set(["bank_transfer", "neft", "rtgs", "imps", "cheque", "card", "razorpay", "gateway", "upi_manual", "upi_bob_current", "upi_personal"]);
const sum = <T,>(rows: T[] | null, get: (r: T) => number | null | undefined) =>
  (rows ?? []).reduce((a, r) => a + Number(get(r) ?? 0), 0);

export async function getCommandCenter(): Promise<CommandCenterData> {
  const today = startOfDay();
  const todayIso = today.toISOString();
  const dayIso = today.toISOString().slice(0, 10);
  const monthStart = startOfMonth();
  const monthIso = monthStart.toISOString();
  const inactive30Iso = new Date(today.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
  const inactive60Iso = new Date(today.getTime() - 60 * 86_400_000).toISOString().slice(0, 10);
  const inactive90Iso = new Date(today.getTime() - 90 * 86_400_000).toISOString().slice(0, 10);
  const nextEod = new Date(today.getTime() + 86_399_000).toISOString();

  const [
    quotesPipeline,
    quotesAcceptedMtd,
    quotesLostMtd,
    newEnq,
    followTodayR,
    followOverdueR,
    lastInvoice30,
    lastInvoice60,
    lastInvoice90,
    activeCustomers,
    receiptsToday,
    receiptsMtd,
    advancesR,
    overdueDash,
    dispatchesToday,
    challansAwaiting,
    prodPending,
    installPending,
    delayedProj,
    urgentPayment,
    shortStock,
  ] = await Promise.all([
    supabase.from("quotes").select("total,status").in("status", ["draft", "sent"]),
    supabase.from("quotes").select("total").eq("status", "accepted").gte("updated_at", monthIso),
    supabase.from("quotes").select("id", { count: "exact", head: true }).in("status", ["rejected", "expired"]).gte("updated_at", monthIso),
    supabase.from("enquiries").select("id", { count: "exact", head: true }).gte("created_at", monthIso),
    supabase.from("followups").select("id", { count: "exact", head: true }).eq("status", "pending").gte("scheduled_at", todayIso).lte("scheduled_at", nextEod),
    supabase.from("followups").select("id", { count: "exact", head: true }).eq("status", "pending").lt("scheduled_at", todayIso),
    supabase.from("invoices").select("customer_id,issue_date"),
    supabase.from("invoices").select("customer_id,issue_date"),
    supabase.from("invoices").select("customer_id,issue_date"),
    supabase.from("customers").select("id,is_active").eq("is_active", true),
    supabase.from("receipts").select("amount,method").gte("received_at", todayIso),
    supabase.from("receipts").select("amount").gte("received_at", monthIso),
    supabase.from("receipts").select("unallocated_amount").gt("unallocated_amount", 0),
    supabase.from("customer_payment_dashboard" as never).select("balance_due,due_date").gt("balance_due", 0).lt("due_date", dayIso),
    supabase.from("dispatches").select("id", { count: "exact", head: true }).eq("dispatch_date", dayIso),
    supabase.from("dispatches").select("id", { count: "exact", head: true }).eq("status", "delivered"),
    supabase.from("production_orders").select("id", { count: "exact", head: true }).in("status", ["planned", "in_progress"]),
    supabase.from("installations").select("id", { count: "exact", head: true }).not("status", "in", '("completed","cancelled")'),
    supabase.from("projects").select("id,name,expected_completion_date,stage,lifecycle_status").not("expected_completion_date", "is", null).lt("expected_completion_date", dayIso).not("stage", "in", '("completed","lost","cancelled")').order("expected_completion_date", { ascending: true }).limit(1),
    supabase.from("customer_payment_dashboard" as never).select("id,customer_id,customer_name,balance_due,due_date,estimate_no").gt("balance_due", 0).lt("due_date", dayIso).order("balance_due", { ascending: false }).limit(1),
    supabase.from("inventory_items").select("id,stock_code,quantity_on_hand,reorder_level"),
  ]);
  for (const r of [quotesPipeline, quotesAcceptedMtd, quotesLostMtd, newEnq, followTodayR, followOverdueR, lastInvoice30, lastInvoice60, lastInvoice90, activeCustomers, receiptsToday, receiptsMtd, advancesR, overdueDash, dispatchesToday, challansAwaiting, prodPending, installPending, delayedProj, urgentPayment, shortStock]) {
    if (r.error) throw new AppError(mapDbError(r.error));
  }

  // Inactivity buckets: last invoice per customer, then bucketed
  const lastByCust = new Map<string, string>();
  for (const row of (lastInvoice30.data ?? []) as Array<{ customer_id: string; issue_date: string }>) {
    const cur = lastByCust.get(row.customer_id);
    if (!cur || row.issue_date > cur) lastByCust.set(row.customer_id, row.issue_date);
  }
  const activeIds = ((activeCustomers.data ?? []) as Array<{ id: string }>).map((c) => c.id);
  let i30 = 0, i60 = 0, i90 = 0;
  for (const id of activeIds) {
    const last = lastByCust.get(id);
    if (!last) { i90++; continue; }
    if (last < inactive90Iso) i90++;
    else if (last < inactive60Iso) i60++;
    else if (last < inactive30Iso) i30++;
  }

  const rtRows = (receiptsToday.data ?? []) as Array<{ amount: number; method: string }>;
  const bankInr = rtRows.filter((r) => BANK_METHODS.has(r.method)).reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const cashInr = rtRows.filter((r) => r.method === "cash").reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const advancesRows = (advancesR.data ?? []) as Array<{ unallocated_amount: number | null }>;

  const insights: OwnerInsight[] = [];
  const proj = ((delayedProj.data ?? []) as Array<{ id: string; name: string; expected_completion_date: string }>)[0];
  if (proj) {
    const days = Math.floor((today.getTime() - new Date(proj.expected_completion_date).getTime()) / 86_400_000);
    insights.push({ kind: "warning", title: "Biggest delayed project", detail: `${proj.name} — ${days}d overdue`, to: `/projects/${proj.id}` });
  }
  const urgPay = ((urgentPayment.data ?? []) as Array<{ id: string; customer_id: string; customer_name: string; balance_due: number; due_date: string; estimate_no: string | null }>)[0];
  if (urgPay) {
    insights.push({ kind: "risk", title: "Payment needing immediate attention", detail: `${urgPay.customer_name} — ₹${Math.round(Number(urgPay.balance_due ?? 0)).toLocaleString("en-IN")} on ${urgPay.estimate_no ?? "invoice"}`, to: `/customers/${urgPay.customer_id}` });
  }
  const short = ((shortStock.data ?? []) as Array<{ id: string; stock_code: string; quantity_on_hand: number | null; reorder_level: number | null }>)
    .filter((r) => Number(r.quantity_on_hand ?? 0) < Number(r.reorder_level ?? 0))
    .sort((a, b) => Number(a.quantity_on_hand ?? 0) - Number(b.quantity_on_hand ?? 0));
  if (short.length > 0) {
    insights.push({ kind: "warning", title: "Material shortage", detail: `${short.length} item${short.length === 1 ? "" : "s"} below reorder — top: ${short[0].stock_code}`, to: `/inventory` });
  }

  return {
    quotes: {
      pipelineInr: sum(quotesPipeline.data as Array<{ total: number }>, (r) => r.total),
      pendingCount: (quotesPipeline.data ?? []).length,
      acceptedMtd: (quotesAcceptedMtd.data ?? []).length,
      acceptedInrMtd: sum(quotesAcceptedMtd.data as Array<{ total: number }>, (r) => r.total),
      lostMtd: quotesLostMtd.count ?? 0,
      newEnquiriesMtd: newEnq.count ?? 0,
    },
    customerActivity: {
      inactive30: i30,
      inactive60: i60,
      inactive90: i90,
      followupsToday: followTodayR.count ?? 0,
      overdueFollowups: followOverdueR.count ?? 0,
    },
    finance: {
      todaysCollectionsInr: rtRows.reduce((s, r) => s + Number(r.amount ?? 0), 0),
      bankInr,
      cashInr,
      advancesReceivedInr: advancesRows.reduce((s, r) => s + Number(r.unallocated_amount ?? 0), 0),
      advancesCount: advancesRows.length,
      mtdCollectionsInr: sum(receiptsMtd.data as Array<{ amount: number }>, (r) => r.amount),
      overduePaymentsCount: (overdueDash.data ?? []).length,
      overduePaymentsInr: sum(overdueDash.data as Array<{ balance_due: number }>, (r) => r.balance_due),
    },
    ops: {
      dispatchDueToday: dispatchesToday.count ?? 0,
      challansAwaitingInvoice: challansAwaiting.count ?? 0,
      productionPending: prodPending.count ?? 0,
      installationPending: installPending.count ?? 0,
    },
    insights,
  };
}
