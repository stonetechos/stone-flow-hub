/** Customers data access. Trust boundary — validates inputs, generates codes, dedupes on phone. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { normalizeMobile, sanitizeSearch } from "@/lib/zod";
import type { DbTable } from "@/lib/types";
import { customerCreateSchema, type CustomerCreateInput } from "./schema";

export type CustomerRow = DbTable<"customers">;

export async function listCustomers(query = ""): Promise<CustomerRow[]> {
  let q = supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const s = sanitizeSearch(query);
  if (s) {
    q = q.or(
      `name.ilike.%${s}%,customer_code.ilike.%${s}%,primary_phone.ilike.%${s}%,city.ilike.%${s}%`,
    );
  }
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function getCustomer(id: string): Promise<CustomerRow | null> {
  const { data, error } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function findCustomerByPhone(mobile: string): Promise<CustomerRow | null> {
  const normalized = normalizeMobile(mobile);
  if (!normalized) return null;
  const { data, error } = await supabase
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

  // Duplicate guard on phone.
  const existing = await findCustomerByPhone(parsed.mobile);
  if (existing) {
    throw new AppError(
      `A customer with this mobile already exists: ${existing.name} (${existing.customer_code})`,
      "DUPLICATE_CUSTOMER",
      409,
    );
  }

  // Generate code via Postgres sequence.
  const { data: code, error: codeErr } = await supabase.rpc("next_code", { _prefix: "CUS" });
  if (codeErr || !code) throw new AppError(mapDbError(codeErr));

  const { data, error } = await supabase
    .from("customers")
    .insert({
      customer_code: code,
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
    })
    .select("*")
    .single();

  if (error) throw new AppError(mapDbError(error));
  return data;
}
