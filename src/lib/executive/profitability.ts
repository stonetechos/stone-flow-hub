/** Project profitability rollup — reuses estimates, invoices, vendor_payments,
 *  installation_materials and installation_signoffs. Additive only. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export interface ProjectProfitability {
  project_id: string;
  project_name: string;
  customer_name: string | null;
  estimate_value: number;
  quoted_value: number;
  actual_sales: number;
  material_cost: number;
  procurement_cost: number;
  installation_cost: number;
  labour_cost: number;
  transport_cost: number;
  gross_profit: number;
  net_profit: number;
  profit_pct: number;
}

export async function getProjectProfitability(): Promise<ProjectProfitability[]> {
  const [projRes, estRes, quoteRes, invRes, vpRes, poRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,customer_id,customers(name)")
      .eq("is_active", true)
      .limit(500),
    supabase
      .from("estimates")
      .select(
        "id,total,material_cost,manufacturing_cost,installation_cost,freight_cost,other_cost,enquiries(project_id)",
      ),
    supabase.from("quotes").select("total,project_id"),
    supabase.from("invoices").select("total,project_id"),
    supabase.from("vendor_payments").select("amount,grns(project_id)"),
    supabase.from("purchase_orders").select("id,project_id,status"),
  ]);
  for (const r of [projRes, estRes, quoteRes, invRes, vpRes, poRes])
    if (r.error) throw new AppError(mapDbError(r.error));

  type Est = {
    id: string;
    total: number;
    material_cost: number;
    manufacturing_cost: number;
    installation_cost: number;
    freight_cost: number;
    other_cost: number;
    enquiries?: { project_id?: string | null } | null;
  };
  const estByProject = new Map<string, Est>();
  for (const e of (estRes.data ?? []) as Est[]) {
    const pid = e.enquiries?.project_id;
    if (pid && !estByProject.has(pid)) estByProject.set(pid, e);
  }
  const sumBy = <T extends { project_id?: string | null }>(rows: T[], val: (r: T) => number) => {
    const m = new Map<string, number>();
    for (const r of rows)
      if (r.project_id) m.set(r.project_id, (m.get(r.project_id) ?? 0) + val(r));
    return m;
  };
  const quoteTotal = sumBy(
    (quoteRes.data ?? []) as Array<{ project_id: string; total: number }>,
    (r) => Number(r.total ?? 0),
  );
  const invTotal = sumBy((invRes.data ?? []) as Array<{ project_id: string; total: number }>, (r) =>
    Number(r.total ?? 0),
  );
  const vpTotal = new Map<string, number>();
  for (const r of (vpRes.data ?? []) as Array<{
    amount: number;
    grns?: { project_id?: string | null } | null;
  }>) {
    const pid = r.grns?.project_id;
    if (pid) vpTotal.set(pid, (vpTotal.get(pid) ?? 0) + Number(r.amount ?? 0));
  }

  const rows: ProjectProfitability[] = [];
  for (const p of (projRes.data ?? []) as Array<{
    id: string;
    name: string;
    customers?: { name?: string } | null;
  }>) {
    const est = estByProject.get(p.id);
    const material = Number(est?.material_cost ?? 0);
    const procurement = vpTotal.get(p.id) ?? 0;
    const install = Number(est?.installation_cost ?? 0);
    const labour = Number(est?.manufacturing_cost ?? 0);
    const transport = Number(est?.freight_cost ?? 0);
    const sales = invTotal.get(p.id) ?? 0;
    const gross = sales - material - procurement;
    const net =
      sales - material - procurement - install - labour - transport - Number(est?.other_cost ?? 0);
    rows.push({
      project_id: p.id,
      project_name: p.name,
      customer_name: p.customers?.name ?? null,
      estimate_value: Number(est?.total ?? 0),
      quoted_value: quoteTotal.get(p.id) ?? 0,
      actual_sales: sales,
      material_cost: material,
      procurement_cost: procurement,
      installation_cost: install,
      labour_cost: labour,
      transport_cost: transport,
      gross_profit: gross,
      net_profit: net,
      profit_pct: sales > 0 ? (net / sales) * 100 : 0,
    });
  }
  return rows.sort((a, b) => b.actual_sales - a.actual_sales);
}
