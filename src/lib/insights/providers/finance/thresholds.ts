/**
 * Configurable thresholds for the Finance Intelligence Pack (Phase G.3).
 *
 * Centralised for the same reason as `providers/sales/thresholds.ts` — one
 * obvious place to tune every provider's cutoffs instead of hard-coded
 * magic numbers scattered across files.
 */

export const PAYMENT_SCHEDULE_ADHERENCE_THRESHOLDS = {
  /** Paid fraction (0..1) below which a "partial" milestone counts as
   *  materially short rather than just slightly behind. */
  partialShortfallPct: 0.5,
  /** Days-until-due window in which a materially-short partial payment
   *  already counts as "slipping" (an early warning before it's overdue). */
  slippingWindowDays: 3,
};

export const VENDOR_PAYMENT_QUEUE_THRESHOLDS = {
  /** Vendors owed less than this (INR) are not queued at all. */
  minOutstandingInr: 5_000,
  /** Vendor risk score (0..100, from `listVendorScores`) at/above which the
   *  "critical supplier" weighting applies. */
  criticalRiskScore: 50,
};

export const MARGIN_WATCH_THRESHOLDS = {
  /** Net margin % below this (but above criticalMarginPct) is "low margin". */
  lowMarginPct: 15,
  /** Net margin % at/below this is "negative margin". */
  criticalMarginPct: 0,
};
