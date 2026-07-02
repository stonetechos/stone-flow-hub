/** Enquiries data access — includes stage advance and Send-RFQ orchestration. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable, LeadStage } from "@/lib/types";
import { sanitizeSearch } from "@/lib/zod";
import {
  enquiryCreateSchema,
  sendRfqSchema,
  type EnquiryCreateInput,
  type SendRfqInput,
} from "./schema";
import { getProject } from "@/lib/projects/api";

export type EnquiryRow = DbTable<"enquiries">;
export type EnquiryListItem = EnquiryRow & {
  customer: { id: string; name: string; customer_code: string } | null;
  project: { id: string; name: string; project_code: string; city: string | null } | null;
};

const SELECT_WITH_JOINS =
  "*, customer:customers!enquiries_customer_id_fkey(id,name,customer_code), project:projects!enquiries_project_id_fkey(id,name,project_code,city)";

export async function listEnquiries(query = ""): Promise<EnquiryListItem[]> {
  let q = supabase
    .from("enquiries")
    .select(SELECT_WITH_JOINS)
    .order("created_at", { ascending: false })
    .limit(200);

  const s = sanitizeSearch(query);
  if (s) q = q.or(`enquiry_no.ilike.%${s}%,notes.ilike.%${s}%`);

  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as EnquiryListItem[];
}

export async function getEnquiry(id: string): Promise<EnquiryListItem | null> {
  const { data, error } = await supabase
    .from("enquiries")
    .select(SELECT_WITH_JOINS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as EnquiryListItem | null) ?? null;
}

export async function createEnquiry(input: EnquiryCreateInput): Promise<EnquiryRow> {
  const parsed = enquiryCreateSchema.parse(input);

  // Derive customer_id from the chosen project (single source of truth).
  const project = await getProject(parsed.project_id);
  if (!project) throw new AppError("Selected project not found", "NOT_FOUND", 404);

  // enquiry_no is populated by the `assign_enquiry_code` trigger when blank.
  const { data, error } = await supabase
    .from("enquiries")
    .insert({
      enquiry_no: "",
      project_id: project.id,
      customer_id: project.customer_id,
      priority: parsed.priority,
      source: parsed.source ?? null,
      budget_inr: parsed.budget_inr ?? null,
      required_delivery_date: parsed.required_delivery_date ?? null,
      notes: parsed.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updateEnquiryStage(id: string, stage: LeadStage): Promise<EnquiryRow> {
  const { data, error } = await supabase
    .from("enquiries")
    .update({ stage })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updateEnquiry(id: string, input: EnquiryCreateInput): Promise<EnquiryRow> {
  const parsed = enquiryCreateSchema.parse(input);
  const project = await getProject(parsed.project_id);
  if (!project) throw new AppError("Selected project not found", "NOT_FOUND", 404);
  const { data, error } = await supabase
    .from("enquiries")
    .update({
      project_id: project.id,
      customer_id: project.customer_id,
      priority: parsed.priority,
      source: parsed.source ?? null,
      budget_inr: parsed.budget_inr ?? null,
      required_delivery_date: parsed.required_delivery_date ?? null,
      notes: parsed.notes ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deleteEnquiry(id: string): Promise<void> {
  const { error } = await supabase.from("enquiries").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

export async function sendRfq(input: SendRfqInput) {
  const parsed = sendRfqSchema.parse(input);
  const { data, error } = await supabase.rpc("send_rfq", {
    p_enquiry_id: parsed.enquiry_id,
    p_vendor_ids: parsed.vendor_ids,
    p_due_date: parsed.due_date,
    p_notes: parsed.notes ?? undefined,
  });
  if (error) throw new AppError(mapDbError(error));
  return data;
}
