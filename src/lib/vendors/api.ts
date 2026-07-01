/** Vendors data access. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { normalizeMobile, sanitizeSearch } from "@/lib/zod";
import type { DbTable } from "@/lib/types";
import { vendorCreateSchema, type VendorCreateInput } from "./schema";

export type VendorRow = DbTable<"vendors">;

export async function listVendors(query = ""): Promise<VendorRow[]> {
  let q = supabase
    .from("vendors")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  const s = query.trim();
  if (s) {
    q = q.or(
      `company_name.ilike.%${s}%,vendor_code.ilike.%${s}%,city.ilike.%${s}%`,
    );
  }
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function listVendorsForPicker(): Promise<VendorRow[]> {
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("is_active", true)
    .order("company_name", { ascending: true })
    .limit(500);
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function getVendor(id: string): Promise<VendorRow | null> {
  const { data, error } = await supabase.from("vendors").select("*").eq("id", id).maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function createVendor(input: VendorCreateInput): Promise<VendorRow> {
  const parsed = vendorCreateSchema.parse(input);

  const { data: code, error: codeErr } = await supabase.rpc("next_code", { _prefix: "VEN" });
  if (codeErr || !code) throw new AppError(mapDbError(codeErr));

  const { data: vendor, error } = await supabase
    .from("vendors")
    .insert({
      vendor_code: code,
      company_name: parsed.company_name,
      city: parsed.city ?? null,
      state: parsed.state ?? null,
      pincode: parsed.pincode ?? null,
      address: parsed.address ?? null,
      gst_number: parsed.gst_number ?? null,
      payment_terms: parsed.payment_terms ?? null,
      notes: parsed.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));

  // Primary contact
  const phone = normalizeMobile(parsed.mobile);
  const { error: cErr } = await supabase.from("vendor_contacts").insert({
    vendor_id: vendor.id,
    name: parsed.contact_name,
    phone,
    email: parsed.email ?? null,
    is_primary: true,
  });
  if (cErr) throw new AppError(mapDbError(cErr));

  return vendor;
}
