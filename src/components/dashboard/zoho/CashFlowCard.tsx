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
    <div className="card-3d-milky flex flex-col justify-between p-6">
      <div className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <span className="inline-flex rounded-xl border border-cyan-200 bg-cyan-50 p-2 text-cyan-700 shadow-xs">
              <ArrowUpRight className="h-4 w-4" />
            </span>
            <span className="font-display text-base font-black text-engraved-title">
              Cash Flow Pulse
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
      </div>

      <div className="space-y-4 pt-2">
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
                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
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
                    borderColor: "#fed7aa",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px -5px rgba(234, 88, 12, 0.1)",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#c2410c"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#cashGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bottom Metrics Bar with 3D Engraved Wells */}
        <div className="grid grid-cols-2 gap-2.5 border-t border-cyan-50 pt-4 text-xs sm:grid-cols-4">
          <div className="engraved-well rounded-xl p-2.5">
            <div className="truncate font-mono text-[10px] font-bold uppercase text-slate-500">
              Opening ({startDate})
            </div>
            <div className="mt-0.5 font-display font-black text-engraved-title tabular-nums">
              {formatInrFull(openingCash)}
            </div>
          </div>

          <div className="engraved-well rounded-xl p-2.5">
            <div className="truncate font-mono text-[10px] font-bold uppercase text-engraved-kicker">
              + Inflow
            </div>
            <div className="mt-0.5 font-display font-black text-engraved-blue tabular-nums">
              {formatInrFull(incoming)}
            </div>
          </div>

          <div className="engraved-well rounded-xl p-2.5">
            <div className="truncate font-mono text-[10px] font-bold uppercase text-indigo-700">
              - Outflow
            </div>
            <div className="mt-0.5 font-display font-black text-indigo-900 tabular-nums">
              {formatInrFull(outgoing)}
            </div>
          </div>

          <div className="engraved-well-glow rounded-xl p-2.5">
            <div className="truncate font-mono text-[10px] font-bold uppercase text-engraved-kicker">
              Closing ({endDate})
            </div>
            <div className="mt-0.5 font-display font-black text-engraved-blue-lg text-sm sm:text-base tabular-nums">
              {formatInrFull(closingCash)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
