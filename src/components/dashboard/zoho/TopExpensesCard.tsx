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

  return (
    <Card className="border border-border/80 shadow-xs bg-card flex flex-col justify-between">
      <CardHeader className="p-6 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <span className="p-1 rounded-full border border-border bg-muted text-foreground inline-flex">
              <CircleDot className="h-3.5 w-3.5" />
            </span>
            <span>Top Expenses</span>
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
      </CardHeader>

      <CardContent className="p-6 pt-2">
        {isLoading ? (
          <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">
            Loading Expense breakdown…
          </div>
        ) : !hasExpenses ? (
          <div className="h-56 flex flex-col items-center justify-center text-center p-4 text-xs text-muted-foreground">
            <CircleDot className="h-8 w-8 stroke-1 text-muted-foreground/50 mb-2" />
            <p>No recorded expenses for this period.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* Donut chart */}
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenses}
                    dataKey="amount"
                    nameKey="category"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {expenses.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [formatInrFull(val), "Amount"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category breakdown list */}
            <div className="space-y-2 text-xs">
              {expenses.slice(0, 5).map((item) => (
                <div key={item.category} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate text-foreground font-medium">{item.category}</span>
                    </div>
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatInrFull(item.amount)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
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

        <div className="mt-4 border-t border-border/60 pt-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Total Period Expenses:</span>
          <span className="font-bold text-foreground tabular-nums">{formatInrFull(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
