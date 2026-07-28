/** Global search across all business modules. Runs queries in parallel and groups results. */
import { getDb } from "@/integrations/supabase/server-context";

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
  | "architects"
  // Goal 4 additions — closes the gap against the 12-entity target list
  // (customers/enquiries/projects/quotes/orders/RFQs/vendors/tasks/
  // follow-ups/notes/documents/activities): everything above already
  // covered 6 of 12; these five close the remaining gap (orders was
  // already covered as salesOrders).
  | "rfqs"
  | "tasks"
  | "followups"
  | "notes"
  | "documents"
  | "activities";

/**
 * `comments`/`file_objects`/`activity_log` are polymorphic — one row can
 * belong to a customer, project, enquiry, quote, sales order, purchase
 * order, invoice, vendor, or RFQ. This maps each `entity_type` value this
 * app actually writes (grep-confirmed against every `entity_type:` /
 * `entityType:` literal at a `comments`/`file_objects`/`activity_log`
 * insert call site) to the list route whose detail page can show it.
 * Unmapped/unknown values fall back to the Activity feed rather than a
 * broken link.
 */
const ENTITY_TYPE_ROUTE: Record<string, string> = {
  customer: "/customers",
  project: "/projects",
  enquiry: "/enquiries",
  quote: "/quotes",
  quotation: "/quotes",
  sales_order: "/sales-orders",
  purchase_order: "/purchase-orders",
  invoice: "/invoices",
  vendor: "/vendors",
  rfq: "/rfqs",
  followup: "/followups",
  task: "/tasks",
  profile: "/admin/users",
  user: "/admin/users",
};

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
    rfqs,
    tasks,
    followups,
    notes,
    documents,
    activities,
  ] = await Promise.all([
    safe(
      getDb()
        .from("customers")
        .select("id,name,customer_code,primary_phone,primary_email,city")
        .or(
          `name.ilike.${p},customer_code.ilike.${p},primary_phone.ilike.${p},primary_email.ilike.${p},city.ilike.${p}`,
        )
        .limit(LIMIT),
    ),
    safe(
      getDb()
        .from("customer_contacts")
        .select("id,name,phone,email,whatsapp,customer_id")
        .or(`name.ilike.${p},phone.ilike.${p},email.ilike.${p},whatsapp.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      getDb()
        .from("projects")
        .select("id,name,city,project_code,site_address")
        .or(`name.ilike.${p},city.ilike.${p},project_code.ilike.${p},site_address.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      getDb()
        .from("vendors")
        .select("id,company_name,vendor_code,city")
        .or(`company_name.ilike.${p},vendor_code.ilike.${p},city.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      getDb()
        .from("products")
        .select("id,name,product_code")
        .or(`name.ilike.${p},product_code.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      getDb()
        .from("enquiries")
        .select("id,enquiry_no,notes,architect_name,contractor_name")
        .or(
          `enquiry_no.ilike.${p},notes.ilike.${p},architect_name.ilike.${p},contractor_name.ilike.${p}`,
        )
        .limit(LIMIT),
    ),
    safe(
      getDb()
        .from("quotes")
        .select("id,quote_no,notes")
        .or(`quote_no.ilike.${p},notes.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      getDb()
        .from("sales_orders")
        .select("id,so_no,notes")
        .or(`so_no.ilike.${p},notes.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      getDb()
        .from("purchase_orders")
        .select("id,po_no,notes")
        .or(`po_no.ilike.${p},notes.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      getDb()
        .from("inventory_items")
        .select("id,stock_code,location")
        .or(`stock_code.ilike.${p},location.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      getDb()
        .from("invoices")
        .select("id,invoice_no,notes")
        .or(`invoice_no.ilike.${p},notes.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      getDb()
        .from("payments")
        .select("id,payment_no,reference_no")
        .or(`payment_no.ilike.${p},reference_no.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      getDb()
        .from("dispatches")
        .select("id,dispatch_no,tracking_no")
        .or(`dispatch_no.ilike.${p},tracking_no.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      getDb()
        .from("profiles")
        .select("id,full_name,email,phone")
        .or(`full_name.ilike.${p},email.ilike.${p},phone.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      getDb()
        .from("customers")
        .select("id,name,customer_code,customer_type,city")
        .in("customer_type", ["architect", "interior_designer", "contractor"])
        .or(`name.ilike.${p},customer_code.ilike.${p},city.ilike.${p}`)
        .limit(LIMIT),
    ),
    // ---- Goal 4 additions ----
    safe(
      getDb()
        .from("rfqs")
        .select("id,rfq_no,notes")
        .or(`rfq_no.ilike.${p},notes.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      getDb()
        .from("tasks")
        .select("id,title,description")
        .or(`title.ilike.${p},description.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      getDb()
        .from("followups")
        .select("id,notes,outcome_notes")
        .or(`notes.ilike.${p},outcome_notes.ilike.${p}`)
        .limit(LIMIT),
    ),
    safe(
      getDb()
        .from("comments")
        .select("id,body,entity_type,entity_id")
        .ilike("body", p)
        .limit(LIMIT),
    ),
    safe(
      getDb()
        .from("file_objects")
        .select("id,file_name,entity_type,entity_id,folder")
        .ilike("file_name", p)
        .limit(LIMIT),
    ),
    safe(
      getDb()
        .from("activity_log")
        .select("id,summary,entity_type,entity_id")
        .ilike("summary", p)
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
  push(customers, "customers", "Customers", "/customers", "name", "primary_phone", "Customer");
  push(projects, "projects", "Projects", "/projects", "name", "site_address", "Project");
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
  // Contacts route into their parent customer detail page.
  for (const r of contacts as Array<
    Record<string, unknown> & { id: string; customer_id?: string | null }
  >) {
    const cid = typeof r.customer_id === "string" ? r.customer_id : "";
    hits.push({
      id: r.id,
      label: val(r as Row, "name") ?? "Contact",
      sublabel: val(r as Row, "phone") ?? val(r as Row, "email"),
      href: cid ? `/customers/${cid}` : `/customers`,
      group: "contacts",
      groupLabel: "Contacts",
    });
  }
  // Salespeople are `profiles` rows, and there is no per-profile detail
  // route — nor is there a bare `/admin`; the only route under it is
  // `/admin/users`. `push` would have built `/admin/<profile id>`, so
  // every salesperson result in global search was a link to a 404. They
  // all point at Users & Roles instead, which is the page that can
  // actually show them.
  for (const r of salespeople as Row[]) {
    hits.push({
      id: r.id,
      label: val(r, "full_name") ?? "User",
      sublabel: val(r, "email"),
      href: "/admin/users",
      group: "salespeople",
      groupLabel: "Salespeople",
    });
  }
  push(
    architects,
    "architects",
    "Architects / Designers / Contractors",
    "/customers",
    "name",
    "city",
    "Partner",
  );

  // ---- Goal 4 additions ----
  push(rfqs, "rfqs", "RFQs", "/rfqs", "rfq_no", "notes", "RFQ");
  // No /tasks/$id detail route exists — every hit routes to the list page,
  // same accepted pattern as "salespeople" above (a real destination,
  // just not a per-record one).
  push(tasks, "tasks", "Tasks", "/tasks", "title", "description", "Task");
  push(followups, "followups", "Follow-ups", "/followups", "notes", "outcome_notes", "Follow-up");

  // Notes/documents/activities are polymorphic (comments/file_objects/
  // activity_log all key off entity_type+entity_id rather than owning a
  // route of their own) — route to whichever parent record's page the
  // ENTITY_TYPE_ROUTE map knows, falling back to the Activity feed for an
  // entity_type this map doesn't recognize rather than a broken link.
  for (const r of notes as Array<
    Record<string, unknown> & { id: string; entity_type?: string; entity_id?: string }
  >) {
    const base = (r.entity_type && ENTITY_TYPE_ROUTE[r.entity_type]) || "/activity";
    hits.push({
      id: r.id,
      label: val(r as Row, "body") ?? "Note",
      sublabel: r.entity_type ?? null,
      href: r.entity_id && base !== "/activity" ? `${base}/${r.entity_id}` : base,
      group: "notes",
      groupLabel: "Notes",
    });
  }
  for (const r of documents as Array<
    Record<string, unknown> & { id: string; entity_type?: string; entity_id?: string }
  >) {
    const base = (r.entity_type && ENTITY_TYPE_ROUTE[r.entity_type]) || "/activity";
    hits.push({
      id: r.id,
      label: val(r as Row, "file_name") ?? "Document",
      sublabel: val(r as Row, "folder"),
      href: r.entity_id && base !== "/activity" ? `${base}/${r.entity_id}` : base,
      group: "documents",
      groupLabel: "Documents",
    });
  }
  for (const r of activities as Array<
    Record<string, unknown> & { id: number | string; entity_type?: string; entity_id?: string }
  >) {
    const base = (r.entity_type && ENTITY_TYPE_ROUTE[r.entity_type]) || "/activity";
    hits.push({
      // activity_log.id is bigserial (number) — SearchHit.id is string
      // everywhere else, so coerce rather than widen the shared type for
      // one entity.
      id: String(r.id),
      label: val(r as Row, "summary") ?? "Activity",
      sublabel: r.entity_type ?? null,
      href: r.entity_id && base !== "/activity" ? `${base}/${r.entity_id}` : base,
      group: "activities",
      groupLabel: "Activities",
    });
  }

  return hits;
}
