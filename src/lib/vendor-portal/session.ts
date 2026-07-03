/** Vendor portal session: resolves the vendor company for the current user. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";

export type VendorUserRow = DbTable<"vendor_users">;
export type VendorRow = DbTable<"vendors">;

export interface VendorContext {
  vendorUser: VendorUserRow;
  vendor: VendorRow;
}

/**
 * Returns the vendor company + role for the signed-in user, or null when the
 * user is not a vendor portal user (e.g. internal staff).
 */
export async function getVendorContext(): Promise<VendorContext | null> {
  const { data: sess } = await supabase.auth.getUser();
  const uid = sess.user?.id;
  if (!uid) return null;

  const { data: vu, error } = await supabase
    .from("vendor_users")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  if (!vu) return null;

  const { data: vendor, error: vErr } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", vu.vendor_id)
    .maybeSingle();
  if (vErr) throw new AppError(mapDbError(vErr));
  if (!vendor) return null;

  return { vendorUser: vu, vendor };
}
