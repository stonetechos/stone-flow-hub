import { supabase } from "@/integrations/supabase/client";
import type { DbTable } from "@/lib/types";
import { AppError, mapDbError } from "@/lib/errors";

export type ActivityRow = DbTable<"activity_log">;

export async function listActivityFor(entityType: string, entityId: string): Promise<ActivityRow[]> {
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new AppError(mapDbError(error));
  return data;
}
