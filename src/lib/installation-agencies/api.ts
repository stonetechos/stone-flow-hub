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
import { extractPhoneDigits, sanitizeSearch } from "@/lib/zod";

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
  query = "",
): Promise<InstallationAgencyRow[]> {
  let q = getDb()
    .from("installation_agencies" as never)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(200);
  if (activeOnly) q = q.eq("is_active" as never, true as never);
  const s = sanitizeSearch(query);
  if (s) {
    const digits = extractPhoneDigits(query);
    const clauses = [
      `name.ilike.%${s}%`,
      `code.ilike.%${s}%`,
      `contact_person.ilike.%${s}%`,
      `phone.ilike.%${s}%`,
    ];
    if (digits.length >= 4) {
      clauses.push(`phone.ilike.%${digits}%`);
      if (digits.length >= 10) {
        clauses.push(`phone.ilike.%${digits.slice(-10)}%`);
      }
    }
    q = q.or(clauses.join(",") as never);
  }
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

export interface AgencyCategoryBadge {
  value: AgencyWorkType | string;
  label: string;
  badgeClass: string;
}

export function getAgencyCategoryInfo(
  agency?: InstallationAgencyRow | null,
): AgencyCategoryBadge[] {
  if (!agency) {
    return [
      {
        value: "installation",
        label: "Installation Agency",
        badgeClass:
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
      },
    ];
  }

  const types = agency.work_types && agency.work_types.length > 0 ? [...agency.work_types] : [];

  const fullText = `${agency.name} ${agency.code} ${agency.notes ?? ""}`.toLowerCase();
  if (fullText.includes("polish") && !types.includes("polishing_work")) {
    types.push("polishing_work");
  }
  if ((fullText.includes("cart") || fullText.includes("transport")) && !types.includes("carting")) {
    types.push("carting");
  }
  if (fullText.includes("cnc") && !types.includes("cnc_works")) {
    types.push("cnc_works");
  }
  if (
    (fullText.includes("handcraft") || fullText.includes("carv")) &&
    !types.includes("handcrafter")
  ) {
    types.push("handcrafter");
  }
  if (fullText.includes("art") && !types.includes("artwork")) {
    types.push("artwork");
  }

  const finalTypes = types.length > 0 ? types : ["installation"];

  return finalTypes.map((wt) => {
    switch (wt) {
      case "polishing_work":
        return {
          value: wt,
          label: "Polishing Agency",
          badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
        };
      case "carting":
        return {
          value: wt,
          label: "Carting & Transport",
          badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
        };
      case "installation":
        return {
          value: wt,
          label: "Installation Agency",
          badgeClass:
            "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
        };
      case "cnc_works":
        return {
          value: wt,
          label: "CNC Works",
          badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
        };
      case "handcrafter":
        return {
          value: wt,
          label: "Handcrafter",
          badgeClass: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
        };
      case "artwork":
        return {
          value: wt,
          label: "Artwork",
          badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
        };
      default:
        return {
          value: wt,
          label: wt,
          badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30",
        };
    }
  });
}

export function parsePaymentMeta(row: {
  description?: string | null;
  ref_no?: string | null;
  notes?: string | null;
}) {
  const notes = row.notes ?? "";
  const desc = row.description ?? "";
  const ref = row.ref_no ?? "";
  const combined = `${notes} ${desc} ${ref}`.toLowerCase();

  const isCustomerPayment =
    notes.includes("[PaidBy:customer]") ||
    combined.includes("paid by customer") ||
    combined.includes("customer direct") ||
    combined.includes("customer paid") ||
    combined.includes("client paid") ||
    combined.includes("on behalf");

  let customerName = "";
  const custMatch = notes.match(/\[Customer:([^\]]+)\]/);
  if (custMatch) {
    customerName = custMatch[1].trim();
  } else if (desc.toLowerCase().includes("customer")) {
    const parts = desc.split(/customer:?/i);
    if (parts[1]) {
      const firstChunk = parts[1].split(/[(–—]/)[0];
      customerName = (firstChunk ?? "").replace(/[[\]]/g, "").trim();
    }
  }

  let channel: "upi" | "cash" | "bank_transfer" | "cheque" | "other" = "other";
  const channelMatch = notes.match(/\[Method:([^\]]+)\]/);
  if (channelMatch) {
    channel = channelMatch[1].trim() as typeof channel;
  } else if (
    combined.includes("upi") ||
    combined.includes("gpay") ||
    combined.includes("phonepe") ||
    combined.includes("paytm")
  ) {
    channel = "upi";
  } else if (combined.includes("cash")) {
    channel = "cash";
  } else if (combined.includes("cheque") || combined.includes("chq")) {
    channel = "cheque";
  } else if (
    combined.includes("neft") ||
    combined.includes("rtgs") ||
    combined.includes("imps") ||
    combined.includes("bank")
  ) {
    channel = "bank_transfer";
  }

  return {
    isCustomerPayment,
    customerName,
    channel,
  };
}
