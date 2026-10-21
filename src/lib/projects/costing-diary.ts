/**
 * Project Costing Diary & Realized Profit Sheet Data Layer
 *
 * Captures real-world project costs (stone purchase price, transport, local carting,
 * adhesive bags, chemical sealers, labour, transit damage replacements, delivery delay write-offs)
 * and calculates Initial Projected vs Realized Net Profit.
 */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";

export interface ProjectCostItemLog {
  id: string;
  date: string;
  category:
    | "purchase"
    | "transport"
    | "carting"
    | "adhesive"
    | "sealer"
    | "labour"
    | "damage"
    | "writeoff"
    | "other";
  title: string;
  amount: number;
  notes?: string;
}

export interface ProjectCostingDiary {
  purchase_cost?: number | null; // Raw stone / slab procurement from supplier
  transport_cost?: number | null; // Main transport / interstate freight to yard
  local_carting_cost?: number | null; // Local tempo / carting trips to site
  adhesive_cost?: number | null; // Adhesive bags cost
  adhesive_bags?: number | null; // Number of bags used
  sealer_cost?: number | null; // Chemical sealers / impregnators cost
  sealer_litres?: number | null; // Litres / cans used
  labour_cost?: number | null; // Installation / application labour
  damage_cost?: number | null; // Damaged slabs & replacement delivery cost
  writeoff_discount?: number | null; // Delayed delivery discounts / deductions / write-offs
  other_cost?: number | null; // Misc / unloading / crane / site storage
  notes?: string | null; // Project diary remarks
  cost_logs?: ProjectCostItemLog[]; // Detailed timeline events (split deliveries, damaged lots, extra tempos)
  updated_at?: string;
  updated_by?: string;
}

export interface ProjectFinancialRollup {
  projectId: string;
  projectName: string;
  projectCode: string;
  customerId: string;
  customerName: string;
  salesperson: "rishi" | "raman" | "unassigned";
  // Revenue
  quotedValue: number;
  invoicedValue: number;
  moneyCollected: number;
  balanceDue: number;
  // Costs Breakdown
  costing: ProjectCostingDiary;
  totalDirectCosts: number;
  totalDamageAndLosses: number;
  totalCosts: number;
  // Profitability
  projectedProfit: number;
  realizedProfit: number;
  realizedMarginPct: number;
  profitLeakage: number; // Discrepancy due to damage, extra carting, or write-offs
  // Document counts
  dispatchCount: number;
  invoiceCount: number;
  hasDamageLogged: boolean;
  hasWriteoffLogged: boolean;
}

/** Get existing costing diary from project workflow_state */
export async function getProjectCostingDiary(projectId: string): Promise<ProjectCostingDiary> {
  const db = getDb();
  const { data, error } = await db
    .from("projects")
    .select("workflow_state")
    .eq("id", projectId)
    .maybeSingle();

  if (error) throw new AppError(mapDbError(error));

  const wf = (data?.workflow_state as Record<string, unknown> | null) || {};
  return (wf.costing_diary as ProjectCostingDiary) || {};
}

/** Save updated costing diary into project workflow_state */
export async function saveProjectCostingDiary(
  projectId: string,
  diary: ProjectCostingDiary,
  userEmailOrName?: string,
): Promise<ProjectCostingDiary> {
  const db = getDb();
  const { data: existing, error: fetchErr } = await db
    .from("projects")
    .select("workflow_state")
    .eq("id", projectId)
    .single();

  if (fetchErr) throw new AppError(mapDbError(fetchErr));

  const wf = (existing.workflow_state as Record<string, unknown> | null) || {};
  const updatedDiary: ProjectCostingDiary = {
    ...diary,
    updated_at: new Date().toISOString(),
    updated_by: userEmailOrName || "staff",
  };

  const updatedWf = {
    ...wf,
    costing_diary: updatedDiary,
  };

  const { error: updateErr } = await db
    .from("projects")
    .update({ workflow_state: updatedWf } as never)
    .eq("id", projectId);

  if (updateErr) throw new AppError(mapDbError(updateErr));

  return updatedDiary;
}

/**
 * Calculates complete financial and profit rollup for a single project,
 * integrating Quotes, Invoices, Receipts, Dispatches, and the Costing Diary.
 */
