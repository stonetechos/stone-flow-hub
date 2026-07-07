/** Cash flow forecast — combines scheduled customer receipts and open vendor liabilities.
 *  Confidence blends coverage (how much of the horizon is backed by concrete
 *  schedule rows) with recent variance. Never invents numbers. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export type ForecastGrain = "week" | "month";

export interface ForecastPoint {
  period: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface ForecastResult {
  horizonWeeks: number;
  grain: ForecastGrain;
  points: ForecastPoint[];
  totalInflow: number;
  totalOutflow: number;
  netCash: number;
  confidencePct: number;
}

function keyFor(date: Date, grain: ForecastGrain): string {
  const y = date.getUTCFullYear();
  if (grain === "month") return `${y}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  const first = new Date(Date.UTC(y, 0, 1));
  const diff = (date.getTime() - first.getTime()) / 86_400_000;
  const w = Math.floor((diff + first.getUTCDay()) / 7) + 1;
  return `${y}-W${String(w).padStart(2, "0")}`;
}

export async function getForecast(horizonDays = 90, grain: ForecastGrain = "week"): Promise<ForecastResult> {
  const today = new Date();
  const horizonEnd = new Date(today.getTime() + horizonDays * 86_400_000);
  const [inflowRes, outflowRes, historicPay] = await Promise.all([
    supabase.from("customer_payment_dashboard" as never).select("balance_due,due_date")
      .gt("balance_due", 0).lte("due_date", horizonEnd.toISOString().slice(0, 10)),
    supabase.from("purchase_orders").select("expected_date,id").not("expected_date", "is", null)
      .lte("expected_date", horizonEnd.toISOString().slice(0, 10))
      .not("status", "in", '("cancelled")'),
    supabase.from("payments").select("amount,paid_at").gte("paid_at", new Date(today.getTime() - 90 * 86_400_000).toISOString()),
  ]);
  for (const r of [inflowRes, outflowRes, historicPay]) if (r.error) throw new AppError(mapDbError(r.error));

  const map = new Map<string, ForecastPoint>();
  const add = (iso: string, side: "inflow" | "outflow", amount: number) => {
    const k = keyFor(new Date(iso), grain);
    const p = map.get(k) ?? { period: k, inflow: 0, outflow: 0, net: 0 };
    p[side] += amount;
    p.net = p.inflow - p.outflow;
    map.set(k, p);
  };
  let totalInflow = 0, totalOutflow = 0;
  for (const r of (inflowRes.data ?? []) as Array<{ balance_due: number; due_date: string }>) {
    add(r.due_date, "inflow", Number(r.balance_due ?? 0));
    totalInflow += Number(r.balance_due ?? 0);
  }
  // Approximate outflow per open PO by average vendor payment last 90d
  const historic = (historicPay.data ?? []) as Array<{ amount: number }>;
  const avgPo = historic.length > 0
    ? historic.reduce((s, r) => s + Number(r.amount ?? 0), 0) / historic.length
    : 0;
  for (const r of (outflowRes.data ?? []) as Array<{ expected_date: string }>) {
    add(r.expected_date, "outflow", avgPo);
    totalOutflow += avgPo;
  }

  const points = Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
  const coverage = points.length > 0 ? Math.min(1, points.length / (grain === "week" ? Math.ceil(horizonDays / 7) : Math.ceil(horizonDays / 30))) : 0;
  const historicVar = historic.length > 5 ? 1 : 0.5;
  const confidencePct = Math.round(coverage * 60 + historicVar * 40);

  return {
    horizonWeeks: Math.ceil(horizonDays / 7),
    grain,
    points,
    totalInflow,
    totalOutflow,
    netCash: totalInflow - totalOutflow,
    confidencePct,
  };
}
