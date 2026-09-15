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

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

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
        icon={<ArrowDownLeft className="h-4 w-4" />}
        accentBg="bg-blue-50 text-blue-600 border-blue-100"
        titleColor="text-blue-800"
        summary={receivables}
        period={period}
        onPeriodChange={onPeriodChange}
        isLoading={isLoading}
      />

      {/* Total Payables Card */}
      <MetricCard
        type="payables"
        title="Total Payables"
        icon={<ArrowUpRight className="h-4 w-4" />}
        accentBg="bg-indigo-50 text-indigo-600 border-indigo-100"
        titleColor="text-indigo-800"
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
  icon,
  accentBg,
  titleColor,
  summary,
  period,
  onPeriodChange,
  isLoading,
}: {
  type: "receivables" | "payables";
  title: string;
  icon: React.ReactNode;
  accentBg: string;
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
    <Card className="rounded-2xl border border-blue-100/80 bg-white/95 shadow-[0_4px_20px_rgba(30,58,138,0.04)] backdrop-blur-xs transition-all duration-300 hover:border-blue-200 hover:shadow-[0_8px_30px_rgba(30,58,138,0.08)]">
      <CardContent className="p-6">
        {/* Card Header with Icon, Title and Period Dropdown */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl border shadow-xs",
                accentBg,
              )}
            >
              {icon}
            </div>
            <span
              className={cn("font-mono text-xs font-bold tracking-wider uppercase", titleColor)}
            >
              {title}
            </span>
          </div>

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

        {/* Large Amount */}
        <div className="mt-5">
          <div className="font-display text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums sm:text-4xl">
            {isLoading ? "Loading…" : formatInrFull(total)}
          </div>
        </div>

        {/* Sleek Blue Indicator Bar */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              type === "receivables"
                ? "bg-gradient-to-r from-blue-600 to-cyan-500"
                : "bg-gradient-to-r from-indigo-600 to-blue-500",
            )}
            style={{ width: `${overduePercent}%` }}
          />
        </div>

        {/* Bottom Current vs Overdue Row */}
        <div className="mt-5 flex items-center justify-between border-t border-blue-50 pt-4 text-xs">
          <div>
            <div className="font-medium text-slate-500">Current Due</div>
            <div className="mt-0.5 font-display text-sm font-bold text-slate-900 tabular-nums">
              {isLoading ? "—" : formatInrFull(current)}
            </div>
          </div>

          <div className="text-right">
            <div className="font-medium text-slate-500">Overdue</div>

            {/* Interactive Aging Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="group mt-0.5 inline-flex items-center gap-1 font-display text-sm font-bold text-blue-600 tabular-nums transition-colors hover:text-blue-800"
                >
                  <span>{isLoading ? "—" : formatInrFull(overdue)}</span>
                  <ChevronDown className="h-3 w-3 text-blue-500 group-hover:text-blue-700" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-64 rounded-xl border-blue-100 p-3.5 text-xs shadow-lg"
              >
                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 font-semibold text-slate-900">
                  <AlertCircle className="h-3.5 w-3.5 text-blue-600" />
                  <span>Overdue Aging Breakdown</span>
                </div>
                <div className="mt-2.5 space-y-2">
                  {aging.map((bucket) => (
                    <div key={bucket.label} className="flex items-center justify-between">
                      <span className="text-slate-500">{bucket.label}:</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
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
