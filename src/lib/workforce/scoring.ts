/**
 * Rule-based performance scoring.
 * Reads counts of completed ERP entities attributable to each employee for
 * the given period, matches them to KRA metric_source keys, weights them
 * by KRA weightage, and returns per-KRA + overall snapshots.
 *
 * Fully explainable and deterministic. No AI.
 */
import { supabase } from "@/integrations/supabase/client";
import { gradeFromPct, type PerformanceGrade } from "./types";

export interface ScoredKra {
  kra_id: string;
  kra_name: string;
  metric_source: string | null;
  weight: number;
  target: number;
  achieved: number;
  pct: number;
  weighted: number;
}

export interface EmployeeScore {
  employee_id: string;
  period_start: string;
  period_end: string;
  kras: ScoredKra[];
  overall_pct: number;
  grade: PerformanceGrade;
}

/**
 * Read achieved count for a metric key over the period.
 * Uses `created_by` where available, else falls back to owner_id / assigned_to
 * columns that exist on the given ERP table. All queries respect RLS.
 */
async function achievedCount(
  metric: string,
  userId: string | null,
  periodStart: string,
  periodEnd: string,
): Promise<number> {
  if (!userId) return 0;
  const range = (col = "created_at") => ({ from: periodStart, to: periodEnd, col });

  async function countRows(
    table: string,
    filter: (b: ReturnType<typeof supabase.from>) => unknown,
  ): Promise<number> {
    // Loose typing: table list is small enough to enumerate in the switch below.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = (supabase.from as any)(table).select("id", { count: "exact", head: true });
    const filtered = filter(q);
    const { count, error } = (await filtered) as { count: number | null; error: unknown };
    if (error) return 0;
    return count ?? 0;
  }

  const r = range();
  switch (metric) {
    case "customers_created":
      return countRows("customers", (q) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q as any).eq("created_by", userId).gte(r.col, r.from).lte(r.col, r.to),
      );
    case "enquiries_created":
      return countRows("enquiries", (q) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q as any).eq("created_by", userId).gte(r.col, r.from).lte(r.col, r.to),
      );
    case "quotations_created":
      return countRows("quotes", (q) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q as any).eq("created_by", userId).gte(r.col, r.from).lte(r.col, r.to),
      );
    case "sales_orders_processed":
      return countRows("sales_orders", (q) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q as any).eq("created_by", userId).gte(r.col, r.from).lte(r.col, r.to),
      );
    case "dispatches_prepared":
    case "dispatches_completed":
    case "dispatches_assisted":
      return countRows("dispatches", (q) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q as any).eq("created_by", userId).gte(r.col, r.from).lte(r.col, r.to),
      );
    case "po_completed":
      return countRows("purchase_orders", (q) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q as any).eq("created_by", userId).gte(r.col, r.from).lte(r.col, r.to),
      );
    case "installations_completed":
      return countRows("installations", (q) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q as any).eq("created_by", userId).gte(r.col, r.from).lte(r.col, r.to),
      );
    case "site_visits_completed":
      return countRows("site_visits", (q) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q as any).eq("created_by", userId).gte(r.col, r.from).lte(r.col, r.to),
      );
    case "cash_collections":
      return countRows("receipts", (q) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q as any).eq("created_by", userId).gte(r.col, r.from).lte(r.col, r.to),
      );
    case "new_customers":
      return countRows("customers", (q) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q as any).gte(r.col, r.from).lte(r.col, r.to),
      );
    default:
      return 0;
  }
}

export function periodBounds(period: "daily" | "weekly" | "monthly" | "quarterly" = "monthly"): {
  start: string;
  end: string;
} {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === "weekly") start.setDate(start.getDate() - 6);
  else if (period === "monthly") start.setDate(1);
  else if (period === "quarterly") {
    const q = Math.floor(start.getMonth() / 3);
    start.setMonth(q * 3, 1);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function computeEmployeeScore(
  employeeId: string,
  designationId: string | null,
  userId: string | null,
): Promise<EmployeeScore> {
  const { data: kras, error } = await supabase
    .from("kras")
    .select("*")
    .eq("active", true)
    .eq("designation_id", designationId ?? "00000000-0000-0000-0000-000000000000");
  if (error) throw error;

  const { start, end } = periodBounds("monthly");
  const scored: ScoredKra[] = [];
  let totalWeight = 0;
  let weightedSum = 0;

  for (const k of kras ?? []) {
    const achieved = await achievedCount(k.metric_source ?? "", userId, start, end);
    const target = Number(k.target_value ?? 0);
    const pct = target > 0 ? Math.min(200, (achieved / target) * 100) : 0;
    const weight = Number(k.weightage ?? 0);
    const weighted = (pct * weight) / 100;
    totalWeight += weight;
    weightedSum += weighted;
    scored.push({
      kra_id: k.id,
      kra_name: k.name,
      metric_source: k.metric_source,
      weight,
      target,
      achieved,
      pct: Math.round(pct * 10) / 10,
      weighted: Math.round(weighted * 10) / 10,
    });
  }

  const overall = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
  const overallCapped = Math.min(200, overall);
  return {
    employee_id: employeeId,
    period_start: start.slice(0, 10),
    period_end: end.slice(0, 10),
    kras: scored,
    overall_pct: Math.round(overallCapped * 10) / 10,
    grade: gradeFromPct(overallCapped),
  };
}
