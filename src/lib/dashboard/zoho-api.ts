/**
 * Zoho Books Dashboard API & Calculation Layer
 *
 * Provides real-time financial metrics matching Zoho Books:
 * - Total Receivables & Aging Breakdown
 * - Total Payables & Aging Breakdown
 * - Monthly Cash Flow (Area chart + Opening/Incoming/Outgoing/Closing cash)
 * - Sales & Expense (Bar chart + Accrual vs Cash mode)
 * - Top Expenses by Category
 * - Project Summary
 */
import { getDb } from "@/integrations/supabase/server-context";

export type PeriodFilter =
  | "this_fiscal_year"
  | "previous_fiscal_year"
  | "this_quarter"
  | "this_month"
  | "today";

export type AgingBucket = {
  label: string;
  amount: number;
  count: number;
};

export type ReceivablesPayablesSummary = {
  total: number;
  current: number;
  overdue: number;
  aging: AgingBucket[];
};

export type CashFlowMonth = {
  month: string;
  inflow: number;
  outflow: number;
  netCash: number;
  balance: number;
};

export type CashFlowSummary = {
  startDate: string;
  endDate: string;
  openingCash: number;
  incoming: number;
  outgoing: number;
  closingCash: number;
  monthlyData: CashFlowMonth[];
};

export type SalesExpenseMonth = {
  month: string;
  sales: number;
  expenses: number;
};

export type SalesExpenseSummary = {
  totalSales: number;
  totalExpenses: number;
  monthlyData: SalesExpenseMonth[];
};

export type ExpenseCategoryItem = {
  category: string;
  amount: number;
  percentage: number;
  color: string;
};

export type ProjectSummaryData = {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalBudget: number;
  totalInvoiced: number;
};

/**
 * Returns [startDate, endDate] for the given PeriodFilter.
 * Default fiscal year starts on April 1.
 */
export function getPeriodDateRange(period: PeriodFilter = "this_fiscal_year"): {
  start: Date;
  end: Date;
  startIso: string;
  endIso: string;
} {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Jan, 3 = Apr

  let start: Date;
  let end: Date;

  if (period === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (period === "this_month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (period === "this_quarter") {
    const q = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), (q + 1) * 3, 0, 23, 59, 59, 999);
  } else if (period === "previous_fiscal_year") {
    const fyStartYear = currentMonth >= 3 ? currentYear - 1 : currentYear - 2;
    start = new Date(fyStartYear, 3, 1, 0, 0, 0, 0);
    end = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999);
  } else {
    // this_fiscal_year
    const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
    start = new Date(fyStartYear, 3, 1, 0, 0, 0, 0);
    end = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999);
  }

  return {
    start,
    end,
    startIso: start.toISOString().slice(0, 10),
    endIso: end.toISOString().slice(0, 10),
  };
}

/** Formats number in Indian Lakhs/Crores shorthand for chart Y-axes. */
export function formatIndianCompact(val: number): string {
  if (!val || val === 0) return "0";
  const abs = Math.abs(val);
  if (abs >= 10_000_000) {
    const cr = val / 10_000_000;
    return `${Number(cr.toFixed(2))}Cr`;
  }
  if (abs >= 100_000) {
    const l = val / 100_000;
    return `${Number(l.toFixed(2))}L`;
  }
  if (abs >= 1_000) {
    const k = val / 1_000;
    return `${Number(k.toFixed(1))}k`;
  }
  return val.toLocaleString("en-IN");
}

