import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Scale,
  AlertTriangle,
  FileSpreadsheet,
  Banknote,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Info,
  ExternalLink,
  FileText,
  Receipt,
  Plus,
  Building2,
  Truck,
  Wallet,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Percent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatInr, formatMoneyCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  getSuperAdminFinanceReport,
  computeTotalMismatch,
  generateFinancialAiSuggestions,
  CANONICAL_HSN_VENDOR_SPECS,
  HSN4_CANONICAL_NAMES,
  SFT_SAVINGS_ANNUAL_LIMIT_INR,
  type SuperAdminFinanceReport,
  type HsnGroupSummary,
} from "@/lib/dashboard/superadmin-finance";
import { useActiveTheme } from "@/components/global/ThemeSwitcher";
import { THEME_GAUGE_PALETTES } from "./StatutoryHealthGauge";

const CANONICAL_HSN_CODES = ["6802", "2516", "3214", "3824", "9954", "9965"];

interface SuperAdminFinancialCockpitBoxesProps {
  className?: string;
}

export function SuperAdminFinancialCockpitBoxes({
  className,
}: SuperAdminFinancialCockpitBoxesProps) {
  const activeThemeId = useActiveTheme();
  const palette = THEME_GAUGE_PALETTES[activeThemeId] || THEME_GAUGE_PALETTES["st-og"];
  const navigate = useNavigate();

  const [isMismatchModalOpen, setIsMismatchModalOpen] = useState(false);
  const [isAiStrategyModalOpen, setIsAiStrategyModalOpen] = useState(false);
  const [selectedHsnFilter, setSelectedHsnFilter] = useState<string | "all">("all");
  const [simOffsetAmount, setSimOffsetAmount] = useState<number>(120000);

  const query = useQuery<SuperAdminFinanceReport>({
    queryKey: ["superadmin-finance-report"],
    queryFn: () => getSuperAdminFinanceReport(),
    staleTime: 60_000,
  });

  const report = query.data;
  const isLoading = query.isLoading;

  // Merge canonical HSN categories with live DB summary to guarantee all 6 key HSNs exist
  const completeHsnSummary = useMemo<HsnGroupSummary[]>(() => {
    const map = new Map<string, HsnGroupSummary>();
    for (const h of report?.hsnSummary ?? []) {
      map.set(h.hsn4, h);
    }

    const result: HsnGroupSummary[] = [];
    for (const code of CANONICAL_HSN_CODES) {
      const existing = map.get(code);
      if (existing) {
        result.push(existing);
      } else {
        const meta = HSN4_CANONICAL_NAMES[code];
        result.push({
          hsn4: code,
          categoryName: meta?.name || `HSN ${code}`,
          soldQty: 0,
          soldValue: 0,
          purchasedQty: 0,
          purchasedValue: 0,
          deficitQty: 0,
          deficitValue: 0,
          unit: meta?.defaultUnit || "units",
          status: "balanced",
        });
      }
    }

    // Append any extra non-canonical HSN codes that may have been parsed
    for (const h of report?.hsnSummary ?? []) {
      if (!CANONICAL_HSN_CODES.includes(h.hsn4)) {
        result.push(h);
      }
    }

    return result;
  }, [report?.hsnSummary]);

  // Compute Total Sales vs Purchase Mismatch
  const mismatch = useMemo(() => {
    return computeTotalMismatch(completeHsnSummary);
  }, [completeHsnSummary]);

  // Personal accounts & SFT headroom
  const raman = report?.personalAccounts?.find((a) => a.accountKey === "raman");
  const rishi = report?.personalAccounts?.find((a) => a.accountKey === "rishi");

  const ramanHeadroom = raman?.headroomInr ?? 10_00_000;
  const rishiHeadroom = rishi?.headroomInr ?? 10_00_000;
  const minHeadroom = Math.min(ramanHeadroom, rishiHeadroom);
  const totalHeadroom = ramanHeadroom + rishiHeadroom;
  const ramanUsage = raman?.usagePercentage ?? 0;
  const rishiUsage = rishi?.usagePercentage ?? 0;

  // Financial Analytical AI suggestions
  const aiSuggestions = useMemo(() => {
    return generateFinancialAiSuggestions(report?.personalAccounts ?? [], report?.cashAnalytics);
  }, [report?.personalAccounts, report?.cashAnalytics]);

  const topOffsetSuggestion = aiSuggestions.find((s) => s.type === "direct_agency_offset");

  return (
    <div className={cn("w-full max-w-full min-w-0 select-none", className)}>
      {/* TWO PROMINENT EXECUTIVE BOXES GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 w-full">
        {/* ========================================================================= */}
        {/* BOX 1: SALES VS PURCHASE INVOICING MISMATCH                               */}
        {/* ========================================================================= */}
        <div
          onClick={() => setIsMismatchModalOpen(true)}
          style={{
            background: palette.cardBgGradient,
            boxShadow:
              "0 14px 28px -8px rgba(0,0,0,0.1), 0 4px 10px -2px rgba(0,0,0,0.05), inset 0 1.5px 0 rgba(255,255,255,0.9), inset 0 -2px 0 rgba(0,0,0,0.08)",
          }}
          className={cn(
            "group relative rounded-2xl border-t-2 border-l border-r border-b-3 p-4 sm:p-5 transition-all duration-200 cursor-pointer",
            "hover:-translate-y-1 hover:shadow-xl active:translate-y-0.5",
            palette.cardBorder,
            "border-t-white/95 dark:border-t-white/20 border-b-black/15 dark:border-b-black/50",
            mismatch.isDeficit
              ? "ring-2 ring-rose-500/25 dark:ring-rose-500/35"
              : "ring-1 ring-emerald-500/20",
          )}
        >
          {/* Big Amount & Mismatch State */}
          <div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Sales &amp; Purchase Invoicing Mismatch
            </div>

            <div className="mt-1 flex items-baseline gap-2 flex-wrap">
              <span
                className={cn(
                  "font-display text-2xl sm:text-3xl font-black tabular-nums tracking-tight drop-shadow-2xs",
                  mismatch.isDeficit
                    ? "text-rose-600 dark:text-rose-400"
                    : mismatch.netMismatchValue < 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-foreground",
                )}
              >
                {mismatch.formattedMismatch}
              </span>

              <span className="text-xs font-semibold text-muted-foreground">
                {mismatch.isDeficit
                  ? "unbacked sales (missing purchase invoices)"
                  : mismatch.netMismatchValue < 0
                    ? "inward bills ahead of sales (stock buffer)"
                    : "sales and purchases fully equated"}
              </span>
            </div>

            {/* Inward vs Outward Metric Breakdown */}
            <div className="mt-3 grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-card/80 border border-border/60 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Billed Outward (Sales)
                </span>
                <span className="font-mono font-black text-foreground">
                  {formatInr(mismatch.totalSoldValue)}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {mismatch.totalSoldQty.toLocaleString("en-IN")} units billed
                </span>
              </div>
              <div className="border-l border-border/60 pl-2.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Inward Covered (Purchases)
                </span>
                <span className="font-mono font-black text-foreground">
                  {formatInr(mismatch.totalPurchasedValue)}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {mismatch.totalPurchasedQty.toLocaleString("en-IN")} units covered
                </span>
              </div>
            </div>

            {/* Canonical HSN Ticker preview */}
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              {completeHsnSummary.slice(0, 4).map((h) => {
                const isDef = h.status === "deficit" || h.soldQty > h.purchasedQty;
                return (
                  <span
                    key={h.hsn4}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border",
                      isDef
                        ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800",
                    )}
                  >
                    <span>HSN {h.hsn4}</span>
                    <span className="font-mono font-normal">
                      {isDef ? `+${h.deficitQty} ${h.unit} needed` : "✓"}
                    </span>
                  </span>
                );
              })}
            </div>

            {/* Click to inspect footer */}
            <div className="mt-3.5 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs font-bold text-primary group-hover:text-primary/90">
              <span className="flex items-center gap-1">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Click to inspect itemized HSN deficit &amp; required vendor bills</span>
              </span>
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BOX 2: PERSONAL SAVINGS & UPI SFT HEADROOM (AI ADVISOR)                   */}
        {/* ========================================================================= */}
        <div
          onClick={() => setIsAiStrategyModalOpen(true)}
          style={{
            background: palette.cardBgGradient,
            boxShadow:
              "0 14px 28px -8px rgba(0,0,0,0.1), 0 4px 10px -2px rgba(0,0,0,0.05), inset 0 1.5px 0 rgba(255,255,255,0.9), inset 0 -2px 0 rgba(0,0,0,0.08)",
          }}
          className={cn(
            "group relative rounded-2xl border-t-2 border-l border-r border-b-3 p-4 sm:p-5 transition-all duration-200 cursor-pointer",
            "hover:-translate-y-1 hover:shadow-xl active:translate-y-0.5",
            palette.cardBorder,
            "border-t-white/95 dark:border-t-white/20 border-b-black/15 dark:border-b-black/50",
            minHeadroom < 250000 ? "ring-2 ring-amber-500/25" : "ring-1 ring-primary/20",
          )}
        >
          {/* Big Amount: Headroom Left */}
          <div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Remaining Personal Savings / UPI Headroom
            </div>

            <div className="mt-1 flex items-baseline gap-2 flex-wrap">
              <span className="font-display text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-foreground drop-shadow-2xs">
                {formatInr(minHeadroom)} Left
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                before ₹10L statutory reporting limit
              </span>
            </div>

            {/* Partner Split Progress */}
            <div className="mt-3 space-y-2 p-2.5 rounded-xl bg-card/80 border border-border/60 text-xs">
              {/* Raman */}
              <div>
                <div className="flex items-center justify-between font-semibold text-[11px]">
                  <span className="text-foreground">Raman Personal UPI</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {formatInr(raman?.cumulativeInflowsInr ?? 0)} / ₹10L (
                    {raman?.headroomInr ? `${formatInr(raman.headroomInr)} left` : "₹10L left"})
                  </span>
                </div>
                <Progress
                  value={ramanUsage}
                  className="h-1.5 mt-1 bg-slate-200 dark:bg-slate-800"
                />
              </div>

              {/* Rishi */}
              <div>
                <div className="flex items-center justify-between font-semibold text-[11px]">
                  <span className="text-foreground">Rishi Personal UPI</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {formatInr(rishi?.cumulativeInflowsInr ?? 0)} / ₹10L (
                    {rishi?.headroomInr ? `${formatInr(rishi.headroomInr)} left` : "₹10L left"})
                  </span>
                </div>
                <Progress
                  value={rishiUsage}
                  className="h-1.5 mt-1 bg-slate-200 dark:bg-slate-800"
                />
              </div>
            </div>

            {/* FINANCIAL ANALYTICAL AI ADVISOR INSIGHT (EMBEDDED) */}
            <div className="mt-3 p-2.5 rounded-xl bg-gradient-to-r from-cyan-500/10 via-emerald-500/10 to-transparent border border-cyan-500/30 text-xs">
              <div className="flex items-center gap-1.5 text-cyan-800 dark:text-cyan-300 font-extrabold text-[11px]">
                <Sparkles className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Financial Analytical AI Recommendation</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                {topOffsetSuggestion?.summary ||
                  "Direct customer cash payments to quarry or transport agency accounts to avoid hitting personal savings accounts."}
              </p>
            </div>

            {/* Click to inspect footer */}
            <div className="mt-3.5 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs font-bold text-primary group-hover:text-primary/90">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Open AI Financial Strategy &amp; Direct Offsets</span>
              </span>
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DIALOG 1: ITEMIZED HSN PURCHASE VS SALES MISMATCH LEDGER                  */}
      {/* ========================================================================= */}
      <Dialog open={isMismatchModalOpen} onOpenChange={setIsMismatchModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div
                style={{ background: palette.activePillBg }}
                className="p-2 rounded-xl text-white shrink-0"
              >
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-display text-lg sm:text-xl font-black">
                  4-Digit HSN Purchase vs. Sales Invoicing Ledger
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Benchmark: Equating inward purchases and outward sales strictly by the first 4
                  numbers of the HSN code. Identifies required supplier purchase invoices.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Executive Rollup Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/50 border border-border/60">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                Total Billed Outward
              </span>
              <span className="font-mono font-black text-foreground text-sm sm:text-base">
                {formatInr(mismatch.totalSoldValue)}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                {mismatch.totalSoldQty.toLocaleString("en-IN")} units sold
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                Total Inward Covered
              </span>
              <span className="font-mono font-black text-foreground text-sm sm:text-base">
                {formatInr(mismatch.totalPurchasedValue)}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                {mismatch.totalPurchasedQty.toLocaleString("en-IN")} units purchased
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                Net Mismatch Amount
              </span>
              <span
                className={cn(
                  "font-mono font-black text-sm sm:text-base",
                  mismatch.isDeficit ? "text-rose-600" : "text-emerald-600",
                )}
              >
                {mismatch.formattedMismatch}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                {mismatch.isDeficit ? "Deficit unbacked" : "Inward buffer"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                Deficit HSN Categories
              </span>
              <span className="font-mono font-black text-foreground text-sm sm:text-base">
                {mismatch.deficitCategoriesCount} of {completeHsnSummary.length}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                require purchase bills
              </span>
            </div>
          </div>

          {/* Itemized HSN Table */}
          <div className="space-y-3 mt-2">
            <div className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>Itemized 4-Digit HSN Breakdown &amp; Required Vendor Bills:</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                Click "+ Add Purchase Bill" to record invoices against any HSN deficit
              </span>
            </div>

            <div className="rounded-xl border border-border/80 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/60 text-[11px]">
                  <TableRow>
                    <TableHead className="font-black">HSN (4-Digit) &amp; Product</TableHead>
                    <TableHead className="text-right font-black">Billed Outward</TableHead>
                    <TableHead className="text-right font-black">Inward Covered</TableHead>
                    <TableHead className="text-right font-black">Mismatch Qty</TableHead>
                    <TableHead className="text-right font-black">Required Bill ₹</TableHead>
                    <TableHead className="font-black">Whose Purchase Invoice?</TableHead>
                    <TableHead className="text-center font-black">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs divide-y divide-border/60">
                  {completeHsnSummary.map((item) => {
                    const spec = CANONICAL_HSN_VENDOR_SPECS[item.hsn4];
                    const isDef = item.status === "deficit" || item.soldQty > item.purchasedQty;
                    const diffQty = Math.max(0, item.soldQty - item.purchasedQty);
                    const avgRate =
                      item.soldQty > 0 ? item.soldValue / item.soldQty : spec?.unitRate || 250;
                    const requiredValue =
                      item.deficitValue > 0
                        ? item.deficitValue
                        : Math.round(diffQty * (spec?.unitRate || avgRate));

                    return (
                      <TableRow
                        key={item.hsn4}
                        className={cn(isDef ? "bg-rose-50/40 dark:bg-rose-950/20" : "")}
                      >
                        {/* HSN & Name */}
                        <TableCell className="font-semibold py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-primary text-xs">
                              {item.hsn4}
                            </span>
                            {isDef && (
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                            )}
                          </div>
                          <div className="text-[11px] text-foreground font-medium">
                            {item.categoryName}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Base: {item.unit}</div>
                        </TableCell>

                        {/* Sold Outward */}
                        <TableCell className="text-right py-3">
                          <div className="font-mono font-bold text-foreground">
                            {item.soldQty.toLocaleString("en-IN")} {item.unit}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {formatInr(item.soldValue)}
                          </div>
                        </TableCell>

                        {/* Purchased Inward */}
                        <TableCell className="text-right py-3">
                          <div className="font-mono font-bold text-foreground">
                            {item.purchasedQty.toLocaleString("en-IN")} {item.unit}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {formatInr(item.purchasedValue)}
                          </div>
                        </TableCell>

                        {/* Mismatch Quantity */}
                        <TableCell className="text-right py-3">
                          {isDef ? (
                            <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                              +{diffQty.toLocaleString("en-IN")} {item.unit}
                            </span>
                          ) : (
                            <span className="font-mono text-emerald-600 font-semibold">
                              Balanced
                            </span>
                          )}
                        </TableCell>

                        {/* Required Purchase Bill Value */}
                        <TableCell className="text-right py-3">
                          {isDef && requiredValue > 0 ? (
                            <div className="font-mono font-black text-rose-600 dark:text-rose-400">
                              {formatInr(requiredValue)}
                            </div>
                          ) : (
                            <span className="font-mono text-muted-foreground">₹0</span>
                          )}
                        </TableCell>

                        {/* Recommended Vendor / Supplier */}
                        <TableCell className="py-3 max-w-[240px]">
                          <div className="text-[11px] font-bold text-foreground">
                            {spec?.vendorType || "Product Supplier / Quarry"}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                            {spec?.suggestedVendors.slice(0, 2).join(", ") ||
                              "Verified Trade Vendor"}
                          </div>
                          <div className="text-[9.5px] text-muted-foreground/80 italic mt-0.5">
                            {spec?.statutoryAdvice}
                          </div>
                        </TableCell>

                        {/* Action */}
                        <TableCell className="text-center py-3">
                          <Link
                            to="/purchase-invoices/new"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs shrink-0 whitespace-nowrap cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add Bill</span>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Dialog Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/70 mt-2">
            <div className="text-xs text-muted-foreground">
              Directly recording purchase invoices updates the live statutory radar in real time.
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsMismatchModalOpen(false);
                  navigate({ to: "/purchase-invoices" });
                }}
                className="text-xs font-bold"
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                View All Purchase Invoices
              </Button>
              <Button
                size="sm"
                onClick={() => setIsMismatchModalOpen(false)}
                className="text-xs font-bold"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 2: FINANCIAL ANALYTICAL AI ADVISOR & DIRECT OFFSETS                */}
      {/* ========================================================================= */}
      <Dialog open={isAiStrategyModalOpen} onOpenChange={setIsAiStrategyModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div
                style={{ background: palette.activePillBg }}
                className="p-2 rounded-xl text-white shrink-0"
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-display text-lg sm:text-xl font-black">
                  Financial Analytical AI Advisor — Cash Routing &amp; SFT Protection
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Automated intelligence guarding personal accounts under Income Tax Section 285BA /
                  Rule 114E (₹10 Lakh statutory annual limit).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Interactive Direct Agency Offset Simulator */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/15 via-cyan-500/10 to-purple-500/10 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                  <Banknote className="h-4 w-4" />
                </span>
                <span className="text-xs font-black uppercase text-foreground">
                  Direct Customer-to-Agency/Vendor Offset Simulator
                </span>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                100% Tax Compliant
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              When a customer opts for a cash settlement, instruct them to pay directly to an
              external Quarry, Transporter, or Adhesive Agency bank account on Stone Tech's behalf.
              Zero rupees enter your personal savings accounts, preserving your statutory headroom.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-2.5 rounded-lg bg-card/90 border border-border/60">
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">
                  Customer Cash Deal Amount
                </span>
                <div className="mt-1 font-mono font-black text-base text-foreground">
                  {formatInr(simOffsetAmount)}
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[50000, 120000, 250000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSimOffsetAmount(amt)}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer",
                        simOffsetAmount === amt
                          ? "bg-primary text-white border-primary"
                          : "bg-muted text-muted-foreground border-border",
                      )}
                    >
                      ₹{formatMoneyCompact(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-card/90 border border-border/60">
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">
                  If Deposited Personally (UPI)
                </span>
                <div className="mt-1 font-mono font-black text-base text-rose-600">
                  -{formatInr(simOffsetAmount)}
                </div>
                <span className="text-[10px] text-rose-600 block mt-1 font-medium">
                  Directly burns personal ₹10L limit
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-card/90 border border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold uppercase block">
                  With Direct Vendor Offset
                </span>
                <div className="mt-1 font-mono font-black text-base text-emerald-600 dark:text-emerald-400">
                  ₹0 Impact
                </div>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block mt-1 font-medium">
                  Saves {formatInr(simOffsetAmount)} headroom!
                </span>
              </div>
            </div>
          </div>

          {/* AI Strategic Action Recommendations List */}
          <div className="space-y-3 mt-2">
            <div className="text-xs font-bold text-foreground">
              Strategic AI Recommendations Generated for Stone Tech:
            </div>

            <div className="space-y-2.5">
              {aiSuggestions.map((sug) => (
                <div
                  key={sug.id}
                  className="p-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted/40 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs font-black text-foreground">{sug.title}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9.5px] font-bold uppercase",
                        sug.priority === "critical"
                          ? "bg-rose-50 text-rose-700 border-rose-300"
                          : sug.priority === "high"
                            ? "bg-amber-50 text-amber-700 border-amber-300"
                            : "bg-emerald-50 text-emerald-700 border-emerald-300",
                      )}
                    >
                      {sug.priority}
                    </Badge>
                  </div>
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                    {sug.details}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Live Partner Savings Account Audit */}
          <div className="p-3.5 rounded-xl bg-muted/50 border border-border/60 text-xs space-y-2">
            <span className="font-bold text-foreground block">
              Current Partner Savings Inflow Velocity (FY 2026–27):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-card border border-border/60">
                <div className="flex justify-between font-bold">
                  <span>Raman Personal Savings</span>
                  <span className="font-mono">{formatInr(raman?.cumulativeInflowsInr ?? 0)}</span>
                </div>
                <div className="text-[10.5px] text-muted-foreground mt-1">
                  Remaining headroom:{" "}
                  <strong className="text-foreground">{formatInr(ramanHeadroom)}</strong> (
                  {ramanUsage}% used)
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-card border border-border/60">
                <div className="flex justify-between font-bold">
                  <span>Rishi Personal Savings</span>
                  <span className="font-mono">{formatInr(rishi?.cumulativeInflowsInr ?? 0)}</span>
                </div>
                <div className="text-[10.5px] text-muted-foreground mt-1">
                  Remaining headroom:{" "}
                  <strong className="text-foreground">{formatInr(rishiHeadroom)}</strong> (
                  {rishiUsage}% used)
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/70 mt-2">
            <div className="text-xs text-muted-foreground">
              Always use direct vendor payment slips or agency bank transfer receipts for audit
              defense.
            </div>

            <Button
              size="sm"
              onClick={() => setIsAiStrategyModalOpen(false)}
              className="text-xs font-bold"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
