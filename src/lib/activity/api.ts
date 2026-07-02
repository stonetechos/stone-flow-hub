/** Recent activity feed for the dashboard. */
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
