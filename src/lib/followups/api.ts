/** Follow-ups data access. Polymorphic: attaches to any master record. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";
import {
  followupCompleteSchema,
  followupCreateSchema,
  type FollowupCompleteInput,
  type FollowupCreateInput,
  type FollowupEntityType,
} from "./schema";

export type FollowupRow = DbTable<"followups">;

/** Row shape returned by list views — with enquiry, project, and customer context joined. */
export type FollowupWithEnquiry = FollowupRow & {
  enquiry: {
    id: string;
    enquiry_no: string;
    project: { id: string; name: string } | null;
    customer: { id: string; name: string } | null;
  } | null;
  project: { id: string; name: string; project_code: string | null } | null;
};

const SELECT_WITH_JOINS =
  "*, enquiry:enquiries!followups_enquiry_id_fkey(id,enquiry_no,project:projects!enquiries_project_id_fkey(id,name),customer:customers!enquiries_customer_id_fkey(id,name)), project:projects!followups_project_id_fkey(id,name,project_code)";

export interface ListFollowupsOptions {
  scope?: "pending" | "today" | "all";
  entityType?: FollowupEntityType | null;
  entityId?: string | null;
  projectId?: string | null;
  customerId?: string | null;
  limit?: number;
}

/** Backward-compatible list — accepts a bare scope string or full options object. */
export async function listFollowups(
  input: "pending" | "today" | "all" | ListFollowupsOptions = "all",
): Promise<FollowupWithEnquiry[]> {
  const opts: ListFollowupsOptions = typeof input === "string" ? { scope: input } : input;
  const scope = opts.scope ?? "all";
  let q = supabase
    .from("followups")
    .select(SELECT_WITH_JOINS)
    .order("scheduled_at", { ascending: true })
    .limit(opts.limit ?? 200);

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

  if (opts.entityType && opts.entityId) {
    q = q.eq("entity_type", opts.entityType).eq("entity_id", opts.entityId);
  }
  if (opts.projectId) q = q.eq("project_id", opts.projectId);
  if (opts.customerId) {
    // Match either a customer-scoped follow-up or one linked to that customer via an enquiry.
    q = q.or(
      `and(entity_type.eq.customer,entity_id.eq.${opts.customerId}),` +
        `enquiry_id.in.(${(await enquiryIdsForCustomer(opts.customerId)).join(",") || "00000000-0000-0000-0000-000000000000"})`,
    );
  }

  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as FollowupWithEnquiry[];
}

async function enquiryIdsForCustomer(customerId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("enquiries")
    .select("id")
    .eq("customer_id", customerId);
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []).map((r) => r.id);
}

export async function getFollowup(id: string): Promise<FollowupWithEnquiry | null> {
  const { data, error } = await supabase
    .from("followups")
    .select(SELECT_WITH_JOINS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as FollowupWithEnquiry | null) ?? null;
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

/** Derive project_id / enquiry_id / customer_id context from the primary entity. */
async function deriveDerivedContext(
  entityType: FollowupEntityType,
  entityId: string,
): Promise<{ enquiry_id: string | null; project_id: string | null }> {
  switch (entityType) {
    case "enquiry": {
      const { data } = await supabase
        .from("enquiries")
        .select("id,project_id")
        .eq("id", entityId)
        .maybeSingle();
      return { enquiry_id: data?.id ?? null, project_id: data?.project_id ?? null };
    }
    case "project":
      return { enquiry_id: null, project_id: entityId };
    case "rfq": {
      const { data } = await supabase
        .from("rfqs")
        .select("enquiry_id,project_id")
        .eq("id", entityId)
        .maybeSingle();
      return { enquiry_id: data?.enquiry_id ?? null, project_id: data?.project_id ?? null };
    }
    case "purchase_order":
    case "sales_order": {
      const table = entityType === "purchase_order" ? "purchase_orders" : "sales_orders";
      const { data } = await supabase
        .from(table)
        .select("project_id")
        .eq("id", entityId)
        .maybeSingle();
      return { enquiry_id: null, project_id: data?.project_id ?? null };
    }
    case "invoice": {
      const { data } = await supabase
        .from("invoices")
        .select("project_id")
        .eq("id", entityId)
        .maybeSingle();
      return { enquiry_id: null, project_id: data?.project_id ?? null };
    }
    // customer, vendor, dispatch: no direct project/enquiry linkage — keep null.
    default:
      return { enquiry_id: null, project_id: null };
  }
}

export async function createFollowup(input: FollowupCreateInput): Promise<FollowupRow> {
  const parsed = followupCreateSchema.parse(input);
  const derived = await deriveDerivedContext(parsed.entity_type, parsed.entity_id);

  const { data, error } = await supabase
    .from("followups")
    .insert({
      entity_type: parsed.entity_type,
      entity_id: parsed.entity_id,
      enquiry_id: derived.enquiry_id,
      project_id: derived.project_id,
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
  const derived = await deriveDerivedContext(parsed.entity_type, parsed.entity_id);
  const { data, error } = await supabase
    .from("followups")
    .update({
      entity_type: parsed.entity_type,
      entity_id: parsed.entity_id,
      enquiry_id: derived.enquiry_id,
      project_id: derived.project_id,
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