/** Format currency in Indian standard ₹ */
export function formatInrFull(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val)) return "₹0.00";
  return (
    "₹" +
    val.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Total Receivables:
 * Pulled from `invoices` with balance_due > 0.
 */
export async function getReceivablesSummary(
  period: PeriodFilter = "this_fiscal_year",
): Promise<ReceivablesPayablesSummary> {
  const { startIso, endIso } = getPeriodDateRange(period);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await getDb()
    .from("invoices")
    .select("id, balance_due, due_date, issue_date, status")
    .not("status", "in", '("cancelled","draft")')
    .gt("balance_due", 0)
    .gte("issue_date", startIso)
    .lte("issue_date", endIso);

  if (error) {
    console.error("Error fetching receivables:", error);
    return { total: 0, current: 0, overdue: 0, aging: [] };
  }

  let total = 0;
  let current = 0;
  let overdue = 0;

  const buckets = {
    "1-15": { amount: 0, count: 0 },
    "16-30": { amount: 0, count: 0 },
    "31-45": { amount: 0, count: 0 },
    ">45": { amount: 0, count: 0 },
  };

  for (const inv of (data ?? []) as Array<{ balance_due: number; due_date: string | null }>) {
    const bal = Number(inv.balance_due ?? 0);
    total += bal;

    if (!inv.due_date) {
      current += bal;
      continue;
    }

    const dueDate = new Date(inv.due_date);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate >= today) {
      current += bal;
    } else {
      overdue += bal;
      const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 15) {
        buckets["1-15"].amount += bal;
        buckets["1-15"].count += 1;
      } else if (diffDays <= 30) {
        buckets["16-30"].amount += bal;
        buckets["16-30"].count += 1;
      } else if (diffDays <= 45) {
        buckets["31-45"].amount += bal;
        buckets["31-45"].count += 1;
      } else {
        buckets[">45"].amount += bal;
        buckets[">45"].count += 1;
      }
    }
  }

  const aging: AgingBucket[] = [
    { label: "1 - 15 Days", amount: buckets["1-15"].amount, count: buckets["1-15"].count },
    { label: "16 - 30 Days", amount: buckets["16-30"].amount, count: buckets["16-30"].count },
    { label: "31 - 45 Days", amount: buckets["31-45"].amount, count: buckets["31-45"].count },
    { label: "> 45 Days", amount: buckets[">45"].amount, count: buckets[">45"].count },
  ];

  return { total, current, overdue, aging };
}

/**
 * Total Payables:
 * Pulled from `purchase_invoices`.
 */
export async function getPayablesSummary(
  period: PeriodFilter = "this_fiscal_year",
): Promise<ReceivablesPayablesSummary> {
  const { startIso, endIso } = getPeriodDateRange(period);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await getDb()
    .from("purchase_invoices" as never)
    .select("id, total_amount, due_date, invoice_date, status" as never)
    .not("status" as never, "in" as never, '("paid","cancelled")' as never)
    .gte("invoice_date" as never, startIso as never)
    .lte("invoice_date" as never, endIso as never);

  if (error) {
    console.error("Error fetching payables:", error);
    return { total: 0, current: 0, overdue: 0, aging: [] };
  }

  let total = 0;
  let current = 0;
  let overdue = 0;

  const buckets = {
    "1-15": { amount: 0, count: 0 },
    "16-30": { amount: 0, count: 0 },
    "31-45": { amount: 0, count: 0 },
    ">45": { amount: 0, count: 0 },
  };

  for (const pinv of (data ?? []) as unknown as Array<{
    total_amount: number;
    due_date: string | null;
  }>) {
    const amt = Number(pinv.total_amount ?? 0);
    total += amt;

    if (!pinv.due_date) {
      current += amt;
      continue;
    }

    const dueDate = new Date(pinv.due_date);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate >= today) {
      current += amt;
    } else {
      overdue += amt;
      const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 15) {
        buckets["1-15"].amount += amt;
        buckets["1-15"].count += 1;
      } else if (diffDays <= 30) {
        buckets["16-30"].amount += amt;
        buckets["16-30"].count += 1;
      } else if (diffDays <= 45) {
        buckets["31-45"].amount += amt;
        buckets["31-45"].count += 1;
      } else {
        buckets[">45"].amount += amt;
        buckets[">45"].count += 1;
      }
    }
  }

  const aging: AgingBucket[] = [
    { label: "1 - 15 Days", amount: buckets["1-15"].amount, count: buckets["1-15"].count },
    { label: "16 - 30 Days", amount: buckets["16-30"].amount, count: buckets["16-30"].count },
    { label: "31 - 45 Days", amount: buckets["31-45"].amount, count: buckets["31-45"].count },
    { label: "> 45 Days", amount: buckets[">45"].amount, count: buckets[">45"].count },
  ];

  return { total, current, overdue, aging };
}

