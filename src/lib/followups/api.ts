import { supabase } from "@/integrations/supabase/client";
import type { DbTable } from "@/lib/types";
import { AppError, mapDbError } from "@/lib/errors";
import { z } from "zod";
import { zRequired, zOptional, zUuid } from "@/lib/zod";

export type Followup = DbTable<"followups">;

export const followupCreateSchema = z.object({
  entity_type: z.enum(["enquiry", "customer", "vendor", "project"]),
  entity_id: zUuid,
  due_at: zRequired("Due date / time"),
  channel: z.enum(["call", "email", "whatsapp", "meeting", "site_visit", "other"]).default("call"),
  notes: zOptional(),
});
export type FollowupCreateInput = z.infer<typeof followupCreateSchema>;

export async function listTodayFollowups(): Promise<Followup[]> {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const { data, error } = await supabase
    .from("followups")
    .select("*")
    .eq("status", "pending")
    .gte("due_at", start.toISOString())
    .lte("due_at", end.toISOString())
    .order("due_at", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function listFollowupsFor(entityType: string, entityId: string): Promise<Followup[]> {
  const { data, error } = await supabase
    .from("followups")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("due_at", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function createFollowup(input: FollowupCreateInput): Promise<Followup> {
  const parsed = followupCreateSchema.parse(input);
  const { data, error } = await supabase
    .from("followups")
    .insert({
      entity_type: parsed.entity_type,
      entity_id: parsed.entity_id,
      due_at: parsed.due_at,
      channel: parsed.channel,
      notes: parsed.notes ?? null,
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function completeFollowup(id: string, outcome?: string): Promise<Followup> {
  const { data, error } = await supabase
    .from("followups")
    .update({
      status: "done",
      completed_at: new Date().toISOString(),
      outcome: outcome ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}
