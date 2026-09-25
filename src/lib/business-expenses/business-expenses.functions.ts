/**
 * Server functions for Business Expenses management.
 *
 * Runs on the server with supabaseAdmin (service role) to guarantee that
 * authenticated staff can create, update and delete business expenses
 * without client-side RLS false-negatives, while recording audit fields.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { businessExpenseInputSchema } from "./schema";

const saveBusinessExpenseInput = z.object({
  id: z.string().uuid().optional(),
  data: businessExpenseInputSchema,
});

export const saveBusinessExpenseServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => saveBusinessExpenseInput.parse(raw))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, data: input } = data;
    const uid = context.userId;

    const payload = {
      expense_date: input.expense_date,
      description: input.description,
      amount: Number(input.amount ?? 0),
      notes: input.notes ?? null,
    };

    if (id) {
      const { data: updated, error } = await supabaseAdmin
        .from("business_expenses" as never)
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
      .from("business_expenses" as never)
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

export const deleteBusinessExpenseServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("business_expenses" as never)
      .delete()
      .eq("id" as never, data.id as never);

    if (error) throw new Error(error.message);
    return { success: true };
  });
