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

export const AGENCY_WORK_TYPES = [
  { value: "installation", label: "Installation" },
  { value: "handcrafter", label: "Handcrafter" },
  { value: "cnc_works", label: "CNC Works" },
  { value: "polishing_work", label: "Polishing Work" },
  { value: "artwork", label: "Artwork" },
  { value: "carting", label: "Carting & Transport" },
] as const;

export type AgencyWorkType = (typeof AGENCY_WORK_TYPES)[number]["value"];

export type InstallationAgencyRow = {
  id: string;
  code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  notes: string | null;
  work_types?: AgencyWorkType[];
  agency_type?: AgencyWorkType;
  is_active: boolean;
  sort_order: number;
};

export interface InstallationAgencyInput {
  code?: string;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  work_types?: AgencyWorkType[];
  agency_type?: AgencyWorkType | null;
  notes?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export function encodeAgencyNotes(
  notes: string | null | undefined,
  workTypes: AgencyWorkType[],
): string | null {
  const clean = (notes ?? "").replace(/\[WorkTypes:[^\]]+\]\s*/g, "").trim();
  if (workTypes.length === 0) return clean || null;
  const tag = `[WorkTypes:${workTypes.join(",")}]`;
  return clean ? `${tag} ${clean}` : tag;
}

export function decodeAgencyWorkTypes(notes: string | null | undefined): {
  cleanNotes: string;
  workTypes: AgencyWorkType[];
} {
  if (!notes) return { cleanNotes: "", workTypes: ["installation"] };
  const match = notes.match(/\[WorkTypes:([^\]]+)\]/);
  if (!match) {
    const lower = notes.toLowerCase();
    const detected: AgencyWorkType[] = [];
    if (lower.includes("handcraft") || lower.includes("carv")) detected.push("handcrafter");
    if (lower.includes("cnc")) detected.push("cnc_works");
    if (lower.includes("polish")) detected.push("polishing_work");
    if (lower.includes("art")) detected.push("artwork");
    if (lower.includes("carting") || lower.includes("transport")) detected.push("carting");
    if (detected.length === 0) detected.push("installation");
    return { cleanNotes: notes, workTypes: detected };
  }
  const types = match[1].split(",").map((s) => s.trim()) as AgencyWorkType[];
  const cleanNotes = notes.replace(/\[WorkTypes:[^\]]+\]\s*/g, "").trim();
  return { cleanNotes, workTypes: types.length > 0 ? types : ["installation"] };
}

function parseRow(r: Record<string, unknown>): InstallationAgencyRow {
  const { cleanNotes, workTypes } = decodeAgencyWorkTypes(r.notes as string | null);
  return {
    ...(r as unknown as InstallationAgencyRow),
    notes: cleanNotes,
    work_types: workTypes,
    agency_type: workTypes[0] ?? "installation",
  };
}

function toPayload(input: InstallationAgencyInput) {
  const workTypes =
    input.work_types ?? (input.agency_type ? [input.agency_type] : ["installation"]);
  const codeVal =
    input.code && input.code.trim().length > 0
      ? input.code.trim()
      : input.name
          .trim()
          .replace(/[^a-zA-Z0-9]/g, "-")
          .toUpperCase()
          .slice(0, 30) || `AG-${Date.now()}`;
  return {
    code: codeVal,
    name: input.name.trim(),
    contact_person: input.contact_person ?? null,
    phone: input.phone ?? null,
    notes: encodeAgencyNotes(input.notes, workTypes),
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
  return ((data ?? []) as Record<string, unknown>[]).map(parseRow);
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
  return parseRow(data as Record<string, unknown>);
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
  return parseRow(data as Record<string, unknown>);
}

export async function deleteInstallationAgency(id: string): Promise<void> {
  const { error } = await getDb()
    .from("installation_agencies" as never)
    .delete()
    .eq("id" as never, id as never);
  if (error) throw new AppError(mapDbError(error));
}
