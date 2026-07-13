/**
 * Predictive Intelligence Framework — public barrel.
 *
 * Foundation only (Phase G.0.1). Domain predictors land in siblings:
 *   ./sales.ts   ./ops.ts   ./finance.ts   ./procurement.ts   ./customer.ts
 *
 * Every predictor imports from here and returns `Prediction[]` records
 * consumed by the Insight Bus and rendered via `<InsightCard />`.
 */
export * from "./types";
export * from "./score";
export * from "./baselines";
export { THRESHOLDS } from "./thresholds";
export type { PredictThresholds } from "./thresholds";
