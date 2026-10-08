/**
 * Server functions for Customer management.
 *
 * Runs on the server with supabaseAdmin (service role) to bypass client-side
 * RLS restrictions when creating/updating/deleting customers, ensuring all
 * authenticated staff can perform customer operations reliably.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { customerCreateSchema } from "./schema";
import { normalizeMobile } from "@/lib/zod";
import type { Database } from "@/integrations/supabase/types";
import { isMaterialInterestEnumError, sanitizeForPendingDbEnum } from "./material-interests";

export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

const saveCustomerInput = z.object({
  id: z.string().uuid().optional(),
  data: customerCreateSchema,
});

export const saveCustomerServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => saveCustomerInput.parse(raw))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, data: input } = data;
    const uid = context.userId;

    const normalizedPhone = normalizeMobile(input.mobile);

    // If creating (no id), check duplicate phone only when phone is provided
    if (!id && normalizedPhone) {
      const { data: existing } = await supabaseAdmin
        .from("customers")
        .select("id, name, customer_code")
        .eq("primary_phone", normalizedPhone)
        .limit(1)
        .maybeSingle();

      if (existing) {
        throw new Error(
          `A customer with this mobile already exists: ${existing.name} (${existing.customer_code})`,
        );
      }
    }

    if (!id) {
      // Ensure entity_sequences for CUS is at least the current customer count/highest sequential code
      // so new customer codes are strictly subsequent to existing records.
      try {
        const { count } = await supabaseAdmin
          .from("customers")
          .select("*", { count: "exact", head: true });
        if (count && count > 0) {
          const { data: seq } = await supabaseAdmin
            .from("entity_sequences")
            .select("last_value")
            .eq("prefix", "CUS")
            .maybeSingle();
          if (seq && seq.last_value < count) {
            await supabaseAdmin
              .from("entity_sequences")
              .update({ last_value: count })
              .eq("prefix", "CUS");
          }
        }
      } catch (seqErr) {
        console.warn("[customers.functions] CUS sequence alignment check skipped:", seqErr);
      }

      const payload = {
        customer_code: "",
        name: input.name,
        contact_person: input.contact_person ?? null,
        company_name: input.company_name ?? null,
        primary_phone: normalizedPhone || null,
        primary_email: input.email ?? null,
        whatsapp: input.whatsapp ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        pincode: input.pincode ?? null,
        billing_address: input.billing_address ?? null,
        gst_number: input.gst_number ?? null,
        notes: input.notes ?? null,
        customer_type: input.customer_type,
        referred_by: input.customer_type === "reference" ? (input.referred_by ?? null) : null,
        site_address: input.site_address ?? null,
        space_type: input.space_type ?? null,
        material_interests: input.material_interests ?? [],
        created_by: uid,
      };

      let row: CustomerRow | null = null;
      const initialInsert = await supabaseAdmin
        .from("customers")
        .insert(payload as never)
        .select("*")
        .single();

      let insertData = initialInsert.data;
      let insertError = initialInsert.error;

      // Defensive resilience: If Postgres enum is missing 'natural_stone_cladding_tiles',
      // sanitize the payload by stripping the un-migrated enum value and recording it in notes.
      if (insertError && isMaterialInterestEnumError(insertError)) {
        console.warn(
          "[customers.functions] Enum fallback triggered on insert for material_interests:",
          insertError.message,
        );
        const { filteredInterests, sanitizedNotes } = sanitizeForPendingDbEnum(
          payload.material_interests,
          payload.notes,
        );
        const retryResult = await supabaseAdmin
          .from("customers")
          .insert({
            ...payload,
            material_interests: filteredInterests,
            notes: sanitizedNotes,
          } as never)
          .select("*")
          .single();
        insertData = retryResult.data;
        insertError = retryResult.error;
      }

      if (insertError) throw new Error(insertError.message);
      row = insertData as CustomerRow;

      if (row) {
        try {
          const { broadcastCustomerCreated } = await import("@/lib/notifications/broadcast");
          broadcastCustomerCreated(row as CustomerRow);
        } catch (e) {
          console.warn("[customers.functions] broadcast skipped:", e);
        }
      }

      return row as CustomerRow;
    } else {
      // Update existing customer
      const updatePayload = {
        name: input.name,
        contact_person: input.contact_person ?? null,
        company_name: input.company_name ?? null,
        primary_phone: normalizedPhone || null,
        primary_email: input.email ?? null,
        whatsapp: input.whatsapp ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        pincode: input.pincode ?? null,
        billing_address: input.billing_address ?? null,
        gst_number: input.gst_number ?? null,
        notes: input.notes ?? null,
        customer_type: input.customer_type,
        referred_by: input.customer_type === "reference" ? (input.referred_by ?? null) : null,
        site_address: input.site_address ?? null,
        space_type: input.space_type ?? null,
        material_interests: input.material_interests ?? [],
      };

      const initialUpdate = await supabaseAdmin
        .from("customers")
        .update(updatePayload as never)
        .eq("id", id)
        .select("*")
        .single();

      let updateData = initialUpdate.data;
      let updateError = initialUpdate.error;

      // Defensive resilience: If Postgres enum is missing 'natural_stone_cladding_tiles',
      // sanitize the payload by stripping the un-migrated enum value and recording it in notes.
      if (updateError && isMaterialInterestEnumError(updateError)) {
        console.warn(
          "[customers.functions] Enum fallback triggered on update for material_interests:",
          updateError.message,
        );
        const { filteredInterests, sanitizedNotes } = sanitizeForPendingDbEnum(
          updatePayload.material_interests,
          updatePayload.notes,
        );
        const retryResult = await supabaseAdmin
          .from("customers")
          .update({
            ...updatePayload,
            material_interests: filteredInterests,
            notes: sanitizedNotes,
          })
          .eq("id", id)
          .select("*")
          .single();
        updateData = retryResult.data;
        updateError = retryResult.error;
      }

      if (updateError) throw new Error(updateError.message);
      return updateData as CustomerRow;
    }
  });

const deleteCustomerInput = z.object({
  id: z.string().uuid(),
});

export const deleteCustomerServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => deleteCustomerInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Guard: Prevent deletion if financial or operational records exist
    const [invoices, quotes, orders, projects] = await Promise.all([
      supabaseAdmin.from("invoices").select("id").eq("customer_id", data.id).limit(1),
      supabaseAdmin.from("quotes").select("id").eq("customer_id", data.id).limit(1),
      supabaseAdmin.from("sales_orders").select("id").eq("customer_id", data.id).limit(1),
      supabaseAdmin.from("projects").select("id").eq("customer_id", data.id).limit(1),
    ]);

    if (
      (invoices.data && invoices.data.length > 0) ||
      (quotes.data && quotes.data.length > 0) ||
      (orders.data && orders.data.length > 0) ||
      (projects.data && projects.data.length > 0)
    ) {
      throw new Error(
        "Cannot delete customer with existing quotes, orders, invoices, or projects. Deactivate or archive the customer instead.",
      );
    }

    // Clean up enquiries / contacts attached to this customer so foreign key RESTRICT doesn't block deletion
    await supabaseAdmin.from("enquiries").delete().eq("customer_id", data.id);
    await supabaseAdmin.from("customer_contacts").delete().eq("customer_id", data.id);

    const { error } = await supabaseAdmin.from("customers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const purgeMisplacedCustomerEntriesServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    // Safe no-op: customer data is unified and preserved for all organization users
    return { deleted: 0 };
  });

const updateCustomerCrmStatusInput = z.object({
  customerId: z.string().uuid(),
  is_active: z.boolean().optional(),
  response_status: z
    .enum([
      "active_responsive",
      "followup_pending",
      "awaiting_reply",
      "inactive_no_response",
      "do_not_contact",
    ])
    .optional(),
  call_note: z.string().optional(),
  call_outcome: z.string().optional(),
  next_call_at: z.string().optional(),
  next_call_channel: z.enum(["call", "whatsapp", "email", "meeting", "site_visit"]).optional(),
  next_call_agenda: z.string().optional(),
  complete_pending_followup_id: z.string().uuid().optional(),
});

export const updateCustomerCrmStatusServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => updateCustomerCrmStatusInput.parse(raw))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("customers")
      .select("id, name, workflow_state, notes, is_active")
      .eq("id", data.customerId)
      .single();

    if (fetchErr || !existing) {
      throw new Error(fetchErr?.message || "Customer not found");
    }

    const currentWf = (existing.workflow_state as Record<string, unknown>) || {};
    const updatedWf: Record<string, unknown> = {
      ...currentWf,
    };

    if (data.response_status) {
      updatedWf.response_status = data.response_status;
    }

    const nowIso = new Date().toISOString();

    if (data.call_note || data.call_outcome) {
      updatedWf.last_call_at = nowIso;
      if (data.call_note) updatedWf.last_call_notes = data.call_note;
      if (data.call_outcome) updatedWf.last_call_outcome = data.call_outcome;
      updatedWf.call_count = Number(currentWf.call_count ?? 0) + 1;
    }

    if (data.next_call_at) {
      updatedWf.next_call_at = data.next_call_at;
      if (data.next_call_agenda) updatedWf.next_call_agenda = data.next_call_agenda;
    }

    // Determine is_active status
    let targetIsActive = existing.is_active;
    if (data.is_active !== undefined) {
      targetIsActive = data.is_active;
    } else if (
      data.response_status === "inactive_no_response" ||
      data.response_status === "do_not_contact"
    ) {
      targetIsActive = false;
    } else if (
      data.response_status === "active_responsive" ||
      data.response_status === "followup_pending" ||
      data.response_status === "awaiting_reply"
    ) {
      targetIsActive = true;
    }

    // Append to notes for audit trail if a call note was recorded
    let updatedNotes = existing.notes;
    if (data.call_note && data.call_note.trim()) {
      const timestamp = new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      const outcomeTag = data.call_outcome ? `[${data.call_outcome}] ` : "";
      const logLine = `\n[Call · ${timestamp}] ${outcomeTag}${data.call_note.trim()}`;
      updatedNotes = existing.notes ? `${existing.notes.trim()}${logLine}` : logLine.trim();
    }

    const { data: updatedCustomer, error: updateErr } = await supabaseAdmin
      .from("customers")
      .update({
        workflow_state: updatedWf as unknown as import("@/integrations/supabase/types").Json,
        is_active: targetIsActive,
        notes: updatedNotes,
      })
      .eq("id", data.customerId)
      .select("*")
      .single();

    if (updateErr) throw new Error(updateErr.message);

    // If an existing pending follow-up was fulfilled by this call, mark it complete
    if (data.complete_pending_followup_id) {
      await supabaseAdmin
        .from("followups")
        .update({
          status: "done",
          completed_at: nowIso,
          outcome_notes:
            data.call_note || data.call_outcome || "Follow-up completed via call tracker",
        })
        .eq("id", data.complete_pending_followup_id);
    }

    // If a next call is scheduled, insert into followups table
    if (data.next_call_at) {
      await supabaseAdmin.from("followups").insert({
        entity_type: "customer",
        entity_id: data.customerId,
        scheduled_at: data.next_call_at,
        channel: data.next_call_channel || "call",
        notes: data.next_call_agenda || data.call_note || "Scheduled customer follow-up call",
        status: "pending",
        created_by: uid,
      });
    }

    return { customer: updatedCustomer as CustomerRow, ok: true };
  });
