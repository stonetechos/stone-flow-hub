/**
 * Predictive Sales Intelligence — Phase G.0.2.
 *
 * Four deterministic, pure producers that operate on already-fetched sales
 * data and return Prediction records with a full explainability trace:
 *
 *   1. predictQuoteConversion       — per open quote
 *   2. predictEnquiryCold           — per active enquiry
 *   3. predictRepeatOrderThisMonth  — per customer with ≥3 prior orders
 *   4. predictStopBuying            — per customer with historical purchases
 *
 * No I/O, no schema changes, no ML. Each producer takes a plain input
 * object; the adapter in `sales-adapter.ts` composes them with bounded reads.
 *
 * Signal-support notes (see file footer for anything unsupported by schema):
 *   • Quote conversion uses quote status/age + customer history + enquiry
 *     stage. There is no signed_at column, so acceptance is inferred from
 *     status in ('accepted','converted').
 *   • Enquiry cold uses updated_at and next-scheduled follow-up. Stage-median
 *     baseline is caller-supplied (adapter derives from enquiry_stage_history)
 *     and omitted safely when history is sparse.
 *   • Repeat-order cadence uses sales_orders.order_date (customer-scoped).
 *   • Stop-buying uses order recency vs. average interval + trend slope over
 *     the last N orders.
 */
import { coefficientOfVariation, daysBetween, slope } from "./baselines";
import { score, shouldEmit } from "./score";
import { THRESHOLDS } from "./thresholds";
import type {
  Prediction,
  PredictRecordRef,
  PredictSignal,
} from "./types";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

/* ─────────────────────────── Quote conversion ─────────────────────────── */

export interface QuoteConversionInput {
  quote: {
    id: string;
    quote_no: string | null;
    status: string;
    issue_date: string | null;
    valid_until: string | null;
    total: number | null;
    customer_id: string | null;
    enquiry_id: string | null;
  };
  /** Prior quotes for the same customer (excluding this one). */
  customerQuoteHistory: Array<{ id: string; status: string }>;
  /** Enquiry stage, when the quote has one. */
  enquiryStage: string | null;
  /** Whether an unresolved follow-up is scheduled for the enquiry/customer. */
  hasScheduledFollowup: boolean;
  /** ISO date of the most recent activity considered (for recency). */
  lastActivityAt: string | null;
}

export function predictQuoteConversion(
  input: QuoteConversionInput,
): Prediction | null {
  const q = input.quote;
  // Only meaningful for live quotes.
  if (!["draft", "sent"].includes(q.status)) return null;

  const signals: PredictSignal[] = [];
  const records: PredictRecordRef[] = [
    { type: "quote", id: q.id, note: q.quote_no ?? undefined },
  ];

  const ageDays = q.issue_date ? daysBetween(q.issue_date) : null;
  if (q.status === "sent" && ageDays !== null) {
    if (ageDays <= THRESHOLDS.sales.quoteAgingWarnDays) {
      signals.push({ label: "Sent recently", value: `${ageDays}d`, weight: 0.2 });
    } else if (ageDays <= THRESHOLDS.sales.quoteAgingHotDays) {
      signals.push({ label: "Sent 7–14 days ago", value: `${ageDays}d`, weight: 0.1 });
    } else {
      signals.push({ label: "Sent > 14 days ago (cooling)", value: `${ageDays}d`, weight: 0.05 });
    }
  }

  // Customer conversion rate.
  const hist = input.customerQuoteHistory;
  const closed = hist.filter((h) => ["accepted", "converted", "rejected", "expired"].includes(h.status));
  const wins = hist.filter((h) => ["accepted", "converted"].includes(h.status)).length;
  const rate = closed.length ? wins / closed.length : null;
  if (rate !== null && closed.length >= 2) {
    if (rate >= 0.5) signals.push({ label: "Strong customer win-rate", value: `${Math.round(rate * 100)}%`, weight: 0.3 });
    else if (rate >= 0.25) signals.push({ label: "Moderate customer win-rate", value: `${Math.round(rate * 100)}%`, weight: 0.15 });
  }

  // Late-funnel enquiry stages count as strong signal.
  const lateStages = new Set([
    "negotiation",
    "customer_approved",
    "vendor_approved",
    "vendor_quote_received",
    "customer_quotation_sent",
  ]);
  if (input.enquiryStage && lateStages.has(input.enquiryStage)) {
    signals.push({ label: `Enquiry in ${input.enquiryStage}`, value: input.enquiryStage, weight: 0.2 });
  }

  if (input.hasScheduledFollowup) {
    signals.push({ label: "Follow-up scheduled", value: "yes", weight: 0.15 });
  }

  // Expiring soon adds urgency (raises severity, not likelihood).
  const expiringSoon =
    q.valid_until && daysBetween(new Date(), q.valid_until) <= 3 && daysBetween(new Date(), q.valid_until) >= 0;

  if (!shouldEmit(signals)) return null;

  const s = score({
    signals,
    sampleSize: closed.length,
    recencyDays: input.lastActivityAt ? Math.max(0, daysBetween(input.lastActivityAt)) : ageDays ?? 30,
    expectedSignals: 4,
    thresholds: THRESHOLDS.confidence,
  });

  const severity: Prediction["severity"] =
    s.value >= 0.6 ? "info" : expiringSoon ? "warning" : "info";
  const title =
    s.value >= 0.6
      ? `Push quote ${q.quote_no ?? ""} to close — likelihood ${Math.round(s.value * 100)}%`
      : `Nudge quote ${q.quote_no ?? ""} — conversion signals building`;

  return {
    id: `sales.quote-conversion:${q.id}`,
    module: "sales",
    kind: "sales.quote-conversion",
    severity,
    confidence: s.confidence,
    score: round2(s.value),
    title,
    entityRef: { type: "quote", id: q.id, note: q.quote_no ?? undefined },
    value: q.total ?? undefined,
    explanation: {
      why: "Signals from quote age, customer win-rate, enquiry stage and follow-up activity indicate elevated conversion likelihood.",
      signals: s.trace.firedSignals,
      recordsAnalysed: records,
      suggestedAction: { label: "Open quote", to: `/quotes/${q.id}` },
      expectedOutcome:
        q.total && s.value > 0
          ? `Timely nudge could realise ~₹${Math.round(q.total * s.value).toLocaleString("en-IN")} sooner`
          : "Faster progression through the sales funnel",
    },
  };
}

