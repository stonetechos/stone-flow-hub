/** Dashboard aggregates — cheap parallel counts for KPI cards. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { TERMINAL_STAGES } from "@/lib/constants";

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
};

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

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
  ] = await Promise.all([
    supabase
      .from("enquiries")
      .select("id", { count: "exact", head: true })
      .not("stage", "in", `(${TERMINAL_STAGES.map((s) => `"${s}"`).join(",")})`),
    supabase
      .from("rfqs")
      .select("id", { count: "exact", head: true })
      .in("status", ["sent", "partially_received"]),
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
      .in("status", ["draft", "sent"]),
    supabase
      .from("sales_orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed"),
    supabase.from("quotes").select("total").in("status", ["draft", "sent"]),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("invoices").select("balance_due").not("status", "in", '("cancelled","draft")'),
    supabase.from("payments").select("amount").gte("paid_at", monthStart.toISOString()),
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
  ]) {
    if (r.error) throw new AppError(mapDbError(r.error));
  }

  const sumField = <K extends string>(
    rows: Array<Record<K, number | null | undefined>> | null,
    key: K,
  ) => (rows ?? []).reduce((acc, r) => acc + Number(r[key] ?? 0), 0);

  return {
    activeEnquiries: activeEnq.count ?? 0,
    pendingRfqs: pendingRfq.count ?? 0,
    todayFollowups: todayFu.count ?? 0,
    overdueFollowups: overdueFu.count ?? 0,
    quotesAwaitingApproval: quotesAwaiting.count ?? 0,
    ordersToStart: ordersToStart.count ?? 0,
    revenuePipelineInr: sumField(
      revenuePipeline.data as Array<{ total: number }>,
      "total",
    ),
    customers: cust.count ?? 0,
    outstandingInr: sumField(outstanding.data as Array<{ balance_due: number }>, "balance_due"),
    paymentsThisMonthInr: sumField(monthPay.data as Array<{ amount: number }>, "amount"),
  };
}
