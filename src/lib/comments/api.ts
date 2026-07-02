/** Threaded comments (polymorphic). */
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { zRequired } from "@/lib/zod";
import type { DbTable } from "@/lib/types";

export type CommentRow = DbTable<"comments">;

export const commentCreateSchema = z.object({
  entity_type: zRequired("Entity type"),
  entity_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  body: zRequired("Comment"),
});
export type CommentCreateInput = z.infer<typeof commentCreateSchema>;

export async function listComments(entityType: string, entityId: string): Promise<CommentRow[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function createComment(input: CommentCreateInput): Promise<CommentRow> {
  const parsed = commentCreateSchema.parse(input);
  const auth = await supabase.auth.getUser();
  const uid = auth.data.user?.id ?? null;
  const { data, error } = await supabase
    .from("comments")
    .insert({ ...parsed, created_by: uid })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}
