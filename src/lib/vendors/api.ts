/** Vendors data access. */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import { extractPhoneDigits, normalizeMobile, sanitizeSearch } from "@/lib/zod";
import type { DbTable } from "@/lib/types";
import { vendorCreateSchema, type VendorCreateInput } from "./schema";

export type VendorContactRow = DbTable<"vendor_contacts">;
export type VendorRow = DbTable<"vendors"> & {
  vendor_contacts?: VendorContactRow[];
};

export function getVendorPhone(v: VendorRow | null | undefined): string | null {
  if (!v) return null;
  if (v.mobile_number) return v.mobile_number;
  if (v.whatsapp_number) return v.whatsapp_number;
  if (v.vendor_contacts && v.vendor_contacts.length > 0) {
    const primary = v.vendor_contacts.find((c) => c.is_primary) ?? v.vendor_contacts[0];
    if (primary?.phone) return primary.phone;
    if (primary?.whatsapp) return primary.whatsapp;
  }
  const ref = v.external_ref as Record<string, unknown> | null;
  if (ref) {
    if (typeof ref.mobile === "string" && ref.mobile) return ref.mobile;
    if (typeof ref.phone === "string" && ref.phone) return ref.phone;
    if (typeof ref.mobile_number === "string" && ref.mobile_number) return ref.mobile_number;
  }
  return null;
}

export function getVendorContactName(v: VendorRow | null | undefined): string | null {
  if (!v) return null;
  if (v.contact_person) return v.contact_person;
  if (v.vendor_contacts && v.vendor_contacts.length > 0) {
    const primary = v.vendor_contacts.find((c) => c.is_primary) ?? v.vendor_contacts[0];
    if (primary?.name) return primary.name;
  }
  const ref = v.external_ref as Record<string, unknown> | null;
  if (ref) {
    if (typeof ref.contact_person === "string" && ref.contact_person) return ref.contact_person;
    if (typeof ref.contact_name === "string" && ref.contact_name) return ref.contact_name;
    if (typeof ref.name === "string" && ref.name) return ref.name;
  }
  return null;
}

async function attachVendorContacts(vendors: VendorRow[]): Promise<VendorRow[]> {
  if (vendors.length === 0) return [];
  const vendorIds = vendors.map((v) => v.id);
  try {
    const { data: contacts } = await getDb()
      .from("vendor_contacts")
      .select("*")
      .in("vendor_id", vendorIds)
      .order("is_primary", { ascending: false });

    const contactMap = new Map<string, VendorContactRow[]>();
    if (contacts) {
      for (const c of contacts) {
        if (!contactMap.has(c.vendor_id)) {
          contactMap.set(c.vendor_id, []);
        }
        contactMap.get(c.vendor_id)!.push(c);
      }
    }

    return vendors.map((v) => {
      const vContacts = contactMap.get(v.id) ?? [];
      const primary = vContacts.find((c) => c.is_primary) ?? vContacts[0];
      const phone = v.mobile_number || primary?.phone || primary?.whatsapp || getVendorPhone(v);
      const contactPerson = v.contact_person || primary?.name || getVendorContactName(v);
      const email = v.email || primary?.email || null;
      return {
        ...v,
        vendor_contacts: vContacts,
        mobile_number: phone,
        contact_person: contactPerson,
        email,
      };
    });
  } catch {
    return vendors.map((v) => ({
      ...v,
      mobile_number: v.mobile_number || getVendorPhone(v),
      contact_person: v.contact_person || getVendorContactName(v),
    }));
  }
}