export async function getProjectFinancialRollup(
  projectId: string,
): Promise<ProjectFinancialRollup | null> {
  const db = getDb();

  const [projRes, quotesRes, invsRes, dispatchesRes] = await Promise.all([
    db
      .from("projects")
      .select(
        "id, name, project_code, customer_id, workflow_state, external_ref, customers:customers!projects_customer_id_fkey(*)",
      )
      .eq("id", projectId)
      .maybeSingle(),
    db
      .from("quotes")
      .select("id, total, status")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    db
      .from("invoices")
      .select("id, total, amount_paid, balance_due, status")
      .eq("project_id", projectId),
    db.from("dispatches").select("id, status").eq("project_id", projectId),
  ]);

  if (projRes.error) throw new AppError(mapDbError(projRes.error));
  if (!projRes.data) return null;

  const proj = projRes.data;
  const cust = proj.customers as {
    name?: string;
    workflow_state?: unknown;
    external_ref?: unknown;
  } | null;

  // Determine salesperson
  let salesperson: "rishi" | "raman" | "unassigned" = "unassigned";
  const projWf = (proj.workflow_state as Record<string, unknown> | null) || {};
  const custWf = (cust?.workflow_state as Record<string, unknown> | null) || {};
  const custExt = (cust?.external_ref as Record<string, unknown> | null) || {};

  const rawSp = String(
    projWf.assigned_to ||
      projWf.assigned_salesperson ||
      custWf.assigned_to ||
      custWf.assigned_salesperson ||
      custExt.assigned_salesperson ||
      "",
  ).toLowerCase();

  if (rawSp.includes("rishi")) salesperson = "rishi";
  else if (rawSp.includes("raman")) salesperson = "raman";

  // Quoted Revenue
  const quotes = quotesRes.data || [];
  const approvedQuote = quotes.find((q) => q.status === "accepted" || q.status === "converted");
  const quotedValue = approvedQuote
    ? Number(approvedQuote.total || 0)
    : quotes.length > 0
      ? Number(quotes[0].total || 0)
      : 0;

  // Invoices & Cash Collected
  const invoices = invsRes.data || [];
  const invoicedValue = invoices.reduce((s, i) => s + Number(i.total || 0), 0);
  const moneyCollected = invoices.reduce((s, i) => s + Number(i.amount_paid || 0), 0);
  const balanceDue = invoices.reduce((s, i) => s + Number(i.balance_due || 0), 0);

  // Costing Diary
  const costing = (projWf.costing_diary as ProjectCostingDiary) || {};
  const purchaseCost = Number(costing.purchase_cost || 0);
  const transportCost = Number(costing.transport_cost || 0);
  const localCartingCost = Number(costing.local_carting_cost || 0);
  const adhesiveCost = Number(costing.adhesive_cost || 0);
  const sealerCost = Number(costing.sealer_cost || 0);
  const labourCost = Number(costing.labour_cost || 0);
  const damageCost = Number(costing.damage_cost || 0);
  const writeoffDiscount = Number(costing.writeoff_discount || 0);
  const otherCost = Number(costing.other_cost || 0);

  // Additional logs sum
  const loggedCosts = (costing.cost_logs || []).reduce((s, l) => s + Number(l.amount || 0), 0);

  const totalDirectCosts =
    purchaseCost +
    transportCost +
    localCartingCost +
    adhesiveCost +
    sealerCost +
    labourCost +
    otherCost;
  const totalDamageAndLosses = damageCost + writeoffDiscount;
  const totalCosts = Math.max(totalDirectCosts + totalDamageAndLosses, loggedCosts);

  // Effective revenue for profit calculation: money collected takes priority if payments received, otherwise invoiced
  const effectiveRevenue = moneyCollected > 0 ? moneyCollected : invoicedValue || quotedValue;
  const projectedProfit = quotedValue > 0 ? quotedValue - totalDirectCosts : 0;
  const realizedProfit = effectiveRevenue - totalCosts;
  const realizedMarginPct = effectiveRevenue > 0 ? (realizedProfit / effectiveRevenue) * 100 : 0;
  const profitLeakage = totalDamageAndLosses;

  return {
    projectId,
    projectName: proj.name,
    projectCode: proj.project_code,
    customerId: proj.customer_id,
    customerName: cust?.name || "Customer",
    salesperson,
    quotedValue,
    invoicedValue,
    moneyCollected,
    balanceDue,
    costing,
    totalDirectCosts,
    totalDamageAndLosses,
    totalCosts,
    projectedProfit,
    realizedProfit,
    realizedMarginPct,
    profitLeakage,
    dispatchCount: (dispatchesRes.data || []).length,
    invoiceCount: invoices.length,
    hasDamageLogged: damageCost > 0,
    hasWriteoffLogged: writeoffDiscount > 0,
  };
}
