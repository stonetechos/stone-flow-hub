/**
 * ColdEnquiryProvider — flags open enquiries that have gone quiet for
 * longer than expected for the stage they're in.
 *
 * Reads: enquiries, followups, activity_log (the latter two via the
 * shared `getEnquiryActivitySnapshots` helper, so this provider owns none
 * of that query/aggregation logic itself).
 */
import { listEnquiries } from "@/lib/enquiries/api";
import { formatInr } from "@/lib/format";
import type { Insight, InsightProvider } from "@/lib/insights/types";
import {
  getEnquiryActivitySnapshots,
  type EnquiryActivitySnapshot,
} from "@/lib/insights/shared/enquiryActivity";
import { computeConfidence, computePriority } from "@/lib/insights/shared/priority";
import {
  CLOSED_LEAD_STAGES,
  DEFAULT_COLD_THRESHOLD_DAYS,
  STAGE_COLD_THRESHOLD_DAYS,
} from "./thresholds";

export const COLD_ENQUIRY_PROVIDER_ID = "sales.cold-enquiry";

function stageLabel(stage: string): string {
  return stage.replace(/_/g, " ");
}

function activityPhrase(snapshot: EnquiryActivitySnapshot): string {
  if (snapshot.lastActivityKind === "created") return "since it was created";
  if (snapshot.lastActivityKind === "followup_completed") {
    return `since the last follow-up was completed (${snapshot.lastActivitySummary ?? "no notes"})`;
  }
  return `since the last logged activity (${snapshot.lastActivitySummary ?? "no summary"})`;
}

export const ColdEnquiryProvider: InsightProvider = {
  id: COLD_ENQUIRY_PROVIDER_ID,
  label: "Cold enquiries",
  fetch: async () => {
    const all = await listEnquiries();
    const open = all.filter((e) => !CLOSED_LEAD_STAGES.has(e.stage));
    if (open.length === 0) return [];

    const snapshots = await getEnquiryActivitySnapshots(open);
    const insights: Insight[] = [];

    for (const enquiry of open) {
      const snapshot = snapshots.get(enquiry.id);
      if (!snapshot) continue;
      const threshold = STAGE_COLD_THRESHOLD_DAYS[enquiry.stage] ?? DEFAULT_COLD_THRESHOLD_DAYS;
      if (snapshot.daysSinceActivity <= threshold) continue;

      const customerName = enquiry.customer?.name ?? "Unknown customer";
      insights.push({
        id: `${COLD_ENQUIRY_PROVIDER_ID}:${enquiry.id}`,
        source: COLD_ENQUIRY_PROVIDER_ID,
        module: "Sales",
        kind: "warning",
        tone: "warning",
        confidence: computeConfidence(snapshot.lastActivityKind === "created" ? 1 : 0),
        title: `${enquiry.enquiry_no} has gone cold`,
        why:
          `${customerName}'s enquiry has been in "${stageLabel(enquiry.stage)}" for ` +
          `${snapshot.daysSinceActivity} days with no meaningful activity ${activityPhrase(snapshot)} — ` +
          `expected activity within ${threshold} day${threshold === 1 ? "" : "s"} at this stage.` +
          (enquiry.budget_inr ? ` Budget ${formatInr(enquiry.budget_inr)}.` : "") +
          (snapshot.pendingFollowupCount > 0
            ? ` ${snapshot.pendingFollowupCount} follow-up${snapshot.pendingFollowupCount === 1 ? " is" : "s are"} still pending.`
            : ""),
        action: { label: "Open enquiry", href: `/enquiries/${enquiry.id}` },
        entity: { type: "enquiry", id: enquiry.id, label: enquiry.enquiry_no },
        value: enquiry.budget_inr ?? undefined,
        priority: computePriority({
          urgencyDays: snapshot.daysSinceActivity - threshold,
          valueInr: enquiry.budget_inr ?? undefined,
        }),
        generatedAt: new Date().toISOString(),
      });
    }

    return insights;
  },
};
