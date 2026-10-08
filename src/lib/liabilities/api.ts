/**
 * Liabilities — CRUD over public.liabilities. Brand-new table, not yet in
 * the generated Database type — same `as never` cast pattern used by
 * src/lib/purchase-transportation/api.ts (every `.from()`/`.eq()`/
 * `.insert()`/`.update()` needs its own cast or `tsc` fails with "not
 * assignable to type 'never'"). Uses getDb() (request-scoped,
 * auth-context-safe client) per current best practice.
 */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import { liabilityInputSchema, type LiabilityInput } from "./schema";

export type LiabilityRow = {
  id: string;
  name: string;
  amount: number;
  due_day_of_month: number | null;
  is_recurring: boolean;
  is_active: boolean;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function toPayload(p: LiabilityInput) {
  return {
    name: p.name,
    amount: Number(p.amount ?? 0),
    due_day_of_month: p.due_day_of_month ?? null,
    is_recurring: p.is_recurring ?? true,
    is_active: p.is_active ?? true,
    notes: p.notes ?? null,
    sort_order: p.sort_order ?? 100,
  };
}

export async function listLiabilities(activeOnly = false): Promise<LiabilityRow[]> {
  let q = getDb()
    .from("liabilities" as never)
    .select("*")
    .order("due_day_of_month", { ascending: true, nullsFirst: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(500);
  if (activeOnly) q = q.eq("is_active" as never, true as never);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as LiabilityRow[];
}

export async function createLiability(input: LiabilityInput): Promise<LiabilityRow> {
  const p = liabilityInputSchema.parse(input);

  // 1. Primary path: Server function (authenticated & bypasses restrictive client RLS)
  try {
    const { saveLiabilityServerFn } = await import("./liabilities.functions");
    const res = await saveLiabilityServerFn({ data: { data: p } });
    if (res) return res as unknown as LiabilityRow;
  } catch (serverErr) {
    console.warn(
      "[liabilities.api] Server function failed, falling back to client-side insert:",
      serverErr,
    );
  }

  // 2. Client fallback
  const { data, error } = await getDb()
    .from("liabilities" as never)
    .insert(toPayload(p) as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as LiabilityRow;
}

export async function updateLiability(id: string, input: LiabilityInput): Promise<LiabilityRow> {
  const p = liabilityInputSchema.parse(input);

  // 1. Primary path: Server function
  try {
    const { saveLiabilityServerFn } = await import("./liabilities.functions");
    const res = await saveLiabilityServerFn({ data: { id, data: p } });
    if (res) return res as unknown as LiabilityRow;
  } catch (serverErr) {
    console.warn(
      "[liabilities.api] Server function failed, falling back to client-side update:",
      serverErr,
    );
  }

  // 2. Client fallback
  const { data, error } = await getDb()
    .from("liabilities" as never)
    .update(toPayload(p) as never)
    .eq("id" as never, id as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as LiabilityRow;
}

export async function deleteLiability(id: string): Promise<void> {
  // 1. Primary path: Server function
  try {
    const { deleteLiabilityServerFn } = await import("./liabilities.functions");
    await deleteLiabilityServerFn({ data: { id } });
    return;
  } catch (serverErr) {
    console.warn(
      "[liabilities.api] Server function failed, falling back to client-side delete:",
      serverErr,
    );
  }

  // 2. Client fallback
  const { error } = await getDb()
    .from("liabilities" as never)
    .delete()
    .eq("id" as never, id as never);
  if (error) throw new AppError(mapDbError(error));
}

export type LiabilityPaymentRow = {
  id: string;
  liability_id: string;
  payment_date: string;
  amount: number;
  payment_mode: string;
  reference_no: string | null;
  month_for: string | null;
  notes: string | null;
  paid_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function listLiabilityPayments(liabilityId?: string): Promise<LiabilityPaymentRow[]> {
  let q = getDb()
    .from("liability_payments" as never)
    .select("*")
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (liabilityId) {
    q = q.eq("liability_id" as never, liabilityId as never);
  }

  const { data, error } = await q;
  if (error) {
    // Gracefully return empty array if table migration is pending
    if ((error as { code?: string }).code === "42P01") {
      return [];
    }
    throw new AppError(mapDbError(error));
  }
  return (data ?? []) as unknown as LiabilityPaymentRow[];
}

export async function recordLiabilityPayment(
  input: import("./schema").LiabilityPaymentInput,
): Promise<LiabilityPaymentRow> {
  const { liabilityPaymentInputSchema } = await import("./schema");
  const parsed = liabilityPaymentInputSchema.parse(input);

  // 1. Primary path: Server function (runs via admin to bypass RLS and trigger phone broadcast)
  try {
    const { recordLiabilityPaymentServerFn } = await import("./liabilities.functions");
    const res = await recordLiabilityPaymentServerFn({ data: parsed });
    if (res) return res as unknown as LiabilityPaymentRow;
  } catch (serverErr) {
    console.warn(
      "[liabilities.api] Server function failed, falling back to client-side insert:",
      serverErr,
    );
  }

  // 2. Client fallback
  const { data, error } = await getDb()
    .from("liability_payments" as never)
    .insert({
      liability_id: parsed.liability_id,
      payment_date: parsed.payment_date,
      amount: parsed.amount,
      payment_mode: parsed.payment_mode || "Bank Transfer",
      reference_no: parsed.reference_no ?? null,
      month_for: parsed.month_for ?? null,
      notes: parsed.notes ?? null,
    } as never)
    .select("*")
    .single();

  if (error) throw new AppError(mapDbError(error));
  return data as unknown as LiabilityPaymentRow;
}

export async function deleteLiabilityPayment(id: string): Promise<void> {
  // 1. Primary path: Server function
  try {
    const { deleteLiabilityPaymentServerFn } = await import("./liabilities.functions");
    await deleteLiabilityPaymentServerFn({ data: { id } });
    return;
  } catch (serverErr) {
    console.warn(
      "[liabilities.api] Server function failed, falling back to client-side delete:",
      serverErr,
    );
  }

  // 2. Client fallback
  const { error } = await getDb()
    .from("liability_payments" as never)
    .delete()
    .eq("id" as never, id as never);
  if (error) throw new AppError(mapDbError(error));
}
