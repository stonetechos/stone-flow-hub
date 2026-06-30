import { supabase } from "@/integrations/supabase/client";
import type { DbTable } from "@/lib/types";
import { AppError, mapDbError } from "@/lib/errors";
import { projectCreateSchema, type ProjectCreateInput } from "./schema";

export type Project = DbTable<"projects">;
export type ProjectWithCustomer = Project & {
  customer: Pick<DbTable<"customers">, "id" | "name" | "code" | "mobile"> | null;
};

export async function listProjects(query?: string): Promise<ProjectWithCustomer[]> {
  let q = supabase
    .from("projects")
    .select("*, customer:customers(id, name, code, mobile)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (query && query.trim()) {
    const t = `%${query.trim()}%`;
    q = q.or(`name.ilike.${t},code.ilike.${t},city.ilike.${t}`);
  }
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data as ProjectWithCustomer[];
}

export async function listProjectsByCustomer(customerId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function getProject(id: string): Promise<ProjectWithCustomer> {
  const { data, error } = await supabase
    .from("projects")
    .select("*, customer:customers(id, name, code, mobile)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  if (!data) throw new AppError("Project not found", "NOT_FOUND", 404);
  return data as ProjectWithCustomer;
}

export async function createProject(input: ProjectCreateInput): Promise<Project> {
  const parsed = projectCreateSchema.parse(input);
  const { data, error } = await supabase
    .from("projects")
    .insert({
      customer_id: parsed.customer_id,
      name: parsed.name,
      city: parsed.city,
      type: parsed.type,
      address: parsed.address ?? null,
      state: parsed.state ?? null,
      pincode: parsed.pincode ?? null,
      budget: parsed.budget ?? null,
      area_sqft: parsed.area_sqft ?? null,
      expected_close_date: parsed.expected_close_date ?? null,
      notes: parsed.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}
