/**
 * Growth Advisory — org-wide margin/pricing/sales-target recommendation.
 *
 * Rishi's request (2026-09-04): "an AI which should tell us to raise our
 * margins to what prices to keep up with a healthy flow of money in the
 * organisation... a statement like you have to increase the prices by
 * this much percentage, or increase the sales by 7 more customers of more
 * than this amount in the coming 30 days."
 *
 * This is a genuine business-policy computation, not a guess dressed up as
 * one — every number here is either read from real data or reuses a
 * threshold this codebase already established and already surfaces to
 * users (MARGIN_WATCH_THRESHOLDS.lowMarginPct = 15%, from
 * src/lib/insights/providers/finance/thresholds.ts — MarginWatchProvider
 * already flags any project below this as "thin margin" on live
 * dashboards). No new number is invented here; 15% is adopted as the
 * organization's target margin because it is the one this app already
 * treats as the healthy cutoff, not because this feature picked it.
 * Rishi can tune MARGIN_WATCH_THRESHOLDS.lowMarginPct directly if 15% is
 * wrong for the business — both this and MarginWatchProvider read the
 * same constant, so they'd move together.
 *
 * Data source: getProjectProfitability() (src/lib/executive/profitability.ts)
 * — the same rollup MarginWatchProvider already uses per-project. This
 * aggregates it org-wide, across every currently-active project with real
 * billed sales (actual_sales > 0 — nothing invoiced yet has no real margin
 * to judge, same filter MarginWatchProvider applies).
 *
 * The two recommendations:
 *  1. Price increase % — the % revenue would need to rise, holding today's
 *     costs and volume fixed, to bring net margin up to the target. Pure
 *     algebra: margin = 1 - costs/revenue, so revenue_needed =
 *     costs / (1 - target%). This assumes raising prices, not volume —
 *     stated explicitly in the advisory text so it isn't mistaken for a
 *     volume-growth number.
 *  2. Sales target — an alternative to a price rise: how many more
 *     customers, of roughly today's average deal size, would close the
 *     same revenue gap. "Average deal size" is the org's average
 *     actual_sales per distinct customer name across the same project set
 *     — an approximation (customer_id isn't exposed by
 *     getProjectProfitability, only customer_name), documented rather
 *     than hidden. The "30 days" window is Rishi's own stated cadence for
 *     setting this kind of target, not a number computed from historical
 *     trend data — this app has no historical margin/revenue snapshot
 *     table (the same honesty note MarginWatchProvider's doc comment
 *     makes about "declining trend"), so there's no real prior-period
 *     figure to project a rate from. This is a live point-in-time
 *     recommendation, recomputed each time it runs — not a forecast.
 *
 * Returns null when the org's aggregate margin already meets the target
 * (or there's no real sales data yet) — no advisory is manufactured when
 * things are fine, matching MarginWatchProvider's own restraint.
 */
import { getProjectProfitability } from "@/lib/executive/profitability";
import { MARGIN_WATCH_THRESHOLDS } from "@/lib/insights/providers/finance/thresholds";

export interface GrowthAdvisory {
  targetMarginPct: number;
  aggregateMarginPct: number;
  aggregateRevenue: number;
  aggregateCosts: number;
  additionalRevenueNeeded: number;
  priceIncreasePct: number;
  avgDealSize: number;
  customersNeeded: number;
  projectCount: number;
  /** Stable-ish id for de-dupe (changes only when the underlying figures move). */
  key: string;
}

export async function computeGrowthAdvisory(): Promise<GrowthAdvisory | null> {
  const targetMarginPct = MARGIN_WATCH_THRESHOLDS.lowMarginPct;
  const projects = (await getProjectProfitability()).filter((p) => p.actual_sales > 0);
  if (projects.length === 0) return null;

  const aggregateRevenue = projects.reduce((s, p) => s + p.actual_sales, 0);
  const aggregateNetProfit = projects.reduce((s, p) => s + p.net_profit, 0);
  if (aggregateRevenue <= 0) return null;

  const aggregateMarginPct = (aggregateNetProfit / aggregateRevenue) * 100;
  if (aggregateMarginPct >= targetMarginPct) return null; // already healthy — no advisory

  const aggregateCosts = aggregateRevenue - aggregateNetProfit;
  const requiredRevenue = aggregateCosts / (1 - targetMarginPct / 100);
  const additionalRevenueNeeded = Math.max(0, requiredRevenue - aggregateRevenue);
  const priceIncreasePct = (additionalRevenueNeeded / aggregateRevenue) * 100;

  const distinctCustomers = new Set(
    projects.map((p) => p.customer_name).filter((n): n is string => !!n),
  ).size;
  const avgDealSize =
    distinctCustomers > 0 ? aggregateRevenue / distinctCustomers : aggregateRevenue;
  const customersNeeded = avgDealSize > 0 ? Math.ceil(additionalRevenueNeeded / avgDealSize) : 0;

  return {
    targetMarginPct,
    aggregateMarginPct,
    aggregateRevenue,
    aggregateCosts,
    additionalRevenueNeeded,
    priceIncreasePct,
    avgDealSize,
    customersNeeded,
    projectCount: projects.length,
    // Rounded so the key is stable across trivial re-computation noise but
    // still changes when the underlying figures materially move.
    key: `${Math.round(aggregateMarginPct * 10)}:${Math.round(priceIncreasePct * 10)}:${customersNeeded}`,
  };
}

export function formatGrowthAdvisoryTitle(a: GrowthAdvisory): string {
  return `Margins are at ${a.aggregateMarginPct.toFixed(1)}% — below the ${a.targetMarginPct}% target`;
}

export function formatGrowthAdvisoryBody(a: GrowthAdvisory): string {
  return (
    `Across ${a.projectCount} billed project${a.projectCount === 1 ? "" : "s"}, net margin is ` +
    `${a.aggregateMarginPct.toFixed(1)}% against a ${a.targetMarginPct}% target. To close the gap, ` +
    `either raise prices by roughly ${a.priceIncreasePct.toFixed(1)}%, or bring in about ` +
    `${a.customersNeeded} more customer${a.customersNeeded === 1 ? "" : "s"} of ₹${Math.round(a.avgDealSize).toLocaleString("en-IN")}+ ` +
    `each in the next 30 days. Whichever it is, it's a target to work toward, not a forecast — ` +
    `there's no historical trend data behind the 30-day window, only today's numbers.`
  );
}