async function getContactVendorIds(s: string, digits: string): Promise<string[]> {
  try {
    const contactClauses: string[] = [
      `name.ilike.%${s}%`,
      `phone.ilike.%${s}%`,
      `whatsapp.ilike.%${s}%`,
    ];
    if (digits.length >= 4) {
      contactClauses.push(`phone.ilike.%${digits}%`, `whatsapp.ilike.%${digits}%`);
      if (digits.length >= 10) {
        const last10 = digits.slice(-10);
        contactClauses.push(`phone.ilike.%${last10}%`, `whatsapp.ilike.%${last10}%`);
      }
    }
    const { data: contacts } = await getDb()
      .from("vendor_contacts")
      .select("vendor_id")
      .or(contactClauses.join(","))
      .limit(50);
    if (contacts && contacts.length > 0) {
      return contacts.map((c) => c.vendor_id).filter(Boolean);
    }
  } catch {
    // Safe fallback if vendor_contacts is unreachable
  }
  return [];
}

function buildVendorSearchClauses(s: string, digits: string, contactVendorIds: string[]): string {
  const clauses = [
    `company_name.ilike.%${s}%`,
    `vendor_code.ilike.%${s}%`,
    `gst_number.ilike.%${s}%`,
    `city.ilike.%${s}%`,
    `contact_person.ilike.%${s}%`,
    `mobile_number.ilike.%${s}%`,
    `email.ilike.%${s}%`,
    `external_ref->>contact_person.ilike.%${s}%`,
  ];

  if (digits.length >= 4) {
    clauses.push(
      `mobile_number.ilike.%${digits}%`,
      `external_ref->>mobile.ilike.%${digits}%`,
      `external_ref->>phone.ilike.%${digits}%`,
    );
    if (digits.length >= 10) {
      const last10 = digits.slice(-10);
      clauses.push(`mobile_number.ilike.%${last10}%`, `external_ref->>mobile.ilike.%${last10}%`);
    }
  }

  if (contactVendorIds.length > 0) {
    clauses.push(`id.in.(${contactVendorIds.join(",")})`);
  }

  return clauses.join(",");
}

export async function listVendors(query = ""): Promise<VendorRow[]> {
  let q = getDb().from("vendors").select("*").order("created_at", { ascending: false }).limit(200);
  const s = sanitizeSearch(query);
  if (s) {
    const digits = extractPhoneDigits(query);
    const contactVendorIds = await getContactVendorIds(s, digits);
    q = q.or(buildVendorSearchClauses(s, digits, contactVendorIds));
  }
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  const vendors = data ?? [];
  return attachVendorContacts(vendors);
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
    const digits = extractPhoneDigits(query);
    const contactVendorIds = await getContactVendorIds(s, digits);
    q = q.or(buildVendorSearchClauses(s, digits, contactVendorIds));
  }
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  const vendors = data ?? [];
  return attachVendorContacts(vendors);
}

