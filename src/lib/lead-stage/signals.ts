/**
 * Lead-stage signals — read-only helpers used by the CRM UI:
 *   • when the enquiry entered its current stage
 *   • next pending follow-up (scheduled_at, assigned salesperson)
 *   • most recent follow-up timestamp
 *
 * Batched by enquiry id for list views so we don't fan out N queries.
 * All fields are best-effort; missing history/followups return sensible fallbacks.
 */
import { supabase } from "@/integrations/supabase/client";
import type { LeadStage } from "@/lib/types";

export interface EnquirySignal {
  enquiry_id: string;
  stage_entered_at: string | null;
  next_followup: {
    id: string;
    scheduled_at: string;
    assigned_to: string | null;
    channel: string | null;
  } | null;
  last_followup_at: string | null;
}

const EMPTY = (id: string): EnquirySignal => ({
  enquiry_id: id,
  stage_entered_at: null,
  next_followup: null,
  last_followup_at: null,
});

export async function listEnquirySignals(
  enquiryIds: string[],
  fallbackByEnquiry: Record<string, { stage: LeadStage; updated_at: string | null }> = {},
): Promise<Record<string, EnquirySignal>> {
  const result: Record<string, EnquirySignal> = Object.fromEntries(
    enquiryIds.map((id) => [id, EMPTY(id)]),
  );
  if (enquiryIds.length === 0) return result;

  // Stage entered — max(changed_at) matching current stage.
  const { data: hist } = await supabase
    .from("enquiry_stage_history")
    .select("enquiry_id,to_stage,changed_at")
    .in("enquiry_id", enquiryIds)
    .order("changed_at", { ascending: false });
  for (const row of hist ?? []) {
    const target = fallbackByEnquiry[row.enquiry_id]?.stage;
    if (!target || row.to_stage !== target) continue;
    const cur = result[row.enquiry_id];
    if (!cur.stage_entered_at) cur.stage_entered_at = row.changed_at;
  }
  // Fallback to updated_at for enquiries with no matching history row.
  for (const id of enquiryIds) {
    if (!result[id].stage_entered_at) {
      result[id].stage_entered_at = fallbackByEnquiry[id]?.updated_at ?? null;
    }
  }

  // Follow-ups: earliest pending per enquiry + latest of any per enquiry.
  const { data: fups } = await supabase
    .from("followups")
    .select("id,enquiry_id,scheduled_at,status,assigned_to,channel,updated_at,completed_at")
    .in("enquiry_id", enquiryIds)
    .order("scheduled_at", { ascending: true });
  for (const f of fups ?? []) {
    if (!f.enquiry_id) continue;
    const cur = result[f.enquiry_id];
    if (!cur) continue;
    if (f.status === "pending" && !cur.next_followup) {
      cur.next_followup = {
        id: f.id,
        scheduled_at: f.scheduled_at,
        assigned_to: f.assigned_to ?? null,
        channel: f.channel ?? null,
      };
    }
    const seenAt = f.completed_at ?? f.updated_at ?? null;
    if (seenAt && (!cur.last_followup_at || seenAt > cur.last_followup_at)) {
      cur.last_followup_at = seenAt;
    }
  }

  return result;
}

export async function getEnquirySignal(
  enquiryId: string,
  stage: LeadStage,
  updatedAt: string | null,
): Promise<EnquirySignal> {
  const all = await listEnquirySignals([enquiryId], { [enquiryId]: { stage, updated_at: updatedAt } });
  return all[enquiryId] ?? EMPTY(enquiryId);
}
