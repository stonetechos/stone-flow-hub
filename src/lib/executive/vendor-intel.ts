/** Vendor intelligence — reuses `vendor_performance_cache` and `vendor_ledger`. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export interface VendorScore {
  vendor_id: string;
  name: string;
  purchase_value: number;
  orders_count: number;
  approval_pct: number;
  delay_pct: number;
  avg_response_hours: number | null;
  avg_dispatch_days: number | null;
  is_preferred: boolean;
  outstanding: number;
  reliability: number;
  quality: number;
  risk: number;
}

export interface VendorIntel {
  top: VendorScore[];
  most_reliable: VendorScore[];
  fastest: VendorScore[];
  lowest_cost: VendorScore[];
  highest_quality: VendorScore[];
  high_risk: VendorScore[];
  dependency: Array<{ name: string; share_pct: number; purchase_value: number }>;
}

export async function getVendorIntel(): Promise<VendorIntel> {
  const [perfRes, vendRes, ledRes] = await Promise.all([
    supabase.from("vendor_performance_cache").select("*"),
    supabase.from("vendors").select("id,company_name").eq("is_active", true),
    supabase.from("vendor_ledger").select("vendor_id,debit,credit"),
  ]);
  for (const r of [perfRes, vendRes, ledRes]) if (r.error) throw new AppError(mapDbError(r.error));

  const nameMap = new Map<string, string>((vendRes.data ?? []).map((v) => [v.id, (v as { company_name: string }).company_name] as const));
  const outMap = new Map<string, number>();
  for (const r of (ledRes.data ?? []) as Array<{ vendor_id: string | null; debit: number | null; credit: number | null }>) {
    if (!r.vendor_id) continue;
    outMap.set(r.vendor_id, (outMap.get(r.vendor_id) ?? 0) + Number(r.debit ?? 0) - Number(r.credit ?? 0));
  }
  type Perf = { vendor_id: string; purchase_value: number; orders_count: number; approval_pct: number; delay_pct: number; avg_response_hours: number | null; avg_dispatch_days: number | null; is_preferred: boolean };
  const scores: VendorScore[] = ((perfRes.data ?? []) as Perf[]).map((p) => {
    const reliability = Math.max(0, 100 - Number(p.delay_pct ?? 0));
    const quality = Number(p.approval_pct ?? 0);
    const risk = Math.max(0, Number(p.delay_pct ?? 0) * 0.6 + (100 - quality) * 0.4);
    return {
      vendor_id: p.vendor_id,
      name: nameMap.get(p.vendor_id) ?? "Unknown",
      purchase_value: Number(p.purchase_value ?? 0),
      orders_count: Number(p.orders_count ?? 0),
      approval_pct: quality,
      delay_pct: Number(p.delay_pct ?? 0),
      avg_response_hours: p.avg_response_hours,
      avg_dispatch_days: p.avg_dispatch_days,
      is_preferred: !!p.is_preferred,
      outstanding: Math.max(0, outMap.get(p.vendor_id) ?? 0),
      reliability,
      quality,
      risk,
    };
  });
  const totalSpend = scores.reduce((s, v) => s + v.purchase_value, 0) || 1;

  return {
    top: [...scores].sort((a, b) => b.purchase_value - a.purchase_value).slice(0, 15),
    most_reliable: scores.filter((s) => s.orders_count >= 2).sort((a, b) => b.reliability - a.reliability).slice(0, 15),
    fastest: scores.filter((s) => s.avg_dispatch_days != null).sort((a, b) => (a.avg_dispatch_days ?? 999) - (b.avg_dispatch_days ?? 999)).slice(0, 15),
    lowest_cost: [...scores].sort((a, b) => (a.purchase_value / Math.max(1, a.orders_count)) - (b.purchase_value / Math.max(1, b.orders_count))).slice(0, 15),
    highest_quality: [...scores].sort((a, b) => b.quality - a.quality).slice(0, 15),
    high_risk: [...scores].sort((a, b) => b.risk - a.risk).filter((s) => s.risk > 30).slice(0, 15),
    dependency: [...scores].sort((a, b) => b.purchase_value - a.purchase_value).slice(0, 10)
      .map((s) => ({ name: s.name, purchase_value: s.purchase_value, share_pct: (s.purchase_value / totalSpend) * 100 })),
  };
}
