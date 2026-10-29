/** Projects data access. */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";
import { sanitizeSearch } from "@/lib/zod";
import { projectCreateSchema, type ProjectCreateInput } from "./schema";

export type ProjectRow = DbTable<"projects">;
export type ProjectWithCustomer = ProjectRow & {
  customer: { id: string; name: string; customer_code: string } | null;
};

const SELECT_WITH_CUSTOMER =
  "*, customer:customers!projects_customer_id_fkey(id,name,customer_code)";

export async function listProjects(query = ""): Promise<ProjectWithCustomer[]> {
  let q = getDb()
    .from("projects")
    .select(SELECT_WITH_CUSTOMER)
    .order("created_at", { ascending: false })
    .limit(200);

  const s = sanitizeSearch(query);
  if (s) {
    q = q.or(
      [
        `name.ilike.%${s}%`,
        `project_code.ilike.%${s}%`,
        `city.ilike.%${s}%`,
        `site_address.ilike.%${s}%`,
      ].join(","),
    );
  }

  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as ProjectWithCustomer[];
}

export interface ProjectPickerOptions {
  query?: string;
  customerId?: string;
}

export async function listProjectsForPicker(
  opts: ProjectPickerOptions = {},
): Promise<ProjectWithCustomer[]> {
  let q = getDb()
    .from("projects")
    .select(SELECT_WITH_CUSTOMER)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(500);
  if (opts.customerId) q = q.eq("customer_id", opts.customerId);
  const s = sanitizeSearch(opts.query ?? "");
  if (s) {
    q = q.or(
      [
        `name.ilike.%${s}%`,
        `project_code.ilike.%${s}%`,
        `city.ilike.%${s}%`,
        `site_address.ilike.%${s}%`,
      ].join(","),
    );
  }
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as ProjectWithCustomer[];
}

export async function listProjectsByCustomer(customerId: string): Promise<ProjectWithCustomer[]> {
  return listProjectsForPicker({ customerId });
}

export async function getProject(id: string): Promise<ProjectWithCustomer | null> {
  const { data, error } = await getDb()
    .from("projects")
    .select(SELECT_WITH_CUSTOMER)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as ProjectWithCustomer | null) ?? null;
}

export async function getNextProjectCode(): Promise<string> {
  const { data } = await getDb()
    .from("projects")
    .select("project_code")
    .order("project_code", { ascending: false })
    .limit(20);

  let maxNum = 0;
  if (data) {
    for (const row of data) {
      const match = /PRJ-(\d+)/i.exec(row.project_code || "");
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
  }
  return `PRJ-${String(maxNum + 1).padStart(6, "0")}`;
}

export async function createProject(input: ProjectCreateInput): Promise<ProjectRow> {
  const parsed = projectCreateSchema.parse(input);

  const payload = {
    project_code: "",
    customer_id: parsed.customer_id,
    name: parsed.name,
    city: parsed.city,
    project_type: parsed.project_type,
    site_address: parsed.site_address ?? null,
    state: parsed.state ?? null,
    pincode: parsed.pincode ?? null,
    expected_value_inr: parsed.expected_value_inr ?? null,
    expected_start_date: parsed.expected_start_date ?? null,
    expected_completion_date: parsed.expected_completion_date ?? null,
    notes: parsed.notes ?? null,
  };

  const { data, error } = await getDb().from("projects").insert(payload).select("*").single();

  if (!error && data) return data;

  // Collision recovery: if DB sequence hits an existing code or trigger fails
  const isUniqueViolation =
    error?.code === "23505" ||
    /unique|duplicate/i.test(error?.message || "") ||
    /projects_project_code_key/i.test(error?.details || error?.message || "");

  if (isUniqueViolation) {
    const safeCode = await getNextProjectCode();
    const { data: retryData, error: retryErr } = await getDb()
      .from("projects")
      .insert({ ...payload, project_code: safeCode })
      .select("*")
      .single();
    if (!retryErr && retryData) return retryData;
    throw new AppError(mapDbError(retryErr || error));
  }

  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updateProject(id: string, input: ProjectCreateInput): Promise<ProjectRow> {
  const parsed = projectCreateSchema.parse(input);
  const { data, error } = await getDb()
    .from("projects")
    .update({
      customer_id: parsed.customer_id,
      name: parsed.name,
      city: parsed.city,
      project_type: parsed.project_type,
      site_address: parsed.site_address ?? null,
      state: parsed.state ?? null,
      pincode: parsed.pincode ?? null,
      expected_value_inr: parsed.expected_value_inr ?? null,
      expected_start_date: parsed.expected_start_date ?? null,
      expected_completion_date: parsed.expected_completion_date ?? null,
      notes: parsed.notes ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await getDb().from("projects").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

export async function getProjectLedgerSummary(projectId: string): Promise<{
  totalInvoiced: number;
  totalReceived: number;
  balanceDue: number;
}> {
  const { data: invRows, error } = await getDb()
    .from("invoices")
    .select("total, amount_paid")
    .eq("project_id", projectId);
  if (error) throw new AppError(mapDbError(error));

  const totalInvoiced = (invRows ?? []).reduce((acc, i) => acc + Number(i.total || 0), 0);
  const totalReceived = (invRows ?? []).reduce((acc, i) => acc + Number(i.amount_paid || 0), 0);

  const balanceDue = Math.max(0, totalInvoiced - totalReceived);
  return { totalInvoiced, totalReceived, balanceDue };
}

export async function completeProject(id: string): Promise<{
  project: ProjectRow;
  ledger: { totalInvoiced: number; totalReceived: number; balanceDue: number };
}> {
  const { data: project, error } = await getDb()
    .from("projects")
    .update({
      is_active: false,
      lifecycle_status: "archived",
    } as never)
    .eq("id", id)
    .select("*, customer:customers!projects_customer_id_fkey(id,name,primary_phone,whatsapp)")
    .single();

  if (error) throw new AppError(mapDbError(error));

  const ledger = await getProjectLedgerSummary(id);

  try {
    const custAny = (
      project as unknown as {
        customer?: {
          id?: string;
          name?: string;
          primary_phone?: string;
          whatsapp?: string;
        } | null;
      }
    )?.customer;

    const { notifyAdminProjectCompleted } = await import("@/lib/notifications/broadcast");
    notifyAdminProjectCompleted({
      id: project.id,
      name: project.name,
      customer_id: custAny?.id,
      customer_name: custAny?.name,
      customer_phone: custAny?.primary_phone,
      customer_whatsapp: custAny?.whatsapp,
      totalInvoiced: ledger.totalInvoiced,
      totalReceived: ledger.totalReceived,
      balanceDue: ledger.balanceDue,
    });
  } catch (err) {
    console.warn("[projects] completeProject notification skipped", err);
  }

  return { project, ledger };
}
