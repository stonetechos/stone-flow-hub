/** Favorites: user-pinned records. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";

export type FavoriteRow = DbTable<"favorites">;

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new AppError("Not signed in", "AUTH", 401);
  return data.user.id;
}

export async function listMyFavorites(): Promise<FavoriteRow[]> {
  const uid = await requireUserId();
  const { data, error } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function isFavorite(entityType: string, entityId: string): Promise<boolean> {
  const uid = await requireUserId();
  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", uid)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return !!data;
}

export async function addFavorite(entityType: string, entityId: string, label?: string): Promise<void> {
  const uid = await requireUserId();
  const { error } = await supabase.from("favorites").insert({
    user_id: uid,
    entity_type: entityType,
    entity_id: entityId,
    label: label ?? null,
  });
  if (error && error.code !== "23505") throw new AppError(mapDbError(error));
}

export async function removeFavorite(entityType: string, entityId: string): Promise<void> {
  const uid = await requireUserId();
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", uid)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);
  if (error) throw new AppError(mapDbError(error));
}
