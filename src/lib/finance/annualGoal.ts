/**
 * ₹50L annual net-margin goal (Task #44) — Rishi: "I want the financial
 * goal as Rs. 50 lakh of net margin for this year." Stored as a single
 * app_settings row (key "finance.annual_net_margin_goal") rather than a
 * new table — see that migration-less decision noted in
 * 20260904170000_liabilities_business_expenses.sql's header.
 *
 * Shared between the Liabilities page (where it's edited) and
 * growthAdvisory.ts (Task #46, where it's read to size the required
 * revenue/price move) so both agree on the shape and the ₹50L fallback.
 */
import { getAppSetting, upsertAppSetting } from "@/lib/app-settings/api";

export interface AnnualNetMarginGoal {
  amount: number;
  /** Free-text label, e.g. "FY 2026-27". Optional — purely descriptive. */
  label?: string;
}

/** Rishi's stated goal — used until he (an admin) saves a different value. */
export const DEFAULT_ANNUAL_NET_MARGIN_GOAL = 5_000_000;

export async function getAnnualNetMarginGoal(): Promise<AnnualNetMarginGoal> {
  const stored = await getAppSetting<AnnualNetMarginGoal>("finance.annual_net_margin_goal");
  if (stored && Number.isFinite(stored.amount) && stored.amount > 0) return stored;
  return { amount: DEFAULT_ANNUAL_NET_MARGIN_GOAL };
}

/** Admin-only write — app_settings' RLS policy only grants admin an INSERT/UPDATE. */
export async function setAnnualNetMarginGoal(goal: AnnualNetMarginGoal): Promise<void> {
  await upsertAppSetting(
    "finance.annual_net_margin_goal",
    goal as unknown as Record<string, unknown>,
    "Annual net-margin target used by the Growth Advisory.",
  );
}
