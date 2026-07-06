/**
 * Report generation helpers. Each function returns { headers, rows } ready to
 * pipe into `toCsv` for download. Queries hit user-scoped RLS via the
 * browser client so we automatically inherit permissions.
 */
import { supabase } from "@/integrations/supabase/client";
import { toCsv, downloadCsv } from "@/lib/csv/parse";

export type Report = { headers: string[]; rows: Record<string, unknown>[] };

async function sel<T>(sql: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await sql;
  if (error) throw error;
  return (data ?? ([] as unknown as T));
}

export const REPORTS = {
  async sales(): Promise<Report> {
    const rows = await sel<Array<Record<string, unknown>>>(
      supabase.from("invoices").select("invoice_no, issue_date, total, amount_paid, balance_due, status, customer:customer_id(name)").order("issue_date", { ascending: false }).limit(2000) as never,
    );
    return {
      headers: ["invoice_no", "issue_date", "customer", "total", "amount_paid", "balance_due", "status"],
      rows: rows.map((r) => ({ ...r, customer: (r.customer as { name?: string } | null)?.name ?? "" })),
    };
  },
  async purchases(): Promise<Report> {
    const rows = await sel<Array<Record<string, unknown>>>(
      supabase.from("purchase_orders").select("po_no, order_date, status, vendor:vendor_id(company_name)").order("order_date", { ascending: false }).limit(2000) as never,
    );
    return {
      headers: ["po_no", "order_date", "vendor", "status"],
      rows: rows.map((r) => ({ ...r, vendor: (r.vendor as { company_name?: string } | null)?.company_name ?? "" })),
    };
  },
  async vendorPerformance(): Promise<Report> {
    const rows = await sel<Array<Record<string, unknown>>>(
      supabase.from("vendor_performance_cache").select("*, vendor:vendor_id(company_name, vendor_code)").order("score", { ascending: false }).limit(1000) as never,
    );
    return {
      headers: ["vendor_code", "vendor", "score", "is_preferred", "approval_pct", "avg_response_hours", "avg_dispatch_days", "orders_count", "last_order_at"],
      rows: rows.map((r) => {
        const v = r.vendor as { company_name?: string; vendor_code?: string } | null;
        return { ...r, vendor: v?.company_name ?? "", vendor_code: v?.vendor_code ?? "" };
      }),
    };
  },
  async production(): Promise<Report> {
    const rows = await sel<Array<Record<string, unknown>>>(
      supabase.from("production_orders").select("mfg_no, status, planned_start, planned_end, quantity, unit, product:product_id(name), project:project_id(name)").order("created_at", { ascending: false }).limit(2000) as never,
    );
    return {
      headers: ["mfg_no", "product", "project", "quantity", "unit", "status", "planned_start", "planned_end"],
      rows: rows.map((r) => ({
        ...r,
        product: (r.product as { name?: string } | null)?.name ?? "",
        project: (r.project as { name?: string } | null)?.name ?? "",
      })),
    };
  },
  async inventory(): Promise<Report> {
    const rows = await sel<Array<Record<string, unknown>>>(
      supabase.from("inventory_items").select("*").order("created_at", { ascending: false }).limit(5000) as never,
    );
    const headers = rows.length ? Object.keys(rows[0]).filter((k) => !k.endsWith("_json")) : ["id"];
    return { headers, rows };
  },
  async followups(): Promise<Report> {
    const rows = await sel<Array<Record<string, unknown>>>(
      supabase.from("followups").select("id, scheduled_at, status, project:project_id(name)").eq("status", "pending").order("scheduled_at").limit(2000) as never,
    );
    return {
      headers: ["scheduled_at", "project", "status"],
      rows: rows.map((r) => ({ ...r, project: (r.project as { name?: string } | null)?.name ?? "" })),
    };
  },
  async outstanding(): Promise<Report> {
    const rows = await sel<Array<Record<string, unknown>>>(
      supabase.from("invoices").select("invoice_no, issue_date, due_date, total, balance_due, status, customer:customer_id(name)").gt("balance_due", 0).order("due_date").limit(2000) as never,
    );
    return {
      headers: ["invoice_no", "customer", "issue_date", "due_date", "total", "balance_due", "status"],
      rows: rows.map((r) => ({ ...r, customer: (r.customer as { name?: string } | null)?.name ?? "" })),
    };
  },
  async projectProfitability(): Promise<Report> {
    const rows = await sel<Array<Record<string, unknown>>>(
      supabase.from("projects").select("project_code, name, stage, expected_value_inr, customer:customer_id(name)").order("created_at", { ascending: false }).limit(2000) as never,
    );
    return {
      headers: ["project_code", "name", "customer", "stage", "expected_value_inr"],
      rows: rows.map((r) => ({ ...r, customer: (r.customer as { name?: string } | null)?.name ?? "" })),
    };
  },
} as const;

export type ReportKey = keyof typeof REPORTS;

export async function downloadReport(key: ReportKey) {
  const { headers, rows } = await REPORTS[key]();
  downloadCsv(`${key}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows));
}
