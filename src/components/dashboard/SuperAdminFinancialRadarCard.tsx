import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  Wallet,
  Smartphone,
  Banknote,
  ArrowRightLeft,
  PieChart,
  RefreshCw,
  Info,
  CheckCircle2,
  TrendingUp,
  Receipt,
  Scale,
  Sliders,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  getSuperAdminFinanceReport,
  type SuperAdminFinanceReport,
  type HsnGroupSummary,
  type PersonalAccountScrutiny,
} from "@/lib/dashboard/superadmin-finance";
import {
  SpeedometerGauge,
  MiniRadialMeter,
  HsnInteractiveSimulator,
  SftInflowSimulator,
} from "./StatutoryHealthGauge";

const CANONICAL_CATEGORIES = [
  { hsn4: "6802", name: "Natural Stone Claddings & Murals", unit: "sq.ft", defaultRate: 250 },
  { hsn4: "2516", name: "Granite & Sandstone Blocks", unit: "sq.ft", defaultRate: 180 },
  { hsn4: "3214", name: "Adhesives & Tile Mastics", unit: "bag", defaultRate: 900 },
  { hsn4: "3824", name: "Chemical Sealers & Repellents", unit: "ltr", defaultRate: 2500 },
  { hsn4: "9954", name: "Fixing Labour Services", unit: "sq.ft", defaultRate: 80 },
  { hsn4: "9965", name: "Local Carting & Freight", unit: "trip", defaultRate: 2500 },
];