/**
 * Cash Flow (Area Chart & Bottom Reconciliation)
 * - 12-month array (Apr ... Mar)
 * - Opening cash + Incoming - Outgoing = Closing cash
 */
export async function getCashFlowData(
  period: PeriodFilter = "this_fiscal_year",
): Promise<CashFlowSummary> {
  const { start, end, startIso, endIso } = getPeriodDateRange(period);

  const [receiptsRes, vpayRes, expRes] = await Promise.all([
    getDb()
      .from("receipts")
      .select("amount, received_at")
      .eq("status", "active")
      .gte("received_at", startIso)
      .lte("received_at", endIso),
    getDb()
      .from("vendor_payments")
      .select("amount, paid_at")
      .gte("paid_at", startIso)
      .lte("paid_at", endIso),
    getDb()
      .from("business_expenses" as never)
      .select("amount, expense_date" as never)
      .gte("expense_date" as never, startIso as never)
      .lte("expense_date" as never, endIso as never),
  ]);

  const monthNames = [
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
    "Jan",
    "Feb",
    "Mar",
  ];
  const startMonthYear = start.getFullYear();

  // Create monthly slots
  const monthsMap: Record<string, { inflow: number; outflow: number }> = {};
  for (let i = 0; i < 12; i++) {
    const y = i >= 9 ? (startMonthYear + 1) % 100 : startMonthYear % 100;
    const label = `${monthNames[i]} ${y}`;
    monthsMap[label] = { inflow: 0, outflow: 0 };
  }

  const parseMonthKey = (dateStr: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const m = d.getMonth();
    const y = d.getFullYear() % 100;
    const monthOrderIdx = (m + 9) % 12; // Apr=0, May=1...
    return `${monthNames[monthOrderIdx]} ${y}`;
  };

  let totalIncoming = 0;
  let totalOutgoing = 0;

  for (const r of (receiptsRes.data ?? []) as Array<{ amount: number; received_at: string }>) {
    const amt = Number(r.amount ?? 0);
    totalIncoming += amt;
    const key = parseMonthKey(r.received_at);
    if (key && monthsMap[key]) monthsMap[key].inflow += amt;
  }

  for (const vp of (vpayRes.data ?? []) as Array<{ amount: number; paid_at: string }>) {
    const amt = Number(vp.amount ?? 0);
    totalOutgoing += amt;
    const key = parseMonthKey(vp.paid_at);
    if (key && monthsMap[key]) monthsMap[key].outflow += amt;
  }

  for (const exp of (expRes.data ?? []) as unknown as Array<{
    amount: number;
    expense_date: string;
  }>) {
    const amt = Number(exp.amount ?? 0);
    totalOutgoing += amt;
    const key = parseMonthKey(exp.expense_date);
    if (key && monthsMap[key]) monthsMap[key].outflow += amt;
  }

  const openingCash = 0;
  let runningBalance = openingCash;

  const monthlyData: CashFlowMonth[] = Object.entries(monthsMap).map(([month, data]) => {
    const netCash = data.inflow - data.outflow;
    runningBalance += netCash;
    return {
      month,
      inflow: data.inflow,
      outflow: data.outflow,
      netCash,
      balance: runningBalance,
    };
  });

  const closingCash = openingCash + totalIncoming - totalOutgoing;

  return {
    startDate: start.toLocaleDateString("en-GB"),
    endDate: end.toLocaleDateString("en-GB"),
    openingCash,
    incoming: totalIncoming,
    outgoing: totalOutgoing,
    closingCash,
    monthlyData,
  };
}

/**
 * Sales & Expense (Bar Chart with Accrual vs Cash toggle)
 */
