/**
 * getOperationalRiskCounts — Phase G.8.8 (Final Intelligence
 * Consolidation).
 *
 * The single place that answers "how many of each operational risk type
 * are there right now" by calling the real Insight Providers directly
 * (as plain async functions — every `InsightProvider.fetch()` is callable
 * outside React/react-query, the same way `getRiskSummary()` always was).
 * This replaces `lib/intelligence/risk.ts`'s five retired duplicate
 * rules (inactive_enquiry, quotation_stale, payment_overdue,
 * dispatch_overdue, installation_overdue) as the shared answer for both
 * `business-health.ts` (composite scoring) and `daily-action.tsx` (KPI
 * tiles + "Top risks" list) — one function, not one reimplementation per
 * consumer, which is exactly the duplication this phase exists to remove.
 *
 * Threshold/rule ownership stays entirely in the providers: this file
 * does no filtering of its own beyond isolating the specific insight
 * *subtype* that corresponds to each risk.ts-era category, using the
 * same id-namespacing convention every multi-rule provider already uses
 * (see DispatchRiskProvider/InstallationDelayProvider's `:overdue:`,
 * `:due-soon:` etc. id segments) — not a new threshold, just picking out
 * the one sub-rule that matches the old category's meaning most closely:
 *  - dispatch/installation "overdue" -> the `:overdue:` subtype only,
 *    excluding those providers' other subtypes (due-soon, not-started,
 *    stalled, nearing-unprepared, production-risk) which risk.ts never
 *    counted as "overdue" either.
 *  - payment "overdue" -> PaymentScheduleAdherenceProvider, which
 *    classifies individual milestones against their own due date (the
 *    closest existing match to risk.ts's per-invoice due-date check;
 *    CollectionPriorityProvider answers a related but different question
 *    — "who to chase" ranked by score, one insight per customer, not per
 *    overdue item — so it isn't used for this specific count).
 */
import { ColdEnquiryProvider } from "@/lib/insights/providers/sales/coldEnquiry";
import { EnquiryOwnershipProvider } from "@/lib/insights/providers/sales/enquiryOwnership";
import { DispatchRiskProvider } from "@/lib/insights/providers/operations/dispatchRisk";
import { InstallationDelayProvider } from "@/lib/insights/providers/operations/installationDelay";
import { VendorDeliveryRiskProvider } from "@/lib/insights/providers/operations/vendorDeliveryRisk";
import { PaymentScheduleAdherenceProvider } from "@/lib/insights/providers/finance/paymentScheduleAdherence";
import type { Insight } from "@/lib/insights/types";

export interface OperationalRiskCounts {
  inactiveEnquiry: number;
  unassignedEnquiry: number;
  dispatchOverdue: number;
  installationOverdue: number;
  vendorDelay: number;
  paymentOverdue: number;
  /** Total across every category below — the direct replacement for
   *  risk.ts's old `items.length`. */
  total: number;
  /** The underlying insights themselves, for consumers (like
   *  daily-action's "Top risks" panel) that render cards, not just
   *  counts. Already filtered to the same subtypes the counts above use. */
  items: Insight[];
}

export async function getOperationalRiskCounts(): Promise<OperationalRiskCounts> {
  const [cold, unassigned, dispatch, installation, vendor, payment] = await Promise.all([
    ColdEnquiryProvider.fetch(),
    EnquiryOwnershipProvider.fetch(),
    DispatchRiskProvider.fetch(),
    InstallationDelayProvider.fetch(),
    VendorDeliveryRiskProvider.fetch(),
    PaymentScheduleAdherenceProvider.fetch(),
  ]);

  const dispatchOverdue = dispatch.filter((i) => i.id.includes(":overdue:"));
  const installationOverdue = installation.filter((i) => i.id.includes(":overdue:"));

  const items = [...cold, ...unassigned, ...dispatchOverdue, ...installationOverdue, ...vendor, ...payment];

  return {
    inactiveEnquiry: cold.length,
    unassignedEnquiry: unassigned.length,
    dispatchOverdue: dispatchOverdue.length,
    installationOverdue: installationOverdue.length,
    vendorDelay: vendor.length,
    paymentOverdue: payment.length,
    total: items.length,
    items,
  };
}
