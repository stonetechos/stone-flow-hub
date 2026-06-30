import { supabase } from "@/integrations/supabase/client";
import type { DbTable } from "@/lib/types";
import { AppError, mapDbError } from "@/lib/errors";
import { vendorCreateSchema, type VendorCreateInput } from "./schema";

export type Vendor = DbTable<"vendors">;

export async function listVendors(query?: string): Promise<Vendor[]> {
  let q = supabase.from("vendors").select("*").order("created_at", { ascending: false }).limit(200);
  if (query && query.trim()) {
    const t = `%${query.trim()}%`;
    q = q.or(`name.ilike.${t},code.ilike.${t},contact_name.ilike.${t},city.ilike.${t}`);
  }
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function getVendor(id: string): Promise<Vendor> {
  const { data, error } = await supabase.from("vendors").select("*").eq("id", id).maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  if (!data) throw new AppError("Vendor not found", "NOT_FOUND", 404);
  return data;
}

export async function createVendor(input: VendorCreateInput): Promise<Vendor> {
  const parsed = vendorCreateSchema.parse(input);
  const { data, error } = await supabase
    .from("vendors")
    .insert({
      name: parsed.name,
      contact_name: parsed.contact_name,
      mobile: parsed.mobile,
      email: parsed.email ?? null,
      city: parsed.city ?? null,
      specialty: parsed.specialty ?? null,
      address: parsed.address ?? null,
      state: parsed.state ?? null,
      pincode: parsed.pincode ?? null,
      gstin: parsed.gstin ?? null,
      payment_terms: parsed.payment_terms ?? null,
      notes: parsed.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}
