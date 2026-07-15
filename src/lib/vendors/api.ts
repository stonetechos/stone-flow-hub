/** Vendors data access. */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import { normalizeMobile, sanitizeSearch } from "@/lib/zod";
import type { DbTable } from "@/lib/types";
import { vendorCreateSchema, type VendorCreateInput } from "./schema";

export type VendorRow = DbTable<"vendors">;
export type VendorContactRow = DbTable<"vendor_contacts">;

export async function listVendors(query = ""): Promise<VendorRow[]> {
  let q = getDb().from("vendors").select("*").order("created_at", { ascending: false }).limit(200);
  const s = sanitizeSearch(query);
  if (s) {
    q = q.or(
      [
        `company_name.ilike.%${s}%`,
        `vendor_code.ilike.%${s}%`,
        `gst_number.ilike.%${s}%`,
        `city.ilike.%${s}%`,
      ].join(","),
    );
  }
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function listVendorsForPicker(query = ""): Promise<VendorRow[]> {
  let q = getDb()
    .from("vendors")
    .select("*")
    .eq("is_active", true)
    .order("company_name", { ascending: true })
    .limit(500);
  const s = sanitizeSearch(query);
  if (s) {
    q = q.or(
      [
        `company_name.ilike.%${s}%`,
        `vendor_code.ilike.%${s}%`,
        `gst_number.ilike.%${s}%`,
        `city.ilike.%${s}%`,
      ].join(","),
    );
  }
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function getVendor(id: string): Promise<VendorRow | null> {
  const { data, error } = await getDb().from("vendors").select("*").eq("id", id).maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function getPrimaryContact(vendorId: string): Promise<VendorContactRow | null> {
  const { data, error } = await getDb()
    .from("vendor_contacts")
    .select("*")
    .eq("vendor_id", vendorId)
    .eq("is_primary", true)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function createVendor(input: VendorCreateInput): Promise<VendorRow> {
  const parsed = vendorCreateSchema.parse(input);

  const { data: vendor, error } = await getDb()
    .from("vendors")
    .insert({
      vendor_code: "",
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

  const phone = normalizeMobile(parsed.mobile);
  const { error: cErr } = await getDb().from("vendor_contacts").insert({
    vendor_id: vendor.id,
    name: parsed.contact_name,
    phone,
    email: parsed.email ?? null,
    is_primary: true,
  });
  if (cErr) throw new AppError(mapDbError(cErr));

  return vendor;
}

export async function updateVendor(id: string, input: VendorCreateInput): Promise<VendorRow> {
  const parsed = vendorCreateSchema.parse(input);
  const { data: vendor, error } = await getDb()
    .from("vendors")
    .update({
      company_name: parsed.company_name,
      city: parsed.city ?? null,
      state: parsed.state ?? null,
      pincode: parsed.pincode ?? null,
      address: parsed.address ?? null,
      gst_number: parsed.gst_number ?? null,
      payment_terms: parsed.payment_terms ?? null,
      notes: parsed.notes ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));

  const phone = normalizeMobile(parsed.mobile);
  const existing = await getPrimaryContact(id);
  if (existing) {
    const { error: uErr } = await getDb()
      .from("vendor_contacts")
      .update({ name: parsed.contact_name, phone, email: parsed.email ?? null })
      .eq("id", existing.id);
    if (uErr) throw new AppError(mapDbError(uErr));
  } else {
    const { error: iErr } = await getDb().from("vendor_contacts").insert({
      vendor_id: id,
      name: parsed.contact_name,
      phone,
      email: parsed.email ?? null,
      is_primary: true,
    });
    if (iErr) throw new AppError(mapDbError(iErr));
  }
  return vendor;
}

export async function deleteVendor(id: string): Promise<void> {
  const { error } = await getDb().from("vendors").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}
