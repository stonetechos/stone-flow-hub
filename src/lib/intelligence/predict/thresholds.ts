/**
 * Business-tunable thresholds for the Predictive Intelligence Framework.
 * Change values here to retune predictors without editing producer logic.
 */

export const THRESHOLDS = {
  sales: {
    quoteAgingWarnDays: 7,
    quoteAgingHotDays: 14,
    enquiryColdDays: 14,
    enquiryStuckMultiplier: 2, // stage-age > multiplier × stage-median
    repeatOrderStableMinOrders: 3,
    stopBuyingRecencyMultiplier: 2,
  },
  ops: {
    dispatchGapDangerDays: 3,
    bottleneckConsecutiveDays: 3,
    inventoryVarianceHigh: 0.25,
    inventoryVarianceMed: 0.6,
    installationConflictHours: 4,
  },
  finance: {
    delayMinHistoryInvoices: 3,
    marginErosionRatio: 1.1, // actual > 110 % of estimated
    forecastCoverageHigh: 0.8,
  },
  procurement: {
    stockoutDangerDays: 3,
    stockoutWarnDays: 7,
    preferredVendorMinPOs: 3,
    batchingWindowDays: 14,
  },
  customer: {
    churnDeclineSignals: 3,
    upsellMinSegmentSize: 5,
    crossSellMinLift: 2,
    crossSellMinSupport: 5,
    vipRevenuePercentile: 0.9,
    vipOnTimeRatio: 0.8,
    vipTenureMonths: 12,
  },
  confidence: {
    sampleHigh: 5,
    sampleMed: 2,
    recencyHigh: 30,
    recencyMed: 90,
  },
} as const;

export type PredictThresholds = typeof THRESHOLDS;
