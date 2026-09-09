import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  type PeriodFilter,
  getReceivablesSummary,
  getPayablesSummary,
  getCashFlowData,
  getSalesAndExpenseData,
  getTopExpensesData,
  getProjectSummaryData,
} from "@/lib/dashboard/zoho-api";
import { ReceivablesPayablesCards } from "./ReceivablesPayablesCards";
import { CashFlowCard } from "./CashFlowCard";
import { SalesAndExpenseCard } from "./SalesAndExpenseCard";
import { TopExpensesCard } from "./TopExpensesCard";
import { ProjectSummaryCard } from "./ProjectSummaryCard";
import { AccountWatchlistCard } from "./AccountWatchlistCard";

export function ZohoDashboardView() {
  const [period, setPeriod] = useState<PeriodFilter>("this_fiscal_year");
  const [salesExpenseMode, setSalesExpenseMode] = useState<"accrual" | "cash">("accrual");

  const receivablesQ = useQuery({
    queryKey: ["zoho-dashboard", "receivables", period],
    queryFn: () => getReceivablesSummary(period),
  });

  const payablesQ = useQuery({
    queryKey: ["zoho-dashboard", "payables", period],
    queryFn: () => getPayablesSummary(period),
  });

  const cashFlowQ = useQuery({
    queryKey: ["zoho-dashboard", "cash-flow", period],
    queryFn: () => getCashFlowData(period),
  });

  const salesExpenseQ = useQuery({
    queryKey: ["zoho-dashboard", "sales-expense", period, salesExpenseMode],
    queryFn: () => getSalesAndExpenseData(period, salesExpenseMode),
  });

  const topExpensesQ = useQuery({
    queryKey: ["zoho-dashboard", "top-expenses", period],
    queryFn: () => getTopExpensesData(period),
  });

  const projectSummaryQ = useQuery({
    queryKey: ["zoho-dashboard", "project-summary"],
    queryFn: getProjectSummaryData,
  });

  return (
    <div className="space-y-6">
      {/* Row 1: Total Receivables & Total Payables */}
      <ReceivablesPayablesCards
        receivables={receivablesQ.data}
        payables={payablesQ.data}
        period={period}
        onPeriodChange={setPeriod}
        isLoading={receivablesQ.isLoading || payablesQ.isLoading}
      />

      {/* Row 2: Cash Flow & Sales and Expense Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CashFlowCard
          summary={cashFlowQ.data}
          period={period}
          onPeriodChange={setPeriod}
          isLoading={cashFlowQ.isLoading}
        />

        <SalesAndExpenseCard
          summary={salesExpenseQ.data}
          period={period}
          onPeriodChange={setPeriod}
          mode={salesExpenseMode}
          onModeChange={setSalesExpenseMode}
          isLoading={salesExpenseQ.isLoading}
        />
      </div>

      {/* Row 3: Project Summary & Top Expenses */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProjectSummaryCard summary={projectSummaryQ.data} isLoading={projectSummaryQ.isLoading} />

        <TopExpensesCard
          expenses={topExpensesQ.data ?? []}
          period={period}
          onPeriodChange={setPeriod}
          isLoading={topExpensesQ.isLoading}
        />
      </div>

      {/* Row 4: Bank & Cash Accounts Watchlist */}
      <div>
        <AccountWatchlistCard incomingToday={receivablesQ.data?.current ?? 0} />
      </div>
    </div>
  );
}
