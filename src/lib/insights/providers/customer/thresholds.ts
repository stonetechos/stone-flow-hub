/**
 * Configuration only for the Customer Intelligence Pack (Phase G.5) — no
 * logic lives here, mirroring the sales/finance/operations thresholds.ts
 * files.
 */

export const CUSTOMER_HEALTH_THRESHOLDS = {
  /** Overdue-balance points (see CustomerHealthProvider's scoring). */
  overdueDaysMajor: 60,
  overdueDaysMinor: 30,
  /** Inactivity points — days since the most recent invoice/receipt/
   *  enquiry/follow-up touch, whichever is most recent. */
  inactivityDaysMajor: 180,
  inactivityDaysMinor: 90,
  /** Pending follow-ups linked to this customer at/above this count adds
   *  a backlog point. */
  followupBacklogMin: 3,
  /** Point totals -> health level cutoffs. */
  watchScoreMin: 1,
  riskScoreMin: 3,
  criticalScoreMin: 5,
};

export const CUSTOMER_LTV_THRESHOLDS = {
  /** Top N customers by lifetime revenue count as "top-value". */
  topValueRank: 10,
  /** Lifetime revenue at/above this (INR) counts as "large lifetime
   *  spend", independent of rank. */
  largeLifetimeSpendMinInr: 1_000_000,
  /** A customer whose recent-window revenue is at least this multiple of
   *  their prior-window revenue counts as "rapidly growing" (prior window
   *  must be > 0 — growth from a zero baseline isn't a real ratio). */
  growthMultiplier: 1.5,
};

export const CUSTOMER_HYGIENE_THRESHOLDS = {
  /** customer_type values that operate as registered businesses and are
   *  expected to have a GSTIN on file. Individuals/architects/interior
   *  designers/"other" commonly transact without one, so they're excluded
   *  rather than guessed at. */
  gstinRequiredTypes: ["company", "builder", "contractor", "government"] as const,
};

export const REPEAT_BUSINESS_THRESHOLDS = {
  /** Invoiced (completed) orders at/above this count = repeat. */
  minInvoicedOrders: 3,
  /** Sales Orders (any non-cancelled status) at/above this count = repeat. */
  minSalesOrders: 3,
  /** Enquiries at/above this count = repeat engagement (funnel-stage
   *  signal, so the bar is a little higher than completed orders). */
  minEnquiries: 4,
};
