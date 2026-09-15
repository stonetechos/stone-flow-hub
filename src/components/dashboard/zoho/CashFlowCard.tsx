import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type PeriodFilter,
  type CashFlowSummary,
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

export function CashFlowCard({
  summary,
  period,
  onPeriodChange,
  isLoading,
}: {
  summary?: CashFlowSummary;
  period: PeriodFilter;
  onPeriodChange: (p: PeriodFilter) => void;
  isLoading?: boolean;
}) {
  const monthlyData = summary?.monthlyData ?? [];
  const openingCash = summary?.openingCash ?? 0;
  const incoming = summary?.incoming ?? 0;
  const outgoing = summary?.outgoing ?? 0;
  const closingCash = summary?.closingCash ?? 0;
  const startDate = summary?.startDate ?? "01/04/26";
  const endDate = summary?.endDate ?? "31/03/27";

  return (
    <Card className="flex flex-col justify-between rounded-2xl border border-blue-100/80 bg-white/95 shadow-[0_4px_20px_rgba(30,58,138,0.04)] backdrop-blur-xs transition-all duration-300 hover:border-blue-200 hover:shadow-[0_8px_30px_rgba(30,58,138,0.08)]">
      <CardHeader className="p-6 pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2.5 text-sm font-bold text-slate-900">
            <span className="inline-flex rounded-xl border border-blue-100 bg-blue-50 p-2 text-blue-600 shadow-xs">
              <ArrowUpRight className="h-4 w-4" />
            </span>
            <span>Cash Flow Pulse</span>
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
        {/* Area Chart with Royal Blue Palette */}
        <div className="h-64 w-full pt-2">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              Loading Cash Flow trends…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
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
                  formatter={(val: number) => [formatInrFull(val), "Cumulative Cash"]}
                  labelStyle={{ fontWeight: "bold", fontSize: "12px", color: "#0F172A" }}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#BFDBFE",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px -5px rgba(30, 58, 138, 0.1)",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#cashGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bottom Metrics Bar with Milky Blue Pill highlights */}
        <div className="grid grid-cols-2 gap-2.5 border-t border-blue-50 pt-4 text-xs sm:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
            <div className="truncate text-slate-500">Opening ({startDate})</div>
            <div className="mt-0.5 font-display font-bold text-slate-900 tabular-nums">
              {formatInrFull(openingCash)}
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-2.5">
            <div className="truncate font-semibold text-blue-700">+ Inflow</div>
            <div className="mt-0.5 font-display font-bold text-blue-800 tabular-nums">
              {formatInrFull(incoming)}
            </div>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-2.5">
            <div className="truncate font-semibold text-indigo-700">- Outflow</div>
            <div className="mt-0.5 font-display font-bold text-indigo-800 tabular-nums">
              {formatInrFull(outgoing)}
            </div>
          </div>

          <div className="rounded-xl border border-blue-600 bg-blue-600 p-2.5 text-white shadow-xs">
            <div className="truncate text-blue-100">Closing ({endDate})</div>
            <div className="mt-0.5 font-display font-black text-white tabular-nums">
              {formatInrFull(closingCash)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
