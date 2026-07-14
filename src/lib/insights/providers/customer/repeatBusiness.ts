/**
 * RepeatBusinessProvider — surfaces customers whose CURRENT history shows
 * genuine repeat engagement. No estimate of future purchases — every
 * number here is a count of records that already exist.
 *
 * Reads: `listCustomerScores()` (reuses `orders_count`, the existing
 * invoiced-orders count from `executive/customer-intel.ts` — the same
 * count that file's own `repeat` list already uses, so this provider
 * doesn't recompute it), `listSalesOrders()` and `listEnquiries()`
 * (existing bulk fetches, grouped by customer client-side).
 *
 * Note: the phase spec's CTA for this provider was not specified past
 * "CTA" — this defaults to the customer record itself (the same
 * destination CustomerHealthProvider and CustomerHygieneProvider use),
 * since repeat business is fundamentally about one customer's history.
 */
import { listCustomerScores } from "@/lib/executive/customer-intel";
import { listSalesOrders } from "@/lib/sales-orders/api";
import { listEnquiries } from "@/lib/enquiries/api";
import { formatInr } from "@/lib/format";
import type { Insight, InsightProvider } from "@/lib/insights/types";
import { computePriority } from "@/lib/insights/shared/priority";
import { REPEAT_BUSINESS_THRESHOLDS as THRESHOLDS } from "./thresholds";

export const REPEAT_BUSINESS_PROVIDER_ID = "customer.repeat-business";

export const RepeatBusinessProvider: InsightProvider = {
  id: REPEAT_BUSINESS_PROVIDER_ID,
  label: "Repeat business",
  fetch: async () => {
    const [scores, salesOrders, enquiries] = await Promise.all([
      listCustomerScores(),
      listSalesOrders(),
      listEnquiries(),
    ]);

    const salesOrderCountByCustomer = new Map<string, number>();
    for (const so of salesOrders) {
      if (!so.customer_id || so.status === "cancelled") continue;
      salesOrderCountByCustomer.set(so.customer_id, (salesOrderCountByCustomer.get(so.customer_id) ?? 0) + 1);
    }

    const enquiryCountByCustomer = new Map<string, number>();
    for (const e of enquiries) {
      if (!e.customer?.id) continue;
      enquiryCountByCustomer.set(e.customer.id, (enquiryCountByCustomer.get(e.customer.id) ?? 0) + 1);
    }

    const now = new Date().toISOString();
    const insights: Insight[] = [];

    for (const score of scores) {
      const salesOrderCount = salesOrderCountByCustomer.get(score.customer_id) ?? 0;
      const enquiryCount = enquiryCountByCustomer.get(score.customer_id) ?? 0;

      const reasons: string[] = [];
      if (score.orders_count >= THRESHOLDS.minInvoicedOrders) {
        reasons.push(`${score.orders_count} invoiced orders`);
      }
      if (salesOrderCount >= THRESHOLDS.minSalesOrders) {
        reasons.push(`${salesOrderCount} sales orders`);
      }
      if (enquiryCount >= THRESHOLDS.minEnquiries) {
        reasons.push(`${enquiryCount} enquiries raised over time`);
      }

      if (reasons.length === 0) continue;

      const revenuePart = score.revenue > 0 ? `; ${formatInr(score.revenue)} lifetime revenue` : "";

      insights.push({
        id: `${REPEAT_BUSINESS_PROVIDER_ID}:${score.customer_id}`,
        source: REPEAT_BUSINESS_PROVIDER_ID,
        module: "Customer",
        kind: "opportunity",
        tone: "success",
        confidence: 1,
        title: `${score.name} is a repeat customer`,
        why: `${score.name} has come back multiple times: ${reasons.join("; ")}${revenuePart}.`,
        action: { label: "Open customer", href: `/customers/${score.customer_id}` },
        entity: { type: "customer", id: score.customer_id, label: score.name },
        value: score.revenue > 0 ? score.revenue : undefined,
        priority: computePriority({ urgencyDays: reasons.length * 5, valueInr: score.revenue }),
        generatedAt: now,
      });
    }

    return insights;
  },
};
