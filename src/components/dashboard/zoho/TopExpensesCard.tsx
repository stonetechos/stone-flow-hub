import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { CircleDot, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type PeriodFilter,
  type ExpenseCategoryItem,
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

const BLUE_PALETTE = ["#1D4ED8", "#2563EB", "#3B82F6", "#60A5FA", "#93C5FD", "#0284C7"];

export function TopExpensesCard({
  expenses,
  period,
  onPeriodChange,
  isLoading,
}: {
  expenses: ExpenseCategoryItem[];
  period: PeriodFilter;
  onPeriodChange: (p: PeriodFilter) => void;
  isLoading?: boolean;
}) {
  const hasExpenses = expenses.length > 0;
  const total = expenses.reduce((acc, e) => acc + e.amount, 0);

  // Remap colors to blue harmonic palette
  const themedExpenses = expenses.map((item, idx) => ({
    ...item,
    color: BLUE_PALETTE[idx % BLUE_PALETTE.length],
  }));

  return (
    <Card className="flex flex-col justify-between rounded-2xl border border-blue-100/80 bg-white/95 shadow-[0_4px_20px_rgba(30,58,138,0.04)] backdrop-blur-xs transition-all duration-300 hover:border-blue-200 hover:shadow-[0_8px_30px_rgba(30,58,138,0.08)]">
      <CardHeader className="p-6 pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2.5 text-sm font-bold text-slate-900">
            <span className="inline-flex rounded-xl border border-blue-100 bg-blue-50 p-2 text-blue-600 shadow-xs">
              <CircleDot className="h-4 w-4" />
            </span>
            <span>Expense Distribution</span>
          </CardTitle>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50/50 px-2.5 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100/70"
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
                  className={cn(period === pKey && "font-semibold text-blue-600")}
                >
                  {PERIOD_LABELS[pKey]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-6 pt-2">
        {isLoading ? (
          <div className="flex h-56 items-center justify-center text-xs text-slate-400">
            Loading Expense breakdown…
          </div>
        ) : !hasExpenses ? (
          <div className="flex h-56 flex-col items-center justify-center p-4 text-center text-xs text-slate-400">
            <CircleDot className="mb-2 h-8 w-8 stroke-1 text-slate-300" />
            <p>No recorded expenses for this period.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
            {/* Donut chart */}
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={themedExpenses}
                    dataKey="amount"
                    nameKey="category"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {themedExpenses.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [formatInrFull(val), "Amount"]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#BFDBFE",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px -5px rgba(30, 58, 138, 0.1)",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category breakdown list */}
            <div className="space-y-2.5 text-xs">
              {themedExpenses.slice(0, 5).map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate font-medium text-slate-700">{item.category}</span>
                    </div>
                    <span className="font-display font-bold text-slate-900 tabular-nums">
                      {formatInrFull(item.amount)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-blue-50 pt-3 text-xs">
          <span className="font-medium text-slate-500">Total Expenses:</span>
          <span className="font-display text-sm font-black text-slate-900 tabular-nums">
            {formatInrFull(total)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
