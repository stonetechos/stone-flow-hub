import { ChevronDown, AlertCircle, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
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

const PERIOD_KEYS: Record<PeriodFilter, string> = {
  this_fiscal_year: "dashboard.periods.this_fiscal_year",
  previous_fiscal_year: "dashboard.periods.previous_fiscal_year",
  this_quarter: "dashboard.periods.this_quarter",
  this_month: "dashboard.periods.this_month",
  today: "dashboard.periods.today",
};

const PERIOD_DEFAULTS: Record<PeriodFilter, string> = {
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
  const { t } = useTranslation();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Total Receivables Card */}
      <MetricCard
        type="receivables"
        title={t("dashboard.totalReceivables", "Total Receivables")}
        icon={<ArrowDownLeft className="h-4 w-4" />}
        accentBg="bg-cyan-50 text-cyan-700 border-cyan-100"
        titleColor="text-cyan-900"
        summary={receivables}
        period={period}
        onPeriodChange={onPeriodChange}
        isLoading={isLoading}
      />

      {/* Total Payables Card */}
      <MetricCard
        type="payables"
        title={t("dashboard.totalPayables", "Total Payables")}
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
  const { t } = useTranslation();
  const total = summary?.total ?? 0;
  const current = summary?.current ?? 0;
  const overdue = summary?.overdue ?? 0;
  const aging = summary?.aging ?? [];

  // Overdue ratio for progress bar indicator
  const overduePercent = total > 0 ? Math.min(100, Math.round((overdue / total) * 100)) : 100;

  return (
    <div className="card-3d-milky p-6">
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
          <span className="font-mono text-xs font-black tracking-wider uppercase text-engraved-title">
            {title}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="engraved-well flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-engraved-blue transition-colors hover:border-cyan-400"
            >
              <span>{t(PERIOD_KEYS[period], PERIOD_DEFAULTS[period])}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 text-xs">
            {(Object.keys(PERIOD_KEYS) as PeriodFilter[]).map((pKey) => (
              <DropdownMenuItem
                key={pKey}
                onClick={() => onPeriodChange(pKey)}
                className={cn(period === pKey && "font-semibold text-cyan-700")}
              >
                {t(PERIOD_KEYS[pKey], PERIOD_DEFAULTS[pKey])}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Large Amount carved into an illuminated engraved stone well */}
      <div className="engraved-well-glow mt-5 rounded-2xl p-4 text-center">
        <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-engraved-kicker">
          {t("dashboard.totalBalance", "Total Balance")}
        </div>
        <div className="mt-1 font-display text-3xl font-black tracking-tight text-engraved-blue-lg tabular-nums sm:text-4xl">
          {isLoading ? t("common.loading", "Loading…") : formatInrFull(total)}
        </div>
      </div>

      {/* 3D Indicator Bar */}
      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80 p-0.5 shadow-inner">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 shadow-sm",
            type === "receivables"
              ? "bg-gradient-to-r from-orange-700 via-orange-600 to-amber-500 shadow-orange-600/50"
              : "bg-gradient-to-r from-amber-700 via-orange-600 to-orange-400 shadow-amber-600/50",
          )}
          style={{ width: `${overduePercent}%` }}
        />
      </div>

      {/* Bottom Current vs Overdue Row in 3D Wells */}
      <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
        <div className="engraved-well rounded-xl p-3">
          <div className="font-mono text-[10px] font-bold uppercase text-slate-500">
            {t("dashboard.currentDue", "Current Due")}
          </div>
          <div className="mt-0.5 font-display text-sm font-black text-engraved-title tabular-nums">
            {isLoading ? "—" : formatInrFull(current)}
          </div>
        </div>

        <div className="engraved-well rounded-xl p-3 text-right">
          <div className="font-mono text-[10px] font-bold uppercase text-slate-500">
            {t("dashboard.overdue", "Overdue")}
          </div>

          {/* Interactive Aging Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="group mt-0.5 inline-flex items-center gap-1 font-display text-sm font-black text-engraved-blue tabular-nums transition-colors hover:scale-105"
              >
                <span>{isLoading ? "—" : formatInrFull(overdue)}</span>
                <ChevronDown className="h-3 w-3 text-cyan-600 group-hover:text-cyan-800" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="card-3d-milky-sm w-64 p-3.5 text-xs shadow-xl">
              <div className="flex items-center gap-1.5 border-b border-cyan-100/80 pb-2 font-bold text-engraved-title">
                <AlertCircle className="h-3.5 w-3.5 text-cyan-700" />
                <span>{t("dashboard.overdueAgingBreakdown", "Overdue Aging Breakdown")}</span>
              </div>
              <div className="mt-2.5 space-y-2">
                {aging.map((bucket) => (
                  <div key={bucket.label} className="flex items-center justify-between">
                    <span className="font-medium text-slate-500">{bucket.label}:</span>
                    <span className="font-mono font-bold text-engraved-blue tabular-nums">
                      {formatInrFull(bucket.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
