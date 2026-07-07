/** Installation dashboard KPIs. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export type InstallationKpis = {
  active_installations: number;
  delayed_sites: number;
  teams_on_site: number;
  avg_progress_pct: number;
  material_shortages: number;
  signoffs_pending: number;
  installation_revenue: number;
};

export async function getInstallationKpis(): Promise<InstallationKpis> {
  const { data, error } = await supabase
    .from("installation_dashboard_kpis" as never)
    .select("*")
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  const row = (data ?? {}) as Record<string, number | null>;
  return {
    active_installations: Number(row.active_installations ?? 0),
    delayed_sites: Number(row.delayed_sites ?? 0),
    teams_on_site: Number(row.teams_on_site ?? 0),
    avg_progress_pct: Number(row.avg_progress_pct ?? 0),
    material_shortages: Number(row.material_shortages ?? 0),
    signoffs_pending: Number(row.signoffs_pending ?? 0),
    installation_revenue: Number(row.installation_revenue ?? 0),
  };
}
