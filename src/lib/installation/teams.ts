/** Installation Teams master. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { sanitizeSearch } from "@/lib/zod";
import { z } from "zod";

export type TeamMember = { name: string; phone?: string | null; skill?: string | null };

export type InstallationTeam = {
  id: string;
  team_code: string | null;
  name: string;
  supervisor_name: string | null;
  supervisor_phone: string | null;
  members: TeamMember[];
  skills: string[];
  vehicle: string | null;
  daily_capacity_sqft: number | null;
  lifecycle_status: "active" | "inactive" | "archived" | "deleted";
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const teamCreateSchema = z.object({
  name: z.string().min(1),
  supervisor_name: z.string().nullable().optional(),
  supervisor_phone: z.string().nullable().optional(),
  members: z
    .array(
      z.object({
        name: z.string().min(1),
        phone: z.string().nullable().optional(),
        skill: z.string().nullable().optional(),
      }),
    )
    .default([]),
  skills: z.array(z.string()).default([]),
  vehicle: z.string().nullable().optional(),
  daily_capacity_sqft: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type TeamCreateInput = z.infer<typeof teamCreateSchema>;

export async function listInstallationTeams(query = ""): Promise<InstallationTeam[]> {
  let q = supabase
    .from("installation_teams" as never)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  const s = sanitizeSearch(query);
  if (s) q = q.or(`name.ilike.%${s}%,team_code.ilike.%${s}%,supervisor_name.ilike.%${s}%`);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as InstallationTeam[];
}

export async function listTeamsForPicker(): Promise<
  Array<{ id: string; name: string; team_code: string | null }>
> {
  const { data, error } = await supabase
    .from("installation_teams" as never)
    .select("id,name,team_code")
    .eq("lifecycle_status", "active")
    .order("name")
    .limit(200);
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as Array<{ id: string; name: string; team_code: string | null }>;
}

export async function getInstallationTeam(id: string): Promise<InstallationTeam | null> {
  const { data, error } = await supabase
    .from("installation_teams" as never)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data ?? null) as unknown as InstallationTeam | null;
}

export async function createInstallationTeam(input: TeamCreateInput): Promise<InstallationTeam> {
  const p = teamCreateSchema.parse(input);
  const { data, error } = await supabase
    .from("installation_teams" as never)
    .insert(p as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as InstallationTeam;
}

export async function updateInstallationTeam(
  id: string,
  input: Partial<TeamCreateInput>,
): Promise<void> {
  const { error } = await supabase
    .from("installation_teams" as never)
    .update(input as never)
    .eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

export async function deleteInstallationTeam(id: string): Promise<void> {
  const { error } = await supabase
    .from("installation_teams" as never)
    .delete()
    .eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}
