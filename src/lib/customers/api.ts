/** Customers data access. Trust boundary — validates inputs, generates codes, dedupes on phone. */
import { getDb } from "@/integrations/supabase/server-context";
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { normalizeMobile, sanitizeSearch } from "@/lib/zod";
import type { DbTable } from "@/lib/types";
import { customerCreateSchema, type CustomerCreateInput } from "./schema";

export type CustomerRow = DbTable<"customers">;

export async function listCustomers(query = ""): Promise<CustomerRow[]> {
  let q = getDb()
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const s = sanitizeSearch(query);
  if (s) {
    // Search across every field a staff user reasonably types when looking up a customer.
    q = q.or(
      [
        `name.ilike.%${s}%`,
        `customer_code.ilike.%${s}%`,
        `primary_phone.ilike.%${s}%`,
        `whatsapp.ilike.%${s}%`,
        `primary_email.ilike.%${s}%`,
        `gst_number.ilike.%${s}%`,
        `city.ilike.%${s}%`,
      ].join(","),
    );
  }
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function getCustomer(id: string): Promise<CustomerRow | null> {
  const { data, error } = await getDb().from("customers").select("*").eq("id", id).maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function findCustomerByPhone(mobile: string): Promise<CustomerRow | null> {
  const normalized = normalizeMobile(mobile);
  if (!normalized) return null;
  const { data, error } = await getDb()
    .from("customers")
    .select("*")
    .ilike("primary_phone", `%${normalized}%`)
    .limit(1)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function createCustomer(input: CustomerCreateInput): Promise<CustomerRow> {
  const parsed = customerCreateSchema.parse(input);

  const existing = await findCustomerByPhone(parsed.mobile);
  if (existing) {
    throw new AppError(
      `A customer with this mobile already exists: ${existing.name} (${existing.customer_code})`,
      "DUPLICATE_CUSTOMER",
      409,
    );
  }

  // 1. Primary path: Elevated server function (bypasses restrictive RLS for authorized staff)
  try {
    const { saveCustomerServerFn } = await import("./customers.functions");
    const res = await saveCustomerServerFn({ data: { data: parsed } });
    if (res) return res as CustomerRow;
  } catch (serverErr: unknown) {
    const err = serverErr as { message?: string };
    if (err?.message?.includes("already exists")) {
      throw new AppError(err.message, "DUPLICATE_CUSTOMER", 409);
    }
    console.warn(
      "[customers.api] Server function failed, falling back to client-side insert:",
      serverErr,
    );
  }

  // 2. Client fallback (with authenticated created_by attribution)
  let uid: string | null = null;
  try {
    const { data: userData } = await supabase.auth.getUser();
    uid = userData.user?.id ?? null;
  } catch {
    // ignore
  }

  const { data, error } = await getDb()
    .from("customers")
    .insert({
      customer_code: "",
      name: parsed.name,
      primary_phone: normalizeMobile(parsed.mobile),
      primary_email: parsed.email ?? null,
      whatsapp: parsed.whatsapp ?? null,
      city: parsed.city ?? null,
      state: parsed.state ?? null,
      pincode: parsed.pincode ?? null,
      billing_address: parsed.billing_address ?? null,
      gst_number: parsed.gst_number ?? null,
      notes: parsed.notes ?? null,
      customer_type: parsed.customer_type,
      referred_by: parsed.customer_type === "reference" ? (parsed.referred_by ?? null) : null,
      site_address: parsed.site_address ?? null,
      space_type: parsed.space_type ?? null,
      material_interests: parsed.material_interests ?? [],
      created_by: uid,
    })
    .select("*")
    .single();

  if (error) throw new AppError(mapDbError(error));

  if (data) {
    try {
      const { broadcastCustomerCreated } = await import("@/lib/notifications/broadcast");
      broadcastCustomerCreated(data);
    } catch (e) {
      console.warn("[customers] notification dispatch skipped", e);
    }
  }

  return data;
}

export async function updateCustomer(id: string, input: CustomerCreateInput): Promise<CustomerRow> {
  const parsed = customerCreateSchema.parse(input);

  // 1. Primary path: Server function
  try {
    const { saveCustomerServerFn } = await import("./customers.functions");
    const res = await saveCustomerServerFn({ data: { id, data: parsed } });
    if (res) return res as CustomerRow;
  } catch (serverErr) {
    console.warn(
      "[customers.api] Server function failed, falling back to client-side update:",
      serverErr,
    );
  }

  // 2. Client fallback
  const { data, error } = await getDb()
    .from("customers")
    .update({
      name: parsed.name,
      primary_phone: normalizeMobile(parsed.mobile),
      primary_email: parsed.email ?? null,
      whatsapp: parsed.whatsapp ?? null,
      city: parsed.city ?? null,
      state: parsed.state ?? null,
      pincode: parsed.pincode ?? null,
      billing_address: parsed.billing_address ?? null,
      gst_number: parsed.gst_number ?? null,
      notes: parsed.notes ?? null,
      customer_type: parsed.customer_type,
      referred_by: parsed.customer_type === "reference" ? (parsed.referred_by ?? null) : null,
      site_address: parsed.site_address ?? null,
      space_type: parsed.space_type ?? null,
      material_interests: parsed.material_interests ?? [],
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deleteCustomer(id: string): Promise<void> {
  // 1. Primary path: Server function
  try {
    const { deleteCustomerServerFn } = await import("./customers.functions");
    await deleteCustomerServerFn({ data: { id } });
    return;
  } catch (serverErr) {
    console.warn(
      "[customers.api] Server function failed, falling back to client-side delete:",
      serverErr,
    );
  }

  // 2. Client fallback
  const { error } = await getDb().from("customers").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}
