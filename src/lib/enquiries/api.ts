import { supabase } from "@/integrations/supabase/client";
import type { DbTable, LeadStage } from "@/lib/types";
import { AppError, mapDbError } from "@/lib/errors";
import { enquiryCreateSchema, sendRfqSchema, type EnquiryCreateInput, type SendRfqInput } from "./schema";

export type Enquiry = DbTable<"enquiries">;
export type Rfq = DbTable<"rfqs">;
export type RfqVendor = DbTable<"rfq_vendors">;

export type EnquiryListItem = Enquiry & {
  project: (Pick<DbTable<"projects">, "id" | "name" | "code" | "city"> & {
    customer: Pick<DbTable<"customers">, "id" | "name" | "code"> | null;
  }) | null;
};

export async function listEnquiries(query?: string): Promise<EnquiryListItem[]> {
  let q = supabase
    .from("enquiries")
    .select("*, project:projects(id, name, code, city, customer:customers(id, name, code))")
    .order("created_at", { ascending: false })
    .limit(200);
  if (query && query.trim()) {
    const t = `%${query.trim()}%`;
    q = q.or(`title.ilike.${t},code.ilike.${t}`);
  }
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data as EnquiryListItem[];
}

export async function getEnquiry(id: string): Promise<EnquiryListItem> {
  const { data, error } = await supabase
    .from("enquiries")
    .select("*, project:projects(id, name, code, city, customer:customers(id, name, code))")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  if (!data) throw new AppError("Enquiry not found", "NOT_FOUND", 404);
  return data as EnquiryListItem;
}

export async function createEnquiry(input: EnquiryCreateInput): Promise<Enquiry> {
  const parsed = enquiryCreateSchema.parse(input);
  const { data, error } = await supabase
    .from("enquiries")
    .insert({
      project_id: parsed.project_id,
      title: parsed.title,
      source: parsed.source,
      priority: parsed.priority,
      estimated_value: parsed.estimated_value ?? null,
      required_by: parsed.required_by ?? null,
      description: parsed.description ?? null,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function advanceEnquiryStage(id: string, stage: LeadStage): Promise<Enquiry> {
  const { data, error } = await supabase
    .from("enquiries")
    .update({ stage, stage_changed_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export type RfqWithVendors = Rfq & {
  rfq_vendors: Array<RfqVendor & { vendor: Pick<DbTable<"vendors">, "id" | "name" | "code"> | null }>;
};

export async function listRfqsForEnquiry(enquiryId: string): Promise<RfqWithVendors[]> {
  const { data, error } = await supabase
    .from("rfqs")
    .select("*, rfq_vendors(*, vendor:vendors(id, name, code))")
    .eq("enquiry_id", enquiryId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return data as RfqWithVendors[];
}

export async function sendRfq(input: SendRfqInput): Promise<Rfq> {
  const parsed = sendRfqSchema.parse(input);
  const { data, error } = await supabase.rpc("send_rfq", {
    p_enquiry_id: parsed.enquiry_id,
    p_vendor_ids: parsed.vendor_ids,
    p_due_date: parsed.due_date,
    p_notes: parsed.notes ?? null,
  });
  if (error) throw new AppError(mapDbError(error));
  return data as Rfq;
}