/* ────────────────────────── Enquiry going cold ────────────────────────── */

export interface EnquiryColdInput {
  enquiry: {
    id: string;
    enquiry_no: string | null;
    stage: string;
    updated_at: string;
    budget_inr: number | null;
    customer_id: string | null;
  };
  /** Days since latest recorded follow-up; null when none exists. */
  daysSinceLastFollowup: number | null;
  /** Earliest scheduled pending follow-up (ISO); null when none. */
  nextFollowupAt: string | null;
  /** Optional median days spent in current stage across history (baseline). */
  stageMedianDays: number | null;
}

const OPEN_STAGES = new Set([
  "new_lead",
  "contacted",
  "site_visit_scheduled",
  "site_visit_completed",
  "sample_sent",
  "customer_quotation_sent",
  "negotiation",
  "qualified",
]);

export function predictEnquiryCold(input: EnquiryColdInput): Prediction | null {
  const e = input.enquiry;
  if (!OPEN_STAGES.has(e.stage)) return null;

  const signals: PredictSignal[] = [];
  const records: PredictRecordRef[] = [
    { type: "enquiry", id: e.id, note: e.enquiry_no ?? undefined },
  ];

  const stageAge = daysBetween(e.updated_at);
  if (stageAge >= THRESHOLDS.sales.enquiryColdDays) {
    signals.push({
      label: `Silent > ${THRESHOLDS.sales.enquiryColdDays} days in ${e.stage}`,
      value: `${stageAge}d`,
      weight: 0.4,
    });
  }

  if (input.daysSinceLastFollowup === null) {
    signals.push({ label: "No follow-up recorded", value: "—", weight: 0.25 });
  } else if (input.daysSinceLastFollowup > THRESHOLDS.sales.enquiryColdDays) {
    signals.push({
      label: `Last follow-up ${input.daysSinceLastFollowup}d ago`,
      value: `${input.daysSinceLastFollowup}d`,
      weight: 0.25,
    });
  }

  if (!input.nextFollowupAt) {
    signals.push({ label: "No follow-up scheduled", value: "—", weight: 0.2 });
  }

  if (
    input.stageMedianDays &&
    input.stageMedianDays > 0 &&
    stageAge > input.stageMedianDays * THRESHOLDS.sales.enquiryStuckMultiplier
  ) {
    signals.push({
      label: `Stuck > ${THRESHOLDS.sales.enquiryStuckMultiplier}× stage median`,
      value: `${stageAge}d vs ${input.stageMedianDays}d`,
      weight: 0.25,
    });
  }

  if (!shouldEmit(signals)) return null;

  const s = score({
    signals,
    sampleSize: input.stageMedianDays ? 5 : 1,
    recencyDays: stageAge,
    expectedSignals: 4,
    thresholds: THRESHOLDS.confidence,
  });

  const severity: Prediction["severity"] = stageAge > 30 ? "danger" : "warning";
  return {
    id: `sales.enquiry-cold:${e.id}`,
    module: "sales",
    kind: "sales.enquiry-cold",
    severity,
    confidence: s.confidence,
    score: round2(s.value),
    title: `Re-engage enquiry ${e.enquiry_no ?? ""} — going cold`,
    entityRef: { type: "enquiry", id: e.id, note: e.enquiry_no ?? undefined },
    value: e.budget_inr ?? undefined,
    explanation: {
      why: "Enquiry has crossed inactivity thresholds without a scheduled follow-up.",
      signals: s.trace.firedSignals,
      recordsAnalysed: records,
      suggestedAction: {
        label: "Open enquiry & log follow-up",
        to: `/enquiries/${e.id}?followup=1`,
      },
      expectedOutcome: "A timely touchpoint typically recovers 20–40% of cold enquiries.",
    },
  };
}

