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
const clean = (q: string): string => q.replace(/[%_,()]/g, "");

async function safe<T>(p: PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  try {
    const { data } = await p;
    return data ?? [];
  } catch {
    return [];
  }
}

export async function globalSearch(query: string): Promise<SearchHit[]> {
  const raw = query.trim();
  if (raw.length < 2) return [];
  const s = clean(raw);
  const p = `%${s}%`;

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
    safe(supabase.from("customers").select("id,name,customer_code,mobile").or(`name.ilike.${p},customer_code.ilike.${p},mobile.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("projects").select("id,name,city").or(`name.ilike.${p},city.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("vendors").select("id,company_name,vendor_code,city").or(`company_name.ilike.${p},vendor_code.ilike.${p},city.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("products").select("id,name,product_code").or(`name.ilike.${p},product_code.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("enquiries").select("id,enquiry_no,notes").or(`enquiry_no.ilike.${p},notes.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("quotes").select("id,quote_no,notes").or(`quote_no.ilike.${p},notes.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("sales_orders").select("id,so_no,notes").or(`so_no.ilike.${p},notes.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("purchase_orders").select("id,po_no,notes").or(`po_no.ilike.${p},notes.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("inventory_items").select("id,stock_code,location").or(`stock_code.ilike.${p},location.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("invoices").select("id,invoice_no,notes").or(`invoice_no.ilike.${p},notes.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("payments").select("id,payment_no,reference_no").or(`payment_no.ilike.${p},reference_no.ilike.${p}`).limit(LIMIT)),
    safe(supabase.from("dispatches").select("id,dispatch_no,tracking_no").or(`dispatch_no.ilike.${p},tracking_no.ilike.${p}`).limit(LIMIT)),
  ]);

  type C = { id: string; name: string; customer_code: string | null; mobile: string | null };
  type P = { id: string; name: string; city: string | null };
  type V = { id: string; company_name: string; vendor_code: string | null; city: string | null };
  type Pr = { id: string; name: string; product_code: string | null };
  type E = { id: string; enquiry_no: string | null; notes: string | null };
  type Inv = { id: string; stock_code: string | null; location: string | null };
  type Pay = { id: string; payment_no: string | null; reference_no: string | null };
  type Dsp = { id: string; dispatch_no: string | null; tracking_no: string | null };

  const hits: SearchHit[] = [];
  for (const r of customers as C[]) hits.push({ id: r.id, label: r.name, sublabel: r.customer_code ?? r.mobile, href: `/customers/${r.id}`, group: "customers", groupLabel: "Customers" });
  for (const r of projects as P[]) hits.push({ id: r.id, label: r.name, sublabel: r.city, href: `/projects/${r.id}`, group: "projects", groupLabel: "Projects" });
  for (const r of vendors as V[]) hits.push({ id: r.id, label: r.company_name, sublabel: r.vendor_code ?? r.city, href: `/vendors/${r.id}`, group: "vendors", groupLabel: "Vendors" });
  for (const r of products as Pr[]) hits.push({ id: r.id, label: r.name, sublabel: r.product_code, href: `/products/${r.id}`, group: "products", groupLabel: "Products" });
  for (const r of enquiries as E[]) hits.push({ id: r.id, label: r.enquiry_no ?? "Enquiry", sublabel: r.notes, href: `/enquiries/${r.id}`, group: "enquiries", groupLabel: "Enquiries" });
  for (const r of quotes as E[]) hits.push({ id: r.id, label: (r as unknown as { quote_no: string | null }).quote_no ?? "Quote", sublabel: r.notes, href: `/quotes/${r.id}`, group: "quotes", groupLabel: "Quotations" });
  for (const r of salesOrders as E[]) hits.push({ id: r.id, label: (r as unknown as { so_no: string | null }).so_no ?? "SO", sublabel: r.notes, href: `/sales-orders/${r.id}`, group: "salesOrders", groupLabel: "Sales Orders" });
  for (const r of purchaseOrders as E[]) hits.push({ id: r.id, label: (r as unknown as { po_no: string | null }).po_no ?? "PO", sublabel: r.notes, href: `/purchase-orders/${r.id}`, group: "purchaseOrders", groupLabel: "Purchase Orders" });
  for (const r of inventory as Inv[]) hits.push({ id: r.id, label: r.stock_code ?? "Item", sublabel: r.location, href: `/inventory/${r.id}`, group: "inventory", groupLabel: "Inventory" });
  for (const r of invoices as E[]) hits.push({ id: r.id, label: (r as unknown as { invoice_no: string | null }).invoice_no ?? "Invoice", sublabel: r.notes, href: `/invoices/${r.id}`, group: "invoices", groupLabel: "Invoices" });
  for (const r of payments as Pay[]) hits.push({ id: r.id, label: r.payment_no ?? "Payment", sublabel: r.reference_no, href: `/payments/${r.id}`, group: "payments", groupLabel: "Payments" });
  for (const r of dispatch as Dsp[]) hits.push({ id: r.id, label: r.dispatch_no ?? "Dispatch", sublabel: r.tracking_no, href: `/dispatch/${r.id}`, group: "dispatch", groupLabel: "Dispatch" });

  return hits;
}
