/** Enquiries data access — includes stage advance, Send-RFQ, and Convert-to-Project. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable, LeadStage } from "@/lib/types";
import { normalizeMobile, sanitizeSearch } from "@/lib/zod";
import {
  convertToProjectSchema,
  enquiryCreateSchema,
  enquiryUpdateSchema,
  sendRfqSchema,
  type ConvertToProjectInput,
  type EnquiryCreateInput,
  type EnquiryUpdateInput,
  type SendRfqInput,
} from "./schema";
import { findCustomerByPhone, createCustomer } from "@/lib/customers/api";

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
  if (s) q = q.or(`enquiry_no.ilike.%${s}%,notes.ilike.%${s}%,requirement.ilike.%${s}%`);

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

/**
 * Create a new enquiry. Looks up the customer by mobile; if none exists,
 * creates one on the fly. Project remains NULL — assign later via convert.
 */
export async function createEnquiry(input: EnquiryCreateInput): Promise<EnquiryRow> {
  const parsed = enquiryCreateSchema.parse(input);

  let customer = await findCustomerByPhone(parsed.mobile);
  if (!customer) {
    customer = await createCustomer({
      name: parsed.customer_name,
      mobile: parsed.mobile,
      email: parsed.email ?? null,
      customer_type: "individual",
      whatsapp: null,
      city: null,
      state: null,
      pincode: null,
      billing_address: null,
      gst_number: null,
      notes: null,
    });
  }

  const { data, error } = await supabase
    .from("enquiries")
    .insert({
      enquiry_no: "",
      customer_id: customer.id,
      project_id: null,
      stage: "new_lead",
      priority: parsed.priority,
      source: parsed.source,
      requirement: parsed.requirement,
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

export async function updateEnquiry(id: string, input: EnquiryUpdateInput): Promise<EnquiryRow> {
  const parsed = enquiryUpdateSchema.parse(input);
  const { data, error } = await supabase
    .from("enquiries")
    .update({
      source: parsed.source ?? null,
      requirement: parsed.requirement ?? null,
      priority: parsed.priority,
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

/**
 * Convert an unassigned enquiry into a full Project.
 * Creates the project against the enquiry's customer, links it back, and
 * advances the enquiry stage if still at 'new_lead'.
 */
export async function convertEnquiryToProject(
  enquiryId: string,
  input: ConvertToProjectInput,
): Promise<{ project_id: string }> {
  const parsed = convertToProjectSchema.parse(input);

  const enq = await getEnquiry(enquiryId);
  if (!enq) throw new AppError("Enquiry not found", "NOT_FOUND", 404);
  if (enq.project_id)
    throw new AppError("This enquiry is already linked to a project", "CONFLICT", 409);

  const { data: project, error: pErr } = await supabase
    .from("projects")
    .insert({
      project_code: "",
      customer_id: enq.customer_id,
      name: parsed.name,
      city: parsed.city,
      site_address: parsed.site_address ?? null,
      state: parsed.state ?? null,
      architect_name: parsed.architect_name ?? null,
      contractor_name: parsed.contractor_name ?? null,
      area_sqft: parsed.area_sqft ?? null,
      expected_completion_date: parsed.expected_completion_date ?? null,
    })
    .select("id")
    .single();
  if (pErr) throw new AppError(mapDbError(pErr));

  const { error: uErr } = await supabase
    .from("enquiries")
    .update({
      project_id: project.id,
      stage: enq.stage === "new_lead" ? "contacted" : enq.stage,
    })
    .eq("id", enquiryId);
  if (uErr) throw new AppError(mapDbError(uErr));

  return { project_id: project.id };
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

// normalizeMobile re-export placeholder to satisfy tree-shaking assumptions
void normalizeMobile;
