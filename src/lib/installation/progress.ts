/** Daily site progress reports for an installation. */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import { z } from "zod";

export type ProgressReport = {
  id: string;
  installation_id: string;
  report_date: string;
  work_completed: string | null;
  area_completed_sqft: number | null;
  balance_work: string | null;
  labour_present: number | null;
  material_consumed: string | null;
  material_shortage: string | null;
  safety_observations: string | null;
  customer_remarks: string | null;
  supervisor_remarks: string | null;
  progress_pct: number | null;
  reported_by: string | null;
  created_at: string;
};

export const progressCreateSchema = z.object({
  installation_id: z.string().uuid(),
  report_date: z.string().min(1),
  work_completed: z.string().nullable().optional(),
  area_completed_sqft: z.number().nullable().optional(),
  balance_work: z.string().nullable().optional(),
  labour_present: z.number().int().nullable().optional(),
  material_consumed: z.string().nullable().optional(),
  material_shortage: z.string().nullable().optional(),
  safety_observations: z.string().nullable().optional(),
  customer_remarks: z.string().nullable().optional(),
  supervisor_remarks: z.string().nullable().optional(),
  progress_pct: z.number().min(0).max(100).nullable().optional(),
});
export type ProgressCreateInput = z.infer<typeof progressCreateSchema>;

export async function listProgress(installationId: string): Promise<ProgressReport[]> {
  const { data, error } = await getDb()
    .from("installation_progress" as never)
    .select("*")
    .eq("installation_id", installationId)
    .order("report_date", { ascending: false })
    .limit(200);
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as ProgressReport[];
}

export async function createProgress(input: ProgressCreateInput): Promise<ProgressReport> {
  const p = progressCreateSchema.parse(input);
  const user = (await getDb().auth.getUser()).data.user;
  const { data, error } = await getDb()
    .from("installation_progress" as never)
    .insert({ ...p, reported_by: user?.id ?? null } as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as ProgressReport;
}

export async function deleteProgress(id: string): Promise<void> {
  const { error } = await getDb()
    .from("installation_progress" as never)
    .delete()
    .eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}
