/**
 * Project milestones + stage recommendations API.
 *
 * Backend Phase 1: rows here are populated automatically by database triggers
 * on site_visits, rfqs, vendor_quotes, production_orders, dispatches,
 * installations, quotes, and receipts. The Lead Stage on `enquiries.stage` is
 * NEVER changed automatically — recommendations surface as pending suggestions
 * that a user must accept or reject.
 *
 * Milestone writes are idempotent (UNIQUE on project_id + milestone_key).
 * Recommendation writes are idempotent (UNIQUE on enquiry_id + source_event +
 * source_ref_id). Activity-log fan-out uses `dedupe_key` so replay is safe.
 */
import { supabase } from "@/integrations/supabase/client";
import type { LeadStage } from "@/lib/types";

export type MilestoneKey =
  | "site_visit_scheduled"
  | "site_visit_completed"
  | "sample_sent"
  | "quotation_sent"
  | "advance_received"
  | "rfq_sent"
  | "vendor_approved"
  | "production_started"
  | "dispatch_created"
  | "installation_completed"
  | "handover_completed";

export const MILESTONE_ORDER: ReadonlyArray<{ key: MilestoneKey; label: string }> = [
  { key: "site_visit_scheduled", label: "Site visit scheduled" },
  { key: "site_visit_completed", label: "Site visit completed" },
  { key: "sample_sent", label: "Sample sent" },
  { key: "quotation_sent", label: "Quotation sent" },
  { key: "advance_received", label: "Advance received" },
  { key: "rfq_sent", label: "RFQ sent" },
  { key: "vendor_approved", label: "Vendor approved" },
  { key: "production_started", label: "Production started" },
  { key: "dispatch_created", label: "Dispatch created" },
  { key: "installation_completed", label: "Installation completed" },
  { key: "handover_completed", label: "Handover completed" },
];

export type ProjectMilestone = {
  id: string;
  project_id: string;
  milestone_key: MilestoneKey;
  completed_at: string;
  completed_by: string | null;
  source: "auto" | "manual";
  source_ref_type: string | null;
  source_ref_id: string | null;
  notes: string | null;
  is_manual_override: boolean;
  created_at: string;
  updated_at: string;
};

export type StageRecommendation = {
  id: string;
  enquiry_id: string;
  project_id: string | null;
  suggested_stage: LeadStage;
  reason: string;
  source_event: string;
  source_ref_type: string | null;
  source_ref_id: string | null;
  status: "pending" | "accepted" | "rejected";
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listProjectMilestones(projectId: string): Promise<ProjectMilestone[]> {
  const { data, error } = await supabase
    .from("project_milestones" as never)
    .select("*")
    .eq("project_id", projectId)
    .order("completed_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProjectMilestone[];
}

export async function listPendingRecommendations(
  enquiryId: string,
): Promise<StageRecommendation[]> {
  const { data, error } = await supabase
    .from("stage_recommendations" as never)
    .select("*")
    .eq("enquiry_id", enquiryId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StageRecommendation[];
}

/** Admin only: manually mark a milestone complete (or override). */
export async function upsertManualMilestone(input: {
  projectId: string;
  key: MilestoneKey;
  completedAt?: string;
  notes?: string;
}) {
  // Cast: types.ts hasn't regenerated for the new table yet; runtime is fine.
  const client = supabase as unknown as {
    from: (t: string) => {
      upsert: (
        row: Record<string, unknown>,
        opts?: { onConflict?: string },
      ) => Promise<{ error: unknown }>;
    };
  };
  const { error } = await client.from("project_milestones").upsert(
    {
      project_id: input.projectId,
      milestone_key: input.key,
      completed_at: input.completedAt ?? new Date().toISOString(),
      notes: input.notes ?? null,
      source: "manual",
      is_manual_override: true,
    },
    { onConflict: "project_id,milestone_key" },
  );
  if (error) throw error as Error;
}

/** Resolve a recommendation. Accepting also updates the enquiry stage. */
export async function resolveRecommendation(input: {
  recommendationId: string;
  enquiryId: string;
  suggestedStage: LeadStage;
  accept: boolean;
}) {
  const nowIso = new Date().toISOString();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id ?? null;

  const client = supabase as unknown as {
    from: (t: string) => {
      update: (row: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<{ error: unknown }>;
      };
    };
  };
  const { error: recErr } = await client
    .from("stage_recommendations")
    .update({
      status: input.accept ? "accepted" : "rejected",
      resolved_by: userId,
      resolved_at: nowIso,
    })
    .eq("id", input.recommendationId);
  if (recErr) throw recErr as Error;

  if (input.accept) {
    const { error: enqErr } = await supabase
      .from("enquiries")
      .update({ stage: input.suggestedStage })
      .eq("id", input.enquiryId);
    if (enqErr) throw enqErr;
  }
}
