/**
 * Phase G.0 — Predictive Intelligence Framework.
 *
 * Shared contracts used by every deterministic predictor. No ML, no external
 * AI. Predictors are pure async functions that read existing tables via the
 * standard Supabase client and return `Prediction` records with a full
 * explainability trace so the UI never renders a black-box number.
 */

export type PredictModule = "sales" | "ops" | "finance" | "procurement" | "customer";

export type PredictSeverity = "info" | "warning" | "danger";

export type PredictConfidence = "high" | "medium" | "low";

/** One rule that fired while producing a prediction. */
export interface PredictSignal {
  /** Short human label ("Silent > 14 days"). */
  label: string;
  /** Raw value that triggered the signal (kept as number|string for UI). */
  value: number | string;
  /** Weight contributed to the overall score in [0..1]. */
  weight: number;
}

/** A concrete row consulted to build the prediction — always link-able. */
export interface PredictRecordRef {
  type: string; // "quote" | "invoice" | "sales_order" | ...
  id: string;
  note?: string; // e.g. "18 days old"
}

/** Explainability payload — every prediction MUST return this. */
export interface PredictExplanation {
  why: string;
  signals: PredictSignal[];
  recordsAnalysed: PredictRecordRef[];
  suggestedAction: { label: string; to: string };
  expectedOutcome: string;
}

/** Canonical prediction record consumed by the Insight Bus. */
export interface Prediction {
  id: string; // stable dedup key
  module: PredictModule;
  kind: string; // producer id, e.g. "sales.quote-conversion"
  severity: PredictSeverity;
  confidence: PredictConfidence;
  score: number; // 0..1
  title: string; // imperative recommendation
  entityRef?: PredictRecordRef; // primary entity (for grouping / links)
  value?: number; // ₹ or days impact, optional
  expiresAt?: string; // ISO — hide after this
  explanation: PredictExplanation;
}
