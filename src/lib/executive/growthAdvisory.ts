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
 * Two independent triggers now feed the same advisory (Task #46, folding
 * in Rishi's ₹50L goal + liabilities message):
 *  1. Margin trigger — org-wide net margin below MARGIN_WATCH_THRESHOLDS
 *     .lowMarginPct (unchanged from the original build).
 *  2. Goal trigger — "I want the financial goal as Rs. 50 lakh of net
 *     margin for this year" (src/lib/finance/annualGoal.ts), net of real
 *     overhead this project-level rollup doesn't see: recurring monthly
 *     liabilities (src/lib/liabilities — is_recurring=true, active) and
 *     this calendar month's business expenses (petty cash — stationery,
 *     tea, etc., src/lib/business-expenses). These are genuine cash
 *     outflows the ₹50L target has to survive, and project profitability
 *     never included them (it only ever counted material/procurement/
 *     installation/labour/transport cost against a project), so
 *     subtracting them here is additive, not double-counting.
 *  Whichever trigger implies the LARGER required-revenue gap drives the
 *  headline number — see `driver` on the returned advisory. Both gaps are
 *  still reported so neither story gets lost.
 *
 *  Known approximation, stated rather than hidden: getProjectProfitability()
 *  has no fiscal-year filter (see that file) — "aggregateNetProfit" here is
 *  an all-time-to-date rollup over currently active projects, used as a
 *  stand-in for "profit generated so far this year" because there is no
 *  date-scoped profitability query in this codebase yet. Likewise, only
 *  one month's liabilities/expenses are netted off (not a running annual
 *  total), because there's no historical snapshot of past months to sum.
 *
 * The two recommendations (now sized off whichever revenue gap is larger):
 *  1. Price increase % — the % revenue would need to rise, holding today's
 *     costs and volume fixed, to close the gap. Pure algebra: margin =
 *     1 - costs/revenue, so revenue_needed = costs / (1 - target%). This
 *     assumes raising prices, not volume — stated explicitly in the
 *     advisory text so it isn't mistaken for a volume-growth number.
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
 * Returns null when NEITHER trigger fires (margin already at/above target
 * AND the ₹50L-minus-overhead goal is already met) — no advisory is
 * manufactured when things are fine, matching MarginWatchProvider's own
 * restraint.
 */