export async function getSalesAndExpenseData(
  period: PeriodFilter = "this_fiscal_year",
  mode: "accrual" | "cash" = "accrual",
): Promise<SalesExpenseSummary> {
  const { start, startIso, endIso } = getPeriodDateRange(period);
  const monthNames = [
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
    "Jan",
    "Feb",
    "Mar",
  ];
  const startMonthYear = start.getFullYear();

  const monthsMap: Record<string, { sales: number; expenses: number }> = {};
  for (let i = 0; i < 12; i++) {
    const y = i >= 9 ? (startMonthYear + 1) % 100 : startMonthYear % 100;
    const label = `${monthNames[i]} ${y}`;
    monthsMap[label] = { sales: 0, expenses: 0 };
  }

  const parseMonthKey = (dateStr: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const m = d.getMonth();
    const y = d.getFullYear() % 100;
    const monthOrderIdx = (m + 9) % 12; // Apr=0...
    return `${monthNames[monthOrderIdx]} ${y}`;
  };

  let totalSales = 0;
  let totalExpenses = 0;

  if (mode === "accrual") {
    const [invRes, pinvRes, expRes] = await Promise.all([
      getDb()
        .from("invoices")
        .select("subtotal, total, issue_date")
        .not("status", "in", '("cancelled","draft")')
        .gte("issue_date", startIso)
        .lte("issue_date", endIso),
      getDb()
        .from("purchase_invoices" as never)
        .select("subtotal, total_amount, invoice_date" as never)
        .not("status" as never, "in" as never, '("cancelled")' as never)
        .gte("invoice_date" as never, startIso as never)
        .lte("invoice_date" as never, endIso as never),
      getDb()
        .from("business_expenses" as never)
        .select("amount, expense_date" as never)
        .gte("expense_date" as never, startIso as never)
        .lte("expense_date" as never, endIso as never),
    ]);

    for (const inv of (invRes.data ?? []) as Array<{
      subtotal: number;
      total: number;
      issue_date: string;
    }>) {
      const amt = Number(inv.subtotal || inv.total || 0);
      totalSales += amt;
      const key = parseMonthKey(inv.issue_date);
      if (key && monthsMap[key]) monthsMap[key].sales += amt;
    }

    for (const pinv of (pinvRes.data ?? []) as unknown as Array<{
      subtotal: number;
      total_amount: number;
      invoice_date: string;
    }>) {
      const amt = Number(pinv.subtotal || pinv.total_amount || 0);
      totalExpenses += amt;
      const key = parseMonthKey(pinv.invoice_date);
      if (key && monthsMap[key]) monthsMap[key].expenses += amt;
    }

    for (const exp of (expRes.data ?? []) as unknown as Array<{
      amount: number;
      expense_date: string;
    }>) {
      const amt = Number(exp.amount || 0);
      totalExpenses += amt;
      const key = parseMonthKey(exp.expense_date);
      if (key && monthsMap[key]) monthsMap[key].expenses += amt;
    }
  } else {
    const [recRes, vpayRes, expRes] = await Promise.all([
      getDb()
        .from("receipts")
        .select("amount, received_at")
        .eq("status", "active")
        .gte("received_at", startIso)
        .lte("received_at", endIso),
      getDb()
        .from("vendor_payments")
        .select("amount, paid_at")
        .gte("paid_at", startIso)
        .lte("paid_at", endIso),
      getDb()
        .from("business_expenses" as never)
        .select("amount, expense_date" as never)
        .gte("expense_date" as never, startIso as never)
        .lte("expense_date" as never, endIso as never),
    ]);

    for (const r of (recRes.data ?? []) as Array<{ amount: number; received_at: string }>) {
      const amt = Number(r.amount || 0);
      totalSales += amt;
      const key = parseMonthKey(r.received_at);
      if (key && monthsMap[key]) monthsMap[key].sales += amt;
    }

    for (const vp of (vpayRes.data ?? []) as Array<{ amount: number; paid_at: string }>) {
      const amt = Number(vp.amount || 0);
      totalExpenses += amt;
      const key = parseMonthKey(vp.paid_at);
      if (key && monthsMap[key]) monthsMap[key].expenses += amt;
    }

    for (const exp of (expRes.data ?? []) as unknown as Array<{
      amount: number;
      expense_date: string;
    }>) {
      const amt = Number(exp.amount || 0);
      totalExpenses += amt;
      const key = parseMonthKey(exp.expense_date);
      if (key && monthsMap[key]) monthsMap[key].expenses += amt;
    }
  }

  const monthlyData: SalesExpenseMonth[] = Object.entries(monthsMap).map(([month, val]) => ({
    month,
    sales: val.sales,
    expenses: val.expenses,
  }));

  return { totalSales, totalExpenses, monthlyData };
}

