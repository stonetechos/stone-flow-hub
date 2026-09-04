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
};

export const INSTALLATION_DELAY_THRESHOLDS = {
  /** An in-progress installation with no progress report in this many days
   *  (and started at least that long ago) counts as stalled. */
  stalledNoReportDays: 5,
  /** A "planned" installation whose planned_start_date is within this many
   *  days, with no team assigned yet, counts as nearing without prep. */
  nearingWithoutPrepDays: 5,
};
