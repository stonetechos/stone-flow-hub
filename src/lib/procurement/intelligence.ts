/** Procurement Intelligence — derive Best/Fastest/Cheapest/Preferred recommendations
 *  from the existing RFQ quote comparison rows. Explanations are generated
 *  from actual quote metrics — no placeholders.
 */
import type { QuoteComparisonRow } from "@/lib/quotes/comparison";

export type RecommendationKind = "best" | "fastest" | "cheapest" | "preferred";

export interface ProcurementRecommendation {
  kind: RecommendationKind;
  vendorId: string | null;
  vendorName: string;
  quoteId: string | null;
  totalCost: number;
  dispatchDays: number | null;
  rating: number | null;
  reason: string;
}

function best(rows: QuoteComparisonRow[]): QuoteComparisonRow | null {
  const submitted = rows.filter((r) => !!r.quote?.submitted_at);
  if (!submitted.length) return null;
  // Composite: cheapest 40%, fastest 30%, rating 30%
  const minCost = Math.min(...submitted.map((r) => r.totalCost || Infinity));
  const minDays = Math.min(...submitted.map((r) => r.quote?.dispatch_days ?? Infinity));
  const maxRating = Math.max(...submitted.map((r) => Number(r.vendor.rating ?? 0)));
  const scored = submitted.map((r) => {
    const priceScore = minCost > 0 ? minCost / (r.totalCost || Infinity) : 0;
    const dispatchScore = minDays > 0 ? minDays / (r.quote?.dispatch_days ?? Infinity) : 0;
    const ratingScore = maxRating > 0 ? Number(r.vendor.rating ?? 0) / maxRating : 0;
    return { r, score: 0.4 * priceScore + 0.3 * dispatchScore + 0.3 * ratingScore };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.r ?? null;
}

export function buildRecommendations(rows: QuoteComparisonRow[]): ProcurementRecommendation[] {
  const submitted = rows.filter((r) => !!r.quote?.submitted_at);
  const out: ProcurementRecommendation[] = [];
  const pack = (kind: RecommendationKind, r: QuoteComparisonRow | null | undefined, reason: string) => {
    if (!r) return;
    out.push({
      kind,
      vendorId: r.vendor.id,
      vendorName: r.vendor.company_name,
      quoteId: r.quote?.id ?? null,
      totalCost: r.totalCost,
      dispatchDays: r.quote?.dispatch_days ?? null,
      rating: r.vendor.rating,
      reason,
    });
  };

  if (submitted.length === 0) return out;

  const cheapest = submitted.reduce((a, b) => (a.totalCost <= b.totalCost ? a : b));
  pack("cheapest", cheapest, `Lowest total cost ₹${cheapest.totalCost.toLocaleString("en-IN")}` +
    (cheapest.quote?.stock_available ? " with stock on hand." : "."));

  const fastest = submitted
    .filter((r) => r.quote?.dispatch_days != null)
    .reduce<QuoteComparisonRow | null>(
      (a, b) => (!a || (b.quote?.dispatch_days ?? Infinity) < (a.quote?.dispatch_days ?? Infinity) ? b : a),
      null,
    );
  pack("fastest", fastest, fastest?.quote?.dispatch_days != null
    ? `Ships in ${fastest.quote.dispatch_days} days — fastest amongst all vendors.`
    : "");

  const preferred = submitted.find((r) => r.perf?.is_preferred) ?? null;
  pack("preferred", preferred,
    preferred ? `Marked as preferred vendor with performance score ${Math.round(preferred.perf?.score ?? 0)}.` : "");

  const overall = best(submitted);
  pack("best", overall,
    overall
      ? `Best balance of price (₹${overall.totalCost.toLocaleString("en-IN")}), lead time (${overall.quote?.dispatch_days ?? "?"}d) and rating (${overall.vendor.rating ?? "—"}).`
      : "");

  return out;
}
