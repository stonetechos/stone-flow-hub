/** Estimation Studio — data access layer.
 *  Non-breaking: exists alongside the legacy /quotes module.
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { sanitizeSearch } from "@/lib/zod";
import { getProject } from "@/lib/projects/api";
import type { DbTable } from "@/lib/types";
import {
  estimateCreateSchema,
  estimateUpdateSchema,
  generateDocumentSchema,
  type EstimateCreateInput,
  type EstimateUpdateInput,
  type GenerateDocumentInput,
} from "./schema";

export type EstimateRow = DbTable<"estimates">;
export type EstimateItemRow = DbTable<"estimate_items">;
export type EstimateComponentRow = DbTable<"estimate_cost_components">;
export type EstimatePaymentRow = DbTable<"estimate_payment_schedules">;
export type EstimateDocumentRow = DbTable<"estimate_documents">;

export type EstimateListItem = EstimateRow & {
  customer: { id: string; name: string; customer_code: string } | null;
  project: { id: string; name: string; project_code: string } | null;
};

const SELECT_JOINS =
  "*, customer:customers!estimates_customer_id_fkey(id,name,customer_code), project:projects!estimates_project_id_fkey(id,name,project_code)";

export async function listEstimates(query = ""): Promise<EstimateListItem[]> {
  let q = supabase
    .from("estimates")
    .select(SELECT_JOINS)
    .order("created_at", { ascending: false })
    .limit(200);
  const s = sanitizeSearch(query);
  if (s) q = q.or(`estimate_no.ilike.%${s}%,notes.ilike.%${s}%`);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as EstimateListItem[];
}

export async function getEstimate(id: string): Promise<EstimateListItem | null> {
  const { data, error } = await supabase
    .from("estimates")
    .select(SELECT_JOINS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as EstimateListItem | null) ?? null;
}

export async function getEstimateItems(estimateId: string): Promise<EstimateItemRow[]> {
  const { data, error } = await supabase
    .from("estimate_items")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("sort_order", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function getEstimateComponents(estimateId: string): Promise<EstimateComponentRow[]> {
  const { data, error } = await supabase
    .from("estimate_cost_components")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("sort_order", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function getEstimateSchedule(estimateId: string): Promise<EstimatePaymentRow[]> {
  const { data, error } = await supabase
    .from("estimate_payment_schedules")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("sort_order", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function getEstimateDocuments(estimateId: string): Promise<EstimateDocumentRow[]> {
  const { data, error } = await supabase
    .from("estimate_documents")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function createEstimate(input: EstimateCreateInput): Promise<EstimateRow> {
  const parsed = estimateCreateSchema.parse(input);
  const project = await getProject(parsed.project_id);
  if (!project) throw new AppError("Selected project not found", "NOT_FOUND", 404);

  const { data: est, error } = await supabase
    .from("estimates")
    .insert({
      estimate_no: "",
      template: parsed.template,
      project_id: project.id,
      customer_id: project.customer_id,
      enquiry_id: parsed.enquiry_id ?? null,
      source_quote_id: parsed.source_quote_id ?? null,
      valid_until: parsed.valid_until ?? null,
      notes: parsed.notes ?? null,
      terms: parsed.terms ?? null,
      margin_pct: parsed.margin_pct,
      gst_pct: parsed.gst_pct,
      payment_schedule_kind: parsed.payment_schedule_kind,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));

  const itemRows = parsed.items.map((it, idx) => ({
    estimate_id: est.id,
    category: it.category,
    product_id: it.product_id ?? null,
    description: it.description,
    quantity: it.quantity,
    unit: it.unit ?? null,
    unit_price: it.unit_price,
    tax_pct: it.tax_pct,
    sort_order: idx,
  }));
  if (itemRows.length) {
    const { error: itemErr } = await supabase.from("estimate_items").insert(itemRows);
    if (itemErr) throw new AppError(mapDbError(itemErr));
  }

  if (parsed.components.length) {
    const compRows = parsed.components.map((c, idx) => ({
      estimate_id: est.id,
      kind: c.kind,
      label: c.label ?? null,
      quantity: c.quantity,
      unit: c.unit ?? null,
      unit_price: c.unit_price,
      sort_order: idx,
    }));
    const { error: compErr } = await supabase
      .from("estimate_cost_components")
      .insert(compRows);
    if (compErr) throw new AppError(mapDbError(compErr));
  }

  const scheduleRows = parsed.schedule.map((s, idx) => ({
    estimate_id: est.id,
    label: s.label,
    pct: s.pct,
    due_offset_days: s.due_offset_days,
    sort_order: idx,
  }));
  const { error: schErr } = await supabase
    .from("estimate_payment_schedules")
    .insert(scheduleRows);
  if (schErr) throw new AppError(mapDbError(schErr));

  const { data: reloaded } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", est.id)
    .single();
  return reloaded ?? est;
}

export async function updateEstimate(
  id: string,
  input: EstimateUpdateInput,
): Promise<EstimateRow> {
  const parsed = estimateUpdateSchema.parse(input);
  const { data, error } = await supabase
    .from("estimates")
    .update({
      valid_until: parsed.valid_until ?? null,
      notes: parsed.notes ?? null,
      terms: parsed.terms ?? null,
      margin_pct: parsed.margin_pct,
      gst_pct: parsed.gst_pct,
      payment_schedule_kind: parsed.payment_schedule_kind,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));

  await supabase.from("estimate_items").delete().eq("estimate_id", id);
  await supabase.from("estimate_cost_components").delete().eq("estimate_id", id);
  await supabase.from("estimate_payment_schedules").delete().eq("estimate_id", id);

  if (parsed.items.length) {
    const itemRows = parsed.items.map((it, idx) => ({
      estimate_id: id,
      category: it.category,
      product_id: it.product_id ?? null,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit ?? null,
      unit_price: it.unit_price,
      tax_pct: it.tax_pct,
      sort_order: idx,
    }));
    const { error: itemErr } = await supabase.from("estimate_items").insert(itemRows);
    if (itemErr) throw new AppError(mapDbError(itemErr));
  }
  if (parsed.components.length) {
    const compRows = parsed.components.map((c, idx) => ({
      estimate_id: id,
      kind: c.kind,
      label: c.label ?? null,
      quantity: c.quantity,
      unit: c.unit ?? null,
      unit_price: c.unit_price,
      sort_order: idx,
    }));
    const { error: compErr } = await supabase
      .from("estimate_cost_components")
      .insert(compRows);
    if (compErr) throw new AppError(mapDbError(compErr));
  }
  const scheduleRows = parsed.schedule.map((s, idx) => ({
    estimate_id: id,
    label: s.label,
    pct: s.pct,
    due_offset_days: s.due_offset_days,
    sort_order: idx,
  }));
  const { error: schErr } = await supabase
    .from("estimate_payment_schedules")
    .insert(scheduleRows);
  if (schErr) throw new AppError(mapDbError(schErr));

  return data;
}

export async function setEstimateStatus(
  id: string,
  status: DbTable<"estimates">["status"],
): Promise<EstimateRow> {
  const { data, error } = await supabase
    .from("estimates")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deleteEstimate(id: string): Promise<void> {
  const { error } = await supabase.from("estimates").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

/** Save a generated customer / cost-sheet / WhatsApp / email version. Full history is kept. */
export async function saveEstimateDocument(
  input: GenerateDocumentInput,
): Promise<EstimateDocumentRow> {
  const parsed = generateDocumentSchema.parse(input);
  const { count } = await supabase
    .from("estimate_documents")
    .select("id", { head: true, count: "exact" })
    .eq("estimate_id", parsed.estimate_id)
    .eq("kind", parsed.kind);
  const nextVersion = (count ?? 0) + 1;

  const { data, error } = await supabase
    .from("estimate_documents")
    .insert({
      estimate_id: parsed.estimate_id,
      kind: parsed.kind,
      version: nextVersion,
      subject: parsed.subject ?? null,
      body_text: parsed.body_text ?? null,
      body_html: parsed.body_html ?? null,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

/** Convert an accepted estimate into a legacy Quote so downstream Sales Order / Invoice flow works. */
export async function convertEstimateToQuote(estimateId: string) {
  const est = await getEstimate(estimateId);
  if (!est) throw new AppError("Estimate not found", "NOT_FOUND", 404);
  if (!est.project_id) throw new AppError("Estimate has no project to convert.", "BAD_REQUEST", 400);
  const items = await getEstimateItems(estimateId);

  const { data: quote, error } = await supabase
    .from("quotes")
    .insert({
      quote_no: "",
      project_id: est.project_id,
      customer_id: est.customer_id,
      enquiry_id: est.enquiry_id ?? null,
      estimate_id: est.id,
      valid_until: est.valid_until ?? null,
      notes: est.notes ?? null,
      terms: est.terms ?? null,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));

  const rows = items.map((it, idx) => ({
    quote_id: quote.id,
    product_id: it.product_id,
    description: it.description,
    quantity: it.quantity,
    unit: it.unit,
    unit_price: it.unit_price,
    tax_pct: it.tax_pct,
    sort_order: idx,
  }));
  if (rows.length) {
    const { error: itemErr } = await supabase.from("quote_items").insert(rows);
    if (itemErr) throw new AppError(mapDbError(itemErr));
  }

  await supabase
    .from("estimates")
    .update({ status: "converted" })
    .eq("id", est.id);

  return quote;
}
