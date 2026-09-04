/**
 * Business Expenses — CRUD over public.business_expenses. Brand-new table,
 * not yet in the generated Database type — `as never` cast pattern (see
 * src/lib/liabilities/api.ts's header for why). Uses getDb().
 */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import { businessExpenseInputSchema, type BusinessExpenseInput } from "./schema";

export type BusinessExpenseRow = {
  id: string;
  expense_date: string;
  description: string;
  amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function toPayload(p: BusinessExpenseInput) {
  return {
    expense_date: p.expense_date,
    description: p.description,
    amount: Number(p.amount ?? 0),
    notes: p.notes ?? null,
  };
}

/** Lists expenses newest-first. Optional [from, to] (inclusive, YYYY-MM-DD) date filter. */
export async function listBusinessExpenses(range?: {
  from?: string;
  to?: string;
}): Promise<BusinessExpenseRow[]> {
  let q = getDb()
    .from("business_expenses" as never)
    .select("*")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (range?.from) q = q.gte("expense_date" as never, range.from as never);
  if (range?.to) q = q.lte("expense_date" as never, range.to as never);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as BusinessExpenseRow[];
}

export async function createBusinessExpense(
  input: BusinessExpenseInput,
): Promise<BusinessExpenseRow> {
  const p = businessExpenseInputSchema.parse(input);
  const { data, error } = await getDb()
    .from("business_expenses" as never)
    .insert(toPayload(p) as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as BusinessExpenseRow;
}

export async function updateBusinessExpense(
  id: string,
  input: BusinessExpenseInput,
): Promise<BusinessExpenseRow> {
  const p = businessExpenseInputSchema.parse(input);
  const { data, error } = await getDb()
    .from("business_expenses" as never)
    .update(toPayload(p) as never)
    .eq("id" as never, id as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as BusinessExpenseRow;
}

export async function deleteBusinessExpense(id: string): Promise<void> {
  const { error } = await getDb()
    .from("business_expenses" as never)
    .delete()
    .eq("id" as never, id as never);
  if (error) throw new AppError(mapDbError(error));
}

/**
 * Sum of expenses in the current calendar month (used by growthAdvisory.ts
 * — Task #46 — to surface recent business-expense burn without
 * double-counting against project-level costs, which never include petty
 * cash like tea/stationery/donations).
 */
export async function getCurrentMonthExpenseTotal(): Promise<number> {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const rows = await listBusinessExpenses({ from });
  return rows.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
}