import { getProjectProfitability } from "@/lib/executive/profitability";
import { MARGIN_WATCH_THRESHOLDS } from "@/lib/insights/providers/finance/thresholds";
import { getAnnualNetMarginGoal } from "@/lib/finance/annualGoal";
import { listLiabilities } from "@/lib/liabilities/api";
import { getCurrentMonthExpenseTotal } from "@/lib/business-expenses/api";

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
  /** ₹50L (or whatever's configured) — see src/lib/finance/annualGoal.ts. */
  annualGoalAmount: number;
  /** Sum of active, is_recurring=true liabilities — one month's worth. */
  monthlyLiabilityTotal: number;
  /** Sum of active, is_recurring=false liabilities — reported, not netted off (not a recurring monthly drain). */
  oneTimeLiabilityTotal: number;
  /** This calendar month's business-expense (petty cash) total. */
  currentMonthExpenseTotal: number;
  /** aggregateNetProfit minus monthlyLiabilityTotal and currentMonthExpenseTotal. */
  effectiveNetProfit: number;
  /** Revenue gap implied by the margin-threshold trigger alone (0 if margin is already healthy). */
  marginGapRevenue: number;
  /** Revenue gap implied by the annual-goal trigger alone (0 if the goal is already met). */
  goalGapRevenue: number;
  /** Which trigger produced the larger (and therefore reported) revenue gap. */
  driver: "margin" | "goal";
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
  const aggregateCosts = aggregateRevenue - aggregateNetProfit;

  const [annualGoal, liabilities, currentMonthExpenseTotal] = await Promise.all([
    getAnnualNetMarginGoal(),
    listLiabilities(true),
    getCurrentMonthExpenseTotal(),
  ]);
  const monthlyLiabilityTotal = liabilities
    .filter((l) => l.is_recurring)
    .reduce((s, l) => s + l.amount, 0);
  const oneTimeLiabilityTotal = liabilities
    .filter((l) => !l.is_recurring)
    .reduce((s, l) => s + l.amount, 0);
  const effectiveNetProfit = aggregateNetProfit - monthlyLiabilityTotal - currentMonthExpenseTotal;

  // Trigger 1: margin below the healthy-cutoff threshold.
  const marginGapRevenue =
    aggregateMarginPct < targetMarginPct
      ? Math.max(0, aggregateCosts / (1 - targetMarginPct / 100) - aggregateRevenue)
      : 0;

  // Trigger 2: the ₹50L (or configured) annual goal, net of real overhead.
  // Convert the profit shortfall to a revenue figure using today's margin
  // rate as the profit-per-revenue-rupee ratio; if the org has no margin
  // at all right now (aggregateMarginPct <= 0), fall back to the target
  // margin rate so the math still produces a sane (if conservative) number
  // instead of dividing by zero or a negative rate.
  const additionalProfitNeeded = Math.max(0, annualGoal.amount - effectiveNetProfit);
  const profitRate = (aggregateMarginPct > 0 ? aggregateMarginPct : targetMarginPct) / 100;
  const goalGapRevenue = additionalProfitNeeded > 0 ? additionalProfitNeeded / profitRate : 0;

  const additionalRevenueNeeded = Math.max(marginGapRevenue, goalGapRevenue);
  if (additionalRevenueNeeded <= 0) return null; // both triggers are satisfied — no advisory

  const driver: "margin" | "goal" = marginGapRevenue >= goalGapRevenue ? "margin" : "goal";
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
    annualGoalAmount: annualGoal.amount,
    monthlyLiabilityTotal,
    oneTimeLiabilityTotal,
    currentMonthExpenseTotal,
    effectiveNetProfit,
    marginGapRevenue,
    goalGapRevenue,
    driver,
    // Rounded so the key is stable across trivial re-computation noise but
    // still changes when the underlying figures materially move.
    key: `${Math.round(aggregateMarginPct * 10)}:${Math.round(priceIncreasePct * 10)}:${customersNeeded}:${driver}`,
  };
}

export function formatGrowthAdvisoryTitle(a: GrowthAdvisory): string {
  if (a.driver === "goal") {
    return `On track to miss the ₹${Math.round(a.annualGoalAmount).toLocaleString("en-IN")} annual net-margin goal`;
  }
  return `Margins are at ${a.aggregateMarginPct.toFixed(1)}% — below the ${a.targetMarginPct}% target`;
}

export function formatGrowthAdvisoryBody(a: GrowthAdvisory): string {
  const overheadNote =
    a.monthlyLiabilityTotal > 0 || a.currentMonthExpenseTotal > 0
      ? ` (after netting off ₹${Math.round(a.monthlyLiabilityTotal).toLocaleString("en-IN")} in monthly liabilities and ₹${Math.round(a.currentMonthExpenseTotal).toLocaleString("en-IN")} in this month's business expenses)`
      : "";
  const driverLine =
    a.driver === "goal"
      ? `Effective net profit${overheadNote} is ₹${Math.round(a.effectiveNetProfit).toLocaleString("en-IN")} against the ₹${Math.round(a.annualGoalAmount).toLocaleString("en-IN")} annual goal. `
      : `Across ${a.projectCount} billed project${a.projectCount === 1 ? "" : "s"}, net margin is ${a.aggregateMarginPct.toFixed(1)}% against a ${a.targetMarginPct}% target. `;
  return (
    driverLine +
    `To close the gap, either raise prices by roughly ${a.priceIncreasePct.toFixed(1)}%, or bring in about ` +
    `${a.customersNeeded} more customer${a.customersNeeded === 1 ? "" : "s"} of ₹${Math.round(a.avgDealSize).toLocaleString("en-IN")}+ ` +
    `each in the next 30 days. Whichever it is, it's a target to work toward, not a forecast — ` +
    `there's no historical trend data behind the 30-day window, only today's numbers.`
  );
}
