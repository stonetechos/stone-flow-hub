/** Global search across all business modules. Runs queries in parallel and groups results. */
import { supabase } from "@/integrations/supabase/client";

export type SearchGroupKey =
  | "customers"
  | "contacts"
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
  | "dispatch"
  | "salespeople"
  | "architects";

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
    contacts,
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
    salespeople,
    architects,
  ] = await Promise.all([
    safe(
      supabase
        .from("customers")
        .select("id,name,customer_code,primary_phone,primary_email,city")
        .or(`name.ilike.${p},customer_code.ilike.${p},primary_phone.ilike.${p},primary_email.ilike.${p},city.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      supabase
        .from("customer_contacts")
        .select("id,name,phone,email,whatsapp,customer_id")
        .or(`name.ilike.${p},phone.ilike.${p},email.ilike.${p},whatsapp.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      supabase
        .from("projects")
        .select("id,name,city,project_code,site_address")
        .or(`name.ilike.${p},city.ilike.${p},project_code.ilike.${p},site_address.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      supabase
        .from("vendors")
        .select("id,company_name,vendor_code,city")
        .or(`company_name.ilike.${p},vendor_code.ilike.${p},city.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      supabase
        .from("products")
        .select("id,name,product_code")
        .or(`name.ilike.${p},product_code.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      supabase
        .from("enquiries")
        .select("id,enquiry_no,notes,architect_name,contractor_name")
        .or(`enquiry_no.ilike.${p},notes.ilike.${p},architect_name.ilike.${p},contractor_name.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      supabase
        .from("quotes")
        .select("id,quote_no,notes")
        .or(`quote_no.ilike.${p},notes.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      supabase
        .from("sales_orders")
        .select("id,so_no,notes")
        .or(`so_no.ilike.${p},notes.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      supabase
        .from("purchase_orders")
        .select("id,po_no,notes")
        .or(`po_no.ilike.${p},notes.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      supabase
        .from("inventory_items")
        .select("id,stock_code,location")
        .or(`stock_code.ilike.${p},location.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      supabase
        .from("invoices")
        .select("id,invoice_no,notes")
        .or(`invoice_no.ilike.${p},notes.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      supabase
        .from("payments")
        .select("id,payment_no,reference_no")
        .or(`payment_no.ilike.${p},reference_no.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      supabase
        .from("dispatches")
        .select("id,dispatch_no,tracking_no")
        .or(`dispatch_no.ilike.${p},tracking_no.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      supabase
        .from("profiles")
        .select("id,full_name,email,phone")
        .or(`full_name.ilike.${p},email.ilike.${p},phone.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      supabase
        .from("customers")
        .select("id,name,customer_code,customer_type,city")
        .in("customer_type", ["architect", "interior_designer", "contractor"])
        .or(`name.ilike.${p},customer_code.ilike.${p},city.ilike.${p}`)
        .limit(LIMIT),
    ),
  ]);

  type Row = Record<string, unknown> & { id: string };
  const val = (r: Row, k: string): string | null => {
    const v = r[k];
    return typeof v === "string" && v.length > 0 ? v : null;
  };
  const push = (
    rows: unknown,
    group: SearchGroupKey,
    groupLabel: string,
    hrefBase: string,
    labelKey: string,
    subKey: string,
    fallback: string,
  ): void => {
    for (const r of rows as Row[]) {
      hits.push({
        id: r.id,
        label: val(r, labelKey) ?? fallback,
        sublabel: val(r, subKey),
        href: `${hrefBase}/${r.id}`,
        group,
        groupLabel,
      });
    }
  };

  const hits: SearchHit[] = [];
  push(customers, "customers", "Customers", "/customers", "name", "customer_code", "Customer");
  push(projects, "projects", "Projects", "/projects", "name", "city", "Project");
  push(vendors, "vendors", "Vendors", "/vendors", "company_name", "vendor_code", "Vendor");
  push(products, "products", "Products", "/products", "name", "product_code", "Product");
  push(enquiries, "enquiries", "Enquiries", "/enquiries", "enquiry_no", "notes", "Enquiry");
  push(quotes, "quotes", "Quotations", "/quotes", "quote_no", "notes", "Quote");
  push(salesOrders, "salesOrders", "Sales Orders", "/sales-orders", "so_no", "notes", "SO");
  push(
    purchaseOrders,
    "purchaseOrders",
    "Purchase Orders",
    "/purchase-orders",
    "po_no",
    "notes",
    "PO",
  );
  push(inventory, "inventory", "Inventory", "/inventory", "stock_code", "location", "Item");
  push(invoices, "invoices", "Invoices", "/invoices", "invoice_no", "notes", "Invoice");
  push(payments, "payments", "Payments", "/payments", "payment_no", "reference_no", "Payment");
  push(dispatch, "dispatch", "Dispatch", "/dispatch", "dispatch_no", "tracking_no", "Dispatch");

  return hits;
}
