/** Recent activity feed + filterable global activity center. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";

export type ActivityRow = DbTable<"activity_log">;

export async function listRecentActivity(limit = 10): Promise<ActivityRow[]> {
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export interface GlobalActivityFilters {
  entityType?: string | null;
  entityId?: string | null;
  /** Bulk variant of `entityId` — fetch activity for many entities of the
   *  same `entityType` in one query (e.g. insight providers scanning every
   *  open enquiry). Ignored if `entityId` is also set. */
  entityIds?: string[] | null;
  projectId?: string | null;
  actorId?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  limit?: number;
}

export async function listGlobalActivity(
  filters: GlobalActivityFilters = {},
): Promise<ActivityRow[]> {
  let q = supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 200);
  if (filters.entityType) q = q.eq("entity_type", filters.entityType);
  if (filters.entityId) q = q.eq("entity_id", filters.entityId);
  else if (filters.entityIds && filters.entityIds.length > 0)
    q = q.in("entity_id", filters.entityIds);
  if (filters.projectId) q = q.eq("project_id", filters.projectId);
  if (filters.actorId) q = q.eq("actor_id", filters.actorId);
  if (filters.fromDate) q = q.gte("created_at", filters.fromDate);
  if (filters.toDate) q = q.lte("created_at", filters.toDate);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function listEntityActivity(
  entityType: string,
  entityId: string,
  limit = 50,
): Promise<ActivityRow[]> {
  return listGlobalActivity({ entityType, entityId, limit });
}
