/**
 * Server functions for Liabilities management.
 *
 * Runs on the server with supabaseAdmin (service role) to guarantee that
 * authenticated staff and managers can create, update and delete liabilities
 * without client-side RLS false-negatives, while recording audit fields.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { liabilityInputSchema } from "./schema";

const saveLiabilityInput = z.object({
  id: z.string().uuid().optional(),
  data: liabilityInputSchema,
});

export const saveLiabilityServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => saveLiabilityInput.parse(raw))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, data: input } = data;
    const uid = context.userId;

    const payload = {
      name: input.name,
      amount: Number(input.amount ?? 0),
      due_day_of_month: input.due_day_of_month ?? null,
      is_recurring: input.is_recurring ?? true,
      is_active: input.is_active ?? true,
      notes: input.notes ?? null,
      sort_order: input.sort_order ?? 100,
    };

    if (id) {
      const { data: updated, error } = await supabaseAdmin
        .from("liabilities" as never)
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id" as never, id as never)
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      return updated;
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("liabilities" as never)
      .insert({
        ...payload,
        created_by: uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return inserted;
  });

export const deleteLiabilityServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("liabilities" as never)
      .delete()
      .eq("id" as never, data.id as never);

    if (error) throw new Error(error.message);
    return { success: true };
  });
