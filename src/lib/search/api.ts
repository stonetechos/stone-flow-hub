/** Global search across all business modules. Runs queries in parallel and groups results. */
import { supabase } from "@/integrations/supabase/client";

export type SearchGroupKey =
  | "customers"
  | "projects"
  | "vendors"
  | "products"
  | "enquiries"
  | "quotes"
  | "salesOrders"
  | "purchaseOrders"
  | "inventory"
  | "invoices"
  | "payments"
  | "dispatch";

export interface SearchHit {
  id: string;
  label: string;
  sublabel?: string | null;
  href: string;
  group: SearchGroupKey;
  groupLabel: string;
}

const LIMIT = 6;
const like = (q: string): string => `%${q.replace(/[%_]/g, "")}%`;

async function safe<T>(p: PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  try {
    const { data } = await p;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function globalSearch(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const p = like(q);

  const [
    customers,
    projects,
    vendors,
    products,
    enquiries,
    quotes,
    salesOrders,
    purchaseOrders,
    inventory,
    invoices,
    payments,
    dispatch,
  ] = await Promise.all([
    safe(supabase.from("customers").select("id,name,code,mobile").or(`name.ilike.${p},code.ilike.${p},mobile.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("projects").select("id,name,code,city").or(`name.ilike.${p},code.ilike.${p},city.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("vendors").select("id,name,code,city").or(`name.ilike.${p},code.ilike.${p},city.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("products").select("id,name,code").or(`name.ilike.${p},code.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("enquiries").select("id,code,title").or(`code.ilike.${p},title.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("quotes").select("id,code,title").or(`code.ilike.${p},title.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("sales_orders").select("id,code,title").or(`code.ilike.${p},title.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("purchase_orders").select("id,code,title").or(`code.ilike.${p},title.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("inventory_items").select("id,code,name").or(`code.ilike.${p},name.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("invoices").select("id,code,title").or(`code.ilike.${p},title.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("payments").select("id,code,reference").or(`code.ilike.${p},reference.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("dispatches").select("id,code,title").or(`code.ilike.${p},title.ilike.${p}`).limit(LIMIT)),
  ]);

  const hits: SearchHit[] = [];
  for (const r of customers as Array<{ id: string; name: string; code: string | null; mobile: string | null }>)
    hits.push({ id: r.id, label: r.name, sublabel: r.code ?? r.mobile, href: `/customers/${r.id}`, group: "customers", groupLabel: "Customers" });
  for (const r of projects as Array<{ id: string; name: string; code: string | null; city: string | null }>)
    hits.push({ id: r.id, label: r.name, sublabel: r.code ?? r.city, href: `/projects/${r.id}`, group: "projects", groupLabel: "Projects" });
  for (const r of vendors as Array<{ id: string; name: string; code: string | null; city: string | null }>)
    hits.push({ id: r.id, label: r.name, sublabel: r.code ?? r.city, href: `/vendors/${r.id}`, group: "vendors", groupLabel: "Vendors" });
  for (const r of products as Array<{ id: string; name: string; code: string | null }>)
    hits.push({ id: r.id, label: r.name, sublabel: r.code, href: `/products/${r.id}`, group: "products", groupLabel: "Products" });
  for (const r of enquiries as Array<{ id: string; code: string | null; title: string | null }>)
    hits.push({ id: r.id, label: r.code ?? r.title ?? "Enquiry", sublabel: r.title, href: `/enquiries/${r.id}`, group: "enquiries", groupLabel: "Enquiries" });
  for (const r of quotes as Array<{ id: string; code: string | null; title: string | null }>)
    hits.push({ id: r.id, label: r.code ?? "Quote", sublabel: r.title, href: `/quotations/${r.id}`, group: "quotes", groupLabel: "Quotations" });
  for (const r of salesOrders as Array<{ id: string; code: string | null; title: string | null }>)
    hits.push({ id: r.id, label: r.code ?? "SO", sublabel: r.title, href: `/sales-orders/${r.id}`, group: "salesOrders", groupLabel: "Sales Orders" });
  for (const r of purchaseOrders as Array<{ id: string; code: string | null; title: string | null }>)
    hits.push({ id: r.id, label: r.code ?? "PO", sublabel: r.title, href: `/purchase-orders/${r.id}`, group: "purchaseOrders", groupLabel: "Purchase Orders" });
  for (const r of inventory as Array<{ id: string; code: string | null; name: string | null }>)
    hits.push({ id: r.id, label: r.name ?? r.code ?? "Item", sublabel: r.code, href: `/inventory/${r.id}`, group: "inventory", groupLabel: "Inventory" });
  for (const r of invoices as Array<{ id: string; code: string | null; title: string | null }>)
    hits.push({ id: r.id, label: r.code ?? "Invoice", sublabel: r.title, href: `/invoices/${r.id}`, group: "invoices", groupLabel: "Invoices" });
  for (const r of payments as Array<{ id: string; code: string | null; reference: string | null }>)
    hits.push({ id: r.id, label: r.code ?? "Payment", sublabel: r.reference, href: `/payments/${r.id}`, group: "payments", groupLabel: "Payments" });
  for (const r of dispatch as Array<{ id: string; code: string | null; title: string | null }>)
    hits.push({ id: r.id, label: r.code ?? "Dispatch", sublabel: r.title, href: `/dispatch/${r.id}`, group: "dispatch", groupLabel: "Dispatch" });

  return hits;
}
