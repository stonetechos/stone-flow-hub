/** Customers data access. Trust boundary — validates inputs, generates codes, dedupes on phone. */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import { normalizeMobile, sanitizeSearch } from "@/lib/zod";
import type { DbTable } from "@/lib/types";
import { customerCreateSchema, type CustomerCreateInput } from "./schema";
import {
  isMaterialInterestEnumError,
  sanitizeForPendingDbEnum,
  type MaterialInterest,
} from "./material-interests";
import {
  isMissingCustomerColumnError,
  normalizeCustomerRow,
  prepareCustomerExternalRef,
  stripMissingCustomerColumns,
} from "./normalize";

export type CustomerRow = DbTable<"customers">;

export async function listCustomers(query = ""): Promise<CustomerRow[]> {
  let q = getDb().from("customers").select("*").order("created_at", { ascending: true }).limit(200);

  const s = sanitizeSearch(query);
  if (s) {
    // Search across every field a staff user reasonably types when looking up a customer.
    // Query external_ref JSONB (for resilience if dedicated columns are not yet in Postgres)
    // alongside top-level fields safely without throwing 42703 schema errors.
    q = q.or(
      [
        `name.ilike.%${s}%`,
        `external_ref->>company_name.ilike.%${s}%`,
        `external_ref->>contact_person.ilike.%${s}%`,
        `customer_code.ilike.%${s}%`,
        `primary_phone.ilike.%${s}%`,
        `whatsapp.ilike.%${s}%`,
        `primary_email.ilike.%${s}%`,
        `gst_number.ilike.%${s}%`,
        `city.ilike.%${s}%`,
      ].join(","),
    );
  }
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []).map((row) => normalizeCustomerRow(row));
}

export async function purgeMisplacedCustomerEntries(): Promise<void> {
  // Safe no-op: preserved for backwards-compatibility without deleting valid customer entries
}

export async function getCustomer(id: string): Promise<CustomerRow | null> {
  const { data, error } = await getDb().from("customers").select("*").eq("id", id).maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return normalizeCustomerRow(data);
}

export async function findCustomerByPhone(mobile: string): Promise<CustomerRow | null> {
  const normalized = normalizeMobile(mobile);
  if (!normalized) return null;
  const { data, error } = await getDb()
    .from("customers")
    .select("*")
    .ilike("primary_phone", `%${normalized}%`)
    .limit(1)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return normalizeCustomerRow(data);
}

