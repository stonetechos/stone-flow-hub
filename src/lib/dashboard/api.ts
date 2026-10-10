/** Dashboard aggregates — cheap parallel counts for KPI cards. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export type DashboardKpis = {
  activeEnquiries: number;
  todayFollowups: number;
  overdueFollowups: number;
  pendingRfqs: number;
  quotesAwaitingApproval: number;
  ordersToStart: number;
  revenuePipelineInr: number;
  outstandingInr: number;
  paymentsThisMonthInr: number;
  customers: number;
  salesTodayInr: number;
  collectionsTodayInr: number;
  pendingQuotes: number;
  deliveriesToday: number;
  activeInstallations: number;
};

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const todayIso = start.toISOString().slice(0, 10);

  const [
    activeEnq,
    pendingRfq,
    todayFu,
    overdueFu,
    quotesAwaiting,
    ordersToStart,
    revenuePipeline,
    cust,
    outstanding,
    monthPay,
    salesToday,
    collectionsToday,
    deliveriesToday,
    activeInstallations,
  ] = await Promise.all([
    supabase
      .from("enquiries")
      .select("id", { count: "exact", head: true })
      .not("stage", "in", "(completed,lost,cancelled)"),
    supabase
      .from("rfqs")
      .select("id", { count: "exact", head: true })
      .in("status", ["draft", "sent", "partially_received"]),
    supabase
      .from("followups")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .gte("scheduled_at", start.toISOString())
      .lte("scheduled_at", end.toISOString()),
    supabase
      .from("followups")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("scheduled_at", start.toISOString()),
    supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .in("status", ["draft", "sent", "accepted"]),
    supabase
      .from("sales_orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["draft", "confirmed"]),
    supabase.from("quotes").select("total").in("status", ["draft", "sent", "accepted"]),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("customer_ledger").select("debit,credit"),
    supabase.from("payments").select("amount").gte("paid_at", monthStart.toISOString()),
    supabase.from("invoices").select("total").eq("issue_date", todayIso).neq("status", "cancelled"),
    supabase.from("payments").select("amount").gte("paid_at", start.toISOString()),
    supabase
      .from("dispatches")
      .select("id", { count: "exact", head: true })
      .eq("dispatch_date", todayIso),
    // "Active" = currently underway, excludes not-yet-started ("planned"),
    // paused, and finished/cancelled states. See
    // src/lib/installation/orders.ts INSTALLATION_ORDER_STATUSES.
    supabase
      .from("installations")
      .select("id", { count: "exact", head: true })
      .in("status", ["scheduled", "in_progress"])
      .not("lifecycle_status", "in", "(archived,deleted)"),
  ]);

  for (const r of [
    activeEnq,
    pendingRfq,
    todayFu,
    overdueFu,
    quotesAwaiting,
    ordersToStart,
    revenuePipeline,
    cust,
    outstanding,
    monthPay,
    salesToday,
    collectionsToday,
    deliveriesToday,
    activeInstallations,
  ]) {
    if (r.error) throw new AppError(mapDbError(r.error));
  }

  const sumField = <K extends string>(
    rows: Array<Record<K, number | null | undefined>> | null,
    key: K,
  ) => (rows ?? []).reduce((acc, r) => acc + Number(r[key] ?? 0), 0);

  const custDebit = sumField(outstanding.data as Array<{ debit: number }>, "debit");
  const custCredit = sumField(outstanding.data as Array<{ credit: number }>, "credit");

  return {
    activeEnquiries: activeEnq.count ?? 0,
    pendingRfqs: pendingRfq.count ?? 0,
    todayFollowups: todayFu.count ?? 0,
    overdueFollowups: overdueFu.count ?? 0,
    quotesAwaitingApproval: quotesAwaiting.count ?? 0,
    ordersToStart: ordersToStart.count ?? 0,
    revenuePipelineInr: sumField(revenuePipeline.data as Array<{ total: number }>, "total"),
    customers: cust.count ?? 0,
    outstandingInr: Math.max(0, custDebit - custCredit),
    paymentsThisMonthInr: sumField(monthPay.data as Array<{ amount: number }>, "amount"),
    salesTodayInr: sumField(salesToday.data as Array<{ total: number }>, "total"),
    collectionsTodayInr: sumField(collectionsToday.data as Array<{ amount: number }>, "amount"),
    pendingQuotes: quotesAwaiting.count ?? 0,
    deliveriesToday: deliveriesToday.count ?? 0,
    activeInstallations: activeInstallations.count ?? 0,
  };
}
