/**
 * Salesperson Profit & Performance Analytics Engine
 *
 * Tracks:
 * - Total money received / collected by whom (Rishi Rai, Raman Pupneja)
 * - Total business brought (Invoiced & Quoted)
 * - Total project costs & Realized Net Profit
 * - ₹50 Lakh Company Profit Target with distribution between Rishi and Raman
 * - Smart actionable coaching suggestions (target deals & sq.ft needed to reach profit goals)
 */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import { type ProjectCostingDiary } from "@/lib/projects/costing-diary";

export interface SalespersonScorecard {
  key: "rishi" | "raman" | "unassigned";
  name: string;
  avatarColor: string;
  dealsCount: number;
  invoicedRevenue: number;
  moneyCollected: number;
  totalCosts: number;
  netProfit: number;
  profitMarginPct: number;
  avgProfitPerDeal: number;
  avgDealSqft: number;
  targetProfit: number;
  targetProgressPct: number;
  targetGap: number;
  coachingSuggestion: string;
  activeCrmQuotesCount: number;
  pipelinePotentialProfit: number;
}

export interface CompanyProfitabilityOverview {
  companyTargetProfit: number;
  totalDeals: number;
  totalInvoiced: number;
  totalMoneyCollected: number;
  totalCosts: number;
  totalNetProfit: number;
  overallMarginPct: number;
  overallTargetProgressPct: number;
  overallTargetGap: number;
  salespeople: SalespersonScorecard[];
  projectBreakdowns: Array<{
    projectId: string;
    projectName: string;
    customerName: string;
    salesperson: "rishi" | "raman" | "unassigned";
    quotedValue: number;
    invoicedValue: number;
    moneyCollected: number;
    totalCosts: number;
    netProfit: number;
    marginPct: number;
    hasDamageLogged: boolean;
    hasWriteoffLogged: boolean;
  }>;
}

export const SALESPEOPLE_CONFIG = {
  rishi: {
    name: "Rishi Rai",
    avatarColor: "bg-teal-600 text-white",
    defaultTarget: 25_00_000, // ₹25 Lakhs
  },
  raman: {
    name: "Raman Pupneja",
    avatarColor: "bg-indigo-600 text-white",
    defaultTarget: 25_00_000, // ₹25 Lakhs
  },
  unassigned: {
    name: "Unassigned / General",
    avatarColor: "bg-slate-500 text-white",
    defaultTarget: 0,
  },
};