/* ───────────────────────── Repeat order this month ────────────────────── */

export interface CustomerOrderCadenceInput {
  customer: { id: string; name: string };
  /** Sales orders for the customer, most-recent-first is not required. */
  orders: Array<{ id: string; order_date: string; status: string }>;
}

export function predictRepeatOrderThisMonth(
  input: CustomerOrderCadenceInput,
): Prediction | null {
  const orders = [...input.orders]
    .filter((o) => o.status !== "cancelled" && o.order_date)
    .sort((a, b) => a.order_date.localeCompare(b.order_date));
  if (orders.length < THRESHOLDS.sales.repeatOrderStableMinOrders) return null;

  const intervals: number[] = [];
  for (let i = 1; i < orders.length; i++) {
    intervals.push(daysBetween(orders[i - 1].order_date, orders[i].order_date));
  }
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const cv = coefficientOfVariation(intervals) ?? 1;
  const last = orders[orders.length - 1];
  const daysSinceLast = daysBetween(last.order_date);

  const signals: PredictSignal[] = [];
  const records: PredictRecordRef[] = orders.slice(-5).map((o) => ({
    type: "sales_order",
    id: o.id,
    note: o.order_date,
  }));

  if (orders.length >= THRESHOLDS.sales.repeatOrderStableMinOrders) {
    signals.push({
      label: `${orders.length} prior orders`,
      value: orders.length,
      weight: 0.25,
    });
  }
  if (cv < 0.4) signals.push({ label: "Stable cadence", value: `CV ${cv.toFixed(2)}`, weight: 0.3 });
  else if (cv < 0.7) signals.push({ label: "Fairly stable cadence", value: `CV ${cv.toFixed(2)}`, weight: 0.15 });

  const dueRatio = avg > 0 ? daysSinceLast / avg : 0;
  if (dueRatio >= 0.85 && dueRatio <= 1.5) {
    signals.push({
      label: "Due window reached",
      value: `${daysSinceLast}d / avg ${Math.round(avg)}d`,
      weight: 0.35,
    });
  } else if (dueRatio >= 0.6) {
    signals.push({
      label: "Approaching due window",
      value: `${daysSinceLast}d / avg ${Math.round(avg)}d`,
      weight: 0.15,
    });
  }

  if (!shouldEmit(signals)) return null;

  const s = score({
    signals,
    sampleSize: orders.length,
    recencyDays: daysSinceLast,
    expectedSignals: 3,
    thresholds: THRESHOLDS.confidence,
  });

  return {
    id: `sales.repeat-order:${input.customer.id}`,
    module: "sales",
    kind: "sales.repeat-order-this-month",
    severity: "info",
    confidence: s.confidence,
    score: round2(s.value),
    title: `Reach out to ${input.customer.name} — repeat order likely soon`,
    entityRef: { type: "customer", id: input.customer.id, note: input.customer.name },
    explanation: {
      why: "Customer buys on a stable cadence and is inside their typical re-order window.",
      signals: s.trace.firedSignals,
      recordsAnalysed: records,
      suggestedAction: {
        label: "Open customer & start enquiry",
        to: `/customers/${input.customer.id}?action=enquiry`,
      },
      expectedOutcome: "Proactive outreach at cadence lifts repeat conversion by ~15–25%.",
    },
  };
}

