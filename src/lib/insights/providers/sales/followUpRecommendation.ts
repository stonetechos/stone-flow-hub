/**
 * FollowUpRecommendationProvider — surfaces overdue follow-ups, today's
 * follow-ups, and follow-ups that become overdue tomorrow, each as its own
 * insight.
 *
 * Reads: followups, enquiries, customers (all via the existing
 * `listFollowups` join — enquiry budget was added to that join so this
 * provider doesn't need a second query to prioritize by deal value).
 *
 * Scope: only follow-ups linked to an enquiry are considered (matching the
 * phase's stated data sources) — a follow-up attached directly to some
 * other entity type isn't a Sales Intelligence concern.
 *
 * Prioritization (per spec, in this exact order): first overdue days,
 * then enquiry value, then customer importance. There is currently no
 * reliable "customer importance" signal in the schema (no tier/VIP field
 * on `customers`), so that third key is a documented no-op rather than a
 * fabricated score — see computePriority, which only takes the first two.
 */
import { listFollowups } from "@/lib/followups/api";
import { formatInr } from "@/lib/format";
import type { Insight, InsightProvider } from "@/lib/insights/types";
import { daysSince, isSameCalendarDay, startOfDayOffset } from "@/lib/insights/shared/dates";
import { computePriority } from "@/lib/insights/shared/priority";
import { FOLLOWUP_RECOMMENDATION_WINDOW } from "./thresholds";

export const FOLLOWUP_RECOMMENDATION_PROVIDER_ID = "sales.followup-recommendation";

type Bucket = "overdue" | "due_today" | "due_tomorrow";

function classifyBucket(scheduledAt: string, now: Date, tomorrow: Date): Bucket | null {
  const scheduled = new Date(scheduledAt);
  if (isSameCalendarDay(scheduled, now)) return "due_today";
  if (isSameCalendarDay(scheduled, tomorrow)) return "due_tomorrow";
  if (scheduled.getTime() < now.getTime()) return "overdue";
  return null;
}

export const FollowUpRecommendationProvider: InsightProvider = {
  id: FOLLOWUP_RECOMMENDATION_PROVIDER_ID,
  label: "Follow-up recommendations",
  fetch: async () => {
    const pending = await listFollowups({ scope: "pending", limit: 500 });
    const now = new Date();
    const tomorrow = startOfDayOffset(FOLLOWUP_RECOMMENDATION_WINDOW.dueTomorrowOffsetDays, now);

    const insights: Insight[] = [];

    for (const followup of pending) {
      const enquiry = followup.enquiry;
      if (!enquiry) continue; // out of scope — not enquiry-linked

      const bucket = classifyBucket(followup.scheduled_at, now, tomorrow);
      if (!bucket) continue;

      const overdueDays = bucket === "overdue" ? daysSince(followup.scheduled_at, now) : 0;
      const customerName = enquiry.customer?.name ?? "Unknown customer";
      const scheduledDate = new Date(followup.scheduled_at);
      const when = scheduledDate.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      const whenTimeOnly = scheduledDate.toLocaleTimeString("en-IN", { timeStyle: "short" });

      const kind = bucket === "overdue" ? "risk" : "action";
      const tone = bucket === "overdue" ? "danger" : bucket === "due_today" ? "warning" : "info";
      const title =
        bucket === "overdue"
          ? `Follow-up ${overdueDays}d overdue — ${enquiry.enquiry_no}`
          : bucket === "due_today"
            ? `Follow-up due today — ${enquiry.enquiry_no}`
            : `Follow-up due tomorrow — ${enquiry.enquiry_no}`;
      const why =
        bucket === "overdue"
          ? `Follow-up for ${customerName} (${enquiry.enquiry_no}) was due ${when} and is now ` +
            `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue.`
          : bucket === "due_today"
            ? `Follow-up for ${customerName} (${enquiry.enquiry_no}) is scheduled for today at ` +
              `${whenTimeOnly} — action it before it slips to overdue.`
            : `Follow-up for ${customerName} (${enquiry.enquiry_no}) is scheduled for tomorrow (${when}) — ` +
              `plan for it today so it doesn't become overdue.`;

      insights.push({
        id: `${FOLLOWUP_RECOMMENDATION_PROVIDER_ID}:${followup.id}`,
        source: FOLLOWUP_RECOMMENDATION_PROVIDER_ID,
        module: "Sales",
        kind,
        tone,
        confidence: 1,
        title,
        why: enquiry.budget_inr ? `${why} Budget ${formatInr(enquiry.budget_inr)}.` : why,
        action: { label: "Open enquiry", href: `/enquiries/${enquiry.id}` },
        entity: { type: "followup", id: followup.id, label: enquiry.enquiry_no },
        value: enquiry.budget_inr ?? undefined,
        priority: computePriority({
          urgencyDays: overdueDays,
          valueInr: enquiry.budget_inr ?? undefined,
        }),
        generatedAt: new Date().toISOString(),
      });
    }

    return insights;
  },
};
