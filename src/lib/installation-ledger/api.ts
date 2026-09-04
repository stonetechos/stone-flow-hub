/**
 * Installation Agency Ledger — CRUD over public.installation_agency_ledger
 * _entries and reads of the public.installation_agency_ledger view. Brand
 * new tables/view, not yet in the generated Database type — `as never`
 * cast pattern (see src/lib/liabilities/api.ts's header). Uses getDb().
 *
 * Manual entry only (Task #48, Rishi's explicit decision) — no trigger,
 * no SECURITY DEFINER upsert. createInstallationLedgerEntry() is a plain
 * insert under normal staff RLS.
 */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import { installationLedgerEntryInputSchema, type InstallationLedgerEntryInput } from "./schema";

export type InstallationLedgerRow = {
  id: string;
  installation_agency_id: string;
  entry_date: string;
  description: string;
  ref_no: string | null;
  debit: number;
  credit: number;
  notes: string | null;
  created_at: string;
  running_balance: number;
};

export interface InstallationAgencyLedgerSummary {
  installation_agency_id: string;
  agency_name: string;
  agency_code: string;
  total_debit: number;
  total_credit: number;
  balance: number;
}

/** Full ledger (all agencies) with running balance, oldest first per agency. */
export async function listInstallationLedger(agencyId?: string): Promise<InstallationLedgerRow[]> {
  let q = getDb()
    .from("installation_agency_ledger" as never)
    .select("*")
    .order("entry_date", { ascending: true })
    .order("created_at", { ascending: true });
  if (agencyId) q = q.eq("installation_agency_id" as never, agencyId as never);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as InstallationLedgerRow[];
}

/** Per-agency balance summary for the ledger index (mirrors listVendorLedgerSummaries()). */
export async function listInstallationLedgerSummaries(): Promise<
  InstallationAgencyLedgerSummary[]
> {
  const [{ data: agencies, error: agencyErr }, entries] = await Promise.all([
    getDb()
      .from("installation_agencies" as never)
      .select("id, code, name"),
    listInstallationLedger(),
  ]);
  if (agencyErr) throw new AppError(mapDbError(agencyErr));

  const byAgency = new Map<string, { debit: number; credit: number }>();
  for (const e of entries) {
    const acc = byAgency.get(e.installation_agency_id) ?? { debit: 0, credit: 0 };
    acc.debit += e.debit;
    acc.credit += e.credit;
    byAgency.set(e.installation_agency_id, acc);
  }

  return ((agencies ?? []) as unknown as { id: string; code: string; name: string }[]).map((a) => {
    const acc = byAgency.get(a.id) ?? { debit: 0, credit: 0 };
    return {
      installation_agency_id: a.id,
      agency_name: a.name,
      agency_code: a.code,
      total_debit: acc.debit,
      total_credit: acc.credit,
      balance: acc.debit - acc.credit,
    };
  });
}

export async function createInstallationLedgerEntry(
  input: InstallationLedgerEntryInput,
): Promise<InstallationLedgerRow> {
  const p = installationLedgerEntryInputSchema.parse(input);
  const amount = Number(p.amount ?? 0);
  const { data, error } = await getDb()
    .from("installation_agency_ledger_entries" as never)
    .insert({
      installation_agency_id: p.installation_agency_id,
      entry_date: p.entry_date,
      description: p.description,
      ref_no: p.ref_no ?? null,
      debit: p.entry_type === "charge" ? amount : 0,
      credit: p.entry_type === "payment" ? amount : 0,
      notes: p.notes ?? null,
    } as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as InstallationLedgerRow;
}

export async function deleteInstallationLedgerEntry(id: string): Promise<void> {
  const { error } = await getDb()
    .from("installation_agency_ledger_entries" as never)
    .delete()
    .eq("id" as never, id as never);
  if (error) throw new AppError(mapDbError(error));
}
