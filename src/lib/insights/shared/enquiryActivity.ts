/**
 * Shared "last meaningful activity per enquiry" computation.
 *
 * Both ColdEnquiryProvider and LostOpportunityProvider need to know, for a
 * batch of open enquiries, when each one last saw real activity — this
 * lives here once so neither re-queries activity_log/followups or
 * re-derives the same "which timestamp counts as activity" logic itself
 * (Phase G.2: "no duplicated query logic where practical").
 *
 * "Meaningful activity" = a logged activity_log row for the enquiry, or a
 * follow-up that was actually completed. A merely *scheduled* follow-up is
 * a plan, not something that happened, so it doesn't count as activity —
 * though it's still surfaced (`pendingFollowupCount`) for context in a
 * provider's "why" text.
 */
import { listGlobalActivity } from "@/lib/activity/api";
import { listFollowups } from "@/lib/followups/api";
import { daysSince } from "./dates";

export interface EnquiryActivitySnapshot {
  /** ISO timestamp of the last meaningful signal — falls back to the
   *  enquiry's own `created_at` when nothing else exists. */
  lastActivityAt: string;
  lastActivityKind: "activity" | "followup_completed" | "created";
  /** Short human-readable summary of that last signal, when one exists. */
  lastActivitySummary: string | null;
  daysSinceActivity: number;
  pendingFollowupCount: number;
  overduePendingFollowupCount: number;
}

const BULK_QUERY_LIMIT = 5000;

export async function getEnquiryActivitySnapshots(
  enquiries: Array<{ id: string; created_at: string }>,
): Promise<Map<string, EnquiryActivitySnapshot>> {
  const snapshots = new Map<string, EnquiryActivitySnapshot>();
  const ids = enquiries.map((e) => e.id);
  if (ids.length === 0) return snapshots;

  const [activity, followups] = await Promise.all([
    listGlobalActivity({ entityType: "enquiry", entityIds: ids, limit: BULK_QUERY_LIMIT }),
    listFollowups({ scope: "all", enquiryIds: ids, limit: BULK_QUERY_LIMIT }),
  ]);
  const now = Date.now();

  for (const enquiry of enquiries) {
    let bestAt = enquiry.created_at;
    let bestKind: EnquiryActivitySnapshot["lastActivityKind"] = "created";
    let bestSummary: string | null = null;

    for (const row of activity) {
      if (row.entity_id === enquiry.id && row.created_at > bestAt) {
        bestAt = row.created_at;
        bestKind = "activity";
        bestSummary = row.summary ?? row.action.replace(/_/g, " ");
      }
    }

    let pendingFollowupCount = 0;
    let overduePendingFollowupCount = 0;
    for (const f of followups) {
      if (f.enquiry_id !== enquiry.id) continue;
      if (f.status === "pending") {
        pendingFollowupCount += 1;
        if (new Date(f.scheduled_at).getTime() < now) overduePendingFollowupCount += 1;
      } else if (f.status === "done" && f.completed_at && f.completed_at > bestAt) {
        bestAt = f.completed_at;
        bestKind = "followup_completed";
        bestSummary = f.outcome_notes ?? "Follow-up completed";
      }
    }

    snapshots.set(enquiry.id, {
      lastActivityAt: bestAt,
      lastActivityKind: bestKind,
      lastActivitySummary: bestSummary,
      daysSinceActivity: daysSince(bestAt, now),
      pendingFollowupCount,
      overduePendingFollowupCount,
    });
  }

  return snapshots;
}
