import { useState } from "react";
import { ChevronDown, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  type PeriodFilter,
  type ReceivablesPayablesSummary,
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

export function ReceivablesPayablesCards({
  receivables,
  payables,
  period,
  onPeriodChange,
  isLoading,
}: {
  receivables?: ReceivablesPayablesSummary;
  payables?: ReceivablesPayablesSummary;
  period: PeriodFilter;
  onPeriodChange: (p: PeriodFilter) => void;
  isLoading?: boolean;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Total Receivables Card */}
      <MetricCard
        type="receivables"
        title="Total Receivables"
        titleColor="text-emerald-600 dark:text-emerald-400"
        summary={receivables}
        period={period}
        onPeriodChange={onPeriodChange}
        isLoading={isLoading}
      />

      {/* Total Payables Card */}
      <MetricCard
        type="payables"
        title="Total Payables"
        titleColor="text-rose-600 dark:text-rose-400"
        summary={payables}
        period={period}
        onPeriodChange={onPeriodChange}
        isLoading={isLoading}
      />
    </div>
  );
}

function MetricCard({
  type,
  title,
  titleColor,
  summary,
  period,
  onPeriodChange,
  isLoading,
}: {
  type: "receivables" | "payables";
  title: string;
  titleColor: string;
  summary?: ReceivablesPayablesSummary;
  period: PeriodFilter;
  onPeriodChange: (p: PeriodFilter) => void;
  isLoading?: boolean;
}) {
  const total = summary?.total ?? 0;
  const current = summary?.current ?? 0;
  const overdue = summary?.overdue ?? 0;
  const aging = summary?.aging ?? [];

  // Overdue ratio for progress bar indicator
  const overduePercent = total > 0 ? Math.min(100, Math.round((overdue / total) * 100)) : 100;

  return (
    <Card className="border border-border/80 shadow-xs bg-card">
      <CardContent className="p-6">
        {/* Card Header with Title and Period Dropdown */}
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-xs font-semibold tracking-wide uppercase", titleColor)}>
            {title}
          </span>

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

        {/* Large Amount */}
        <div className="mt-4">
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {isLoading ? "Loading…" : formatInrFull(total)}
          </div>
        </div>

        {/* Yellow / Amber Indicator Bar */}
        <div className="mt-4 h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-amber-400 transition-all duration-500 rounded-full"
            style={{ width: `${overduePercent}%` }}
          />
        </div>

        {/* Bottom Current vs Overdue Row */}
        <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4 text-xs">
          <div>
            <div className="text-muted-foreground">Current</div>
            <div className="mt-0.5 font-semibold text-foreground tabular-nums">
              {isLoading ? "—" : formatInrFull(current)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-muted-foreground">Overdue</div>

            {/* Interactive Aging Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="mt-0.5 inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors tabular-nums group"
                >
                  <span>{isLoading ? "—" : formatInrFull(overdue)}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-3 text-xs shadow-md">
                <div className="font-semibold text-foreground pb-2 border-b border-border flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  <span>Overdue Aging Breakdown</span>
                </div>
                <div className="mt-2 space-y-2">
                  {aging.map((bucket) => (
                    <div key={bucket.label} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{bucket.label}:</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatInrFull(bucket.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
