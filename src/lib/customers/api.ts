/**
 * Customers data layer. Pure functions, return parsed Supabase rows.
 * Workflow: Customer Created → Duplicate Validation → DB code generation (trigger)
 *           → Insert → Activity Log (trigger) → return row.
 */
import { supabase } from "@/integrations/supabase/client";
import type { DbTable } from "@/lib/types";
import { AppError, mapDbError } from "@/lib/errors";
import { customerCreateSchema, normalizeForDedup, type CustomerCreateInput } from "./schema";

export type Customer = DbTable<"customers">;

export async function listCustomers(query?: string): Promise<Customer[]> {
  let q = supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(200);
  if (query && query.trim()) {
    const t = `%${query.trim()}%`;
    q = q.or(`name.ilike.${t},mobile.ilike.${t},code.ilike.${t},city.ilike.${t}`);
  }
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function getCustomer(id: string): Promise<Customer> {
  const { data, error } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  if (!data) throw new AppError("Customer not found", "NOT_FOUND", 404);
  return data;
}

/** Look up an existing customer by normalized mobile (last 10 digits). */
export async function findDuplicateByMobile(mobile: string): Promise<Customer | null> {
  const norm = mobile.replace(/\D+/g, "").slice(-10);
  if (norm.length < 10) return null;
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .ilike("mobile", `%${norm}`)
    .limit(1);
  if (error) throw new AppError(mapDbError(error));
  return data[0] ?? null;
}

export async function createCustomer(input: CustomerCreateInput): Promise<Customer> {
  const parsed = customerCreateSchema.parse(input);

  // Duplicate validation
  const dup = await findDuplicateByMobile(parsed.mobile);
  if (dup) {
    throw new AppError(
      `A customer with this mobile already exists: ${dup.name} (${dup.code}).`,
      "DUPLICATE",
      409,
    );
  }

  const norm = normalizeForDedup(parsed);
  const { data, error } = await supabase
    .from("customers")
    .insert({
      name: parsed.name,
      mobile: parsed.mobile,
      mobile_normalized: norm.mobile_normalized,
      email: parsed.email ?? null,
      city: parsed.city ?? null,
      type: parsed.type,
      alt_mobile: parsed.alt_mobile ?? null,
      address: parsed.address ?? null,
      state: parsed.state ?? null,
      pincode: parsed.pincode ?? null,
      gstin: parsed.gstin ?? null,
      notes: parsed.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}
