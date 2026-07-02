/** Projects data access. */
import { supabase } from "@/integrations/supabase/client";
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
  let q = supabase
    .from("projects")
    .select(SELECT_WITH_CUSTOMER)
    .order("created_at", { ascending: false })
    .limit(200);

  const s = sanitizeSearch(query);
  if (s) q = q.or(`name.ilike.%${s}%,project_code.ilike.%${s}%,city.ilike.%${s}%`);

  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as ProjectWithCustomer[];
}

export async function listProjectsForPicker(): Promise<ProjectWithCustomer[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(SELECT_WITH_CUSTOMER)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as ProjectWithCustomer[];
}

export async function getProject(id: string): Promise<ProjectWithCustomer | null> {
  const { data, error } = await supabase
    .from("projects")
    .select(SELECT_WITH_CUSTOMER)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as ProjectWithCustomer | null) ?? null;
}

export async function createProject(input: ProjectCreateInput): Promise<ProjectRow> {
  const parsed = projectCreateSchema.parse(input);

  const { data, error } = await supabase
    .from("projects")
    .insert({
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
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updateProject(id: string, input: ProjectCreateInput): Promise<ProjectRow> {
  const parsed = projectCreateSchema.parse(input);
  const { data, error } = await supabase
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
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}
