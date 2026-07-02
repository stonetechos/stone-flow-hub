/** Central document search & filter across all uploaded files. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable, FileFolder } from "@/lib/types";

export type FileRow = DbTable<"file_objects">;

export interface DocumentFilters {
  entityType?: string | null;
  entityId?: string | null;
  projectId?: string | null;
  folder?: string | null;
  q?: string | null;
  limit?: number;
}

export async function listDocuments(filters: DocumentFilters = {}): Promise<FileRow[]> {
  let q = supabase
    .from("file_objects")
    .select("*")
    .order("uploaded_at", { ascending: false })
    .limit(filters.limit ?? 200);
  if (filters.entityType) q = q.eq("entity_type", filters.entityType);
  if (filters.entityId) q = q.eq("entity_id", filters.entityId);
  if (filters.projectId) q = q.eq("project_id", filters.projectId);
  if (filters.folder) {
    q = q.eq("folder", filters.folder as FileFolder);
  }
  if (filters.q) q = q.ilike("file_name", `%${filters.q}%`);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}
