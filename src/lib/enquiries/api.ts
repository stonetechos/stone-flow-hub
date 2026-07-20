/** Enquiries data access — includes stage advance, Send-RFQ, and Convert-to-Project. */
import { getDb } from "@/integrations/supabase/server-context";
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
  let q = getDb()
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
  const { data, error } = await getDb()
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

  let customer:
    | Awaited<ReturnType<typeof findCustomerByPhone>>
    | Awaited<ReturnType<typeof createCustomer>>
    | null = null;

  if (parsed.customer_id) {
    // Trust the picker — user chose an existing customer explicitly.
    const { data, error } = await getDb()
      .from("customers")
      .select("*")
      .eq("id", parsed.customer_id)
      .maybeSingle();
    if (error) throw new AppError(mapDbError(error));
    customer = data;
    if (!customer) throw new AppError("Selected customer no longer exists", "NOT_FOUND", 404);
  } else {
    customer = await findCustomerByPhone(parsed.mobile);
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
  }

  const { data, error } = await getDb()
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

export async function updateEnquiryStage(
  id: string,
  stage: LeadStage,
  opts?: { lost_reason?: string | null; lost_notes?: string | null },
): Promise<EnquiryRow> {
  const patch: {
    stage: LeadStage;
    lost_reason?: string | null;
    lost_notes?: string | null;
  } = { stage };
  if (opts && (stage === "lost" || stage === "cancelled")) {
    if (opts.lost_reason !== undefined) patch.lost_reason = opts.lost_reason ?? null;
    if (opts.lost_notes !== undefined) patch.lost_notes = opts.lost_notes ?? null;
  }
  const { data, error } = await getDb()
    .from("enquiries")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

/** Bulk-advance many enquiries to a stage. Non-lost only (no reason capture). */
export async function bulkUpdateEnquiryStage(ids: string[], stage: LeadStage): Promise<number> {
  if (ids.length === 0) return 0;
  const { error, count } = await getDb()
    .from("enquiries")
    .update({ stage }, { count: "exact" })
    .in("id", ids);
  if (error) throw new AppError(mapDbError(error));
  return count ?? 0;
}

/**
 * Lightweight aggregate for the dashboard pipeline widget.
 * Returns one row per underlying stage; UI groups into umbrellas.
 */
export type StageAggregate = {
  stage: LeadStage;
  count: number;
  revenue_inr: number;
  avg_days_in_stage: number;
};

export async function getEnquiryPipeline(): Promise<StageAggregate[]> {
  const { data, error } = await getDb()
    .from("enquiries")
    .select("stage, budget_inr, updated_at, created_at");
  if (error) throw new AppError(mapDbError(error));
  const now = Date.now();
  const buckets = new Map<string, { count: number; rev: number; days: number }>();
  for (const r of data ?? []) {
    const s = r.stage as LeadStage;
    const b = buckets.get(s) ?? { count: 0, rev: 0, days: 0 };
    b.count += 1;
    b.rev += Number(r.budget_inr ?? 0);
    const since = new Date(r.updated_at ?? r.created_at ?? now).getTime();
    b.days += Math.max(0, (now - since) / (1000 * 60 * 60 * 24));
    buckets.set(s, b);
  }
  return Array.from(buckets.entries()).map(([stage, b]) => ({
    stage: stage as LeadStage,
    count: b.count,
    revenue_inr: b.rev,
    avg_days_in_stage: b.count === 0 ? 0 : b.days / b.count,
  }));
}

/** Which underlying stages this enquiry has ever passed through. */
export async function listEnquiryVisitedStages(enquiryId: string): Promise<Set<LeadStage>> {
  const { data, error } = await getDb()
    .from("enquiry_stage_history")
    .select("to_stage")
    .eq("enquiry_id", enquiryId);
  if (error) throw new AppError(mapDbError(error));
  return new Set((data ?? []).map((r) => r.to_stage as LeadStage));
}

export async function updateEnquiry(id: string, input: EnquiryUpdateInput): Promise<EnquiryRow> {
  const parsed = enquiryUpdateSchema.parse(input);
  const { data, error } = await getDb()
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
  const { error } = await getDb().from("enquiries").delete().eq("id", id);
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

  const { data: project, error: pErr } = await getDb()
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

  const { error: uErr } = await getDb()
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
  const { data, error } = await getDb().rpc("send_rfq", {
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
