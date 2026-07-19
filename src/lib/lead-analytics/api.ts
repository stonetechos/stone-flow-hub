/**
 * Lead-workflow analytics — pure additive queries powering the Phase-3
 * dashboards. Reuses existing tables only. No schema changes.
 *
 * Guiding rules:
 *  - Aggregate on the client from small projected columns.
 *  - Never mutate lead stage. Read-only.
 *  - Umbrella grouping via `STAGE_TO_UMBRELLA`.
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { LEAD_UMBRELLAS, STAGE_TO_UMBRELLA, TERMINAL_STAGES, type LeadUmbrellaId } from "@/lib/constants";
import type { LeadStage } from "@/lib/types";

// ---------- Executive umbrella cards ----------

export interface UmbrellaCard {
  id: LeadUmbrellaId;
  label: string;
  group: "active" | "won" | "post_sale" | "lost";
  count: number;
  revenueInr: number;
  avgDays: number;
}

export interface ExecutiveOverview {
  totalLeads: number;
  cards: UmbrellaCard[];
}

async function fetchEnquiryStageRows() {
  const { data, error } = await supabase
    .from("enquiries")
    .select("stage, budget_inr, updated_at, created_at, lost_reason, source, assigned_to, customer_id, project_id");
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function getExecutiveOverview(): Promise<ExecutiveOverview> {
  const rows = await fetchEnquiryStageRows();
  const now = Date.now();
  const acc = new Map<LeadUmbrellaId, { count: number; rev: number; days: number }>();
  for (const u of LEAD_UMBRELLAS) acc.set(u.id, { count: 0, rev: 0, days: 0 });
  for (const r of rows) {
    const u = STAGE_TO_UMBRELLA[r.stage as LeadStage];
    if (!u) continue;
    const b = acc.get(u)!;
    b.count += 1;
    b.rev += Number(r.budget_inr ?? 0);
    const since = new Date(r.updated_at ?? r.created_at ?? now).getTime();
    b.days += Math.max(0, (now - since) / (1000 * 60 * 60 * 24));
  }
  return {
    totalLeads: rows.length,
    cards: LEAD_UMBRELLAS.map((u) => {
      const b = acc.get(u.id)!;
      return {
        id: u.id,
        label: u.label,
        group: u.group,
        count: b.count,
        revenueInr: b.rev,
        avgDays: b.count === 0 ? 0 : Math.round(b.days / b.count),
      };
    }),
  };
}

// ---------- Sales funnel ----------

export interface FunnelStage {
  id: LeadUmbrellaId;
  label: string;
  count: number;
  revenueInr: number;
  dropOffPct: number;      // % lost vs previous active stage
  conversionPct: number;   // % that made it here from the top
}

export interface FunnelSummary {
  stages: FunnelStage[];
  totalLeads: number;
  lostPct: number;
  wonCount: number;
  wonPct: number;
  avgQuotationInr: number;
  avgOrderInr: number;
  avgDaysToClose: number;
}

// Ordered "active" umbrellas that form the funnel (lost/cancelled/aftersales excluded).
const FUNNEL_ORDER: LeadUmbrellaId[] = [
  "new_enquiry",
  "exploration",
  "requirement_gathering",
  "quotation_sent",
  "negotiation",
  "qualified",
  "order_confirmed",
  "procurement",
  "execution",
  "completed",
];

export async function getFunnelSummary(): Promise<FunnelSummary> {
  const rows = await fetchEnquiryStageRows();

  const counts = new Map<LeadUmbrellaId, { count: number; rev: number }>();
  for (const u of LEAD_UMBRELLAS) counts.set(u.id, { count: 0, rev: 0 });
  for (const r of rows) {
    const u = STAGE_TO_UMBRELLA[r.stage as LeadStage];
    if (!u) continue;
    const b = counts.get(u)!;
    b.count += 1;
    b.rev += Number(r.budget_inr ?? 0);
  }

  const top = counts.get("new_enquiry")!.count + rows.length; // fallback: total leads
  const totalLeads = rows.length;

  // Cumulative "reached this stage or beyond" for conversion math.
  const funnelIdx: Record<LeadUmbrellaId, number> = {} as Record<LeadUmbrellaId, number>;
  FUNNEL_ORDER.forEach((id, i) => (funnelIdx[id] = i));

  const reached = new Array(FUNNEL_ORDER.length).fill(0);
  const revAtLevel = new Array(FUNNEL_ORDER.length).fill(0);
  for (const r of rows) {
    const u = STAGE_TO_UMBRELLA[r.stage as LeadStage];
    if (!u) continue;
    const idx = funnelIdx[u];
    if (idx == null) continue; // lost/aftersales ignored for funnel body
    for (let i = 0; i <= idx; i++) {
      reached[i] += 1;
      revAtLevel[i] += Number(r.budget_inr ?? 0);
    }
  }

  const stages: FunnelStage[] = FUNNEL_ORDER.map((id, i) => {
    const label = LEAD_UMBRELLAS.find((u) => u.id === id)!.label;
    const count = reached[i];
    const prev = i === 0 ? totalLeads || 1 : reached[i - 1] || 1;
    const dropOff = i === 0 ? 0 : Math.max(0, prev - count);
    return {
      id,
      label,
      count,
      revenueInr: revAtLevel[i],
      dropOffPct: prev === 0 ? 0 : Math.round((dropOff / prev) * 100),
      conversionPct: totalLeads === 0 ? 0 : Math.round((count / totalLeads) * 100),
    };
  });

  const wonCount = counts.get("completed")!.count + counts.get("after_sales")!.count;
  const lostCount = counts.get("lost")!.count + counts.get("cancelled")!.count;
  const totalNonActive = wonCount + lostCount;

  // Quote/order averages.
  const [{ data: qData }, { data: oData }] = await Promise.all([
    supabase.from("quotes").select("total").in("status", ["sent", "accepted", "converted"]),
    supabase.from("quotes").select("total").eq("status", "converted"),
  ]);
  const avg = (arr: Array<{ total: number | null }> | null) => {
    const xs = (arr ?? []).map((r) => Number(r.total ?? 0)).filter((n) => n > 0);
    return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
  };

  return {
    stages,
    totalLeads,
    lostPct: totalNonActive === 0 ? 0 : Math.round((lostCount / totalNonActive) * 100),
    wonCount,
    wonPct: totalNonActive === 0 ? 0 : Math.round((wonCount / totalNonActive) * 100),
    avgQuotationInr: avg(qData as Array<{ total: number | null }>),
    avgOrderInr: avg(oData as Array<{ total: number | null }>),
    avgDaysToClose: 0, // reserved — closing timestamps not stored per-enquiry
    // Extra for callers that want top count:
    ...( { _top: top } as unknown as object ),
  };
}

// ---------- Revenue snapshot ----------

export interface RevenueSnapshot {
  expectedInr: number;         // pipeline quotes
  confirmedInr: number;        // quotes for confirmed sales orders
  collectedAdvanceInr: number; // payments received this year
  outstandingInr: number;      // invoices outstanding
  dispatchPendingInr: number;
  installationPendingInr: number;
  completedInr: number;        // paid invoices
  monthlyTrend: Array<{ label: string; value: number }>;
}

export async function getRevenueSnapshot(): Promise<RevenueSnapshot> {
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();

  const [expected, invoices, paidPayments, so, dispatches, installs, monthlyInv] =
    await Promise.all([
      supabase.from("quotes").select("total").in("status", ["draft", "sent"]),
      supabase
        .from("invoices")
        .select("total, balance_due, status")
        .not("status", "in", '("cancelled","draft")'),
      supabase.from("payments").select("amount").gte("paid_at", yearStart),
      supabase.from("sales_orders").select("id, quote_id, status"),
      supabase.from("dispatches").select("status, sales_order_id"),
      supabase.from("installations").select("progress_pct, sales_order_id"),
      supabase.from("invoices").select("total, issue_date, status").gte("issue_date", yearStart.slice(0, 10)),
    ]);

  for (const r of [expected, invoices, paidPayments, so, dispatches, installs, monthlyInv]) {
    if (r.error) throw new AppError(mapDbError(r.error));
  }

  const sum = <T,>(arr: T[] | null, sel: (r: T) => number) =>
    (arr ?? []).reduce((a, r) => a + sel(r), 0);

  // Quote totals by id.
  const quoteIds = (so.data ?? []).map((s) => s.quote_id).filter(Boolean) as string[];
  const quoteTotals = new Map<string, number>();
  if (quoteIds.length > 0) {
    const { data } = await supabase.from("quotes").select("id,total").in("id", quoteIds);
    for (const q of data ?? []) quoteTotals.set(q.id, Number(q.total ?? 0));
  }

  const soById = new Map((so.data ?? []).map((s) => [s.id, s]));
  const soValue = (id: string) => Number(quoteTotals.get(soById.get(id)?.quote_id ?? "") ?? 0);

  const dispatchPendingInr = (dispatches.data ?? [])
    .filter((d) => d.status !== "delivered" && d.status !== "cancelled" && d.sales_order_id)
    .reduce((a, d) => a + soValue(d.sales_order_id!), 0);
  const installPendingInr = (installs.data ?? [])
    .filter((i) => Number(i.progress_pct ?? 0) < 100 && i.sales_order_id)
    .reduce((a, i) => a + soValue(i.sales_order_id!), 0);
  const confirmedInr = (so.data ?? [])
    .filter((s) => s.status === "confirmed" || s.status === "in_production" || s.status === "shipped")
    .reduce((a, s) => a + Number(quoteTotals.get(s.quote_id ?? "") ?? 0), 0);

  // Monthly invoice trend (last 12 months).
  const byMonth = new Map<string, number>();
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    byMonth.set(d.toISOString().slice(0, 7), 0);
  }
  for (const r of (monthlyInv.data ?? []) as Array<{ total: number; issue_date: string; status: string }>) {
    if (!r.issue_date) continue;
    const k = r.issue_date.slice(0, 7);
    if (byMonth.has(k)) byMonth.set(k, byMonth.get(k)! + Number(r.total ?? 0));
  }

  return {
    expectedInr: sum(expected.data as Array<{ total: number }>, (r) => Number(r.total ?? 0)),
    confirmedInr,
    collectedAdvanceInr: sum(paidPayments.data as Array<{ amount: number }>, (r) => Number(r.amount ?? 0)),
    outstandingInr: sum(invoices.data as Array<{ balance_due: number }>, (r) => Number(r.balance_due ?? 0)),
    dispatchPendingInr,
    installationPendingInr: installPendingInr,
    completedInr: sum(
      (invoices.data ?? []).filter((r) => r.status === "paid") as Array<{ total: number }>,
      (r) => Number(r.total ?? 0),
    ),
    monthlyTrend: Array.from(byMonth.entries()).map(([k, v]) => ({
      label: k.slice(5) + "/" + k.slice(2, 4),
      value: v,
    })),
  };
}

// ---------- Follow-up snapshot ----------

export interface FollowupBuckets {
  today: number;
  overdue: number;
  upcoming7: number;
  highPriority: number;
  noFollowup: number;
}

export async function getFollowupBuckets(): Promise<FollowupBuckets> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);
  in7.setHours(23, 59, 59, 999);

  const [today, overdue, upcoming, high, active, withFu] = await Promise.all([
    supabase
      .from("followups")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .gte("scheduled_at", startOfDay.toISOString())
      .lte("scheduled_at", endOfDay.toISOString()),
    supabase
      .from("followups")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("scheduled_at", startOfDay.toISOString()),
    supabase
      .from("followups")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .gt("scheduled_at", endOfDay.toISOString())
      .lte("scheduled_at", in7.toISOString()),
    supabase
      .from("enquiries")
      .select("id", { count: "exact", head: true })
      .eq("priority", "high")
      .not("stage", "in", `(${TERMINAL_STAGES.map((s) => `"${s}"`).join(",")})`),
    supabase
      .from("enquiries")
      .select("id")
      .not("stage", "in", `(${TERMINAL_STAGES.map((s) => `"${s}"`).join(",")})`),
    supabase.from("followups").select("enquiry_id").eq("status", "pending"),
  ]);

  for (const r of [today, overdue, upcoming, high, active, withFu]) {
    if (r.error) throw new AppError(mapDbError(r.error));
  }

  const withSet = new Set(
    ((withFu.data ?? []) as Array<{ enquiry_id: string | null }>)
      .map((r) => r.enquiry_id)
      .filter(Boolean) as string[],
  );
  const noFollowup = ((active.data ?? []) as Array<{ id: string }>).filter((r) => !withSet.has(r.id)).length;

  return {
    today: today.count ?? 0,
    overdue: overdue.count ?? 0,
    upcoming7: upcoming.count ?? 0,
    highPriority: high.count ?? 0,
    noFollowup,
  };
}

// ---------- Lead health snapshot ----------

export interface HealthBuckets {
  healthy: number;
  warning: number;
  critical: number;
  cold: number;
  inactive: number;
  noActivity30d: number;
}

export async function getHealthBuckets(): Promise<HealthBuckets> {
  const rows = await fetchEnquiryStageRows();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const b: HealthBuckets = { healthy: 0, warning: 0, critical: 0, cold: 0, inactive: 0, noActivity30d: 0 };
  for (const r of rows) {
    const stage = r.stage as LeadStage;
    if (stage === "lost" || stage === "cancelled" || stage === "completed") continue;
    const days = (now - new Date(r.updated_at ?? r.created_at ?? now).getTime()) / day;
    if (days > 30) b.noActivity30d += 1;
    if (days <= 3) b.healthy += 1;
    else if (days <= 10) b.warning += 1;
    else if (days <= 20) b.critical += 1;
    else if (days <= 45) b.cold += 1;
    else b.inactive += 1;
  }
  return b;
}

// ---------- Team performance ----------

export interface SalespersonRow {
  userId: string;
  name: string;
  leads: number;
  conversionPct: number;
  quotationPct: number;
  revenueInr: number;
  ordersClosed: number;
  lostLeads: number;
}

export async function getTeamPerformance(): Promise<SalespersonRow[]> {
  const [enq, quotes, so, profiles] = await Promise.all([
    supabase.from("enquiries").select("id, stage, budget_inr, assigned_to, customer_id"),
    supabase.from("quotes").select("id, project_id, status, created_by, total"),
    supabase.from("sales_orders").select("id, status, quote_id, created_by"),
    supabase.from("profiles").select("id, full_name, email"),
  ]);
  for (const r of [enq, quotes, so, profiles]) {
    if (r.error) throw new AppError(mapDbError(r.error));
  }

  const nameOf = new Map<string, string>();
  for (const p of (profiles.data ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>) {
    nameOf.set(p.id, p.full_name || p.email || p.id.slice(0, 8));
  }

  const per = new Map<
    string,
    { leads: number; won: number; lost: number; withQuote: number; revenue: number; orders: number }
  >();
  const bump = (id: string) => {
    if (!per.has(id))
      per.set(id, { leads: 0, won: 0, lost: 0, withQuote: 0, revenue: 0, orders: 0 });
    return per.get(id)!;
  };

  const enquiriesByAssignee = new Map<string, Array<{ id: string }>>();
  for (const e of (enq.data ?? []) as Array<{
    id: string;
    stage: LeadStage;
    budget_inr: number | null;
    assigned_to: string | null;
  }>) {
    if (!e.assigned_to) continue;
    const b = bump(e.assigned_to);
    b.leads += 1;
    if (e.stage === "completed" || e.stage === "after_sales") b.won += 1;
    if (e.stage === "lost" || e.stage === "cancelled") b.lost += 1;
    const list = enquiriesByAssignee.get(e.assigned_to) ?? [];
    list.push({ id: e.id });
    enquiriesByAssignee.set(e.assigned_to, list);
  }

  // Quotation coverage — creator of a quote counts as its salesperson.
  for (const q of (quotes.data ?? []) as Array<{ created_by: string | null; total: number | null }>) {
    if (!q.created_by) continue;
    const b = bump(q.created_by);
    b.withQuote += 1;
    b.revenue += Number(q.total ?? 0);
  }

  for (const s of (so.data ?? []) as Array<{ created_by: string | null; status: string }>) {
    if (!s.created_by) continue;
    if (s.status === "confirmed" || s.status === "in_production" || s.status === "shipped") {
      const b = bump(s.created_by);
      b.orders += 1;
    }
  }

  return Array.from(per.entries())
    .map(([userId, b]) => ({
      userId,
      name: nameOf.get(userId) ?? userId.slice(0, 8),
      leads: b.leads,
      conversionPct: b.leads === 0 ? 0 : Math.round((b.won / b.leads) * 100),
      quotationPct: b.leads === 0 ? 0 : Math.round((b.withQuote / b.leads) * 100),
      revenueInr: b.revenue,
      ordersClosed: b.orders,
      lostLeads: b.lost,
    }))
    .sort((a, b) => b.revenueInr - a.revenueInr);
}

// ---------- Analytics breakdowns ----------

export interface BreakdownRow {
  label: string;
  count: number;
  revenueInr: number;
}

async function projectsAll() {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, city, architect_name, contractor_name, expected_value_inr, customer_id");
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function getLeadSourceBreakdown(): Promise<BreakdownRow[]> {
  const rows = await fetchEnquiryStageRows();
  const map = new Map<string, { count: number; rev: number }>();
  for (const r of rows) {
    const key = r.source || "Unknown";
    const b = map.get(key) ?? { count: 0, rev: 0 };
    b.count += 1;
    b.rev += Number(r.budget_inr ?? 0);
    map.set(key, b);
  }
  return Array.from(map.entries())
    .map(([label, b]) => ({ label, count: b.count, revenueInr: b.rev }))
    .sort((a, b) => b.count - a.count);
}

export async function getLostReasonBreakdown(): Promise<BreakdownRow[]> {
  const rows = await fetchEnquiryStageRows();
  const map = new Map<string, { count: number; rev: number }>();
  for (const r of rows) {
    if (r.stage !== "lost" && r.stage !== "cancelled") continue;
    const key = (r.lost_reason ?? "").trim() || "Not recorded";
    const b = map.get(key) ?? { count: 0, rev: 0 };
    b.count += 1;
    b.rev += Number(r.budget_inr ?? 0);
    map.set(key, b);
  }
  return Array.from(map.entries())
    .map(([label, b]) => ({ label, count: b.count, revenueInr: b.rev }))
    .sort((a, b) => b.count - a.count);
}

async function projectsBy<K extends "city" | "architect_name" | "contractor_name">(
  key: K,
  fallback: string,
): Promise<BreakdownRow[]> {
  const rows = await projectsAll();
  const map = new Map<string, { count: number; rev: number }>();
  for (const r of rows) {
    const k = ((r as Record<string, unknown>)[key] as string | null | undefined)?.trim() || fallback;
    const b = map.get(k) ?? { count: 0, rev: 0 };
    b.count += 1;
    b.rev += Number(r.expected_value_inr ?? 0);
    map.set(k, b);
  }
  return Array.from(map.entries())
    .map(([label, b]) => ({ label, count: b.count, revenueInr: b.rev }))
    .sort((a, b) => b.revenueInr - a.revenueInr);
}

export const getRevenueByCity = () => projectsBy("city", "Unknown");
export const getRevenueByArchitect = () => projectsBy("architect_name", "None recorded");
export const getRevenueByContractor = () => projectsBy("contractor_name", "None recorded");

export async function getInteriorDesignerBreakdown(): Promise<BreakdownRow[]> {
  // "Interior designer" isn't a first-class column — we surface customers of
  // type 'interior_designer' with their project revenue.
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, customer_type");
  if (error) throw new AppError(mapDbError(error));
  const designerIds = new Set(
    ((data ?? []) as Array<{ id: string; name: string; customer_type: string }>)
      .filter((c) => c.customer_type === "interior_designer")
      .map((c) => c.id),
  );
  const nameById = new Map(
    ((data ?? []) as Array<{ id: string; name: string }>).map((c) => [c.id, c.name]),
  );
  const projs = await projectsAll();
  const map = new Map<string, { count: number; rev: number }>();
  for (const p of projs) {
    if (!designerIds.has(p.customer_id)) continue;
    const label = nameById.get(p.customer_id) ?? "Designer";
    const b = map.get(label) ?? { count: 0, rev: 0 };
    b.count += 1;
    b.rev += Number(p.expected_value_inr ?? 0);
    map.set(label, b);
  }
  return Array.from(map.entries())
    .map(([label, b]) => ({ label, count: b.count, revenueInr: b.rev }))
    .sort((a, b) => b.revenueInr - a.revenueInr);
}

export async function getTopProducts(): Promise<BreakdownRow[]> {
  const { data, error } = await supabase
    .from("quote_items")
    .select("product_id, quantity, unit_price, products:products!quote_items_product_id_fkey(name)")
    .limit(5000);
  if (error) throw new AppError(mapDbError(error));
  const map = new Map<string, { count: number; rev: number }>();
  for (const r of (data ?? []) as Array<{
    quantity: number | null;
    unit_price: number | null;
    products: { name: string | null } | null;
  }>) {
    const label = r.products?.name ?? "Unknown product";
    const b = map.get(label) ?? { count: 0, rev: 0 };
    b.count += Number(r.quantity ?? 0);
    b.rev += Number(r.quantity ?? 0) * Number(r.unit_price ?? 0);
    map.set(label, b);
  }
  return Array.from(map.entries())
    .map(([label, b]) => ({ label, count: Math.round(b.count), revenueInr: b.rev }))
    .sort((a, b) => b.revenueInr - a.revenueInr)
    .slice(0, 20);
}

export async function getRevenueByProductCategory(): Promise<BreakdownRow[]> {
  const { data, error } = await supabase
    .from("quote_items")
    .select(
      "quantity, unit_price, products:products!quote_items_product_id_fkey(product_families(name))",
    )
    .limit(5000);
  if (error) throw new AppError(mapDbError(error));
  type QI = {
    quantity: number | null;
    unit_price: number | null;
    products: { product_families: { name: string | null } | null } | null;
  };
  const map = new Map<string, { count: number; rev: number }>();
  for (const r of (data ?? []) as QI[]) {
    const label = r.products?.product_families?.name ?? "Uncategorised";
    const b = map.get(label) ?? { count: 0, rev: 0 };
    b.count += Number(r.quantity ?? 0);
    b.rev += Number(r.quantity ?? 0) * Number(r.unit_price ?? 0);
    map.set(label, b);
  }
  return Array.from(map.entries())
    .map(([label, b]) => ({ label, count: Math.round(b.count), revenueInr: b.rev }))
    .sort((a, b) => b.revenueInr - a.revenueInr);
}

export async function getRevenueByVendor(): Promise<BreakdownRow[]> {
  // Approximation: aggregate paid vendor payments per vendor (spend, not revenue).
  // Reuses vendor_payments — no schema change.
  const { data, error } = await supabase
    .from("vendor_payments")
    .select("amount, vendor_id, vendors:vendors!vendor_payments_vendor_id_fkey(company_name)");
  if (error) throw new AppError(mapDbError(error));
  const map = new Map<string, { count: number; rev: number }>();
  for (const r of (data ?? []) as Array<{
    amount: number | null;
    vendors: { company_name: string | null } | null;
  }>) {
    const label = r.vendors?.company_name ?? "Unknown vendor";
    const b = map.get(label) ?? { count: 0, rev: 0 };
    b.count += 1;
    b.rev += Number(r.amount ?? 0);
    map.set(label, b);
  }
  return Array.from(map.entries())
    .map(([label, b]) => ({ label, count: b.count, revenueInr: b.rev }))
    .sort((a, b) => b.revenueInr - a.revenueInr);
}

