/**
 * Executive KPIs — aggregates across every existing table/view.
 * Purely additive: no schema changes; reuses existing views
 * (procurement_kpis, installation_dashboard_kpis, customer_payment_dashboard,
 *  customer_ledger, vendor_ledger).
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { TERMINAL_STAGES } from "@/lib/constants";

export interface ExecutiveKpis {
  // Pipeline
  salesPipelineInr: number;
  estimatesPending: number;
  quotesPending: number;
  ordersConfirmed: number;
  activeProjects: number;
  // Ops status
  productionInProgress: number;
  productionDelayed: number;
  procurementOpen: number;
  procurementDelayed: number;
  installationActive: number;
  installationDelayed: number;
  dispatchPending: number;
  // Financial position
  customerOutstandingInr: number;
  vendorOutstandingInr: number;
  monthlySalesInr: number;
  monthlyPurchasesInr: number;
  monthlyCollectionsInr: number;
  monthlyProfitInr: number;
  // Cash
  cashAvailableInr: number;
  expectedCashInflowInr: number;
  expectedCashOutflowInr: number;
  netCashPositionInr: number;
}

const sum = <K extends string>(rows: Array<Record<K, number | null>> | null, k: K): number =>
  (rows ?? []).reduce((a, r) => a + Number(r[k] ?? 0), 0);

export async function getExecutiveKpis(): Promise<ExecutiveKpis> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const soon = new Date(now.getTime() + 30 * 86_400_000).toISOString();
  const nowIso = now.toISOString();

  const [
    quotesPipeline,
    estPending,
    quotesPending,
    ordersConfirmed,
    projActive,
    prodInProg,
    prodDelayed,
    procKpiRow,
    installKpiRow,
    dispatchPending,
    customerLedger,
    vendorLedger,
    monthlySales,
    monthlyPurchases,
    monthlyCollections,
    inflow30,
    outflow30,
  ] = await Promise.all([
    supabase.from("quotes").select("total").in("status", ["draft", "sent"]),
    supabase.from("estimates").select("id", { count: "exact", head: true })
      .in("status", ["draft", "sent"]),
    supabase.from("quotes").select("id", { count: "exact", head: true }).in("status", ["draft", "sent"]),
    supabase.from("sales_orders").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
    supabase.from("projects").select("id", { count: "exact", head: true })
      .not("lifecycle_status", "in", "(archived,deleted)")
      .not("status", "in", `(${TERMINAL_STAGES.map((s) => `"${s}"`).join(",")})`),
    supabase.from("production_orders").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("production_orders").select("id", { count: "exact", head: true })
      .lt("planned_end_at", nowIso).neq("status", "completed"),
    supabase.from("procurement_kpis" as never).select("*").maybeSingle(),
    supabase.from("installation_dashboard_kpis" as never).select("*").maybeSingle(),
    supabase.from("dispatches").select("id", { count: "exact", head: true }).eq("status", "planned"),
    supabase.from("customer_ledger").select("debit,credit"),
    supabase.from("vendor_ledger").select("debit,credit"),
    supabase.from("invoices").select("total").gte("issue_date", monthStart.slice(0, 10)),
    supabase.from("vendor_payments").select("amount").gte("paid_at", monthStart),
    supabase.from("payments").select("amount").gte("paid_at", monthStart),
    supabase.from("customer_payment_dashboard" as never).select("balance_due, due_date").lte("due_date", soon.slice(0, 10)),
    supabase.from("purchase_orders").select("id,expected_date").lte("expected_date", soon.slice(0, 10)).not("status", "in", '("cancelled")'),
  ]);

  for (const r of [quotesPipeline, estPending, quotesPending, ordersConfirmed, projActive, prodInProg, prodDelayed, procKpiRow, installKpiRow, dispatchPending, customerLedger, vendorLedger, monthlySales, monthlyPurchases, monthlyCollections, inflow30, outflow30]) {
    if (r.error) throw new AppError(mapDbError(r.error));
  }

  const custDebit = sum(customerLedger.data as Array<{ debit: number | null }>, "debit");
  const custCredit = sum(customerLedger.data as Array<{ credit: number | null }>, "credit");
  const vendDebit = sum(vendorLedger.data as Array<{ debit: number | null }>, "debit");
  const vendCredit = sum(vendorLedger.data as Array<{ credit: number | null }>, "credit");

  const proc = (procKpiRow.data ?? {}) as Record<string, number | string | null>;
  const install = (installKpiRow.data ?? {}) as Record<string, number | string | null>;

  const monthlySalesInr = sum(monthlySales.data as Array<{ total: number }>, "total");
  const monthlyPurchasesInr = sum(monthlyPurchases.data as Array<{ amount: number }>, "amount");
  const monthlyCollectionsInr = sum(monthlyCollections.data as Array<{ amount: number }>, "amount");
  const monthlyProfitInr = monthlySalesInr - monthlyPurchasesInr;

  const cashAvailableInr = custCredit - custDebit; // net collected minus what's owed to vendors
  const expectedCashInflowInr = sum(inflow30.data as Array<{ balance_due: number }>, "balance_due");
  // Purchase order value is unavailable at PO level, approximate from open vendor ledger debit
  const expectedCashOutflowInr = Math.max(0, vendDebit - vendCredit);

  return {
    salesPipelineInr: sum(quotesPipeline.data as Array<{ total: number }>, "total"),
    estimatesPending: estPending.count ?? 0,
    quotesPending: quotesPending.count ?? 0,
    ordersConfirmed: ordersConfirmed.count ?? 0,
    activeProjects: projActive.count ?? 0,
    productionInProgress: prodInProg.count ?? 0,
    productionDelayed: prodDelayed.count ?? 0,
    procurementOpen: Number(proc.purchase_orders_pending ?? 0),
    procurementDelayed: Number(proc.purchase_orders_delayed ?? 0),
    installationActive: Number(install.active_installations ?? 0),
    installationDelayed: Number(install.delayed_sites ?? 0),
    dispatchPending: dispatchPending.count ?? 0,
    customerOutstandingInr: Math.max(0, custDebit - custCredit),
    vendorOutstandingInr: Math.max(0, vendDebit - vendCredit),
    monthlySalesInr,
    monthlyPurchasesInr,
    monthlyCollectionsInr,
    monthlyProfitInr,
    cashAvailableInr,
    expectedCashInflowInr,
    expectedCashOutflowInr,
    netCashPositionInr: cashAvailableInr + expectedCashInflowInr - expectedCashOutflowInr,
  };
}