export async function createCustomer(input: CustomerCreateInput): Promise<CustomerRow> {
  const parsed = customerCreateSchema.parse(input);

  if (parsed.mobile) {
    const existing = await findCustomerByPhone(parsed.mobile);
    if (existing) {
      throw new AppError(
        `A customer with this mobile already exists: ${existing.name} (${existing.customer_code})`,
        "DUPLICATE_CUSTOMER",
        409,
      );
    }
  }

  // 1. Primary path: Elevated server function (bypasses restrictive RLS for authorized staff)
  try {
    const { saveCustomerServerFn } = await import("./customers.functions");
    const res = await saveCustomerServerFn({ data: { data: parsed } });
    if (res) return normalizeCustomerRow(res as CustomerRow);
  } catch (serverErr: unknown) {
    const err = serverErr as { message?: string };
    if (err?.message?.includes("already exists")) {
      throw new AppError(err.message, "DUPLICATE_CUSTOMER", 409);
    }
    console.warn(
      "[customers.api] Server function failed, falling back to client-side insert:",
      serverErr,
    );
  }

  // 2. Client fallback (with authenticated created_by attribution)
  let uid: string | null = null;
  try {
    const { data: userData } = await getDb().auth.getUser();
    uid = userData.user?.id ?? null;
  } catch {
    // ignore
  }

  const extRef = prepareCustomerExternalRef(null, {
    company_name: parsed.company_name,
    contact_person: parsed.contact_person,
  });

  const insertPayload: Record<string, unknown> = {
    customer_code: "",
    name: parsed.name,
    contact_person: parsed.contact_person ?? null,
    company_name: parsed.company_name ?? null,
    primary_phone: normalizeMobile(parsed.mobile) || null,
    primary_email: parsed.email ?? null,
    whatsapp: parsed.whatsapp ?? null,
    city: parsed.city ?? null,
    state: parsed.state ?? null,
    pincode: parsed.pincode ?? null,
    billing_address: parsed.billing_address ?? null,
    gst_number: parsed.gst_number ?? null,
    notes: parsed.notes ?? null,
    customer_type: parsed.customer_type,
    referred_by: parsed.customer_type === "reference" ? (parsed.referred_by ?? null) : null,
    site_address: parsed.site_address ?? null,
    space_type: parsed.space_type ?? null,
    material_interests: parsed.material_interests ?? [],
    created_by: uid,
    external_ref: extRef,
  };

  let { data, error } = await getDb()
    .from("customers")
    .insert(insertPayload as never)
    .select("*")
    .single();

  // Defensive resilience 1: Missing column in schema cache
  if (error && isMissingCustomerColumnError(error)) {
    console.warn(
      "[customers.api] Missing column fallback triggered on client insert for company_name/contact_person:",
      error.message,
    );
    const stripped = stripMissingCustomerColumns(insertPayload);
    const retry = await getDb()
      .from("customers")
      .insert(stripped as never)
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }

  // Defensive resilience 2: Missing enum value
  if (error && isMaterialInterestEnumError(error)) {
    const { filteredInterests, sanitizedNotes } = sanitizeForPendingDbEnum(
      (insertPayload.material_interests as MaterialInterest[]) ?? [],
      (insertPayload.notes as string) ?? null,
    );
    const stripped = stripMissingCustomerColumns({
      ...insertPayload,
      material_interests: filteredInterests,
      notes: sanitizedNotes,
    });
    const retry = await getDb()
      .from("customers")
      .insert(stripped as never)
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw new AppError(mapDbError(error));

  const normalized = normalizeCustomerRow(data);
  if (normalized) {
    try {
      const { broadcastCustomerCreated } = await import("@/lib/notifications/broadcast");
      broadcastCustomerCreated(normalized);
    } catch (e) {
      console.warn("[customers] notification dispatch skipped", e);
    }
  }

  if (!normalized) throw new AppError("Failed to save customer");
  return normalized;
}

export async function updateCustomer(id: string, input: CustomerCreateInput): Promise<CustomerRow> {
  const parsed = customerCreateSchema.parse(input);

  // 1. Primary path: Server function
  try {
    const { saveCustomerServerFn } = await import("./customers.functions");
    const res = await saveCustomerServerFn({ data: { id, data: parsed } });
    if (res) return normalizeCustomerRow(res as CustomerRow);
  } catch (serverErr) {
    console.warn(
      "[customers.api] Server function failed, falling back to client-side update:",
      serverErr,
    );
  }

  // 2. Client fallback
  const { data: existingCustomer } = await getDb()
    .from("customers")
    .select("external_ref")
    .eq("id", id)
    .maybeSingle();

  const extRef = prepareCustomerExternalRef(existingCustomer?.external_ref, {
    company_name: parsed.company_name,
    contact_person: parsed.contact_person,
  });

  const updatePayload: Record<string, unknown> = {
    name: parsed.name,
    contact_person: parsed.contact_person ?? null,
    company_name: parsed.company_name ?? null,
    primary_phone: normalizeMobile(parsed.mobile) || null,
    primary_email: parsed.email ?? null,
    whatsapp: parsed.whatsapp ?? null,
    city: parsed.city ?? null,
    state: parsed.state ?? null,
    pincode: parsed.pincode ?? null,
    billing_address: parsed.billing_address ?? null,
    gst_number: parsed.gst_number ?? null,
    notes: parsed.notes ?? null,
    customer_type: parsed.customer_type,
    referred_by: parsed.customer_type === "reference" ? (parsed.referred_by ?? null) : null,
    site_address: parsed.site_address ?? null,
    space_type: parsed.space_type ?? null,
    material_interests: parsed.material_interests ?? [],
    external_ref: extRef,
  };

  let { data, error } = await getDb()
    .from("customers")
    .update(updatePayload as never)
    .eq("id", id)
    .select("*")
    .single();

  // Defensive resilience 1: Missing column in schema cache
  if (error && isMissingCustomerColumnError(error)) {
    console.warn(
      "[customers.api] Missing column fallback triggered on client update for company_name/contact_person:",
      error.message,
    );
    const stripped = stripMissingCustomerColumns(updatePayload);
    const retry = await getDb()
      .from("customers")
      .update(stripped as never)
      .eq("id", id)
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }

  // Defensive resilience 2: Missing enum value
  if (error && isMaterialInterestEnumError(error)) {
    const { filteredInterests, sanitizedNotes } = sanitizeForPendingDbEnum(
      (updatePayload.material_interests as MaterialInterest[]) ?? [],
      (updatePayload.notes as string) ?? null,
    );
    const stripped = stripMissingCustomerColumns({
      ...updatePayload,
      material_interests: filteredInterests,
      notes: sanitizedNotes,
    });
    const retry = await getDb()
      .from("customers")
      .update(stripped as never)
      .eq("id", id)
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw new AppError(mapDbError(error));
  if (!data) throw new AppError("Failed to update customer");
  return normalizeCustomerRow(data);
}

export async function deleteCustomer(id: string): Promise<void> {
  // 1. Primary path: Server function
  try {
    const { deleteCustomerServerFn } = await import("./customers.functions");
    await deleteCustomerServerFn({ data: { id } });
    return;
  } catch (serverErr) {
    console.warn(
      "[customers.api] Server function failed, falling back to client-side delete:",
      serverErr,
    );
  }

  // 2. Client fallback
  const { error } = await getDb().from("customers").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

export interface UpdateCustomerCrmStatusOptions {
  customerId: string;
  is_active?: boolean;
  response_status?:
    | "active_responsive"
    | "order_placed"
    | "followup_pending"
    | "awaiting_reply"
    | "inactive_no_response"
    | "do_not_contact";
  call_note?: string;
  call_outcome?: string;
  next_call_at?: string;
  next_call_channel?: "call" | "whatsapp" | "email" | "meeting" | "site_visit";
  next_call_agenda?: string;
  complete_pending_followup_id?: string;
}

export async function updateCustomerCrmStatus(
  input: UpdateCustomerCrmStatusOptions,
): Promise<CustomerRow> {
  // 1. Primary path: Server function (elevated permissions)
  try {
    const { updateCustomerCrmStatusServerFn } = await import("./customers.functions");
    const res = await updateCustomerCrmStatusServerFn({ data: input });
    if (res?.customer) return normalizeCustomerRow(res.customer as CustomerRow);
  } catch (serverErr) {
    console.warn(
      "[customers.api] Server function updateCustomerCrmStatus failed, falling back to client-side:",
      serverErr,
    );
  }

  // 2. Client fallback
  const db = getDb();
  const { data: existing, error: fetchErr } = await db
    .from("customers")
    .select("id, name, workflow_state, notes, is_active")
    .eq("id", input.customerId)
    .single();

  if (fetchErr || !existing)
    throw new AppError(fetchErr ? mapDbError(fetchErr) : "Customer not found");

  const currentWf = (existing.workflow_state as Record<string, unknown>) || {};
  const updatedWf: Record<string, unknown> = { ...currentWf };

  if (input.response_status) {
    updatedWf.response_status = input.response_status;
  }

  const nowIso = new Date().toISOString();

  if (input.call_note || input.call_outcome) {
    updatedWf.last_call_at = nowIso;
    if (input.call_note) updatedWf.last_call_notes = input.call_note;
    if (input.call_outcome) updatedWf.last_call_outcome = input.call_outcome;
    updatedWf.call_count = Number(currentWf.call_count ?? 0) + 1;
  }

  if (input.next_call_at) {
    updatedWf.next_call_at = input.next_call_at;
    if (input.next_call_agenda) updatedWf.next_call_agenda = input.next_call_agenda;
  }

  let targetIsActive = existing.is_active;
  if (input.is_active !== undefined) {
    targetIsActive = input.is_active;
  } else if (
    input.response_status === "inactive_no_response" ||
    input.response_status === "do_not_contact"
  ) {
    targetIsActive = false;
  } else if (
    input.response_status === "active_responsive" ||
    input.response_status === "order_placed" ||
    input.response_status === "followup_pending" ||
    input.response_status === "awaiting_reply"
  ) {
    targetIsActive = true;
  }

  let updatedNotes = existing.notes;
  if (input.call_note && input.call_note.trim()) {
    const timestamp = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    const outcomeTag = input.call_outcome ? `[${input.call_outcome}] ` : "";
    const logLine = `\n[Call · ${timestamp}] ${outcomeTag}${input.call_note.trim()}`;
    updatedNotes = existing.notes ? `${existing.notes.trim()}${logLine}` : logLine.trim();
  }

  const { data: updated, error: updateErr } = await db
    .from("customers")
    .update({
      workflow_state: updatedWf as unknown as import("@/integrations/supabase/types").Json,
      is_active: targetIsActive,
      notes: updatedNotes,
    })
    .eq("id", input.customerId)
    .select("*")
    .single();

  if (updateErr) throw new AppError(mapDbError(updateErr));

  // If customer gave their order, automatically resolve any open pending followups
  if (input.response_status === "order_placed") {
    await db
      .from("followups")
      .update({
        status: "done",
        completed_at: nowIso,
        outcome_notes:
          input.call_note || input.call_outcome || "Order placed — sales follow-up completed",
      })
      .eq("entity_type", "customer")
      .eq("entity_id", input.customerId)
      .eq("status", "pending");
  }

  if (input.complete_pending_followup_id) {
    await db
      .from("followups")
      .update({
        status: "done",
        completed_at: nowIso,
        outcome_notes: input.call_note || input.call_outcome || "Completed via call log",
      })
      .eq("id", input.complete_pending_followup_id);
  }

  if (input.next_call_at) {
    await db.from("followups").insert({
      entity_type: "customer",
      entity_id: input.customerId,
      scheduled_at: input.next_call_at,
      channel: input.next_call_channel || "call",
      notes: input.next_call_agenda || input.call_note || "Scheduled customer follow-up call",
      status: "pending",
    });
  }

  return normalizeCustomerRow(updated as CustomerRow);
}
