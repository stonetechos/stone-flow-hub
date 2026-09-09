import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { PieChart, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type PeriodFilter,
  type SalesExpenseSummary,
  formatIndianCompact,
  formatInrFull,
} from "@/lib/dashboard/zoho-api";
import { cn } from "@/lib/utils";

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  this_fiscal_year: "This Fiscal Year",
  previous_fiscal_year: "Previous Fiscal Year",
  this_quarter: "This Quarter",
  this_month: "This Month",
  today: "Today",
};

export function SalesAndExpenseCard({
  summary,
  period,
  onPeriodChange,
  mode,
  onModeChange,
  isLoading,
}: {
  summary?: SalesExpenseSummary;
  period: PeriodFilter;
  onPeriodChange: (p: PeriodFilter) => void;
  mode: "accrual" | "cash";
  onModeChange: (m: "accrual" | "cash") => void;
  isLoading?: boolean;
}) {
  const monthlyData = summary?.monthlyData ?? [];
  const totalSales = summary?.totalSales ?? 0;
  const totalExpenses = summary?.totalExpenses ?? 0;

  return (
    <Card className="border border-border/80 shadow-xs bg-card flex flex-col justify-between">
      <CardHeader className="p-6 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <span className="p-1 rounded-full border border-border bg-muted text-foreground inline-flex">
              <PieChart className="h-3.5 w-3.5" />
            </span>
            <span>Sales & Expense</span>
          </CardTitle>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                <span>{PERIOD_LABELS[period]}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 text-xs">
              {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map((pKey) => (
                <DropdownMenuItem
                  key={pKey}
                  onClick={() => onPeriodChange(pKey)}
                  className={cn(period === pKey && "font-semibold text-primary")}
                >
                  {PERIOD_LABELS[pKey]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Accrual vs Cash Toggle */}
        <div className="pt-2">
          <div className="inline-flex rounded-md border border-border bg-muted/50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => onModeChange("accrual")}
              className={cn(
                "rounded px-3 py-1 font-medium transition-all",
                mode === "accrual"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Accrual
            </button>
            <button
              type="button"
              onClick={() => onModeChange("cash")}
              className={cn(
                "rounded px-3 py-1 font-medium transition-all",
                mode === "cash"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Cash
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-2 space-y-4">
        {/* Bar Chart */}
        <div className="h-60 w-full pt-1">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              Loading Sales & Expense data…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                  opacity={0.6}
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))", opacity: 0.8 }}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatIndianCompact}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  formatter={(val: number, name: string) => [
                    formatInrFull(val),
                    name === "sales" ? "Sales / Income" : "Expenses",
                  ]}
                  labelStyle={{ fontWeight: "bold", fontSize: "12px" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="sales"
                  name="Sales"
                  fill="#2563eb"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={16}
                />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="#f43f5e"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bottom Income & Expenses Summary Boxes */}
        <div className="grid grid-cols-2 gap-4 border-t border-border/60 pt-4 text-center">
          <div className="rounded-md bg-muted/40 p-3">
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Income</div>
            <div className="mt-1 text-base sm:text-lg font-bold text-foreground tabular-nums">
              {formatInrFull(totalSales)}
            </div>
          </div>

          <div className="rounded-md bg-muted/40 p-3">
            <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              Total Expenses
            </div>
            <div className="mt-1 text-base sm:text-lg font-bold text-foreground tabular-nums">
              {formatInrFull(totalExpenses)}
            </div>
          </div>
        </div>

        {/* Footnote */}
        <p className="text-[11px] text-muted-foreground italic text-center">
          Income and expense values displayed are exclusive of taxes
        </p>
      </CardContent>
    </Card>
  );
}