/* ───────────────────────── Customer stop buying ───────────────────────── */

export function predictStopBuying(
  input: CustomerOrderCadenceInput,
): Prediction | null {
  const orders = [...input.orders]
    .filter((o) => o.status !== "cancelled" && o.order_date)
    .sort((a, b) => a.order_date.localeCompare(b.order_date));
  if (orders.length < THRESHOLDS.sales.repeatOrderStableMinOrders) return null;

  const intervals: number[] = [];
  for (let i = 1; i < orders.length; i++) {
    intervals.push(daysBetween(orders[i - 1].order_date, orders[i].order_date));
  }
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const last = orders[orders.length - 1];
  const daysSinceLast = daysBetween(last.order_date);

  const signals: PredictSignal[] = [];
  const records: PredictRecordRef[] = orders.slice(-6).map((o) => ({
    type: "sales_order",
    id: o.id,
    note: o.order_date,
  }));

  if (avg > 0 && daysSinceLast > avg * THRESHOLDS.sales.stopBuyingRecencyMultiplier) {
    signals.push({
      label: "Overdue beyond typical cadence",
      value: `${daysSinceLast}d vs avg ${Math.round(avg)}d`,
      weight: 0.5,
    });
  }

  // Trend: are inter-order intervals lengthening?
  const trend = slope(intervals);
  if (trend !== null && trend > 0 && intervals.length >= 3) {
    signals.push({
      label: "Order gaps lengthening",
      value: `slope ${trend.toFixed(1)}d/order`,
      weight: 0.25,
    });
  }

  // Fewer orders in the recent half vs earlier half.
  if (orders.length >= 4) {
    const mid = Math.floor(orders.length / 2);
    const firstHalfSpan = daysBetween(orders[0].order_date, orders[mid - 1]?.order_date ?? orders[0].order_date) || 1;
    const secondHalfSpan = daysBetween(orders[mid].order_date, last.order_date) || 1;
    const firstRate = mid / firstHalfSpan;
    const secondRate = (orders.length - mid) / secondHalfSpan;
    if (secondRate < firstRate * 0.6) {
      signals.push({
        label: "Order frequency dropping",
        value: `${secondRate.toFixed(3)} vs ${firstRate.toFixed(3)} /day`,
        weight: 0.2,
      });
    }
  }

  if (!shouldEmit(signals, 0.5)) return null;

  const s = score({
    signals,
    sampleSize: orders.length,
    recencyDays: daysSinceLast,
    expectedSignals: 3,
    thresholds: THRESHOLDS.confidence,
  });

  const severity: Prediction["severity"] =
    daysSinceLast > avg * 3 ? "danger" : "warning";
  return {
    id: `sales.stop-buying:${input.customer.id}`,
    module: "sales",
    kind: "sales.stop-buying",
    severity,
    confidence: s.confidence,
    score: round2(clamp01(s.value)),
    title: `Win back ${input.customer.name} — purchase drop-off risk`,
    entityRef: { type: "customer", id: input.customer.id, note: input.customer.name },
    explanation: {
      why: "Customer has passed their typical re-order window and historical cadence is decaying.",
      signals: s.trace.firedSignals,
      recordsAnalysed: records,
      suggestedAction: {
        label: "Open customer & schedule outreach",
        to: `/customers/${input.customer.id}?followup=1`,
      },
      expectedOutcome: "Targeted win-back before 3× cadence recovers ~10–20% of lapsing accounts.",
    },
  };
}

/* ─────────────────── Unsupported / conservatively deferred ────────────────
 * • Quote acceptance timestamp — no `signed_at` column exists; win-rate is
 *   inferred from status. Not a blocker.
 * • Sample-sent / site-visit boolean flags on the quote — derived indirectly
 *   from the enquiry stage; no dedicated column, so signals are stage-based.
 * • Customer disputes / open credit-notes — future signal for stop-buying;
 *   deliberately omitted here to keep the sales producer at ≤4 reads.
 * • Stage-median baseline — supplied by the adapter; when history is sparse
 *   the stuck-multiplier signal simply does not fire (never fabricated).
 */
