/**
 * LostOpportunityProvider — flags high-value open enquiries that have
 * been inactive long enough to be at real risk of being lost, and explains
 * why chasing them back down is still worth it.
 *
 * Reads: enquiries, followups, activity_log (the latter two via the
 * shared `getEnquiryActivitySnapshots` helper — same as ColdEnquiryProvider,
 * with zero query duplication between the two).
 */
import { listEnquiries } from "@/lib/enquiries/api";
import { formatInr } from "@/lib/format";
import type { Insight, InsightProvider } from "@/lib/insights/types";
import { getEnquiryActivitySnapshots } from "@/lib/insights/shared/enquiryActivity";
import { computeConfidence, computePriority } from "@/lib/insights/shared/priority";
import { CLOSED_LEAD_STAGES, LOST_OPPORTUNITY_THRESHOLDS } from "./thresholds";

export const LOST_OPPORTUNITY_PROVIDER_ID = "sales.lost-opportunity";

export const LostOpportunityProvider: InsightProvider = {
  id: LOST_OPPORTUNITY_PROVIDER_ID,
  label: "Lost opportunities",
  fetch: async () => {
    const all = await listEnquiries();
    const open = all.filter((e) => !CLOSED_LEAD_STAGES.has(e.stage));
    const highValueOpen = open.filter(
      (e) => (e.budget_inr ?? 0) >= LOST_OPPORTUNITY_THRESHOLDS.minValueInr,
    );
    if (highValueOpen.length === 0) return [];

    // Rank by value among every currently-open enquiry (not just the
    // high-value subset) so "your #N open deal" is meaningful rather than
    // circular against a pre-filtered list.
    const rankById = new Map(
      [...open]
        .filter((e) => (e.budget_inr ?? 0) > 0)
        .sort((a, b) => (b.budget_inr ?? 0) - (a.budget_inr ?? 0))
        .map((e, i) => [e.id, i + 1] as const),
    );

    const snapshots = await getEnquiryActivitySnapshots(highValueOpen);
    const insights: Insight[] = [];

    for (const enquiry of highValueOpen) {
      const snapshot = snapshots.get(enquiry.id);
      if (!snapshot || snapshot.daysSinceActivity < LOST_OPPORTUNITY_THRESHOLDS.minIdleDays)
        continue;

      const customerName = enquiry.customer?.name ?? "Unknown customer";
      const rank = rankById.get(enquiry.id);
      const rankPhrase = rank ? ` — your #${rank} open deal by value` : "";

      insights.push({
        id: `${LOST_OPPORTUNITY_PROVIDER_ID}:${enquiry.id}`,
        source: LOST_OPPORTUNITY_PROVIDER_ID,
        module: "Sales",
        kind: "risk",
        tone: "danger",
        confidence: computeConfidence(snapshot.lastActivityKind === "created" ? 1 : 0),
        title: `${formatInr(enquiry.budget_inr)} opportunity at risk`,
        why:
          `${customerName}'s ${formatInr(enquiry.budget_inr)} enquiry (${enquiry.enquiry_no}) has had no ` +
          `activity for ${snapshot.daysSinceActivity} days while still in "${enquiry.stage.replace(/_/g, " ")}"` +
          `${rankPhrase}. Recovering it now still beats starting a new deal from zero.`,
        action: { label: "Open enquiry", href: `/enquiries/${enquiry.id}` },
        entity: { type: "enquiry", id: enquiry.id, label: enquiry.enquiry_no },
        value: enquiry.budget_inr ?? undefined,
        priority: computePriority({
          urgencyDays: snapshot.daysSinceActivity,
          valueInr: enquiry.budget_inr ?? undefined,
        }),
        generatedAt: new Date().toISOString(),
      });
    }

    return insights;
  },
};
