/**
 * Configuration only for the Operations Intelligence Pack (Phase G.4) — no
 * logic lives here, mirroring `providers/sales/thresholds.ts` and
 * `providers/finance/thresholds.ts`.
 */

export const DISPATCH_RISK_THRESHOLDS = {
  /** A "planned" dispatch due within this many days counts as due-soon. */
  dueSoonDays: 3,
  /** An "in_transit" dispatch older than this many days without being
   *  marked delivered counts as pending completion. */
  inTransitStallDays: 5,
  /** A Sales Order's delivery_date within this many days counts as
   *  "imminent" when checking production completeness. */
  deliveryImminentDays: 5,
};

export const INSTALLATION_DELAY_THRESHOLDS = {
  /** An in-progress installation with no progress report in this many days
   *  (and started at least that long ago) counts as stalled. */
  stalledNoReportDays: 5,
  /** A "planned" installation whose planned_start_date is within this many
   *  days, with no team assigned yet, counts as nearing without prep. */
  nearingWithoutPrepDays: 5,
};

export const PRODUCTION_BOTTLENECK_THRESHOLDS = {
  /** A stage still open longer than its own `typical_days` * this
   *  multiplier counts as stalled. Uses the app's own per-stage
   *  `typical_days` baseline — never a fabricated capacity number. */
  stageStallMultiplier: 2,
  /** This many or more simultaneously-stalled orders sitting at the same
   *  stage counts as a stage-level bottleneck (overload), not just an
   *  individually slow order. */
  stageOverloadMinOrders: 3,
  /** A production order counts as overdue this many days after
   *  planned_end with no completed_at. */
  overdueGraceDays: 0,
};
