/**
 * CollectionPriorityProvider — surfaces customers who have unpaid payment-
 * schedule milestones, prioritized using the app's existing AI Collection
 * Assistant scoring (`rankCollectionPriorities`) rather than a new formula.
 *
 * Reads: `customer_payment_dashboard` via the existing `listPaymentDashboard`
 * bulk fetch. That view already joins customers, invoices, and receipts
 * into `balance_due` / `paid_amount` / `days_to_due` — a second raw query
 * against those tables here would just duplicate what the view already
 * computes, so this provider deliberately does not add one.
 *
 * One insight per customer (per phase spec), not per milestone: the
 * milestone with the highest existing collection score decides the
 * customer's tone / headline, and any other unpaid milestones are folded
 * into the explanation and the total.
 */
import { listPaymentDashboard } from "@/lib/customer-payments/schedule";
import { rankCollectionPriorities, type CollectionPriority } from "@/lib/customer-payments/collection";
import { formatInr } from "@/lib/format";
import type { Insight, InsightKind, InsightProvider } from "@/lib/insights/types";
import { computePriority } from "@/lib/insights/shared/priority";

export const COLLECTION_PRIORITY_PROVIDER_ID = "finance.collection-priority";

interface CustomerQueue {
  customerId: string;
  customerName: string;
  items: CollectionPriority[];
}

function groupByCustomer(priorities: CollectionPriority[]): CustomerQueue[] {
  const map = new Map<string, CustomerQueue>();
  for (const p of priorities) {
    const id = p.row.customer_id;
    if (!id) continue;
    const existing = map.get(id);
    if (existing) existing.items.push(p);
    else map.set(id, { customerId: id, customerName: p.row.customer_name ?? "Unknown customer", items: [p] });
  }
  return [...map.values()];
}

function toneFor(risk: CollectionPriority["risk"]): Insight["tone"] {
  if (risk === "critical" || risk === "high") return "danger";
  if (risk === "medium") return "warning";
  return "info";
}

function kindFor(risk: CollectionPriority["risk"]): InsightKind {
  return risk === "critical" || risk === "high" ? "risk" : risk === "medium" ? "warning" : "action";
}

export const CollectionPriorityProvider: InsightProvider = {
  id: COLLECTION_PRIORITY_PROVIDER_ID,
  label: "Collection priority",
  fetch: async () => {
    const rows = await listPaymentDashboard();
    const priorities = rankCollectionPriorities(rows);
    if (priorities.length === 0) return [];

    const queues = groupByCustomer(priorities);
    const now = new Date().toISOString();

    return queues.map((queue) => {
      const sorted = [...queue.items].sort((a, b) => b.score - a.score);
      const top = sorted[0];
      const totalOutstanding = queue.items.reduce((sum, p) => sum + p.expectedInflow, 0);
      const overdueCount = queue.items.filter((p) => (p.row.days_to_due ?? 0) < 0).length;
      const milestoneWord = queue.items.length === 1 ? "milestone" : "milestones";
      const strategyText = top.strategy.endsWith(".") ? top.strategy : `${top.strategy}.`;

      const why =
        `${queue.items.length} unpaid ${milestoneWord} totalling ${formatInr(totalOutstanding)} ` +
        `(${top.reason.join(", ")})` +
        (overdueCount > 1 ? `; ${overdueCount} of these are overdue` : "") +
        `. Recommended: ${strategyText}`;

      return {
        id: `${COLLECTION_PRIORITY_PROVIDER_ID}:${queue.customerId}`,
        source: COLLECTION_PRIORITY_PROVIDER_ID,
        module: "Finance",
        kind: kindFor(top.risk),
        tone: toneFor(top.risk),
        confidence: 1,
        title: `${queue.customerName} — ${formatInr(totalOutstanding)} outstanding (${top.risk})`,
        why,
        action: { label: "Open customer", href: `/customers/${queue.customerId}` },
        entity: { type: "customer", id: queue.customerId, label: queue.customerName },
        value: totalOutstanding,
        priority: computePriority({
          urgencyDays: Math.max(0, -(top.row.days_to_due ?? 0)),
          valueInr: totalOutstanding,
        }),
        generatedAt: now,
      };
    });
  },
};
