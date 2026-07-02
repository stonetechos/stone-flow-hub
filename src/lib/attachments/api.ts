/** Polymorphic attachments: file_objects + storage bucket. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { FILES_BUCKET } from "@/lib/constants";
import type { DbTable, FileFolder } from "@/lib/types";

export type FileRow = DbTable<"file_objects">;

export async function listAttachments(entityType: string, entityId: string): Promise<FileRow[]> {
  const { data, error } = await supabase
    .from("file_objects")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("uploaded_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function uploadAttachment(params: {
  entityType: string;
  entityId: string;
  folder?: FileFolder;
  file: File;
}): Promise<FileRow> {
  const folder: FileFolder = params.folder ?? "other";

  const path = `${params.entityType}/${params.entityId}/${Date.now()}_${params.file.name}`;
  const up = await supabase.storage.from(FILES_BUCKET).upload(path, params.file, {
    contentType: params.file.type || undefined,
    upsert: false,
  });
  if (up.error) throw new AppError(up.error.message);
  const { data, error } = await supabase
    .from("file_objects")
    .insert({
      bucket: FILES_BUCKET,
      entity_type: params.entityType,
      entity_id: params.entityId,
      file_name: params.file.name,
      object_path: path,
      mime_type: params.file.type || null,
      size_bytes: params.file.size,
      folder,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deleteAttachment(row: FileRow): Promise<void> {
  await supabase.storage.from(row.bucket).remove([row.object_path]);
  const { error } = await supabase.from("file_objects").delete().eq("id", row.id);
  if (error) throw new AppError(mapDbError(error));
}

export async function signedUrl(row: FileRow, expiresSec = 300): Promise<string> {
  const { data, error } = await supabase.storage
    .from(row.bucket)
    .createSignedUrl(row.object_path, expiresSec);
  if (error) throw new AppError(error.message);
  return data.signedUrl;
}
