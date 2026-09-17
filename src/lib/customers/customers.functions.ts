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

    // If creating (no id), check duplicate phone
    if (!id) {
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

      const payload = {
        customer_code: "",
        name: input.name,
        primary_phone: normalizedPhone,
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

      const { data: row, error } = await supabaseAdmin
        .from("customers")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw new Error(error.message);

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
        primary_phone: normalizedPhone,
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

      const { data: row, error } = await supabaseAdmin
        .from("customers")
        .update(updatePayload)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      return row as CustomerRow;
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
    const { error } = await supabaseAdmin.from("customers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
