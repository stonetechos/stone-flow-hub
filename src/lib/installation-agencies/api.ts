/**
 * Installation Agencies (Task #47) — master data CRUD over
 * public.installation_agencies. Brand-new table, not yet in the generated
 * Database type — `as never` cast pattern (see
 * src/lib/purchase-transportation/api.ts's Carting Agencies section,
 * which this mirrors exactly). Not built on the shared MasterListPage for
 * the same reason Carting Agencies isn't — see src/lib/masters/config.ts.
 */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";

export type InstallationAgencyRow = {
  id: string;
  code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
};

export interface InstallationAgencyInput {
  code: string;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  notes?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

function toPayload(input: InstallationAgencyInput) {
  return {
    code: input.code,
    name: input.name,
    contact_person: input.contact_person ?? null,
    phone: input.phone ?? null,
    notes: input.notes ?? null,
    is_active: input.is_active ?? true,
    sort_order: input.sort_order ?? 100,
  };
}

export async function listInstallationAgencies(
  activeOnly = true,
): Promise<InstallationAgencyRow[]> {
  let q = getDb()
    .from("installation_agencies" as never)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(200);
  if (activeOnly) q = q.eq("is_active" as never, true as never);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as InstallationAgencyRow[];
}

export async function createInstallationAgency(
  input: InstallationAgencyInput,
): Promise<InstallationAgencyRow> {
  const { data, error } = await getDb()
    .from("installation_agencies" as never)
    .insert(toPayload(input) as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as InstallationAgencyRow;
}

export async function updateInstallationAgency(
  id: string,
  input: InstallationAgencyInput,
): Promise<InstallationAgencyRow> {
  const { data, error } = await getDb()
    .from("installation_agencies" as never)
    .update(toPayload(input) as never)
    .eq("id" as never, id as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as InstallationAgencyRow;
}

export async function deleteInstallationAgency(id: string): Promise<void> {
  const { error } = await getDb()
    .from("installation_agencies" as never)
    .delete()
    .eq("id" as never, id as never);
  if (error) throw new AppError(mapDbError(error));
}
