/**
 * Smart vendor recommendations for RFQs. Wraps the `recommend_vendors_for_rfq`
 * RPC and returns rows ready for the RFQ recommendation panel.
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export type RecommendedVendor = {
  vendor_id: string;
  company_name: string;
  vendor_code: string;
  city: string | null;
  rating: number | null;
  lead_time_days: number | null;
  score: number;
  is_preferred: boolean;
  approval_pct: number;
  avg_response_hours: number | null;
  orders_count: number;
  capability_match_count: number;
  stone_match: boolean;
};

export async function recommendVendorsForRfq(rfqId: string): Promise<RecommendedVendor[]> {
  const { data, error } = await supabase.rpc(
    "recommend_vendors_for_rfq" as never,
    { p_rfq_id: rfqId } as never,
  );
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as RecommendedVendor[];
}

/** Tier label + star count derived from score + preferred flag. */
export function tierFor(
  v: Pick<RecommendedVendor, "score" | "is_preferred" | "stone_match">,
): { label: string; stars: number; tone: "default" | "secondary" | "outline" } {
  if (v.is_preferred || v.score >= 75) return { label: "Recommended", stars: 5, tone: "default" };
  if (v.score >= 50 || v.stone_match) return { label: "Good", stars: 4, tone: "secondary" };
  return { label: "Backup", stars: 3, tone: "outline" };
}
