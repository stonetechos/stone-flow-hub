/**
 * Multi-category assignment for vendors.
 *
 * Uses the existing `vendor_service_categories` catalog + `vendor_service_links`
 * many-to-many table. Later slices attach product categories, stone types,
 * finishes, edge finishes, capabilities and capacity via their own dedicated
 * link tables (all already present) — the picker composition here mirrors
 * that shape so extending the vendor detail page later is drop-in.
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";

export type ServiceCategoryRow = DbTable<"vendor_service_categories">;

export async function listServiceCategories(): Promise<ServiceCategoryRow[]> {
  const { data, error } = await supabase
    .from("vendor_service_categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function listVendorCategoryIds(vendorId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("vendor_service_links")
    .select("category_id")
    .eq("vendor_id", vendorId);
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []).map((r) => r.category_id);
}

/** Idempotent set: computes the diff and applies inserts + deletes only. */
export async function setVendorCategories(
  vendorId: string,
  next: readonly string[],
): Promise<void> {
  const current = new Set(await listVendorCategoryIds(vendorId));
  const wanted = new Set(next);

  const toAdd = [...wanted].filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !wanted.has(id));

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("vendor_service_links")
      .insert(toAdd.map((category_id) => ({ vendor_id: vendorId, category_id })));
    if (error) throw new AppError(mapDbError(error));
  }
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("vendor_service_links")
      .delete()
      .eq("vendor_id", vendorId)
      .in("category_id", toRemove);
    if (error) throw new AppError(mapDbError(error));
  }
}
