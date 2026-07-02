/** Read helpers that back the Master Hub tabs. No writes here. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";

export type CustomerContactRow = DbTable<"customer_contacts">;
export type VendorContactRow = DbTable<"vendor_contacts">;
export type PaymentRow = DbTable<"payments">;
export type InvoiceRow = DbTable<"invoices">;
export type QuoteRow = DbTable<"quotes">;
export type SalesOrderRow = DbTable<"sales_orders">;
export type PurchaseOrderRow = DbTable<"purchase_orders">;
export type DispatchRow = DbTable<"dispatches">;
export type InventoryRow = DbTable<"inventory_items">;
export type EnquiryRow = DbTable<"enquiries">;
export type ProjectRow = DbTable<"projects">;
export type ProductImageRow = DbTable<"product_images">;

async function run<T>(
  promise: PromiseLike<{ data: T | null; error: { message: string } | null }>,
): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new AppError(mapDbError(error));
  return data ?? ([] as unknown as T);
}

// ---------- Customer hub ----------
export const hub = {
  customerProjects: (customerId: string) =>
    run<ProjectRow[]>(
      supabase
        .from("projects")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false }),
    ),
  customerEnquiries: (customerId: string) =>
    run<EnquiryRow[]>(
      supabase
        .from("enquiries")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false }),
    ),
  customerQuotes: (customerId: string) =>
    run<QuoteRow[]>(
      supabase
        .from("quotes")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false }),
    ),
  customerSalesOrders: (customerId: string) =>
    run<SalesOrderRow[]>(
      supabase
        .from("sales_orders")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false }),
    ),
  customerInvoices: (customerId: string) =>
    run<InvoiceRow[]>(
      supabase
        .from("invoices")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false }),
    ),
  customerPayments: async (
    customerId: string,
  ): Promise<
    Array<PaymentRow & { invoice: { invoice_no: string; customer_id: string } | null }>
  > => {
    const { data, error } = await supabase
      .from("payments")
      .select("*, invoice:invoices!inner(invoice_no,customer_id)")
      .eq("invoice.customer_id", customerId)
      .order("paid_at", { ascending: false });
    if (error) throw new AppError(mapDbError(error));
    return (data ?? []) as Array<
      PaymentRow & { invoice: { invoice_no: string; customer_id: string } | null }
    >;
  },
  customerContacts: (customerId: string) =>
    run<CustomerContactRow[]>(
      supabase
        .from("customer_contacts")
        .select("*")
        .eq("customer_id", customerId)
        .order("is_primary", { ascending: false }),
    ),
  customerStats: async (customerId: string) => {
    const counts = await Promise.all([
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", customerId),
      supabase
        .from("enquiries")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", customerId),
      supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", customerId),
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", customerId),
    ]);
    return {
      projects: counts[0].count ?? 0,
      enquiries: counts[1].count ?? 0,
      quotes: counts[2].count ?? 0,
      invoices: counts[3].count ?? 0,
    };
  },

  // ---------- Project hub ----------
  projectEnquiries: (projectId: string) =>
    run<EnquiryRow[]>(
      supabase
        .from("enquiries")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
    ),
  projectQuotes: (projectId: string) =>
    run<QuoteRow[]>(
      supabase
        .from("quotes")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
    ),
  projectSalesOrders: (projectId: string) =>
    run<SalesOrderRow[]>(
      supabase
        .from("sales_orders")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
    ),
  projectPurchaseOrders: (projectId: string) =>
    run<PurchaseOrderRow[]>(
      supabase
        .from("purchase_orders")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
    ),
  projectInvoices: (projectId: string) =>
    run<InvoiceRow[]>(
      supabase
        .from("invoices")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
    ),
  projectPayments: async (projectId: string) => {
    const { data, error } = await supabase
      .from("payments")
      .select("*, invoice:invoices!inner(invoice_no,project_id)")
      .eq("invoice.project_id", projectId)
      .order("paid_at", { ascending: false });
    if (error) throw new AppError(mapDbError(error));
    return (data ?? []) as Array<
      PaymentRow & { invoice: { invoice_no: string; project_id: string | null } | null }
    >;
  },
  projectDispatches: async (projectId: string) => {
    const { data, error } = await supabase
      .from("dispatches")
      .select("*, sales_order:sales_orders!inner(so_no,project_id)")
      .eq("sales_order.project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw new AppError(mapDbError(error));
    return (data ?? []) as Array<
      DispatchRow & { sales_order: { so_no: string; project_id: string | null } | null }
    >;
  },

  // ---------- Vendor hub ----------
  vendorPurchaseOrders: (vendorId: string) =>
    run<PurchaseOrderRow[]>(
      supabase
        .from("purchase_orders")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false }),
    ),
  vendorProducts: async (vendorId: string) => {
    const { data, error } = await supabase
      .from("vendor_products")
      .select("*, product:products(id,name,product_code,stone_type,default_unit)")
      .eq("vendor_id", vendorId);
    if (error) throw new AppError(mapDbError(error));
    return (data ?? []) as Array<
      DbTable<"vendor_products"> & {
        product: {
          id: string;
          name: string;
          product_code: string;
          stone_type: string;
          default_unit: string;
        } | null;
      }
    >;
  },
  vendorContacts: (vendorId: string) =>
    run<VendorContactRow[]>(
      supabase
        .from("vendor_contacts")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("is_primary", { ascending: false }),
    ),

  // ---------- Product hub ----------
  productInventory: (productId: string) =>
    run<InventoryRow[]>(
      supabase
        .from("inventory_items")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false }),
    ),
  productImages: (productId: string) =>
    run<ProductImageRow[]>(
      supabase
        .from("product_images")
        .select("*")
        .eq("product_id", productId)
        .order("sort_order", { ascending: true }),
    ),
  productQuoteItems: async (productId: string) => {
    const { data, error } = await supabase
      .from("quote_items")
      .select("*, quote:quotes(id,quote_no,customer_id,status,created_at)")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    if (error) throw new AppError(mapDbError(error));
    return (data ?? []) as Array<
      DbTable<"quote_items"> & {
        quote: {
          id: string;
          quote_no: string;
          customer_id: string;
          status: string;
          created_at: string;
        } | null;
      }
    >;
  },
  productInvoiceItems: async (productId: string) => {
    const { data, error } = await supabase
      .from("invoice_items")
      .select("*, invoice:invoices(id,invoice_no,customer_id,status,created_at)")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    if (error) throw new AppError(mapDbError(error));
    return (data ?? []) as Array<
      DbTable<"invoice_items"> & {
        invoice: {
          id: string;
          invoice_no: string;
          customer_id: string;
          status: string;
          created_at: string;
        } | null;
      }
    >;
  },
  productProjectsUsedIn: async (productId: string) => {
    const { data, error } = await supabase
      .from("enquiry_items")
      .select("enquiry:enquiries(project:projects(id,name,project_code,city))")
      .eq("product_id", productId);
    if (error) throw new AppError(mapDbError(error));
    const rows = (data ?? []) as Array<{
      enquiry: {
        project: { id: string; name: string; project_code: string; city: string | null } | null;
      } | null;
    }>;
    const map = new Map<
      string,
      { id: string; name: string; project_code: string; city: string | null }
    >();
    for (const r of rows) {
      const p = r.enquiry?.project;
      if (p) map.set(p.id, p);
    }
    return Array.from(map.values());
  },
};