/**
 * Top Expenses Breakdown by Category
 */
export async function getTopExpensesData(
  period: PeriodFilter = "this_fiscal_year",
): Promise<ExpenseCategoryItem[]> {
  const { startIso, endIso } = getPeriodDateRange(period);

  const [expRes, pinvRes] = await Promise.all([
    getDb()
      .from("business_expenses" as never)
      .select("amount, description" as never)
      .gte("expense_date" as never, startIso as never)
      .lte("expense_date" as never, endIso as never),
    getDb()
      .from("purchase_invoices" as never)
      .select("total_amount" as never)
      .not("status" as never, "in" as never, '("cancelled")' as never)
      .gte("invoice_date" as never, startIso as never)
      .lte("invoice_date" as never, endIso as never),
  ]);

  const categories: Record<string, number> = {
    "Raw Stone & Slabs": 0,
    "Transportation & Local Carting": 0,
    "Site Works & Installation": 0,
    "Tools, Blades & Machinery": 0,
    "Office & Administration": 0,
  };

  for (const pinv of (pinvRes.data ?? []) as unknown as Array<{ total_amount: number }>) {
    categories["Raw Stone & Slabs"] += Number(pinv.total_amount || 0);
  }

  for (const exp of (expRes.data ?? []) as unknown as Array<{
    amount: number;
    description: string;
  }>) {
    const desc = (exp.description || "").toLowerCase();
    const amt = Number(exp.amount || 0);

    if (
      desc.includes("carting") ||
      desc.includes("transport") ||
      desc.includes("freight") ||
      desc.includes("truck")
    ) {
      categories["Transportation & Local Carting"] += amt;
    } else if (
      desc.includes("install") ||
      desc.includes("labour") ||
      desc.includes("labor") ||
      desc.includes("site")
    ) {
      categories["Site Works & Installation"] += amt;
    } else if (
      desc.includes("blade") ||
      desc.includes("tool") ||
      desc.includes("machine") ||
      desc.includes("repair")
    ) {
      categories["Tools, Blades & Machinery"] += amt;
    } else {
      categories["Office & Administration"] += amt;
    }
  }

  const total = Object.values(categories).reduce((acc, v) => acc + v, 0);

  const palette = [
    "#3b82f6", // blue
    "#f97316", // orange
    "#10b981", // emerald
    "#8b5cf6", // purple
    "#ec4899", // pink
  ];

  return Object.entries(categories)
    .filter(([_, amt]) => amt > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount], idx) => ({
      category,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      color: palette[idx % palette.length],
    }));
}

/**
 * Project Summary
 */
export async function getProjectSummaryData(): Promise<ProjectSummaryData> {
  const { data, error } = await getDb()
    .from("projects")
    .select("id, stage, expected_value_inr, is_active");

  if (error || !data) {
    return {
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      totalBudget: 0,
      totalInvoiced: 0,
    };
  }

  let active = 0;
  let completed = 0;
  let budget = 0;

  for (const p of data) {
    if (p.is_active) {
      active += 1;
    } else {
      completed += 1;
    }
    budget += Number(p.expected_value_inr || 0);
  }

  return {
    totalProjects: data.length,
    activeProjects: active,
    completedProjects: completed,
    totalBudget: budget,
    totalInvoiced: 0,
  };
}
