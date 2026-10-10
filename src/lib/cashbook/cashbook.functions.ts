/**
 * Server functions for Raman's Cashbook.
 *
 * Runs on the server with supabaseAdmin (service role) to guarantee that
 * authorized Super Admins or Raman can manage cash in hand entries
 * with verified audit logging and security checks.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cashbookEntryInputSchema } from "./schema";

const saveCashbookEntryInput = z.object({
  id: z.string().uuid().optional(),
  data: cashbookEntryInputSchema,
});

async function assertSuperAdminOrRaman(supabaseAdmin: SupabaseClient, uid: string) {
  const { data: userRecord } = await supabaseAdmin.auth.admin.getUserById(uid);
  const email = userRecord?.user?.email?.toLowerCase();

  const { data: roles } = await supabaseAdmin
    .from("user_roles" as never)
    .select("role")
    .eq("user_id" as never, uid as never);

  const isSuperAdmin = (roles ?? []).some((r: { role: string }) => r.role === "super_admin");
  if (!isSuperAdmin && email !== "raman.pupneja@gmail.com") {
    throw new Error(
      "Unauthorized: Raman's Cashbook is strictly restricted to Super Administrators.",
    );
  }
}

export const saveCashbookEntryServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => saveCashbookEntryInput.parse(raw))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, data: input } = data;
    const uid = context.userId;

    await assertSuperAdminOrRaman(supabaseAdmin, uid);

    const payload = {
      entry_date: input.entry_date,
      entry_type: input.entry_type,
      amount: Number(input.amount ?? 0),
      remarks: input.remarks.trim(),
    };

    if (id) {
      const { data: updated, error } = await supabaseAdmin
        .from("ramans_cashbook" as never)
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
      .from("ramans_cashbook" as never)
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

export const deleteCashbookEntryServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;

    await assertSuperAdminOrRaman(supabaseAdmin, uid);

    const { error } = await supabaseAdmin
      .from("ramans_cashbook" as never)
      .delete()
      .eq("id" as never, data.id as never);

    if (error) throw new Error(error.message);
    return { success: true };
  });
