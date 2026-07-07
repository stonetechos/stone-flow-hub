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
}

export interface CustomerIntel {
  top_by_revenue: CustomerScore[];
  most_profitable: CustomerScore[];
  repeat: CustomerScore[];
  high_outstanding: CustomerScore[];
  delayed_payers: CustomerScore[];
  inactive: CustomerScore[];
  potential_high_value: CustomerScore[];
}

export async function getCustomerIntel(): Promise<CustomerIntel> {
  const now = Date.now();
  const [custs, invs, pays, enqs] = await Promise.all([
    supabase.from("customers").select("id,name,created_at").eq("is_active", true).limit(2000),
    supabase.from("invoices").select("customer_id,total,balance_due,issue_date,due_date"),
    supabase.from("payments").select("invoice_id,paid_at,amount"),
    supabase.from("enquiries").select("customer_id,budget_inr,created_at").limit(5000),
  ]);
  for (const r of [custs, invs, pays, enqs]) if (r.error) throw new AppError(mapDbError(r.error));

  type Inv = { customer_id: string; total: number; balance_due: number; issue_date: string; due_date: string | null };
  const invByCust = new Map<string, Inv[]>();
  for (const i of (invs.data ?? []) as Inv[]) {
    const arr = invByCust.get(i.customer_id) ?? [];
    arr.push(i);
    invByCust.set(i.customer_id, arr);
  }

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
    const lastOrder = rows.reduce<string | null>((acc, r) => (!acc || r.issue_date > acc ? r.issue_date : acc), null);
    scores.push({
      customer_id: c.id,
      name: c.name,
      revenue,
      outstanding,
      last_order_at: lastOrder,
      orders_count: rows.length,
      avg_days_to_pay: null,
      overdue_days: overdueDays,
    });
  }

  const enqPot = new Map<string, number>();
  for (const e of (enqs.data ?? []) as Array<{ customer_id: string; budget_inr: number | null }>) {
    if (!e.customer_id) continue;
    enqPot.set(e.customer_id, (enqPot.get(e.customer_id) ?? 0) + Number(e.budget_inr ?? 0));
  }
  const inactiveCutoff = now - 180 * 86_400_000;

  return {
    top_by_revenue: [...scores].sort((a, b) => b.revenue - a.revenue).slice(0, 15),
    most_profitable: [...scores].sort((a, b) => (b.revenue - b.outstanding) - (a.revenue - a.outstanding)).slice(0, 15),
    repeat: scores.filter((s) => s.orders_count >= 3).sort((a, b) => b.orders_count - a.orders_count).slice(0, 15),
    high_outstanding: [...scores].sort((a, b) => b.outstanding - a.outstanding).filter((s) => s.outstanding > 0).slice(0, 15),
    delayed_payers: [...scores].sort((a, b) => b.overdue_days - a.overdue_days).filter((s) => s.overdue_days > 15).slice(0, 15),
    inactive: scores.filter((s) => !s.last_order_at || new Date(s.last_order_at).getTime() < inactiveCutoff).slice(0, 20),
    potential_high_value: Array.from(enqPot.entries())
      .map(([id, v]) => ({ ...scores.find((s) => s.customer_id === id)!, revenue: v }))
      .filter((s) => s && s.name)
      .sort((a, b) => b.revenue - a.revenue).slice(0, 15),
  };
}
