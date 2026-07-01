/** Dashboard aggregates — cheap parallel counts for KPI cards. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { TERMINAL_STAGES } from "@/lib/constants";

export type DashboardKpis = {
  activeEnquiries: number;
  pendingRfqs: number;
  todayFollowups: number;
  customers: number;
  outstandingInr: number;
  paymentsThisMonthInr: number;
};

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [activeEnq, pendingRfq, todayFu, cust, outstanding, monthPay] = await Promise.all([
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
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("invoices").select("balance_due").not("status", "in", '("cancelled","draft")'),
    supabase.from("payments").select("amount").gte("paid_at", monthStart.toISOString()),
  ]);

  for (const r of [activeEnq, pendingRfq, todayFu, cust, outstanding, monthPay]) {
    if (r.error) throw new AppError(mapDbError(r.error));
  }

  const sum = (rows: Array<{ balance_due?: number | null; amount?: number | null }> | null, key: "balance_due" | "amount") =>
    (rows ?? []).reduce((acc, r) => acc + Number(r[key] ?? 0), 0);

  return {
    activeEnquiries: activeEnq.count ?? 0,
    pendingRfqs: pendingRfq.count ?? 0,
    todayFollowups: todayFu.count ?? 0,
    customers: cust.count ?? 0,
    outstandingInr: sum(outstanding.data as Array<{ balance_due: number }>, "balance_due"),
    paymentsThisMonthInr: sum(monthPay.data as Array<{ amount: number }>, "amount"),
  };
}
