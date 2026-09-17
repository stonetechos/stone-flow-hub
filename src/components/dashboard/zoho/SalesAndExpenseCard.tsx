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
    <div className="card-3d-milky flex flex-col justify-between p-6">
      <div className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <span className="inline-flex rounded-xl border border-cyan-200 bg-cyan-50 p-2 text-cyan-700 shadow-xs">
              <PieChart className="h-4 w-4" />
            </span>
            <span className="font-display text-base font-black text-engraved-title">
              Sales &amp; Expenses
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="engraved-well flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-engraved-blue transition-colors hover:border-cyan-400"
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
                  className={cn(period === pKey && "font-semibold text-cyan-700")}
                >
                  {PERIOD_LABELS[pKey]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Accrual vs Cash Toggle in 3D Engraved well */}
        <div className="pt-3">
          <div className="engraved-well inline-flex rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => onModeChange("accrual")}
              className={cn(
                "rounded-lg px-3 py-1 font-bold transition-all",
                mode === "accrual"
                  ? "bg-cyan-700 text-white shadow-xs"
                  : "text-slate-600 hover:text-cyan-800",
              )}
            >
              Accrual
            </button>
            <button
              type="button"
              onClick={() => onModeChange("cash")}
              className={cn(
                "rounded-lg px-3 py-1 font-bold transition-all",
                mode === "cash"
                  ? "bg-cyan-700 text-white shadow-xs"
                  : "text-slate-600 hover:text-cyan-800",
              )}
            >
              Cash
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        {/* Dual Bar Chart with Sapphire & Sky Blue */}
        <div className="h-64 w-full pt-2">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              Loading Sales & Expenses trends…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E2E8F0"
                  opacity={0.8}
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={{ stroke: "#CBD5E1", opacity: 0.6 }}
                  tick={{ fontSize: 10, fill: "#64748B" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatIndianCompact}
                  tick={{ fontSize: 10, fill: "#64748B" }}
                />
                <Tooltip
                  formatter={(val: number, name: string) => [
                    formatInrFull(val),
                    name === "sales" ? "Sales / Inflow" : "Expenses / Outflow",
                  ]}
                  labelStyle={{ fontWeight: "bold", fontSize: "12px", color: "#0F172A" }}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#BFDBFE",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px -5px rgba(30, 58, 138, 0.1)",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="sales"
                  name="Sales"
                  fill="#2563EB"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="#60A5FA"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bottom Income & Expenses Summary in 3D Engraved Wells */}
        <div className="grid grid-cols-2 gap-3.5 border-t border-cyan-50 pt-4 text-center">
          <div className="engraved-well-glow rounded-xl p-3.5">
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-engraved-kicker">
              Total Income
            </div>
            <div className="mt-1 font-display text-base font-black text-engraved-blue-lg tabular-nums sm:text-lg">
              {formatInrFull(totalSales)}
            </div>
          </div>

          <div className="engraved-well rounded-xl p-3.5">
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-indigo-700">
              Total Expenses
            </div>
            <div className="mt-1 font-display text-base font-black text-indigo-900 tabular-nums sm:text-lg">
              {formatInrFull(totalExpenses)}
            </div>
          </div>
        </div>

        {/* Footnote */}
        <p className="text-[11px] text-muted-foreground italic text-center">
          Income and expense values displayed are exclusive of taxes
        </p>
      </div>
    </div>
  );
}
