/**
 * Weighted-signal scoring helper for the Predictive Intelligence Framework.
 *
 * Deterministic: given the same signals it always returns the same score,
 * confidence and trace. No ML. See `types.ts` for the contract.
 */
import type {
  PredictConfidence,
  PredictSignal,
} from "./types";

export interface ScoreInput {
  /** Fired signals (label + value + weight in [0..1]). */
  signals: PredictSignal[];
  /**
   * Historical sample size behind the prediction (e.g. how many past invoices
   * were used to compute the customer's avg days-to-pay). Drives confidence.
   */
  sampleSize: number;
  /** Days since the freshest source row (0 = today). */
  recencyDays: number;
  /** How many independent signals the producer was designed to check. */
  expectedSignals: number;
  /** Thresholds override — otherwise defaults below. */
  thresholds?: {
    sampleHigh?: number;  // default 5
    sampleMed?: number;   // default 2
    recencyHigh?: number; // default 30
    recencyMed?: number;  // default 90
  };
}

export interface ScoreOutput {
  /** Weighted 0..1 score. */
  value: number;
  confidence: PredictConfidence;
  /** Component breakdown for the UI. */
  trace: {
    firedSignals: PredictSignal[];
    sampleTier: number;
    agreement: number;
    recency: number;
  };
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function score(input: ScoreInput): ScoreOutput {
  const t = input.thresholds ?? {};
  const sampleHigh = t.sampleHigh ?? 5;
  const sampleMed = t.sampleMed ?? 2;
  const recencyHigh = t.recencyHigh ?? 30;
  const recencyMed = t.recencyMed ?? 90;

  // 1. Raw weighted score from the signals that fired.
  const totalWeight = input.signals.reduce((a, s) => a + s.weight, 0);
  const value = clamp01(totalWeight);

  // 2. Confidence components (0..1 each).
  const sampleTier =
    input.sampleSize >= sampleHigh ? 1
    : input.sampleSize >= sampleMed ? 0.6
    : 0.2;
  const agreement = input.expectedSignals > 0
    ? clamp01(input.signals.length / input.expectedSignals)
    : 0;
  const recency =
    input.recencyDays <= recencyHigh ? 1
    : input.recencyDays <= recencyMed ? 0.6
    : 0.2;

  const cScore = sampleTier * 0.5 + agreement * 0.3 + recency * 0.2;
  const confidence: PredictConfidence =
    cScore >= 0.75 && input.signals.length >= 3 ? "high"
    : cScore >= 0.5 || input.signals.length >= 2 ? "medium"
    : "low";

  return {
    value,
    confidence,
    trace: {
      firedSignals: input.signals,
      sampleTier,
      agreement,
      recency,
    },
  };
}

/**
 * Convenience: only emit a prediction when the framework's noise rule holds
 * (≥ 2 independent signals OR at least one signal above `hardWeight`).
 */
export function shouldEmit(signals: PredictSignal[], hardWeight = 0.6): boolean {
  if (signals.length >= 2) return true;
  return signals.some((s) => s.weight >= hardWeight);
}
