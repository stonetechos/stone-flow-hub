/** Time-series aggregations for the analytics dashboard.
 *  Groups by day/week/month/quarter/year on the client — cheap enough
 *  for typical Stone Tech volumes; upgrade to SQL views if row counts grow. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export type Grain = "day" | "week" | "month" | "quarter" | "year";
export interface Range {
  from: string;
  to: string;
}

export function defaultRange(days = 90): Range {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function bucket(iso: string, grain: Grain): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  if (grain === "year") return `${y}`;
  if (grain === "quarter") return `${y}-Q${Math.floor(m / 3) + 1}`;
  if (grain === "month") return `${y}-${String(m + 1).padStart(2, "0")}`;
  if (grain === "week") {
    const first = new Date(Date.UTC(y, 0, 1));
    const diff = (d.getTime() - first.getTime()) / 86_400_000;
    const w = Math.floor((diff + first.getUTCDay()) / 7) + 1;
    return `${y}-W${String(w).padStart(2, "0")}`;
  }
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function group<T>(
  rows: T[],
  dateOf: (r: T) => string | null | undefined,
  valueOf: (r: T) => number,
  grain: Grain,
): Array<{ label: string; value: number }> {
  const map = new Map<string, number>();
  for (const r of rows) {
    const iso = dateOf(r);
    if (!iso) continue;
    const key = bucket(iso, grain);
    map.set(key, (map.get(key) ?? 0) + valueOf(r));
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));
}

export interface TrendSet {
  sales: Array<{ label: string; value: number }>;
  collections: Array<{ label: string; value: number }>;
  procurement: Array<{ label: string; value: number }>;
  purchases: Array<{ label: string; value: number }>;
}

export async function getTrends(range: Range, grain: Grain): Promise<TrendSet> {
  const [inv, pay, po, vp] = await Promise.all([
    supabase
      .from("invoices")
      .select("issue_date,total")
      .gte("issue_date", range.from)
      .lte("issue_date", range.to),
    supabase
      .from("payments")
      .select("paid_at,amount")
      .gte("paid_at", range.from)
      .lte("paid_at", `${range.to}T23:59:59Z`),
    supabase
      .from("purchase_orders")
      .select("order_date,id")
      .gte("order_date", range.from)
      .lte("order_date", range.to),
    supabase
      .from("vendor_payments")
      .select("paid_at,amount")
      .gte("paid_at", range.from)
      .lte("paid_at", `${range.to}T23:59:59Z`),
  ]);
  for (const r of [inv, pay, po, vp]) if (r.error) throw new AppError(mapDbError(r.error));
  return {
    sales: group(
      inv.data ?? [],
      (r) => r.issue_date,
      (r) => Number(r.total ?? 0),
      grain,
    ),
    collections: group(
      pay.data ?? [],
      (r) => r.paid_at,
      (r) => Number(r.amount ?? 0),
      grain,
    ),
    procurement: group(
      po.data ?? [],
      (r) => r.order_date,
      () => 1,
      grain,
    ),
    purchases: group(
      vp.data ?? [],
      (r) => r.paid_at,
      (r) => Number(r.amount ?? 0),
      grain,
    ),
  };
}

export interface AgingBucket {
  bucket: string;
  amount: number;
  count: number;
}
export const AGING_BUCKETS = ["Current", "1–30", "31–60", "61–90", "90+"] as const;

function bucketize(daysOverdue: number): (typeof AGING_BUCKETS)[number] {
  if (daysOverdue <= 0) return "Current";
  if (daysOverdue <= 30) return "1–30";
  if (daysOverdue <= 60) return "31–60";
  if (daysOverdue <= 90) return "61–90";
  return "90+";
}

export async function getCustomerAging(): Promise<AgingBucket[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("balance_due,due_date,issue_date")
    .gt("balance_due", 0)
    .not("status", "in", '("cancelled","draft")');
  if (error) throw new AppError(mapDbError(error));
  const today = Date.now();
  const map = new Map<string, { amount: number; count: number }>();
  for (const b of AGING_BUCKETS) map.set(b, { amount: 0, count: 0 });
  for (const r of data ?? []) {
    const ref = r.due_date ?? r.issue_date;
    const days = ref ? Math.floor((today - new Date(ref).getTime()) / 86_400_000) : 0;
    const b = bucketize(days);
    const s = map.get(b)!;
    s.amount += Number(r.balance_due ?? 0);
    s.count += 1;
  }
  return AGING_BUCKETS.map((b) => ({
    bucket: b,
    ...(map.get(b) as { amount: number; count: number }),
  }));
}

export async function getVendorAging(): Promise<AgingBucket[]> {
  const { data, error } = await supabase.from("vendor_ledger").select("debit,credit,entry_date");
  if (error) throw new AppError(mapDbError(error));
  const today = Date.now();
  const perVendor = new Map<string, { amount: number; count: number }>();
  for (const b of AGING_BUCKETS) perVendor.set(b, { amount: 0, count: 0 });
  for (const r of data ?? []) {
    const bal = Number(r.debit ?? 0) - Number(r.credit ?? 0);
    if (bal <= 0) continue;
    const days = r.entry_date
      ? Math.floor((today - new Date(r.entry_date).getTime()) / 86_400_000)
      : 0;
    const b = bucketize(days);
    const s = perVendor.get(b)!;
    s.amount += bal;
    s.count += 1;
  }
  return AGING_BUCKETS.map((b) => ({
    bucket: b,
    ...(perVendor.get(b) as { amount: number; count: number }),
  }));
}

export interface RevenueSlice {
  label: string;
  value: number;
}

export async function getRevenueByProductFamily(range: Range): Promise<RevenueSlice[]> {
  const { data, error } = await supabase
    .from("invoice_items")
    .select("total, products!inner(family_id, product_families(name)), invoices!inner(issue_date)")
    .gte("invoices.issue_date", range.from)
    .lte("invoices.issue_date", range.to);
  if (error) throw new AppError(mapDbError(error));
  const map = new Map<string, number>();
  for (const r of (data ?? []) as unknown as Array<{
    total: number;
    products?: { product_families?: { name?: string } | null } | null;
  }>) {
    const fam = r.products?.product_families?.name ?? "Unassigned";
    map.set(fam, (map.get(fam) ?? 0) + Number(r.total ?? 0));
  }
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
}

export async function getRevenueByCustomer(range: Range): Promise<RevenueSlice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("total,customer_id,customers(name)")
    .gte("issue_date", range.from)
    .lte("issue_date", range.to);
  if (error) throw new AppError(mapDbError(error));
  const map = new Map<string, number>();
  for (const r of (data ?? []) as Array<{ total: number; customers?: { name?: string } | null }>) {
    const key = r.customers?.name ?? "Unknown";
    map.set(key, (map.get(key) ?? 0) + Number(r.total ?? 0));
  }
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);
}
