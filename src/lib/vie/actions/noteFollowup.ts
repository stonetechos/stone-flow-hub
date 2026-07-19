/**
 * Workflow Engine handler for "note_followup".
 *
 * Calls createFollowup() from lib/followups/api.ts — the EXACT SAME function
 * the existing manual follow-up form already calls. No parallel write path,
 * no duplicated business logic (ADR-0001 requirement 2).
 */
import { createFollowup } from "@/lib/followups/api";
import type { FollowupEntityType } from "@/lib/followups/schema";
import { registerVieAction, type VieActionResult } from "./registry";

const VALID_CHANNELS = ["call", "whatsapp", "email", "meeting", "site_visit"] as const;
type FollowupChannel = (typeof VALID_CHANNELS)[number];

registerVieAction("note_followup", async (params): Promise<VieActionResult> => {
  const entityType = params.entity_type as FollowupEntityType | null;
  const entityId = params.entity_id as string | null;
  const scheduledAt = params.scheduled_at as string | null;

  if (!entityType || !entityId || !scheduledAt) {
    // Should be unreachable: the Planner downgrades to "draft" whenever the
    // target entity or the follow-up date couldn't be resolved, and
    // completeDraftAction must supply them via its patch before execution
    // reaches here.
    throw new Error(
      "note_followup handler invoked with an unresolved entity/date — this should have been caught by the Planner's blocker check",
    );
  }

  const rawChannel = params.channel as string | undefined;
  const channel: FollowupChannel = VALID_CHANNELS.includes(rawChannel as FollowupChannel)
    ? (rawChannel as FollowupChannel)
    : "call";

  const followup = await createFollowup({
    entity_type: entityType,
    entity_id: entityId,
    scheduled_at: scheduledAt,
    channel,
    notes: (params.notes as string | undefined) ?? undefined,
  });

  return { linkedRecordType: "followup", linkedRecordId: followup.id };
});
