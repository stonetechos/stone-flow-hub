/** Installation Orders — auto-generated from Supply+Install Sales Orders. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { sanitizeSearch } from "@/lib/zod";
import { z } from "zod";

export const INSTALLATION_ORDER_STATUSES = [
  "planned", "scheduled", "in_progress", "on_hold", "completed", "signed_off", "cancelled",
] as const;
export type InstallationOrderStatus = (typeof INSTALLATION_ORDER_STATUSES)[number];

export type InstallationOrder = {
  id: string;
  installation_no: string | null;
  sales_order_id: string;
  customer_id: string | null;
  project_id: string | null;
  estimate_id: string | null;
  team_id: string | null;
  supervisor_name: string | null;
  site_address: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  status: InstallationOrderStatus;
  lifecycle_status: "active" | "inactive" | "archived" | "deleted";
  progress_pct: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InstallationListItem = InstallationOrder & {
  customer: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  sales_order: { id: string; so_no: string } | null;
  team: { id: string; name: string } | null;
};

const SELECT =
  "*, customer:customers!installations_customer_id_fkey(id,name), project:projects!installations_project_id_fkey(id,name), sales_order:sales_orders!installations_sales_order_id_fkey(id,so_no), team:installation_teams!installations_team_id_fkey(id,name)";

export async function listInstallations(query = "", status = ""): Promise<InstallationListItem[]> {
  let q = supabase
    .from("installations" as never)
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(200);
  const s = sanitizeSearch(query);
  if (s) q = q.or(`installation_no.ilike.%${s}%,site_address.ilike.%${s}%,notes.ilike.%${s}%`);
  if (status) q = q.eq("status", status as InstallationOrderStatus);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as InstallationListItem[];
}

export async function getInstallation(id: string): Promise<InstallationListItem | null> {
  const { data, error } = await supabase
    .from("installations" as never)
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data ?? null) as unknown as InstallationListItem | null;
}

export async function listInstallationsForSalesOrder(soId: string): Promise<InstallationOrder[]> {
  const { data, error } = await supabase
    .from("installations" as never)
    .select("*")
    .eq("sales_order_id", soId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as InstallationOrder[];
}

export const installationUpdateSchema = z.object({
  team_id: z.string().uuid().nullable().optional(),
  supervisor_name: z.string().nullable().optional(),
  site_address: z.string().nullable().optional(),
  gps_lat: z.number().nullable().optional(),
  gps_lng: z.number().nullable().optional(),
  planned_start_date: z.string().nullable().optional(),
  planned_end_date: z.string().nullable().optional(),
  actual_start_date: z.string().nullable().optional(),
  actual_end_date: z.string().nullable().optional(),
  status: z.enum(INSTALLATION_ORDER_STATUSES).optional(),
  notes: z.string().nullable().optional(),
});
export type InstallationUpdateInput = z.infer<typeof installationUpdateSchema>;

export async function updateInstallation(id: string, input: InstallationUpdateInput): Promise<void> {
  const p = installationUpdateSchema.parse(input);
  const { error } = await supabase
    .from("installations" as never)
    .update(p as never)
    .eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

export async function deleteInstallation(id: string): Promise<void> {
  const { error } = await supabase.from("installations" as never).delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

/** Update the parent Sales Order supply_scope — trigger auto-creates an installation. */
export async function setSalesOrderSupplyScope(
  salesOrderId: string,
  scope: "material_only" | "supply_and_installation",
): Promise<void> {
  const { error } = await supabase
    .from("sales_orders")
    .update({ supply_scope: scope } as never)
    .eq("id", salesOrderId);
  if (error) throw new AppError(mapDbError(error));
}
