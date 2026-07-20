/** Customer intelligence — rankings, outstanding, delayed, inactive. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export interface CustomerScore {
  customer_id: string;
  name: string;
  revenue: number;
  outstanding: number;
  last_order_at: string | null;
  orders_count: number;
  avg_days_to_pay: number | null;
  overdue_days: number;
  /** Invoiced revenue in the last GROWTH_WINDOW_DAYS days — same summation
   *  as `revenue`, just date-windowed. Added for Phase G.5 (Customer
   *  Intelligence) so CustomerLifetimeValueProvider can detect real
   *  period-over-period growth without a second revenue calculation. */
  recent_revenue: number;
  /** Invoiced revenue in the GROWTH_WINDOW_DAYS window before that. */
  prior_revenue: number;
}

/** Window used for the recent-vs-prior revenue comparison above. */
const GROWTH_WINDOW_DAYS = 90;

export interface CustomerIntel {
  top_by_revenue: CustomerScore[];
  most_profitable: CustomerScore[];
  repeat: CustomerScore[];
  high_outstanding: CustomerScore[];
  delayed_payers: CustomerScore[];
  inactive: CustomerScore[];
  potential_high_value: CustomerScore[];
}

async function computeCustomerScores(): Promise<CustomerScore[]> {
  const now = Date.now();
  const [custs, invs] = await Promise.all([
    supabase.from("customers").select("id,name,created_at").eq("is_active", true).limit(2000),
    supabase.from("invoices").select("customer_id,total,balance_due,issue_date,due_date"),
  ]);
  for (const r of [custs, invs]) if (r.error) throw new AppError(mapDbError(r.error));

  type Inv = {
    customer_id: string;
    total: number;
    balance_due: number;
    issue_date: string;
    due_date: string | null;
  };
  const invByCust = new Map<string, Inv[]>();
  for (const i of (invs.data ?? []) as Inv[]) {
    const arr = invByCust.get(i.customer_id) ?? [];
    arr.push(i);
    invByCust.set(i.customer_id, arr);
  }

  const recentCutoff = now - GROWTH_WINDOW_DAYS * 86_400_000;
  const priorCutoff = now - 2 * GROWTH_WINDOW_DAYS * 86_400_000;

  const scores: CustomerScore[] = [];
  for (const c of (custs.data ?? []) as Array<{ id: string; name: string; created_at: string }>) {
    const rows = invByCust.get(c.id) ?? [];
    const revenue = rows.reduce((s, r) => s + Number(r.total ?? 0), 0);
    const outstanding = rows.reduce((s, r) => s + Number(r.balance_due ?? 0), 0);
    const overdueDays = rows.reduce((max, r) => {
      const ref = r.due_date ?? r.issue_date;
      if (!ref || Number(r.balance_due ?? 0) <= 0) return max;
      const d = Math.floor((now - new Date(ref).getTime()) / 86_400_000);
      return d > max ? d : max;
    }, 0);
    const lastOrder = rows.reduce<string | null>(
      (acc, r) => (!acc || r.issue_date > acc ? r.issue_date : acc),
      null,
    );
    const recentRevenue = rows.reduce((s, r) => {
      const t = new Date(r.issue_date).getTime();
      return t >= recentCutoff ? s + Number(r.total ?? 0) : s;
    }, 0);
    const priorRevenue = rows.reduce((s, r) => {
      const t = new Date(r.issue_date).getTime();
      return t >= priorCutoff && t < recentCutoff ? s + Number(r.total ?? 0) : s;
    }, 0);
    scores.push({
      customer_id: c.id,
      name: c.name,
      revenue,
      outstanding,
      last_order_at: lastOrder,
      orders_count: rows.length,
      avg_days_to_pay: null,
      overdue_days: overdueDays,
      recent_revenue: recentRevenue,
      prior_revenue: priorRevenue,
    });
  }
  return scores;
}

/** Full, unsliced per-customer scores — added for Phase G.5 so Customer
 *  Intelligence providers can evaluate every customer against a threshold
 *  instead of only the top-15-per-category slices `getCustomerIntel`
 *  returns. Mirrors the `listVendorScores` addition in `vendor-intel.ts`
 *  (Phase G.3). `getCustomerIntel()`'s own behavior is unchanged. */
export async function listCustomerScores(): Promise<CustomerScore[]> {
  return computeCustomerScores();
}

export async function getCustomerIntel(): Promise<CustomerIntel> {
  const scores = await computeCustomerScores();
  const now = Date.now();
  const { data: enqData, error: enqErr } = await supabase
    .from("enquiries")
    .select("customer_id,budget_inr,created_at")
    .limit(5000);
  if (enqErr) throw new AppError(mapDbError(enqErr));

  const enqPot = new Map<string, number>();
  for (const e of (enqData ?? []) as Array<{ customer_id: string; budget_inr: number | null }>) {
    if (!e.customer_id) continue;
    enqPot.set(e.customer_id, (enqPot.get(e.customer_id) ?? 0) + Number(e.budget_inr ?? 0));
  }
  const inactiveCutoff = now - 180 * 86_400_000;

  return {
    top_by_revenue: [...scores].sort((a, b) => b.revenue - a.revenue).slice(0, 15),
    most_profitable: [...scores]
      .sort((a, b) => b.revenue - b.outstanding - (a.revenue - a.outstanding))
      .slice(0, 15),
    repeat: scores
      .filter((s) => s.orders_count >= 3)
      .sort((a, b) => b.orders_count - a.orders_count)
      .slice(0, 15),
    high_outstanding: [...scores]
      .sort((a, b) => b.outstanding - a.outstanding)
      .filter((s) => s.outstanding > 0)
      .slice(0, 15),
    delayed_payers: [...scores]
      .sort((a, b) => b.overdue_days - a.overdue_days)
      .filter((s) => s.overdue_days > 15)
      .slice(0, 15),
    inactive: scores
      .filter((s) => !s.last_order_at || new Date(s.last_order_at).getTime() < inactiveCutoff)
      .slice(0, 20),
    potential_high_value: Array.from(enqPot.entries())
      .map(([id, v]) => ({ ...scores.find((s) => s.customer_id === id)!, revenue: v }))
      .filter((s) => s && s.name)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15),
  };
}
