/** AI Business Brief — daily / weekly / monthly narrative generated from
 *  live KPIs. All numbers are pulled from the DB before the call so the model
 *  never invents figures. Runs as a server function; auth-gated. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireStaff } from "@/lib/ai/require-staff";

const input = z.object({
  scope: z.enum(["daily", "weekly", "monthly"]).default("daily"),
});

interface Snapshot {
  scope: string;
  window_from: string;
  window_to: string;
  invoices: { count: number; total: number; outstanding: number };
  payments: { count: number; total: number };
  vendor_payments: { count: number; total: number };
  procurement_open: number;
  procurement_delayed: number;
  installations_active: number;
  installations_delayed: number;
  production_delayed: number;
  top_customers: Array<{ name: string; revenue: number }>;
  overdue_receivables: number;
  overdue_payables: number;
}

async function buildSnapshot(scope: "daily" | "weekly" | "monthly"): Promise<Snapshot> {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const now = new Date();
  const days = scope === "daily" ? 1 : scope === "weekly" ? 7 : 30;
  const from = new Date(now.getTime() - days * 86_400_000);
  const fromIso = from.toISOString();
  const fromDate = fromIso.slice(0, 10);
  const toDate = now.toISOString().slice(0, 10);

  const [inv, pay, vp, proc, install, delayedProd, cledger, vledger, custRev] = await Promise.all([
    supabase.from("invoices").select("total,balance_due").gte("issue_date", fromDate),
    supabase.from("payments").select("amount").gte("paid_at", fromIso),
    supabase.from("vendor_payments").select("amount").gte("paid_at", fromIso),
    supabase
      .from("procurement_kpis" as never)
      .select("*")
      .maybeSingle(),
    supabase
      .from("installation_dashboard_kpis" as never)
      .select("*")
      .maybeSingle(),
    supabase
      .from("production_orders")
      .select("id", { count: "exact", head: true })
      .lt("planned_end_at", now.toISOString())
      .neq("status", "completed"),
    supabase.from("customer_ledger").select("debit,credit"),
    supabase.from("vendor_ledger").select("debit,credit"),
    supabase
      .from("invoices")
      .select("total,customers(name)")
      .gte("issue_date", fromDate)
      .limit(500),
  ]);

  const invRows = (inv.data ?? []) as Array<{ total: number; balance_due: number }>;
  const cRows = (cledger.data ?? []) as Array<{ debit: number | null; credit: number | null }>;
  const vRows = (vledger.data ?? []) as Array<{ debit: number | null; credit: number | null }>;
  const cRev = new Map<string, number>();
  for (const r of (custRev.data ?? []) as Array<{
    total: number;
    customers?: { name?: string } | null;
  }>) {
    const name = r.customers?.name ?? "Unknown";
    cRev.set(name, (cRev.get(name) ?? 0) + Number(r.total ?? 0));
  }
  return {
    scope,
    window_from: fromDate,
    window_to: toDate,
    invoices: {
      count: invRows.length,
      total: invRows.reduce((s, r) => s + Number(r.total ?? 0), 0),
      outstanding: invRows.reduce((s, r) => s + Number(r.balance_due ?? 0), 0),
    },
    payments: {
      count: (pay.data ?? []).length,
      total: (pay.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0),
    },
    vendor_payments: {
      count: (vp.data ?? []).length,
      total: (vp.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0),
    },
    procurement_open: Number(
      (proc.data as { purchase_orders_pending?: number } | null)?.purchase_orders_pending ?? 0,
    ),
    procurement_delayed: Number(
      (proc.data as { purchase_orders_delayed?: number } | null)?.purchase_orders_delayed ?? 0,
    ),
    installations_active: Number(
      (install.data as { active_installations?: number } | null)?.active_installations ?? 0,
    ),
    installations_delayed: Number(
      (install.data as { delayed_sites?: number } | null)?.delayed_sites ?? 0,
    ),
    production_delayed: delayedProd.count ?? 0,
    top_customers: Array.from(cRev.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, revenue]) => ({ name, revenue })),
    overdue_receivables: Math.max(
      0,
      cRows.reduce((s, r) => s + Number(r.debit ?? 0) - Number(r.credit ?? 0), 0),
    ),
    overdue_payables: Math.max(
      0,
      vRows.reduce((s, r) => s + Number(r.debit ?? 0) - Number(r.credit ?? 0), 0),
    ),
  };
}

export const generateBusinessBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context);
    const snapshot = await buildSnapshot(data.scope);

    const { chat } = await import("@/lib/ai/gateway.server");
    const scopeLabel = {
      daily: "Daily Business Brief",
      weekly: "Weekly Management Report",
      monthly: "Monthly Performance Report",
    }[data.scope];
    const messages = [
      {
        role: "system" as const,
        content: [
          "You are the executive analyst for Stone Tech OS (natural-stone ERP, India).",
          "Write a concise business brief for the owner. Use the JSON snapshot as the ONLY source of truth.",
          "Never invent numbers or entities absent from the snapshot; if data is missing say so.",
          "Structure: 1) Business Snapshot, 2) What's Working, 3) Sales Opportunities, 4) Risks (high-risk projects, delayed procurement, installation delays, slow-paying customers, vendor risks, cash flow bottlenecks, material shortages), 5) Recommended Actions.",
          "Every recommendation MUST include WHY (a data-backed reason).",
          "Format money as ₹ with Indian comma grouping. Prefer bullet points. Keep it under 500 words.",
        ].join(" "),
      },
      {
        role: "user" as const,
        content: `${scopeLabel} for ${snapshot.window_from} → ${snapshot.window_to}.\n\nSnapshot JSON:\n${JSON.stringify(snapshot, null, 2)}`,
      },
    ];
    const brief = await chat(messages, { temperature: 0.3 });
    return { brief, snapshot };
  });