export async function getCompanyProfitabilityAndTargets(customTargets?: {
  rishi?: number;
  raman?: number;
}): Promise<CompanyProfitabilityOverview> {
  const db = getDb();

  const [projRes, quotesRes, invsRes, dispatchesRes] = await Promise.all([
    db
      .from("projects")
      .select(
        "id, name, project_code, area_sqft, workflow_state, external_ref, customer_id, customers(*)",
      )
      .eq("is_active", true)
      .limit(500),
    db.from("quotes").select("id, total, status, project_id, customer_id"),
    db.from("invoices").select("id, total, amount_paid, balance_due, project_id"),
    db.from("dispatches").select("id, project_id"),
  ]);

  if (projRes.error) throw new AppError(mapDbError(projRes.error));

  const projects = projRes.data || [];
  const quotes = quotesRes.data || [];
  const invoices = invsRes.data || [];

  // Group quotes & invoices by project
  const quotesByProj = new Map<string, Array<{ total: number; status: string }>>();
  for (const q of quotes) {
    if (q.project_id) {
      const list = quotesByProj.get(q.project_id) || [];
      list.push({ total: Number(q.total || 0), status: q.status });
      quotesByProj.set(q.project_id, list);
    }
  }

  const invsByProj = new Map<string, Array<{ total: number; amount_paid: number }>>();
  for (const i of invoices) {
    if (i.project_id) {
      const list = invsByProj.get(i.project_id) || [];
      list.push({ total: Number(i.total || 0), amount_paid: Number(i.amount_paid || 0) });
      invsByProj.set(i.project_id, list);
    }
  }

  const rishiTarget = customTargets?.rishi ?? SALESPEOPLE_CONFIG.rishi.defaultTarget;
  const ramanTarget = customTargets?.raman ?? SALESPEOPLE_CONFIG.raman.defaultTarget;
  const companyTargetProfit = rishiTarget + ramanTarget;

  // Initialize aggregators
  const scorecardMap: Record<
    "rishi" | "raman" | "unassigned",
    {
      dealsCount: number;
      invoicedRevenue: number;
      moneyCollected: number;
      totalCosts: number;
      netProfit: number;
      totalSqft: number;
      activeQuotesCount: number;
      potentialProfit: number;
    }
  > = {
    rishi: {
      dealsCount: 0,
      invoicedRevenue: 0,
      moneyCollected: 0,
      totalCosts: 0,
      netProfit: 0,
      totalSqft: 0,
      activeQuotesCount: 0,
      potentialProfit: 0,
    },
    raman: {
      dealsCount: 0,
      invoicedRevenue: 0,
      moneyCollected: 0,
      totalCosts: 0,
      netProfit: 0,
      totalSqft: 0,
      activeQuotesCount: 0,
      potentialProfit: 0,
    },
    unassigned: {
      dealsCount: 0,
      invoicedRevenue: 0,
      moneyCollected: 0,
      totalCosts: 0,
      netProfit: 0,
      totalSqft: 0,
      activeQuotesCount: 0,
      potentialProfit: 0,
    },
  };

  const projectBreakdowns: CompanyProfitabilityOverview["projectBreakdowns"] = [];

  for (const p of projects) {
    const cust = p.customers as {
      name?: string;
      workflow_state?: unknown;
      external_ref?: unknown;
    } | null;

    // Detect assigned salesperson
    const pWf = (p.workflow_state as Record<string, unknown> | null) || {};
    const cWf = (cust?.workflow_state as Record<string, unknown> | null) || {};
    const cExt = (cust?.external_ref as Record<string, unknown> | null) || {};

    const rawSp = String(
      pWf.assigned_to ||
        pWf.assigned_salesperson ||
        cWf.assigned_to ||
        cWf.assigned_salesperson ||
        cExt.assigned_salesperson ||
        "",
    ).toLowerCase();

    let spKey: "rishi" | "raman" | "unassigned" = "unassigned";
    if (rawSp.includes("rishi")) spKey = "rishi";
    else if (rawSp.includes("raman")) spKey = "raman";

    // Quotes for this project
    const pQuotes = quotesByProj.get(p.id) || [];
    const approvedQ = pQuotes.find((q) => q.status === "accepted" || q.status === "converted");
    const quotedValue = approvedQ ? approvedQ.total : pQuotes.length > 0 ? pQuotes[0].total : 0;

    // Check if there are active pipeline quotes
    const openQuotes = pQuotes.filter((q) => q.status === "sent" || q.status === "draft");
    if (openQuotes.length > 0) {
      scorecardMap[spKey].activeQuotesCount += openQuotes.length;
      scorecardMap[spKey].potentialProfit += openQuotes.reduce((acc, q) => acc + q.total * 0.3, 0);
    }

    // Invoices & Collections
    const pInvs = invsByProj.get(p.id) || [];
    const invoicedValue = pInvs.reduce((acc, i) => acc + i.total, 0);
    const moneyCollected = pInvs.reduce((acc, i) => acc + i.amount_paid, 0);

    // Costing Diary
    const diary = (pWf.costing_diary as ProjectCostingDiary) || {};
    const purchaseCost = Number(diary.purchase_cost || 0);
    const transportCost = Number(diary.transport_cost || 0);
    const localCartingCost = Number(diary.local_carting_cost || 0);
    const adhesiveCost = Number(diary.adhesive_cost || 0);
    const sealerCost = Number(diary.sealer_cost || 0);
    const labourCost = Number(diary.labour_cost || 0);
    const damageCost = Number(diary.damage_cost || 0);
    const writeoffDiscount = Number(diary.writeoff_discount || 0);
    const otherCost = Number(diary.other_cost || 0);

    const loggedCostSum = (diary.cost_logs || []).reduce((s, l) => s + Number(l.amount || 0), 0);
    const manualCostSum =
      purchaseCost +
      transportCost +
      localCartingCost +
      adhesiveCost +
      sealerCost +
      labourCost +
      damageCost +
      writeoffDiscount +
      otherCost;

    const totalCosts = Math.max(manualCostSum, loggedCostSum);

    // Effective revenue for profit: cash received if collected, otherwise invoiced/quoted
    const effectiveRevenue = moneyCollected > 0 ? moneyCollected : invoicedValue || quotedValue;
    const netProfit = effectiveRevenue > 0 ? effectiveRevenue - totalCosts : 0;
    const marginPct = effectiveRevenue > 0 ? (netProfit / effectiveRevenue) * 100 : 0;

    if (effectiveRevenue > 0 || totalCosts > 0) {
      scorecardMap[spKey].dealsCount += 1;
      scorecardMap[spKey].invoicedRevenue += invoicedValue;
      scorecardMap[spKey].moneyCollected += moneyCollected;
      scorecardMap[spKey].totalCosts += totalCosts;
      scorecardMap[spKey].netProfit += netProfit;
      scorecardMap[spKey].totalSqft += Number(p.area_sqft || 450);

      projectBreakdowns.push({
        projectId: p.id,
        projectName: p.name,
        customerName: cust?.name || "Customer",
        salesperson: spKey,
        quotedValue,
        invoicedValue,
        moneyCollected,
        totalCosts,
        netProfit,
        marginPct,
        hasDamageLogged: damageCost > 0,
        hasWriteoffLogged: writeoffDiscount > 0,
      });
    }
  }

  // Compile final scorecards
  const salespeople: SalespersonScorecard[] = (["rishi", "raman", "unassigned"] as const).map(
    (key) => {
      const data = scorecardMap[key];
      const target = key === "rishi" ? rishiTarget : key === "raman" ? ramanTarget : 0;

      const marginPct =
        data.moneyCollected > 0
          ? (data.netProfit / data.moneyCollected) * 100
          : data.invoicedRevenue > 0
            ? (data.netProfit / data.invoicedRevenue) * 100
            : 0;

      const avgProfitPerDeal = data.dealsCount > 0 ? data.netProfit / data.dealsCount : 50_000;
      const avgDealSqft = data.dealsCount > 0 ? Math.round(data.totalSqft / data.dealsCount) : 450;

      const targetGap = Math.max(0, target - data.netProfit);
      const targetProgressPct = target > 0 ? Math.min(100, (data.netProfit / target) * 100) : 0;

      // Generate Smart Coaching Suggestion
      let coachingSuggestion = "";
      if (key !== "unassigned") {
        if (targetGap === 0) {
          coachingSuggestion = `🎉 Congratulations! Target of ₹${(target / 100000).toFixed(1)} Lakhs achieved with ₹${Math.round(data.netProfit - target).toLocaleString("en-IN")} surplus profit! Keep up the momentum on high-margin natural stone orders.`;
        } else {
          const effectiveAvgProfit = Math.max(25_000, avgProfitPerDeal);
          const dealsNeeded = Math.ceil(targetGap / effectiveAvgProfit);
          const totalSqftNeeded = Math.round(dealsNeeded * avgDealSqft);
          const weeklyDeals = Math.max(1, Math.ceil(dealsNeeded / 4));
          const weeklySqft = Math.round(totalSqftNeeded / 4);

          coachingSuggestion = `💡 Based on your average profit of ₹${Math.round(effectiveAvgProfit).toLocaleString("en-IN")} per deal: To bridge the remaining ₹${Math.round(targetGap).toLocaleString("en-IN")} gap to your ₹${(target / 100000).toFixed(0)}L target, you need approximately ${dealsNeeded} more closed client deals (~${weeklyDeals} deals/week) amounting to ${totalSqftNeeded.toLocaleString("en-IN")} sq.ft (~${weeklySqft.toLocaleString("en-IN")} sq.ft/week). Focus on following up your ${data.activeQuotesCount} pending quotes.`;
        }
      }

      return {
        key,
        name: SALESPEOPLE_CONFIG[key].name,
        avatarColor: SALESPEOPLE_CONFIG[key].avatarColor,
        dealsCount: data.dealsCount,
        invoicedRevenue: data.invoicedRevenue,
        moneyCollected: data.moneyCollected,
        totalCosts: data.totalCosts,
        netProfit: data.netProfit,
        profitMarginPct: marginPct,
        avgProfitPerDeal,
        avgDealSqft,
        targetProfit: target,
        targetProgressPct,
        targetGap,
        coachingSuggestion,
        activeCrmQuotesCount: data.activeQuotesCount,
        pipelinePotentialProfit: data.potentialProfit,
      };
    },
  );

  const totalDeals = salespeople.reduce((s, sp) => s + sp.dealsCount, 0);
  const totalInvoiced = salespeople.reduce((s, sp) => s + sp.invoicedRevenue, 0);
  const totalMoneyCollected = salespeople.reduce((s, sp) => s + sp.moneyCollected, 0);
  const totalCosts = salespeople.reduce((s, sp) => s + sp.totalCosts, 0);
  const totalNetProfit = salespeople.reduce((s, sp) => s + sp.netProfit, 0);
  const overallMarginPct =
    totalMoneyCollected > 0
      ? (totalNetProfit / totalMoneyCollected) * 100
      : totalInvoiced > 0
        ? (totalNetProfit / totalInvoiced) * 100
        : 0;

  const overallTargetProgressPct =
    companyTargetProfit > 0 ? Math.min(100, (totalNetProfit / companyTargetProfit) * 100) : 0;
  const overallTargetGap = Math.max(0, companyTargetProfit - totalNetProfit);

  return {
    companyTargetProfit,
    totalDeals,
    totalInvoiced,
    totalMoneyCollected,
    totalCosts,
    totalNetProfit,
    overallMarginPct,
    overallTargetProgressPct,
    overallTargetGap,
    salespeople,
    projectBreakdowns,
  };
}
