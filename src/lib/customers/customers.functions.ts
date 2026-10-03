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
        .insert(payload)
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
          })
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
        .update(updatePayload)
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: targets } = await supabaseAdmin
      .from("customers")
      .select("id, name")
      .or(
        "name.ilike.%Dummy Test Client%,name.ilike.Ankur%,name.ilike.Harash Pupneja%,name.ilike.Rishi rai%",
      );

    if (!targets || targets.length === 0) return { deleted: 0 };

    for (const t of targets) {
      await supabaseAdmin.from("enquiries").delete().eq("customer_id", t.id);
      await supabaseAdmin.from("customer_contacts").delete().eq("customer_id", t.id);
      await supabaseAdmin.from("projects").delete().eq("customer_id", t.id);
      await supabaseAdmin.from("customers").delete().eq("id", t.id);
    }

    return { deleted: targets.length };
  });
