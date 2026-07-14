/**
 * PaymentScheduleAdherenceProvider — flags individual payment-schedule
 * milestones that have gone unpaid past their due date, or that are
 * falling behind pace before the due date even arrives.
 *
 * Reads: `customer_payment_schedules` via the existing `listPaymentDashboard`
 * bulk fetch (already derives `balance_due` / `days_to_due` from
 * receipts/invoices — see CollectionPriorityProvider for why a second raw
 * join isn't added here).
 *
 * Deliberately does NOT reuse `rankCollectionPriorities` — that scores "who
 * to chase" across a customer's whole balance; this provider instead
 * classifies each milestone's adherence to its OWN schedule, a different
 * question (a customer can be a low collection priority overall while one
 * specific milestone has still slipped).
 *
 * CTA note: `receipts` has no `schedule_id` / `invoice_id` foreign key (per
 * Phase G.3 schema review), so there is no reliable specific invoice or
 * receipt record to deep-link to. The CTA instead opens the customer
 * record, where the Customer Payment Centre renders this exact schedule.
 */
import { listPaymentDashboard, type PaymentScheduleDashboardRow } from "@/lib/customer-payments/schedule";
import { formatInr } from "@/lib/format";
import type { Insight, InsightProvider } from "@/lib/insights/types";
import { computePriority } from "@/lib/insights/shared/priority";
import { PAYMENT_SCHEDULE_ADHERENCE_THRESHOLDS as THRESHOLDS } from "./thresholds";

export const PAYMENT_SCHEDULE_ADHERENCE_PROVIDER_ID = "finance.payment-schedule-adherence";

export type AdherenceState = "missed" | "partial_overdue" | "slipping";

/** Pure classification — no I/O, easy to test in isolation. */
export function classifyAdherence(
  row: Pick<PaymentScheduleDashboardRow, "status" | "days_to_due" | "amount" | "paid_amount">,
  thresholds = THRESHOLDS,
): AdherenceState | null {
  const daysToDue = row.days_to_due ?? 0;
  const paidFraction = row.amount > 0 ? row.paid_amount / row.amount : 0;

  if (row.status === "pending" && daysToDue < 0) return "missed";
  if (row.status === "partial" && daysToDue < 0) return "partial_overdue";
  if (
    row.status === "partial" &&
    daysToDue >= 0 &&
    daysToDue <= thresholds.slippingWindowDays &&
    paidFraction < thresholds.partialShortfallPct
  ) {
    return "slipping";
  }
  return null;
}

export const PaymentScheduleAdherenceProvider: InsightProvider = {
  id: PAYMENT_SCHEDULE_ADHERENCE_PROVIDER_ID,
  label: "Payment schedule adherence",
  fetch: async () => {
    const rows = await listPaymentDashboard();
    const now = new Date().toISOString();
    const insights: Insight[] = [];

    for (const row of rows) {
      const state = classifyAdherence(row);
      if (!state) continue;

      const customerName = row.customer_name ?? "Unknown customer";
      const overdueDays = Math.max(0, -(row.days_to_due ?? 0));
      const paidPct = row.amount > 0 ? Math.round((row.paid_amount / row.amount) * 100) : 0;

      const title =
        state === "missed"
          ? `Missed payment — ${customerName}, ${row.label}`
          : state === "partial_overdue"
            ? `Partial payment overdue — ${customerName}, ${row.label}`
            : `Milestone slipping — ${customerName}, ${row.label}`;

      const why =
        state === "missed"
          ? `Milestone "${row.label}" (${formatInr(row.amount)}) for ${customerName} was due ` +
            `${overdueDays} day${overdueDays === 1 ? "" : "s"} ago with nothing received.`
          : state === "partial_overdue"
            ? `Milestone "${row.label}" for ${customerName} is ${overdueDays} day${overdueDays === 1 ? "" : "s"} ` +
              `overdue — only ${formatInr(row.paid_amount)} of ${formatInr(row.amount)} (${paidPct}%) received, ` +
              `${formatInr(row.balance_due)} still due.`
            : `Milestone "${row.label}" for ${customerName} is due in ${row.days_to_due} ` +
              `day${row.days_to_due === 1 ? "" : "s"} but only ${paidPct}% (${formatInr(row.paid_amount)} of ` +
              `${formatInr(row.amount)}) has been received so far.`;

      insights.push({
        id: `${PAYMENT_SCHEDULE_ADHERENCE_PROVIDER_ID}:${row.id}`,
        source: PAYMENT_SCHEDULE_ADHERENCE_PROVIDER_ID,
        module: "Finance",
        kind: state === "slipping" ? "warning" : "risk",
        tone: state === "slipping" ? "warning" : "danger",
        confidence: 1,
        title,
        why,
        action: { label: "Open customer payments", href: `/customers/${row.customer_id}` },
        entity: { type: "payment_schedule", id: row.id, label: row.label },
        value: row.balance_due,
        priority: computePriority({ urgencyDays: overdueDays, valueInr: row.balance_due }),
        generatedAt: now,
      });
    }

    return insights;
  },
};
