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
    <Card className="border border-border/80 shadow-xs bg-card flex flex-col justify-between">
      <CardHeader className="p-6 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <span className="p-1 rounded-full border border-border bg-muted text-foreground inline-flex">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
            <span>Cash Flow</span>
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

      <CardContent className="p-6 pt-2 space-y-4">
        {/* Area Chart */}
        <div className="h-64 w-full pt-2">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              Loading Cash Flow trends…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
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
                  formatter={(val: number) => [formatInrFull(val), "Cumulative Cash"]}
                  labelStyle={{ fontWeight: "bold", fontSize: "12px" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#0284c7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#cashGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bottom Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border/60 pt-4 text-xs">
          <div>
            <div className="text-muted-foreground truncate">Cash as on {startDate}</div>
            <div className="mt-0.5 font-semibold text-foreground tabular-nums">
              {formatInrFull(openingCash)}
            </div>
          </div>

          <div>
            <div className="text-emerald-600 dark:text-emerald-400 font-medium truncate">
              + Incoming
            </div>
            <div className="mt-0.5 font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatInrFull(incoming)}
            </div>
          </div>

          <div>
            <div className="text-rose-600 dark:text-rose-400 font-medium truncate">- Outgoing</div>
            <div className="mt-0.5 font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
              {formatInrFull(outgoing)}
            </div>
          </div>

          <div>
            <div className="text-foreground font-medium truncate">= Cash as on {endDate}</div>
            <div className="mt-0.5 font-bold text-foreground tabular-nums">
              {formatInrFull(closingCash)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
