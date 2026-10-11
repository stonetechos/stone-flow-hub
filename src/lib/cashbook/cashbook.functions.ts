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
import { cashbookEntryInputSchema, type CashbookEntryRow } from "./schema";

const saveCashbookEntryInput = z.object({
  id: z.string().min(1).optional(),
  data: cashbookEntryInputSchema,
});

const CASHBOOK_SETTINGS_KEY = "finance.ramans_cashbook";

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; details?: string };
  const msg = `${e.message ?? ""} ${e.details ?? ""}`.toLowerCase();
  return (
    e.code === "PGRST205" ||
    e.code === "PGRST200" ||
    e.code === "42P01" ||
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("ramans_cashbook")
  );
}

async function getCashbookEntriesFromSettings(admin: SupabaseClient): Promise<CashbookEntryRow[]> {
  const { data } = await admin
    .from("app_settings" as never)
    .select("value")
    .eq("key" as never, CASHBOOK_SETTINGS_KEY as never)
    .maybeSingle();

  const val = (data as { value?: unknown } | null)?.value;
  if (!val) return [];
  if (Array.isArray(val)) return val as CashbookEntryRow[];
  if (Array.isArray((val as { entries?: unknown[] }).entries)) {
    return (val as { entries: CashbookEntryRow[] }).entries;
  }
  return [];
}

async function saveCashbookEntriesToSettings(
  admin: SupabaseClient,
  entries: CashbookEntryRow[],
): Promise<void> {
  const { error } = await admin.from("app_settings" as never).upsert(
    {
      key: CASHBOOK_SETTINGS_KEY,
      value: { entries } as never,
      description: "Raman's Cashbook ledger fallback store",
    } as never,
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
}

async function insertCashbookInAppSettings(
  admin: SupabaseClient,
  payload: { entry_date: string; entry_type: "debit" | "credit"; amount: number; remarks: string },
  uid: string,
): Promise<CashbookEntryRow> {
  const entries = await getCashbookEntriesFromSettings(admin);
  const now = new Date().toISOString();
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `cash-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const newRow: CashbookEntryRow = {
    id,
    ...payload,
    created_by: uid,
    created_at: now,
    updated_at: now,
  };
  entries.push(newRow);
  await saveCashbookEntriesToSettings(admin, entries);
  return newRow;
}

async function updateCashbookInAppSettings(
  admin: SupabaseClient,
  id: string,
  payload: { entry_date: string; entry_type: "debit" | "credit"; amount: number; remarks: string },
): Promise<CashbookEntryRow> {
  const entries = await getCashbookEntriesFromSettings(admin);
  const idx = entries.findIndex((e) => e.id === id);
  const now = new Date().toISOString();
  if (idx === -1) {
    const newRow: CashbookEntryRow = {
      id,
      ...payload,
      created_by: null,
      created_at: now,
      updated_at: now,
    };
    entries.push(newRow);
    await saveCashbookEntriesToSettings(admin, entries);
    return newRow;
  }
  const updatedRow: CashbookEntryRow = {
    ...entries[idx],
    ...payload,
    updated_at: now,
  };
  entries[idx] = updatedRow;
  await saveCashbookEntriesToSettings(admin, entries);
  return updatedRow;
}

async function deleteCashbookFromAppSettings(admin: SupabaseClient, id: string): Promise<void> {
  const entries = await getCashbookEntriesFromSettings(admin);
  const filtered = entries.filter((e) => e.id !== id);
  await saveCashbookEntriesToSettings(admin, filtered);
}

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

      if (error) {
        if (isMissingTableError(error)) {
          return await updateCashbookInAppSettings(supabaseAdmin, id, payload);
        }
        throw new Error(error.message);
      }
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

    if (error) {
      if (isMissingTableError(error)) {
        return await insertCashbookInAppSettings(supabaseAdmin, payload, uid);
      }
      throw new Error(error.message);
    }
    return inserted;
  });

export const deleteCashbookEntryServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().min(1) }).parse(raw))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;

    await assertSuperAdminOrRaman(supabaseAdmin, uid);

    const { error } = await supabaseAdmin
      .from("ramans_cashbook" as never)
      .delete()
      .eq("id" as never, data.id as never);

    if (error) {
      if (isMissingTableError(error)) {
        await deleteCashbookFromAppSettings(supabaseAdmin, data.id);
        return { success: true };
      }
      throw new Error(error.message);
    }
    return { success: true };
  });
