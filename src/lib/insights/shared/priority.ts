/**
 * Shared, deterministic priority/confidence scoring for insight providers.
 *
 * Not a prediction model — a fixed formula over already-known facts (how
 * overdue something is, how much money is involved, how complete the
 * underlying data is). Every Sales Intelligence provider calls this so
 * cross-provider sorting in `useInsights` behaves consistently, and so no
 * individual provider reimplements its own scoring curve (Phase G.2
 * explicitly disallows duplicated scoring logic, and separately forbids
 * introducing prediction scoring / AI — this is neither: same inputs
 * always produce the same output).
 */

export interface PriorityInputs {
  /** Days past the point this became noteworthy (overdue days, days stale,
   *  days beyond a stage's expected activity window, etc). Negative/zero
   *  values are treated as "not yet urgent". */
  urgencyDays: number;
  /** Business value in INR, when known (quote total, enquiry budget). */
  valueInr?: number;
}

/**
 * Relative sort weight — never displayed to the user, only used to order
 * insights within and across providers. Urgency dominates; value is a
 * secondary, logarithmically-dampened boost so a very large quote doesn't
 * automatically outrank a badly overdue follow-up on a modest one.
 */
export function computePriority({ urgencyDays, valueInr }: PriorityInputs): number {
  const urgency = Math.max(0, urgencyDays);
  const valueBoost = valueInr && valueInr > 0 ? Math.log10(valueInr) * 3 : 0;
  return Math.round(urgency + valueBoost);
}

/**
 * Deterministic confidence, 0..1 — how completely the underlying data
 * supports an insight, not a probability estimate. Starts at 1 (the rule
 * fired on a complete, direct signal) and steps down for every "weaker
 * fallback signal" a provider had to use instead (e.g. no activity_log
 * entries at all, only the record's own `created_at` as a stand-in).
 * Floors at 0.5 — below that, a provider shouldn't be emitting the
 * insight at all rather than reporting low confidence.
 */
export function computeConfidence(weakSignalCount: number): number {
  return Math.max(0.5, Number((1 - weakSignalCount * 0.15).toFixed(2)));
}
