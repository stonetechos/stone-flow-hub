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
  const { error } = await getDb()
    .from("liabilities" as never)
    .delete()
    .eq("id" as never, id as never);
  if (error) throw new AppError(mapDbError(error));
}
