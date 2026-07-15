/**
 * EnquiryOwnershipProvider — Phase G.8.7 Task 5 (Unified Intelligence
 * Platform, the one real producer merge this phase executes).
 *
 * Surfaces open enquiries with no salesperson assigned. This is one of
 * two facts (the other is vendor delivery risk — see
 * operations/vendorDeliveryRisk.ts) that `lib/intelligence/risk.ts`'s
 * RiskSummary computes but which had NO Insight Provider equivalent —
 * a genuine coverage gap, not a duplicate. Before this provider existed,
 * "no salesperson assigned" was visible only on the 3 dashboards that
 * import getRiskSummary() directly (business-health, smart-notifications,
 * daily-action) and invisible to Copilot, EntityInsightPanel, and
 * DangerNotifications — exactly the fragmentation this phase's objective
 * ("every business fact generates one Insight, every interface consumes
 * that same Insight") targets.
 *
 * Reuses `getRiskSummary()` for the actual query/aggregation — this
 * provider adds no new database access, it only reshapes an existing
 * RiskItem into the registry's Insight contract. This mirrors the
 * established pattern of CollectionPriorityProvider and
 * PaymentScheduleAdherenceProvider both independently calling the shared
 * `listPaymentDashboard()` bulk fetch rather than each owning its own
 * query.
 *
 * Deliberately does NOT surface risk.ts's other keys (inactive_enquiry,
 * quotation_stale, payment_overdue, dispatch_overdue,
 * installation_overdue) — those five already have real Insight Provider
 * equivalents (ColdEnquiryProvider, QuoteAgeingProvider,
 * CollectionPriorityProvider/PaymentScheduleAdherenceProvider,
 * DispatchRiskProvider, InstallationDelayProvider). Reconciling those five
 * — deciding whether to retire risk.ts's versions outright or lean on the
 * existing merge/dedupe pipeline's entity-based collapsing — is real
 * design work affecting 3 live dashboards and is intentionally left for
 * its own follow-up phase rather than folded into this one silently.
 */
import { getRiskSummary } from "@/lib/intelligence/risk";
import type { Insight, InsightProvider } from "@/lib/insights/types";
import { computeConfidence, computePriority } from "@/lib/insights/shared/priority";

export const ENQUIRY_OWNERSHIP_PROVIDER_ID = "sales.enquiry-ownership";

export const EnquiryOwnershipProvider: InsightProvider = {
  id: ENQUIRY_OWNERSHIP_PROVIDER_ID,
  label: "Enquiry ownership",
  fetch: async () => {
    const { items } = await getRiskSummary();
    const unassigned = items.filter((r) => r.key === "no_salesperson");
    if (unassigned.length === 0) return [];

    const now = new Date().toISOString();
    const insights: Insight[] = unassigned.map((r) => ({
      id: `${ENQUIRY_OWNERSHIP_PROVIDER_ID}:${r.entityId}`,
      source: ENQUIRY_OWNERSHIP_PROVIDER_ID,
      module: "Sales",
      kind: "action",
      tone: "warning",
      confidence: computeConfidence(0),
      title: `${r.label} has no salesperson assigned`,
      why: `Enquiry ${r.label} is still open with no salesperson assigned — nobody owns following it up.`,
      action: { label: "Assign owner", href: r.href },
      entity: { type: "enquiry", id: r.entityId, label: r.label },
      priority: computePriority({ urgencyDays: r.daysOverdue }),
      generatedAt: now,
    }));

    return insights;
  },
};
