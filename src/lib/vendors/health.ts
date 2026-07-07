/**
 * AI Vendor Health.
 *
 * Reads the already-maintained `vendor_performance_cache` (kept fresh by
 * triggers on vendor_requests / vendor_quotes / purchase_orders) and
 * derives a Preferred / Good / Average / Risk / Blacklisted tier with a
 * human-readable explanation. No extra network calls: the source is a
 * single-row lookup per vendor.
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";

export type PerformanceRow = DbTable<"vendor_performance_cache">;

export type HealthTier = "preferred" | "good" | "average" | "risk" | "blacklisted";

export interface VendorHealth {
  tier: HealthTier;
  score: number;
  label: string;
  reasons: string[];
  perf: PerformanceRow | null;
}

export async function getVendorHealth(vendorId: string): Promise<VendorHealth> {
  const [perfRes, vendorRes] = await Promise.all([
    supabase.from("vendor_performance_cache").select("*").eq("vendor_id", vendorId).maybeSingle(),
    supabase
      .from("vendors")
      .select("is_preferred,is_active,rating,lead_time_days,lifecycle_status" as never)
      .eq("id", vendorId)
      .maybeSingle(),
  ]);
  if (perfRes.error) throw new AppError(mapDbError(perfRes.error));
  if (vendorRes.error) throw new AppError(mapDbError(vendorRes.error));

  const perf = perfRes.data ?? null;
  const vendor = (vendorRes.data ?? {}) as {
    is_preferred?: boolean;
    is_active?: boolean;
    rating?: number | null;
    lifecycle_status?: string | null;
  };

  return classify(perf, vendor);
}

function classify(
  perf: PerformanceRow | null,
  vendor: {
    is_preferred?: boolean;
    is_active?: boolean;
    rating?: number | null;
    lifecycle_status?: string | null;
  },
): VendorHealth {
  const reasons: string[] = [];

  if (vendor.lifecycle_status === "archived" || vendor.lifecycle_status === "deleted") {
    return {
      tier: "blacklisted",
      score: 0,
      label: "Blacklisted",
      reasons: [`Vendor is ${vendor.lifecycle_status}.`],
      perf,
    };
  }

  const score = Number(perf?.score ?? 0);
  const approval = Number(perf?.approval_pct ?? 0);
  const respHours = perf?.avg_response_hours == null ? null : Number(perf.avg_response_hours);
  const delayPct = Number(perf?.delay_pct ?? 0);
  const orders = Number(perf?.orders_count ?? 0);
  const preferred = !!vendor.is_preferred;

  if (approval > 0) reasons.push(`${approval.toFixed(0)}% of quotes approved.`);
  if (respHours != null) reasons.push(`Avg response ${respHours.toFixed(1)} h.`);
  if (delayPct > 0) reasons.push(`${delayPct.toFixed(0)}% of orders delayed.`);
  if (orders > 0) reasons.push(`${orders} completed purchase order${orders === 1 ? "" : "s"}.`);
  if (vendor.rating != null) reasons.push(`Manual rating ${Number(vendor.rating).toFixed(1)}/5.`);
  if (preferred) reasons.push("Marked as preferred by procurement.");
  if (reasons.length === 0) reasons.push("Not enough history yet — new vendor.");

  let tier: HealthTier;
  let label: string;
  if (preferred || score >= 80) {
    tier = "preferred"; label = "Preferred";
  } else if (score >= 60) {
    tier = "good"; label = "Good";
  } else if (score >= 40 || orders === 0) {
    tier = "average"; label = "Average";
  } else if (delayPct >= 40 || approval < 20) {
    tier = "risk"; label = "Risk";
  } else {
    tier = "average"; label = "Average";
  }

  return { tier, score, label, reasons, perf };
}