export function SuperAdminFinancialRadarCard() {
  const [activeTab, setActiveTab] = useState<"hsn" | "upi" | "cash">("hsn");
  const [selectedHsnTile, setSelectedHsnTile] = useState<string>("6802");

  const query = useQuery<SuperAdminFinanceReport>({
    queryKey: ["superadmin-finance-report"],
    queryFn: () => getSuperAdminFinanceReport(),
    staleTime: 60_000,
  });

  const data = query.data;
  const isLoading = query.isLoading;

  const totalDeficit = data?.totalDeficitValueInr ?? 0;
  const deficitCount = data?.totalDeficitCount ?? 0;

  // Calculate composite Statutory Health Score (0 to 100)
  const healthMetrics = useMemo(() => {
    if (!data) return { overallScore: 100, hsnScore: 100, sftScore: 100, invoiceScore: 100 };

    // 1. HSN Balancing Component: 100 if 0 deficits; drops by 20 per deficit category
    const hsnScore = Math.max(0, 100 - (data.totalDeficitCount || 0) * 25);

    // 2. Personal Accounts SFT Exposure: 100 if both Raman & Rishi < 50%; scales down if headroom tightens
    const ramanPct =
      data.personalAccounts?.find((a) => a.accountKey === "raman")?.usagePercentage || 0;
    const rishiPct =
      data.personalAccounts?.find((a) => a.accountKey === "rishi")?.usagePercentage || 0;
    const maxUpiUsage = Math.max(ramanPct, rishiPct);
    const sftScore = maxUpiUsage > 90 ? 20 : maxUpiUsage > 75 ? 50 : maxUpiUsage > 50 ? 75 : 100;

    // 3. Invoiced Deal Ratio: White business proportion
    const invoiceScore = Math.round(data.cashAnalytics?.invoicedAdoptionRate || 100);

    // Overall weighted composite score: HSN 45%, SFT 35%, Invoicing 20%
    const overallScore = Math.round(hsnScore * 0.45 + sftScore * 0.35 + invoiceScore * 0.2);

    return { overallScore, hsnScore, sftScore, invoiceScore };
  }, [data]);

  // Combine live HSN data with all canonical categories so every core stone atelier line is represented
  const canonicalHsnList = useMemo(() => {
    const liveMap = new Map<string, HsnGroupSummary>();
    if (data?.hsnSummary) {
      for (const item of data.hsnSummary) {
        liveMap.set(item.hsn4, item);
      }
    }

    return CANONICAL_CATEGORIES.map((cat) => {
      const live = liveMap.get(cat.hsn4);
      if (live) return live;
      return {
        hsn4: cat.hsn4,
        categoryName: cat.name,
        soldQty: 0,
        soldValue: 0,
        purchasedQty: 0,
        purchasedValue: 0,
        deficitQty: 0,
        deficitValue: 0,
        unit: cat.unit,
        status: "balanced" as const,
      };
    });
  }, [data?.hsnSummary]);

  return (
    <Card className="border-border/80 shadow-sm overflow-hidden bg-gradient-to-b from-card to-muted/10 w-full max-w-full">
      <CardHeader className="p-4 sm:p-5 border-b border-border/70 bg-muted/20 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-200 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5"
              >
                <ShieldAlert className="h-3 w-3 mr-1 text-purple-700" /> Super Admin Executive Radar
              </Badge>
              {data && (
                <Badge variant="secondary" className="text-xs font-semibold">
                  {data.fyLabel} (1 Apr – 31 Mar)
                </Badge>
              )}
            </div>
            <CardTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <span>Financial Compliance &amp; Statutory Health Radar</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Real-time interactive meters auditing 4-digit HSN purchase invoice deficits, personal
              savings account ₹10L SFT statutory ceilings (Income Tax Sec 285BA), and cash deal
              channel inflows.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
              className="h-8 text-xs cursor-pointer"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", query.isFetching && "animate-spin")} />
              Refresh Radar
            </Button>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* EXECUTIVE SPEEDOMETER & HEALTH METER COCKPIT HERO STRIP            */}
        {/* ------------------------------------------------------------------ */}
        <div className="mt-4 pt-4 border-t border-border/60 grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-card/60 rounded-2xl p-3 sm:p-4 border border-border/50 shadow-2xs">
          {/* Main Speedometer Gauge */}
          <div className="md:col-span-5 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border/60 pb-3 md:pb-0 md:pr-4">
            <SpeedometerGauge
              value={healthMetrics.overallScore}
              max={100}
              label="Statutory Health Index"
              sublabel="Composite Audit & Inward Balancing Score"
              unit="%"
              size="md"
              mode="health"
              statusText={
                healthMetrics.overallScore >= 80
                  ? "🟢 Audit-Proof · Optimal Health"
                  : healthMetrics.overallScore >= 50
                    ? "🟡 Moderate Exposure"
                    : "🔴 Deficit Red Alert"
              }
            />
          </div>

          {/* Three Sub-meters Rollup */}
          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Meter 1: HSN Balancing */}
            <div
              onClick={() => setActiveTab("hsn")}
              className={cn(
                "p-3 rounded-xl border transition-all cursor-pointer text-center space-y-1",
                activeTab === "hsn"
                  ? "bg-purple-50 dark:bg-purple-950/40 border-purple-400 ring-2 ring-purple-400/20 shadow-xs"
                  : "bg-background/80 border-border/70 hover:bg-muted/40",
              )}
            >
              <div className="flex items-center justify-center text-purple-700 dark:text-purple-300">
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                <span className="text-[11px] font-bold">HSN Inward Cover</span>
              </div>
              <div className="font-mono text-xl font-black text-foreground">
                {healthMetrics.hsnScore}%
              </div>
              <div className="text-[10px] text-muted-foreground">
                {deficitCount === 0 ? "100% Covered" : `${deficitCount} Inward Deficits`}
              </div>
            </div>

            {/* Meter 2: SFT Personal UPI */}
            <div
              onClick={() => setActiveTab("upi")}
              className={cn(
                "p-3 rounded-xl border transition-all cursor-pointer text-center space-y-1",
                activeTab === "upi"
                  ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400 ring-2 ring-amber-400/20 shadow-xs"
                  : "bg-background/80 border-border/70 hover:bg-muted/40",
              )}
            >
              <div className="flex items-center justify-center text-amber-700 dark:text-amber-400">
                <Smartphone className="h-4 w-4 mr-1" />
                <span className="text-[11px] font-bold">SFT Headroom</span>
              </div>
              <div className="font-mono text-xl font-black text-foreground">
                {healthMetrics.sftScore}%
              </div>
              <div className="text-[10px] text-muted-foreground">₹10L Statutory Safe</div>
            </div>

            {/* Meter 3: Tax Invoiced Ratio */}
            <div
              onClick={() => setActiveTab("cash")}
              className={cn(
                "p-3 rounded-xl border transition-all cursor-pointer text-center space-y-1",
                activeTab === "cash"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-400/20 shadow-xs"
                  : "bg-background/80 border-border/70 hover:bg-muted/40",
              )}
            >
              <div className="flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                <Receipt className="h-4 w-4 mr-1" />
                <span className="text-[11px] font-bold">GST Invoicing</span>
              </div>
              <div className="font-mono text-xl font-black text-foreground">
                {healthMetrics.invoiceScore}%
              </div>
              <div className="text-[10px] text-muted-foreground">Billed vs Cash Deals</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 pt-3 border-t border-border/50 overflow-x-auto w-full">
          <button
            type="button"
            onClick={() => setActiveTab("hsn")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "hsn"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>1. 4-Digit HSN Purchase Radar</span>
            {deficitCount > 0 ? (
              <span className="rounded-full bg-rose-500 text-white px-1.5 py-0.2 text-[10px] font-bold">
                {deficitCount} Deficits
              </span>
            ) : (
              <span className="rounded-full bg-emerald-600 text-white px-1.5 py-0.2 text-[9px] font-bold">
                Balanced
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("upi")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "upi"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>2. Personal Accounts SFT Limits (₹10L)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cash")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
              activeTab === "cash"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <PieChart className="h-3.5 w-3.5" />
            <span>3. Cash Deals &amp; Inflow Breakdown</span>
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 w-full">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground text-xs animate-pulse">
            Auditing 4-digit HSN inward/outward invoices and personal account SFT thresholds…
          </div>
        ) : !data ? (
          <div className="py-8 text-center text-muted-foreground text-xs">
            Financial telemetry currently unavailable.
          </div>
        ) : (
          <div className="space-y-6 w-full">
            {/* -------------------------------------------------------------- */}
            {/* TAB 1: 4-DIGIT HSN PURCHASE DEFICIT RADAR                       */}
            {/* -------------------------------------------------------------- */}
            {activeTab === "hsn" && (
              <div className="space-y-6 w-full">
                {/* 1. Interactive Canonical Category Tiles with Mini Radial Dials */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-foreground mb-2.5">
                    <span>
                      Core Product Categories &amp; Inward Coverage Dials (Click to Inspect)
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      Benchmark: Equated strictly by 1st 4 numbers of HSN
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    {canonicalHsnList.map((item) => {
                      const isSelected = selectedHsnTile === item.hsn4;
                      const hasDeficit = item.status === "deficit" || item.deficitQty > 0;
                      const coveragePct =
                        item.soldQty > 0
                          ? Math.min(100, Math.round((item.purchasedQty / item.soldQty) * 100))
                          : 100;

                      return (
                        <div
                          key={item.hsn4}
                          onClick={() => setSelectedHsnTile(item.hsn4)}
                          className={cn(
                            "p-3 rounded-xl border transition-all cursor-pointer text-left space-y-2 relative overflow-hidden",
                            isSelected
                              ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 shadow-xs ring-2 ring-purple-600/20"
                              : hasDeficit
                                ? "border-rose-300 bg-rose-50/50 dark:bg-rose-950/20 hover:border-rose-400"
                                : "border-border/70 bg-card hover:bg-muted/30 hover:border-border",
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono font-bold text-xs text-primary">
                              HSN {item.hsn4}
                            </span>
                            <MiniRadialMeter
                              percentage={coveragePct}
                              size={36}
                              strokeWidth={4}
                              status={hasDeficit ? "deficit" : "balanced"}
                            />
                          </div>

                          <div>
                            <div
                              className="font-semibold text-xs text-foreground truncate"
                              title={item.categoryName}
                            >
                              {item.categoryName}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {item.soldQty > 0 ? `${item.soldQty} ${item.unit} sold` : "0 billed"}
                            </div>
                          </div>

                          <div className="pt-1 border-t border-border/40">
                            {hasDeficit ? (
                              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Deficit: {item.deficitQty} {item.unit}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                100% Inward Covered
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Interactive Live What-If Balancing Simulator */}
                <HsnInteractiveSimulator
                  defaultHsn={selectedHsnTile}
                  defaultSold={318}
                  defaultPurchased={318}
                />

                {/* 3. Detailed Audit Table of Inward Purchases vs Outward Sales */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span>Itemized HSN Inward vs Outward Ledger ({data.fyLabel})</span>
                    <Button asChild size="sm" variant="ghost" className="h-7 text-xs text-primary">
                      <Link to="/purchase-invoices">Go to Purchase Invoices &rarr;</Link>
                    </Button>
                  </div>

                  <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="w-24 font-bold text-xs">HSN (4-Digit)</TableHead>
                          <TableHead className="font-bold text-xs">Product Category</TableHead>
                          <TableHead className="text-right font-bold text-xs">
                            Billed Outward (Sales)
                          </TableHead>
                          <TableHead className="text-right font-bold text-xs">
                            Inward Covered (Purchases)
                          </TableHead>
                          <TableHead className="text-right font-bold text-xs">
                            Purchase Invoices Deficit
                          </TableHead>
                          <TableHead className="w-32 text-center font-bold text-xs">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {canonicalHsnList.map((row) => (
                          <TableRow
                            key={row.hsn4}
                            className={cn(
                              row.status === "deficit"
                                ? "bg-rose-50/40 hover:bg-rose-50/60 dark:bg-rose-950/20"
                                : "hover:bg-muted/30",
                            )}
                          >
                            <TableCell className="font-mono font-bold text-xs text-primary">
                              {row.hsn4}
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-xs text-foreground">
                                {row.categoryName}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                Base Unit: {row.unit}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              <div className="font-semibold font-mono">
                                {row.soldQty} {row.unit}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {formatInr(row.soldValue)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              <div className="font-semibold font-mono text-emerald-700 dark:text-emerald-400">
                                {row.purchasedQty} {row.unit}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {formatInr(row.purchasedValue)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {row.deficitQty > 0 ? (
                                <div className="space-y-0.5">
                                  <div className="font-bold font-mono text-rose-700 dark:text-rose-400">
                                    {row.deficitQty} {row.unit}
                                  </div>
                                  <div className="text-[10px] font-bold text-rose-600 font-mono">
                                    {formatInr(row.deficitValue)}
                                  </div>
                                </div>
                              ) : (
                                <span className="font-mono text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-xs">
                              {row.status === "deficit" ? (
                                <Badge className="bg-rose-600 text-white font-bold text-[10px] uppercase">
                                  Needs Bills
                                </Badge>
                              ) : row.status === "surplus" ? (
                                <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                                  Surplus Stock
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-slate-600 dark:text-slate-400 text-[10px]"
                                >
                                  Balanced
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* TAB 2: PERSONAL ACCOUNTS SFT LIMITS (₹10L RULE 114E)           */}
            {/* -------------------------------------------------------------- */}
            {activeTab === "upi" && (
              <div className="space-y-6 w-full">
                {/* 1. Speedometer Automotive Gauges for Raman & Rishi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.personalAccounts.map((account: PersonalAccountScrutiny) => {
                    const isRaman = account.accountKey === "raman";
                    const isCritical = account.riskLevel === "critical";
                    const isHigh = account.riskLevel === "high_risk";
                    const isCaution = account.riskLevel === "caution";

                    return (
                      <Card
                        key={account.accountKey}
                        className={cn(
                          "border-2 overflow-hidden shadow-xs",
                          isCritical
                            ? "border-rose-500 bg-rose-50/20"
                            : isHigh
                              ? "border-amber-500 bg-amber-50/20"
                              : isCaution
                                ? "border-amber-300 bg-amber-50/10"
                                : "border-emerald-500/30 bg-emerald-50/10",
                        )}
                      >
                        <CardHeader className="p-4 pb-2 border-b bg-muted/10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-xl bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-black">
                                {isRaman ? "R" : "Ri"}
                              </div>
                              <div>
                                <CardTitle className="text-sm font-bold text-foreground">
                                  {account.holderName}&apos;s Personal Account (UPI / Bank)
                                </CardTitle>
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  {account.upiVpa} · FY 2026-27
                                </p>
                              </div>
                            </div>

                            <Badge
                              className={cn(
                                "text-[10px] font-bold uppercase",
                                isCritical
                                  ? "bg-rose-600 text-white"
                                  : isHigh
                                    ? "bg-amber-600 text-white"
                                    : isCaution
                                      ? "bg-amber-500 text-white"
                                      : "bg-emerald-600 text-white",
                              )}
                            >
                              {account.riskLevel.replace("_", " ")}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="p-4 space-y-3">
                          {/* Speedometer Gauge Visual */}
                          <div className="flex justify-center py-1">
                            <SpeedometerGauge
                              value={account.cumulativeInflowsInr}
                              max={account.sftLimitInr}
                              label={`${account.holderName}'s SFT Utilization Meter`}
                              sublabel={`₹${formatInr(account.cumulativeInflowsInr)} of ₹10L annual limit`}
                              unit="%"
                              size="md"
                              mode="risk"
                              statusText={`${account.usagePercentage}% Utilized`}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-center pt-1 border-t border-border/50">
                            <div className="p-2 rounded-lg bg-card border border-border/60">
                              <div className="text-[10px] text-muted-foreground">
                                Cumulative Credits
                              </div>
                              <div className="text-xs font-mono font-bold text-foreground">
                                {formatInr(account.cumulativeInflowsInr)}
                              </div>
                            </div>
                            <div className="p-2 rounded-lg bg-card border border-border/60">
                              <div className="text-[10px] text-muted-foreground">
                                Safe Headroom Left
                              </div>
                              <div
                                className={cn(
                                  "text-xs font-mono font-bold",
                                  account.headroomInr > 250000
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : "text-rose-700 dark:text-rose-400",
                                )}
                              >
                                {formatInr(account.headroomInr)}
                              </div>
                            </div>
                          </div>

                          <div className="text-[11px] text-muted-foreground p-2 rounded-lg bg-muted/40 border border-border/50">
                            {account.recommendation}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* 2. Interactive SFT What-If Inflow Simulator */}
                <SftInflowSimulator
                  ramanCurrent={
                    data.personalAccounts.find((a) => a.accountKey === "raman")
                      ?.cumulativeInflowsInr || 0
                  }
                  rishiCurrent={
                    data.personalAccounts.find((a) => a.accountKey === "rishi")
                      ?.cumulativeInflowsInr || 0
                  }
                />
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* TAB 3: CASH DEALS & INFLOW CHANNEL BREAKDOWN                   */}
            {/* -------------------------------------------------------------- */}
            {activeTab === "cash" && (
              <div className="space-y-6 w-full">
                {/* 1. Commercial Pipeline Summary */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-5 p-3 rounded-2xl border bg-card flex flex-col items-center justify-center shadow-2xs">
                    <SpeedometerGauge
                      value={data.cashAnalytics.cashDealAdoptionRate}
                      max={100}
                      label="Cash Deal Penetration Meter"
                      sublabel={`${data.cashAnalytics.cashDealsCount} of ${data.cashAnalytics.totalDealsCount} quotations opted for cash`}
                      unit="%"
                      size="md"
                      mode="risk"
                      statusText={`${data.cashAnalytics.cashDealAdoptionRate}% Cash Deals`}
                    />
                  </div>

                  <div className="md:col-span-7 grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl border bg-card shadow-2xs space-y-1">
                      <div className="text-[11px] text-muted-foreground font-semibold">
                        Total Quotes Evaluated
                      </div>
                      <div className="text-2xl font-black font-mono text-foreground">
                        {data.cashAnalytics.totalDealsCount}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        All closed &amp; pipeline deals
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border bg-card shadow-2xs space-y-1">
                      <div className="text-[11px] text-muted-foreground font-semibold">
                        Proper GST Tax Deals
                      </div>
                      <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                        {data.cashAnalytics.invoicedDealsCount}
                      </div>
                      <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold">
                        {data.cashAnalytics.invoicedAdoptionRate}% of volume
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border bg-card shadow-2xs space-y-1">
                      <div className="text-[11px] text-muted-foreground font-semibold">
                        Cash Deals (Challan)
                      </div>
                      <div className="text-2xl font-black font-mono text-purple-700 dark:text-purple-400">
                        {data.cashAnalytics.cashDealsCount}
                      </div>
                      <div className="text-[10px] text-purple-800 dark:text-purple-300 font-bold">
                        {data.cashAnalytics.cashDealAdoptionRate}% of volume
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border bg-card shadow-2xs space-y-1">
                      <div className="text-[11px] text-muted-foreground font-semibold">
                        Total Realized Cash Pool
                      </div>
                      <div className="text-2xl font-black font-mono text-foreground">
                        {formatInr(data.cashAnalytics.inflows.totalCashPoolInr)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Sum of all 4 cash channels
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Four Inflow Streams Decomposition */}
                <div>
                  <div className="text-xs font-bold text-foreground mb-2.5">
                    Realized Cash Pool Decomposition (4 Financial Channels)
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Channel 1: Physical Currency Notes */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-card space-y-2 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <Banknote className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground">
                            Physical Currency Notes
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Drawer &amp; cashbook receipts
                          </div>
                        </div>
                      </div>
                      <div className="font-mono text-lg font-black text-foreground pt-1">
                        {formatInr(data.cashAnalytics.inflows.currencyNotesInr)}
                      </div>
                      <Progress
                        value={data.cashAnalytics.inflowPercentages.currencyNotesPct}
                        className="h-1.5"
                      />
                      <div className="text-[10px] text-muted-foreground flex justify-between">
                        <span>Share of cash pool</span>
                        <span className="font-bold">
                          {data.cashAnalytics.inflowPercentages.currencyNotesPct}%
                        </span>
                      </div>
                    </div>

                    {/* Channel 2: Personal UPI — Raman */}
                    <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-card space-y-2 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          <Smartphone className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground">
                            Personal UPI — Raman
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Customer UPI credits
                          </div>
                        </div>
                      </div>
                      <div className="font-mono text-lg font-black text-purple-700 dark:text-purple-400 pt-1">
                        {formatInr(data.cashAnalytics.inflows.personalUpiRamanInr)}
                      </div>
                      <Progress
                        value={data.cashAnalytics.inflowPercentages.personalUpiRamanPct}
                        className="h-1.5"
                      />
                      <div className="text-[10px] text-muted-foreground flex justify-between">
                        <span>Share of cash pool</span>
                        <span className="font-bold">
                          {data.cashAnalytics.inflowPercentages.personalUpiRamanPct}%
                        </span>
                      </div>
                    </div>

                    {/* Channel 3: Personal UPI — Rishi */}
                    <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-card space-y-2 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          <Smartphone className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground">
                            Personal UPI — Rishi
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Customer UPI credits
                          </div>
                        </div>
                      </div>
                      <div className="font-mono text-lg font-black text-blue-700 dark:text-blue-400 pt-1">
                        {formatInr(data.cashAnalytics.inflows.personalUpiRishiInr)}
                      </div>
                      <Progress
                        value={data.cashAnalytics.inflowPercentages.personalUpiRishiPct}
                        className="h-1.5"
                      />
                      <div className="text-[10px] text-muted-foreground flex justify-between">
                        <span>Share of cash pool</span>
                        <span className="font-bold">
                          {data.cashAnalytics.inflowPercentages.personalUpiRishiPct}%
                        </span>
                      </div>
                    </div>

                    {/* Channel 4: Customer Direct Vendor Offsets */}
                    <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <ArrowRightLeft className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground">
                            Direct Quarry Offsets
                          </div>
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                            Zero SFT Risk (Bypasses Bank)
                          </div>
                        </div>
                      </div>
                      <div className="font-mono text-lg font-black text-emerald-800 dark:text-emerald-300 pt-1">
                        {formatInr(data.cashAnalytics.inflows.directVendorOffsetsInr)}
                      </div>
                      <Progress
                        value={data.cashAnalytics.inflowPercentages.directVendorOffsetsPct}
                        className="h-1.5"
                      />
                      <div className="text-[10px] text-muted-foreground flex justify-between">
                        <span>Share of cash pool</span>
                        <span className="font-bold">
                          {data.cashAnalytics.inflowPercentages.directVendorOffsetsPct}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
