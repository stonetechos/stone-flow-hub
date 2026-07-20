/**
 * VendorDeliveryRiskProvider — Phase G.8.7 Task 5 (Unified Intelligence
 * Platform, the one real producer merge this phase executes).
 *
 * Surfaces Purchase Orders and RFQs past their expected/due date with no
 * resolution. This is the second of two facts (the other is enquiry
 * ownership — see sales/enquiryOwnership.ts) that
 * `lib/intelligence/risk.ts`'s RiskSummary computes but which had NO
 * Insight Provider equivalent — vendorPaymentQueue.ts covers money owed
 * TO vendors, not goods/quotes owed FROM them, so procurement-side
 * delivery lateness was a genuine coverage gap, not a duplicate.
 *
 * Reuses `getRiskSummary()` for the actual query/aggregation — see
 * sales/enquiryOwnership.ts's file header for why calling the same shared
 * function from two providers independently matches this codebase's
 * existing convention (CollectionPriorityProvider /
 * PaymentScheduleAdherenceProvider both call listPaymentDashboard()
 * independently already) rather than being a new inefficiency.
 *
 * Deliberately does NOT surface risk.ts's other keys — see
 * sales/enquiryOwnership.ts's file header for the full reasoning; the
 * same five keys with existing provider equivalents are skipped here too.
 */
import { getRiskSummary } from "@/lib/intelligence/risk";
import type { Insight, InsightProvider } from "@/lib/insights/types";
import { computeConfidence, computePriority } from "@/lib/insights/shared/priority";

export const VENDOR_DELIVERY_RISK_PROVIDER_ID = "operations.vendor-delivery-risk";

export const VendorDeliveryRiskProvider: InsightProvider = {
  id: VENDOR_DELIVERY_RISK_PROVIDER_ID,
  label: "Vendor delivery risk",
  fetch: async () => {
    const { items } = await getRiskSummary();
    const delayed = items.filter((r) => r.key === "vendor_delay");
    if (delayed.length === 0) return [];

    const now = new Date().toISOString();
    const insights: Insight[] = delayed.map((r) => ({
      id: `${VENDOR_DELIVERY_RISK_PROVIDER_ID}:${r.entity}:${r.entityId}`,
      source: VENDOR_DELIVERY_RISK_PROVIDER_ID,
      module: "Procurement",
      kind: r.severity === "high" ? "risk" : "warning",
      tone: r.severity === "high" ? "danger" : "warning",
      confidence: computeConfidence(0),
      title: `${r.label} — ${r.reason}`,
      why:
        r.entity === "po"
          ? `Purchase order ${r.label} is past its expected delivery date. ${r.reason}.`
          : `RFQ ${r.label} is past its due date with vendors. ${r.reason}.`,
      action: { label: r.entity === "po" ? "Open purchase order" : "Open RFQ", href: r.href },
      entity: { type: r.entity, id: r.entityId, label: r.label },
      priority: computePriority({ urgencyDays: r.daysOverdue }),
      generatedAt: now,
    }));

    return insights;
  },
};
