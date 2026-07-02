/** Global tags API — supports the entity types that have a join table. */
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { zRequired } from "@/lib/zod";
import type { DbTable } from "@/lib/types";

export type TagRow = DbTable<"tags">;

export type TaggableType = "customer" | "project" | "vendor" | "enquiry";

interface TagBinding {
  table: "customer_tags" | "project_tags" | "vendor_tags" | "enquiry_tags";
  fk: "customer_id" | "project_id" | "vendor_id" | "enquiry_id";
}

const BINDINGS: Record<TaggableType, TagBinding> = {
  customer: { table: "customer_tags", fk: "customer_id" },
  project: { table: "project_tags", fk: "project_id" },
  vendor: { table: "vendor_tags", fk: "vendor_id" },
  enquiry: { table: "enquiry_tags", fk: "enquiry_id" },
};

export const tagCreateSchema = z.object({
  name: zRequired("Tag name"),
  color: z.string().optional(),
});

export async function listAllTags(): Promise<TagRow[]> {
  const { data, error } = await supabase.from("tags").select("*").order("name");
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function createTag(name: string, color = "#64748b"): Promise<TagRow> {
  const parsed = tagCreateSchema.parse({ name, color });
  const { data, error } = await supabase
    .from("tags")
    .insert({ name: parsed.name, color: parsed.color ?? "#64748b" })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function listEntityTags(entityType: TaggableType, entityId: string): Promise<TagRow[]> {
  const b = BINDINGS[entityType];
  const { data, error } = await supabase
    .from(b.table)
    .select("tag_id, tags(*)")
    .eq(b.fk, entityId);
  if (error) throw new AppError(mapDbError(error));
  const rows = (data ?? []) as unknown as Array<{ tags: TagRow | null }>;
  return rows.map((r) => r.tags).filter((t): t is TagRow => !!t);
}

export async function attachTag(entityType: TaggableType, entityId: string, tagId: string): Promise<void> {
  const b = BINDINGS[entityType];
  const row = { [b.fk]: entityId, tag_id: tagId } as never;
  const { error } = await supabase.from(b.table).insert(row);
  if (error && error.code !== "23505") throw new AppError(mapDbError(error));
}

export async function detachTag(entityType: TaggableType, entityId: string, tagId: string): Promise<void> {
  const b = BINDINGS[entityType];
  const { error } = await supabase.from(b.table).delete().eq(b.fk, entityId).eq("tag_id", tagId);
  if (error) throw new AppError(mapDbError(error));
}
