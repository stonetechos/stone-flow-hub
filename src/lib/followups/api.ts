/** Follow-ups data access. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";
import {
  followupCompleteSchema,
  followupCreateSchema,
  type FollowupCompleteInput,
  type FollowupCreateInput,
} from "./schema";

export type FollowupRow = DbTable<"followups">;
export type FollowupWithEnquiry = FollowupRow & {
  enquiry: {
    id: string;
    enquiry_no: string;
    project: { id: string; name: string } | null;
    customer: { id: string; name: string } | null;
  } | null;
};

const SELECT_WITH_JOINS =
  "*, enquiry:enquiries!followups_enquiry_id_fkey(id,enquiry_no,project:projects!enquiries_project_id_fkey(id,name),customer:customers!enquiries_customer_id_fkey(id,name))";

export async function listFollowups(
  scope: "pending" | "today" | "all" = "all",
): Promise<FollowupWithEnquiry[]> {
  let q = supabase
    .from("followups")
    .select(SELECT_WITH_JOINS)
    .order("scheduled_at", { ascending: true })
    .limit(200);

  if (scope === "pending") q = q.eq("status", "pending");
  if (scope === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    q = q
      .eq("status", "pending")
      .gte("scheduled_at", start.toISOString())
      .lte("scheduled_at", end.toISOString());
  }

  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as FollowupWithEnquiry[];
}

export async function listFollowupsForEnquiry(enquiryId: string): Promise<FollowupRow[]> {
  const { data, error } = await supabase
    .from("followups")
    .select("*")
    .eq("enquiry_id", enquiryId)
    .order("scheduled_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function createFollowup(input: FollowupCreateInput): Promise<FollowupRow> {
  const parsed = followupCreateSchema.parse(input);

  // Derive project_id from the enquiry
  const { data: enq, error: enqErr } = await supabase
    .from("enquiries")
    .select("id,project_id")
    .eq("id", parsed.enquiry_id)
    .maybeSingle();
  if (enqErr) throw new AppError(mapDbError(enqErr));
  if (!enq) throw new AppError("Enquiry not found", "NOT_FOUND", 404);

  const { data, error } = await supabase
    .from("followups")
    .insert({
      enquiry_id: parsed.enquiry_id,
      project_id: enq.project_id,
      scheduled_at: parsed.scheduled_at,
      channel: parsed.channel,
      status: "pending",
      notes: parsed.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function completeFollowup(input: FollowupCompleteInput): Promise<FollowupRow> {
  const parsed = followupCompleteSchema.parse(input);
  const { data, error } = await supabase
    .from("followups")
    .update({
      status: "done",
      completed_at: new Date().toISOString(),
      outcome_notes: parsed.outcome_notes ?? null,
    })
    .eq("id", parsed.id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updateFollowup(id: string, input: FollowupCreateInput): Promise<FollowupRow> {
  const parsed = followupCreateSchema.parse(input);
  const { data, error } = await supabase
    .from("followups")
    .update({
      enquiry_id: parsed.enquiry_id,
      scheduled_at: parsed.scheduled_at,
      channel: parsed.channel,
      notes: parsed.notes ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deleteFollowup(id: string): Promise<void> {
  const { error } = await supabase.from("followups").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}