export async function getVendor(id: string): Promise<VendorRow | null> {
  const { data, error } = await getDb().from("vendors").select("*").eq("id", id).maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  if (!data) return null;
  const [enriched] = await attachVendorContacts([data]);
  return enriched ?? data;
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

export function extractVendorMetadata(v: VendorRow | null | undefined): {
  products_dealt: string[];
  work_types: string[];
} {
  if (!v) return { products_dealt: [], work_types: [] };
  const ref = (v.external_ref as Record<string, unknown> | null) ?? {};
  return {
    products_dealt: Array.isArray(ref.products_dealt) ? (ref.products_dealt as string[]) : [],
    work_types: Array.isArray(ref.work_types) ? (ref.work_types as string[]) : [],
  };
}

export async function createVendor(input: VendorCreateInput): Promise<VendorRow> {
  const parsed = vendorCreateSchema.parse(input);

  const external_ref = {
    products_dealt: parsed.products_dealt ?? [],
    work_types: parsed.work_types ?? [],
  };

  const phone = normalizeMobile(parsed.mobile);
  const { data: vendor, error } = await getDb()
    .from("vendors")
    .insert({
      vendor_code: "",
      company_name: parsed.company_name,
      contact_person: parsed.contact_name,
      mobile_number: phone || null,
      email: parsed.email ?? null,
      city: parsed.city ?? null,
      state: parsed.state ?? null,
      pincode: parsed.pincode ?? null,
      address: parsed.address ?? null,
      gst_number: parsed.gst_number ?? null,
      payment_terms: parsed.payment_terms ?? null,
      notes: parsed.notes ?? null,
      external_ref,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));

  const { error: cErr } = await getDb()
    .from("vendor_contacts")
    .insert({
      vendor_id: vendor.id,
      name: parsed.contact_name,
      phone,
      email: parsed.email ?? null,
      is_primary: true,
    });
  if (cErr) throw new AppError(mapDbError(cErr));

  // Sync matching work types into vendor_capabilities
  const capMap: Record<string, string[]> = {
    cnc_works: ["cnc"],
    polishing_work: ["polishing"],
    artwork: ["sculpture", "inlay"],
  };
  const capsToInsert = new Set<string>();
  for (const wt of parsed.work_types ?? []) {
    const mapped = capMap[wt];
    if (mapped) mapped.forEach((c) => capsToInsert.add(c));
  }
  if (capsToInsert.size > 0) {
    const rows = Array.from(capsToInsert).map((capability) => ({
      vendor_id: vendor.id,
      capability: capability as never,
    }));
    await getDb()
      .from("vendor_capabilities")
      .insert(rows)
      .then(
        () => {},
        () => {},
      );
  }

  return vendor;
}

export async function updateVendor(id: string, input: VendorCreateInput): Promise<VendorRow> {
  const parsed = vendorCreateSchema.parse(input);
  const existing = await getVendor(id);
  const existingRef =
    existing && typeof existing.external_ref === "object" && existing.external_ref !== null
      ? (existing.external_ref as Record<string, unknown>)
      : {};

  const external_ref = {
    ...existingRef,
    products_dealt: parsed.products_dealt ?? [],
    work_types: parsed.work_types ?? [],
  };

  const phone = normalizeMobile(parsed.mobile);
  const { data: vendor, error } = await getDb()
    .from("vendors")
    .update({
      company_name: parsed.company_name,
      contact_person: parsed.contact_name,
      mobile_number: phone || null,
      email: parsed.email ?? null,
      city: parsed.city ?? null,
      state: parsed.state ?? null,
      pincode: parsed.pincode ?? null,
      address: parsed.address ?? null,
      gst_number: parsed.gst_number ?? null,
      payment_terms: parsed.payment_terms ?? null,
      notes: parsed.notes ?? null,
      external_ref,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));

  const existingContact = await getPrimaryContact(id);
  if (existingContact) {
    const { error: uErr } = await getDb()
      .from("vendor_contacts")
      .update({ name: parsed.contact_name, phone, email: parsed.email ?? null })
      .eq("id", existingContact.id);
    if (uErr) throw new AppError(mapDbError(uErr));
  } else {
    const { error: iErr } = await getDb()
      .from("vendor_contacts")
      .insert({
        vendor_id: id,
        name: parsed.contact_name,
        phone,
        email: parsed.email ?? null,
        is_primary: true,
      });
    if (iErr) throw new AppError(mapDbError(iErr));
  }

  // Sync matching work types into vendor_capabilities
  const capMap: Record<string, string[]> = {
    cnc_works: ["cnc"],
    polishing_work: ["polishing"],
    artwork: ["sculpture", "inlay"],
  };
  const capsToInsert = new Set<string>();
  for (const wt of parsed.work_types ?? []) {
    const mapped = capMap[wt];
    if (mapped) mapped.forEach((c) => capsToInsert.add(c));
  }
  if (capsToInsert.size > 0) {
    const rows = Array.from(capsToInsert).map((capability) => ({
      vendor_id: id,
      capability: capability as never,
    }));
    await getDb()
      .from("vendor_capabilities")
      .insert(rows)
      .then(
        () => {},
        () => {},
      );
  }

  return vendor;
}

export async function deleteVendor(id: string): Promise<void> {
  const { error } = await getDb().from("vendors").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}
