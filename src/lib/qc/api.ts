/**
 * QC templates + results API. Templates are reusable checklists; results are
 * recorded per production stage.
 */
import { supabase } from "@/integrations/supabase/client";

export type QcOutcome = "pass" | "fail" | "rework" | "approved" | "rejected" | "not_checked";

export type QcTemplate = {
  id: string;
  code: string;
  name: string;
  category: string;
  family_id: string | null;
  stage_id: string | null;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
};

export type QcTemplateItem = {
  id: string;
  template_id: string;
  label: string;
  description: string | null;
  is_required: boolean;
  sort_order: number;
};

export type QcResult = {
  id: string;
  production_stage_id: string;
  template_id: string | null;
  item_id: string | null;
  label: string;
  outcome: QcOutcome;
  remarks: string | null;
  image_urls: string[];
  inspector_id: string | null;
  checked_at: string | null;
};

export async function listQcTemplates(activeOnly = true): Promise<QcTemplate[]> {
  const q = supabase.from("qc_templates" as never).select("*").order("sort_order");
  const { data, error } = activeOnly ? await q.eq("is_active", true) : await q;
  if (error) throw error;
  return (data ?? []) as unknown as QcTemplate[];
}

export async function listTemplateItems(templateId: string): Promise<QcTemplateItem[]> {
  const { data, error } = await supabase
    .from("qc_template_items" as never)
    .select("*")
    .eq("template_id", templateId)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as unknown as QcTemplateItem[];
}

export async function listStageResults(stageId: string): Promise<QcResult[]> {
  const { data, error } = await supabase
    .from("qc_results" as never)
    .select("*")
    .eq("production_stage_id", stageId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as unknown as QcResult[];
}

export async function seedResultsFromTemplate(stageId: string, templateId: string) {
  const items = await listTemplateItems(templateId);
  if (items.length === 0) return;
  const rows = items.map((i) => ({
    production_stage_id: stageId,
    template_id: templateId,
    item_id: i.id,
    label: i.label,
    outcome: "not_checked" as QcOutcome,
  }));
  const { error } = await supabase.from("qc_results" as never).insert(rows as never);
  if (error) throw error;
}

export async function updateResult(id: string, patch: Partial<Pick<QcResult, "outcome" | "remarks" | "image_urls">>) {
  const payload: Record<string, unknown> = { ...patch };
  if (patch.outcome && patch.outcome !== "not_checked") payload.checked_at = new Date().toISOString();
  const { error } = await supabase.from("qc_results" as never).update(payload as never).eq("id", id);
  if (error) throw error;
}
