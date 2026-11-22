import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ShieldAlert,
  AlertTriangle,
  FileSpreadsheet,
  Smartphone,
  Banknote,
  PieChart,
  RefreshCw,
  Info,
  CheckCircle2,
  TrendingUp,
  Receipt,
  Scale,
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
} from "@/lib/dashboard/superadmin-finance";
import {
  SpeedometerGauge,
  MiniRadialMeter,
  HsnInteractiveSimulator,
  SftInflowSimulator,
  THEME_GAUGE_PALETTES,
} from "./StatutoryHealthGauge";
import { useActiveTheme } from "@/components/global/ThemeSwitcher";

const CANONICAL_CATEGORIES = [
  { hsn4: "6802", name: "Natural Stone Claddings & Murals", unit: "sq.ft", defaultRate: 250 },
  { hsn4: "2516", name: "Granite & Sandstone Blocks", unit: "sq.ft", defaultRate: 180 },
  { hsn4: "3214", name: "Adhesives & Tile Mastics", unit: "bag", defaultRate: 900 },
  { hsn4: "3824", name: "Chemical Sealers & Repellents", unit: "ltr", defaultRate: 2500 },
  { hsn4: "9954", name: "Fixing Labour Services", unit: "sq.ft", defaultRate: 80 },
  { hsn4: "9965", name: "Local Carting & Freight", unit: "trip", defaultRate: 2500 },
];

export function SuperAdminFinancialRadarCard() {
  const activeThemeId = useActiveTheme();
  const palette = THEME_GAUGE_PALETTES[activeThemeId] || THEME_GAUGE_PALETTES["st-og"];

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
    <Card className="card-3d-milky w-full max-w-full overflow-hidden border-t-2 border-l-2 border-r border-b-3 border-t-white/95 dark:border-t-white/20 border-b-black/15 dark:border-b-black/50 shadow-[0_16px_36px_-6px_rgba(0,0,0,0.12),inset_0_1.5px_0_rgba(255,255,255,0.9)]">
      <CardHeader className="p-4 sm:p-5 border-b border-border/70 bg-muted/20 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={cn(
                  palette.badgeBg,
                  palette.badgeText,
                  palette.badgeBorder,
                  "text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 shadow-2xs border-t border-b-2",
                )}
              >
                <ShieldAlert className="h-3.5 w-3.5 mr-1.5" style={{ color: palette.primary }} />
                Super Admin Executive Radar
              </Badge>
              {data && (
                <Badge
                  variant="secondary"
                  className="text-xs font-bold border-t border-b-2 shadow-2xs"
                >
                  {data.fyLabel}
                </Badge>
              )}
              {deficitCount > 0 ? (
                <Badge
                  variant="destructive"
                  className="animate-pulse text-xs font-black shadow-2xs border-t border-b-2"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" /> {deficitCount} HSN Inward Deficits (₹
                  {formatInr(totalDeficit)})
                </Badge>
              ) : (
                <Badge className="bg-emerald-600 text-white text-xs font-black shadow-2xs border-t border-b-2">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> 100% Inward Purchase Backed
                </Badge>
              )}
            </div>

            <CardTitle className="text-lg sm:text-xl font-black text-foreground tracking-tight pt-1">
              Financial Compliance &amp; Statutory Health Radar
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Real-time interactive 3D meters auditing 4-digit HSN purchase invoice deficits,
              personal savings account ₹10L SFT statutory ceilings (Income Tax Sec 285BA), and cash
              deal channel inflows.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
              className="h-8 text-xs cursor-pointer font-bold border-t border-b-2 border-black/15 shadow-2xs hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", query.isFetching && "animate-spin")} />
              Refresh Radar
            </Button>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* EXECUTIVE SPEEDOMETER & HEALTH METER COCKPIT HERO STRIP (3D)       */}
        {/* ------------------------------------------------------------------ */}
        <div
          style={{
            background: palette.cardBgGradient,
            boxShadow:
              "0 14px 28px -6px rgba(0,0,0,0.1), 0 4px 10px -2px rgba(0,0,0,0.06), inset 0 1.5px 0 rgba(255,255,255,0.9), inset 0 -2px 0 rgba(0,0,0,0.08)",
          }}
          className={cn(
            "mt-4 pt-4 border-t-2 border-l border-r border-b-3 grid grid-cols-1 md:grid-cols-12 gap-4 items-center rounded-2xl p-3 sm:p-5 transition-all",
            palette.cardBorder,
            "border-t-white/95 dark:border-t-white/20 border-b-black/15 dark:border-b-black/50",
          )}
        >
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

          {/* Three Sub-meters Rollup in 3D */}
          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Meter 1: HSN Balancing */}
            <div
              onClick={() => setActiveTab("hsn")}
              style={
                activeTab === "hsn"
                  ? {
                      background: palette.cardBgGradient,
                      boxShadow: palette.activePillShadow,
                    }
                  : undefined
              }
              className={cn(
                "p-3.5 rounded-2xl border-t-2 border-l border-r border-b-3 transition-all cursor-pointer text-center space-y-1 hover:-translate-y-0.5 active:translate-y-0.5",
                activeTab === "hsn"
                  ? cn(
                      palette.cardBorder,
                      palette.cardRing,
                      "ring-2 scale-[1.02] border-t-white/95 border-b-black/30",
                    )
                  : "bg-card border-border/80 shadow-2xs border-t-white/90 dark:border-t-white/10 border-b-black/15 hover:bg-muted/40",
              )}
            >
              <div
                className="flex items-center justify-center font-extrabold text-xs"
                style={{ color: palette.primary }}
              >
                <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                <span>HSN Inward Cover</span>
              </div>
              <div className="font-mono text-2xl font-black text-foreground drop-shadow-2xs">
                {healthMetrics.hsnScore}%
              </div>
              <div className="text-[10.5px] text-muted-foreground font-semibold">
                {deficitCount === 0 ? "100% Covered" : `${deficitCount} Inward Deficits`}
              </div>
            </div>

            {/* Meter 2: SFT Personal UPI */}
            <div
              onClick={() => setActiveTab("upi")}
              style={
                activeTab === "upi"
                  ? {
                      background: palette.cardBgGradient,
                      boxShadow: palette.activePillShadow,
                    }
                  : undefined
              }
              className={cn(
                "p-3.5 rounded-2xl border-t-2 border-l border-r border-b-3 transition-all cursor-pointer text-center space-y-1 hover:-translate-y-0.5 active:translate-y-0.5",
                activeTab === "upi"
                  ? cn(
                      palette.cardBorder,
                      palette.cardRing,
                      "ring-2 scale-[1.02] border-t-white/95 border-b-black/30",
                    )
                  : "bg-card border-border/80 shadow-2xs border-t-white/90 dark:border-t-white/10 border-b-black/15 hover:bg-muted/40",
              )}
            >
              <div className="flex items-center justify-center font-extrabold text-xs text-amber-600 dark:text-amber-400">
                <Smartphone className="h-4 w-4 mr-1.5" />
                <span>SFT Headroom</span>
              </div>
              <div className="font-mono text-2xl font-black text-foreground drop-shadow-2xs">
                {healthMetrics.sftScore}%
              </div>
              <div className="text-[10.5px] text-muted-foreground font-semibold">
                ₹10L Statutory Safe
              </div>
            </div>

            {/* Meter 3: Tax Invoiced Ratio */}
            <div
              onClick={() => setActiveTab("cash")}
              style={
                activeTab === "cash"
                  ? {
                      background: palette.cardBgGradient,
                      boxShadow: palette.activePillShadow,
                    }
                  : undefined
              }
              className={cn(
                "p-3.5 rounded-2xl border-t-2 border-l border-r border-b-3 transition-all cursor-pointer text-center space-y-1 hover:-translate-y-0.5 active:translate-y-0.5",
                activeTab === "cash"
                  ? cn(
                      palette.cardBorder,
                      palette.cardRing,
                      "ring-2 scale-[1.02] border-t-white/95 border-b-black/30",
                    )
                  : "bg-card border-border/80 shadow-2xs border-t-white/90 dark:border-t-white/10 border-b-black/15 hover:bg-muted/40",
              )}
            >
              <div className="flex items-center justify-center font-extrabold text-xs text-emerald-600 dark:text-emerald-400">
                <Receipt className="h-4 w-4 mr-1.5" />
                <span>GST Invoicing</span>
              </div>
              <div className="font-mono text-2xl font-black text-foreground drop-shadow-2xs">
                {healthMetrics.invoiceScore}%
              </div>
              <div className="text-[10.5px] text-muted-foreground font-semibold">
                Billed vs Cash Deals
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* NAVIGATION TABS BAR (3D TACTILE BUTTONS)                           */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex items-center gap-2 pt-3 border-t border-border/50 overflow-x-auto w-full">
          <button
            type="button"
            onClick={() => setActiveTab("hsn")}
            style={
              activeTab === "hsn"
                ? {
                    background: palette.activePillBg,
                    color: palette.activePillText,
                    boxShadow: palette.activePillShadow,
                  }
                : undefined
            }
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border-t border-b-2 hover:-translate-y-0.5 active:translate-y-0.5",
              activeTab === "hsn"
                ? "border-t-white/40 border-b-black/25"
                : "bg-card text-muted-foreground border-border/80 hover:bg-muted hover:text-foreground shadow-2xs",
            )}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>1. 4-Digit HSN Purchase Radar</span>
            {deficitCount > 0 ? (
              <span className="rounded-full bg-rose-500 text-white px-2 py-0.5 text-[10px] font-bold">
                {deficitCount} Deficits
              </span>
            ) : (
              <span className="rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[9px] font-bold">
                Balanced
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("upi")}
            style={
              activeTab === "upi"
                ? {
                    background: palette.activePillBg,
                    color: palette.activePillText,
                    boxShadow: palette.activePillShadow,
                  }
                : undefined
            }
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border-t border-b-2 hover:-translate-y-0.5 active:translate-y-0.5",
              activeTab === "upi"
                ? "border-t-white/40 border-b-black/25"
                : "bg-card text-muted-foreground border-border/80 hover:bg-muted hover:text-foreground shadow-2xs",
            )}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>2. Personal Accounts SFT Limits (₹10L)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cash")}
            style={
              activeTab === "cash"
                ? {
                    background: palette.activePillBg,
                    color: palette.activePillText,
                    boxShadow: palette.activePillShadow,
                  }
                : undefined
            }
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border-t border-b-2 hover:-translate-y-0.5 active:translate-y-0.5",
              activeTab === "cash"
                ? "border-t-white/40 border-b-black/25"
                : "bg-card text-muted-foreground border-border/80 hover:bg-muted hover:text-foreground shadow-2xs",
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
                {/* 1. Interactive Canonical Category Tiles with 3D Mini Radial Dials */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-foreground mb-2.5">
                    <span>
                      Core Product Categories &amp; Inward Coverage Dials (Click to Inspect)
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      Benchmark: Equated strictly by 1st 4 numbers of HSN
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
                          style={
                            isSelected
                              ? {
                                  background: palette.cardBgGradient,
                                  boxShadow: palette.activePillShadow,
                                }
                              : undefined
                          }
                          className={cn(
                            "p-3.5 rounded-2xl border-t-2 border-l border-r border-b-3 transition-all cursor-pointer text-left space-y-2 relative overflow-hidden shadow-2xs hover:-translate-y-0.5 active:translate-y-0.5",
                            isSelected
                              ? cn(
                                  palette.cardBorder,
                                  palette.cardRing,
                                  "ring-2 scale-[1.02] border-t-white/95 border-b-black/30",
                                )
                              : hasDeficit
                                ? "border-rose-300 bg-rose-50/50 dark:bg-rose-950/20 hover:border-rose-400 border-t-white/80 border-b-rose-400/80"
                                : "border-border/80 bg-card hover:bg-muted/30 border-t-white/90 dark:border-t-white/10 border-b-black/15",
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className="font-mono font-black text-xs"
                              style={{ color: isSelected ? palette.primary : undefined }}
                            >
                              HSN {item.hsn4}
                            </span>
                            <MiniRadialMeter
                              percentage={coveragePct}
                              size={38}
                              strokeWidth={4.5}
                              status={hasDeficit ? "deficit" : "balanced"}
                            />
                          </div>

                          <div>
                            <div
                              className="font-bold text-xs text-foreground truncate"
                              title={item.categoryName}
                            >
                              {item.categoryName}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {item.soldQty > 0 ? `${item.soldQty} ${item.unit} sold` : "0 billed"}
                            </div>
                          </div>

                          <div className="pt-1.5 border-t border-border/40">
                            {hasDeficit ? (
                              <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Deficit: {item.deficitQty} {item.unit}
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
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

                {/* 2. Interactive Live What-If Balancing Simulator (3D & Theme-Adaptive) */}
                <HsnInteractiveSimulator
                  defaultHsn={selectedHsnTile}
                  defaultSold={318}
                  defaultPurchased={318}
                />

                {/* 3. Detailed Audit Table of Inward Purchases vs Outward Sales */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span>Itemized HSN Inward vs Outward Ledger ({data.fyLabel})</span>
                    <Button asChild size="sm" variant="ghost" className="h-7 text-xs font-bold">
                      <Link to="/purchase-invoices" style={{ color: palette.primary }}>
                        Go to Purchase Invoices &rarr;
                      </Link>
                    </Button>
                  </div>

                  <div className="rounded-2xl border-t-2 border-l border-r border-b-3 border-t-white/90 border-b-black/15 border-border/80 overflow-hidden shadow-2xs">
                    <Table>
                      <TableHeader className="bg-muted/40 border-b">
                        <TableRow>
                          <TableHead className="w-24 font-black text-xs">HSN (4-Digit)</TableHead>
                          <TableHead className="font-black text-xs">Product Category</TableHead>
                          <TableHead className="text-right font-black text-xs">
                            Billed Outward (Sales)
                          </TableHead>
                          <TableHead className="text-right font-black text-xs">
                            Inward Covered (Purchases)
                          </TableHead>
                          <TableHead className="text-right font-black text-xs">
                            Purchase Invoices Deficit
                          </TableHead>
                          <TableHead className="w-32 text-center font-black text-xs">
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
                              <div className="text-[10px] text-muted-foreground font-mono">
                                Base Unit: {row.unit}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-mono font-bold text-xs">
                                {row.soldQty} {row.unit}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                ₹{formatInr(row.soldValue)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">
                                {row.purchasedQty} {row.unit}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                ₹{formatInr(row.purchasedValue)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {row.deficitQty > 0 ? (
                                <div>
                                  <div className="font-mono font-black text-xs text-rose-700 dark:text-rose-400">
                                    {row.deficitQty} {row.unit}
                                  </div>
                                  <div className="text-[10px] font-bold text-rose-600 font-mono">
                                    ₹{formatInr(row.deficitValue)} needed
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground font-mono">
                                  &mdash;
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {row.status === "deficit" ? (
                                <Badge
                                  variant="destructive"
                                  className="text-[10px] font-black uppercase tracking-wider"
                                >
                                  🚨 Needs Inward
                                </Badge>
                              ) : row.status === "surplus" ? (
                                <Badge
                                  variant="outline"
                                  className="text-emerald-700 dark:text-emerald-400 border-emerald-400 text-[10px] font-black"
                                >
                                  Surplus Stock
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-slate-600 dark:text-slate-400 text-[10px] font-bold"
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
            {/* TAB 2: PERSONAL SAVINGS ACCOUNTS SFT COMPLIANCE RADAR          */}
            {/* -------------------------------------------------------------- */}
            {activeTab === "upi" && (
              <div className="space-y-6 w-full">
                {/* Statutory Protection Banner */}
                <div className="p-4 rounded-2xl border-t-2 border-l border-r border-b-3 border-amber-300/80 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/20 text-xs text-amber-950 dark:text-amber-200 space-y-1.5 shadow-2xs border-t-white/80 border-b-amber-400/80">
                  <div className="flex items-center gap-2 font-black text-sm text-amber-900 dark:text-amber-100">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Statutory Law Protection: Income Tax Rule 114E (SFT-004 Reporting)</span>
                  </div>
                  <p className="leading-relaxed text-[11.5px]">
                    Banks automatically report personal savings accounts where aggregate cash or
                    electronic credits reach or exceed{" "}
                    <strong>₹10,00,000 in a Financial Year</strong> under Section 285BA. Exceeding
                    this ceiling triggers automated risk profiling, commercial-use freezes by the
                    bank, and Section 68/69A scrutiny notices (taxable at up to 78%).
                  </p>
                </div>

                {/* Individual Raman & Rishi 3D SFT Speedometer Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.personalAccounts.map((account) => {
                    const isRaman = account.accountKey === "raman";
                    const isCritical = account.riskLevel === "critical";
                    const isHigh = account.riskLevel === "high_risk";
                    const isCaution = account.riskLevel === "caution";

                    return (
                      <Card
                        key={account.accountKey}
                        className={cn(
                          "rounded-2xl border-t-2 border-l border-r border-b-3 overflow-hidden shadow-[0_10px_20px_-4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] border-t-white/90 border-b-black/20",
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
                              <div
                                style={{
                                  background: palette.activePillBg,
                                  color: palette.activePillText,
                                }}
                                className="p-2 rounded-xl font-black text-xs shadow-2xs border-t border-white/40"
                              >
                                {isRaman ? "R" : "Ri"}
                              </div>
                              <div>
                                <CardTitle className="text-sm font-black text-foreground">
                                  {account.holderName}&apos;s Personal Account (UPI / Bank)
                                </CardTitle>
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  {account.upiVpa} · FY 2026-27
                                </p>
                              </div>
                            </div>

                            <Badge
                              className={cn(
                                "text-[10px] font-black uppercase shadow-2xs border-t border-b-2",
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
                          {/* 3D Speedometer Gauge Visual */}
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

                          <div className="grid grid-cols-2 gap-2 text-center pt-2 border-t border-border/50">
                            <div className="p-2.5 rounded-xl bg-card border-t-2 border-l border-r border-b-2 border-t-white/90 border-b-black/15 shadow-2xs">
                              <div className="text-[10px] text-muted-foreground font-bold uppercase">
                                Cumulative Credits
                              </div>
                              <div className="text-xs font-mono font-black text-foreground mt-0.5">
                                ₹{formatInr(account.cumulativeInflowsInr)}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-card border-t-2 border-l border-r border-b-2 border-t-white/90 border-b-black/15 shadow-2xs">
                              <div className="text-[10px] text-muted-foreground font-bold uppercase">
                                Safe Headroom Left
                              </div>
                              <div
                                className={cn(
                                  "text-xs font-mono font-black mt-0.5",
                                  account.headroomInr > 250000
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : "text-rose-700 dark:text-rose-400",
                                )}
                              >
                                ₹{formatInr(account.headroomInr)}
                              </div>
                            </div>
                          </div>

                          <div className="text-[11px] p-2.5 rounded-xl bg-muted/40 border border-border/60 text-muted-foreground">
                            {isCritical ? (
                              <strong className="text-rose-700 dark:text-rose-400">
                                🚨 Action: Stop taking UPI in this account immediately. Divert to
                                Current Account.
                              </strong>
                            ) : isHigh ? (
                              <strong className="text-amber-700 dark:text-amber-400">
                                ⚠️ Action: High volume. Route next receipts to other partner or
                                direct vendor offset.
                              </strong>
                            ) : (
                              <span>
                                Headroom remaining is safe. Continue normal business monitoring.
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Interactive 3D SFT Scrutiny Simulator */}
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
            {/* TAB 3: CASH DEALS & INFLOW CHANNEL BREAKDOWN                    */}
            {/* -------------------------------------------------------------- */}
            {activeTab === "cash" && (
              <div className="space-y-6 w-full">
                {/* 1. Commercial Adoption Radar */}
                <div>
                  <div className="text-xs font-bold text-foreground mb-2.5">
                    Commercial Deal Structuring Penetration (Current Financial Year)
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl border-t-2 border-l border-r border-b-3 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-[0_8px_16px_-4px_rgba(0,0,0,0.06)] border-t-white/90 border-b-emerald-400 space-y-1">
                      <div className="text-[11px] text-emerald-900 dark:text-emerald-200 font-bold">
                        Proper GST Tax Invoiced Deals
                      </div>
                      <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                        {data.cashAnalytics.invoicedDealsCount}
                      </div>
                      <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold">
                        {data.cashAnalytics.invoicedAdoptionRate}% of volume
                      </div>
                    </div>

                    <div
                      style={{
                        background: palette.cardBgGradient,
                      }}
                      className={cn(
                        "p-4 rounded-2xl border-t-2 border-l border-r border-b-3 shadow-[0_8px_16px_-4px_rgba(0,0,0,0.06)] space-y-1",
                        palette.cardBorder,
                        "border-t-white/90 border-b-black/15",
                      )}
                    >
                      <div className="text-[11px] text-muted-foreground font-bold">
                        Cash Deals (Challan)
                      </div>
                      <div
                        className="text-2xl font-black font-mono"
                        style={{ color: palette.primary }}
                      >
                        {data.cashAnalytics.cashDealsCount}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-bold">
                        {data.cashAnalytics.cashDealAdoptionRate}% of volume
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl border-t-2 border-l border-r border-b-3 border-border/80 bg-card shadow-[0_8px_16px_-4px_rgba(0,0,0,0.06)] border-t-white/90 border-b-black/15 space-y-1">
                      <div className="text-[11px] text-muted-foreground font-bold">
                        Total Realized Cash Pool
                      </div>
                      <div className="text-2xl font-black font-mono text-foreground">
                        ₹{formatInr(data.cashAnalytics.inflows.totalCashPoolInr)}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium">
                        Sum of all 4 cash channels
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Four Inflow Streams Decomposition in 3D */}
                <div>
                  <div className="text-xs font-bold text-foreground mb-2.5">
                    Realized Cash Pool Decomposition (4 Financial Channels)
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Channel 1: Physical Currency Notes */}
                    <div className="p-4 rounded-2xl border-t-2 border-l border-r border-b-3 border-slate-200 dark:border-slate-800 bg-card space-y-2.5 shadow-[0_8px_16px_-4px_rgba(0,0,0,0.06)] border-t-white/90 border-b-black/15">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shadow-2xs">
                          <Banknote className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground">
                            Physical Currency Notes
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            Drawer &amp; cashbook receipts
                          </div>
                        </div>
                      </div>
                      <div className="font-mono text-xl font-black text-foreground pt-1">
                        ₹{formatInr(data.cashAnalytics.inflows.currencyNotesInr)}
                      </div>
                      <Progress
                        value={data.cashAnalytics.inflowPercentages.currencyNotesPct}
                        className="h-2 rounded-full"
                      />
                      <div className="text-[10px] text-muted-foreground flex justify-between font-mono">
                        <span>Share of cash pool</span>
                        <span className="font-bold">
                          {data.cashAnalytics.inflowPercentages.currencyNotesPct}%
                        </span>
                      </div>
                    </div>

                    {/* Channel 2: Personal UPI — Raman */}
                    <div
                      style={{ background: palette.cardBgGradient }}
                      className={cn(
                        "p-4 rounded-2xl border-t-2 border-l border-r border-b-3 space-y-2.5 shadow-[0_8px_16px_-4px_rgba(0,0,0,0.06)]",
                        palette.cardBorder,
                        "border-t-white/90 border-b-black/15",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          style={{
                            background: palette.activePillBg,
                            color: palette.activePillText,
                          }}
                          className="p-2 rounded-xl shadow-2xs border-t border-white/40"
                        >
                          <Smartphone className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground">
                            Personal UPI — Raman
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            Customer UPI credits
                          </div>
                        </div>
                      </div>
                      <div
                        className="font-mono text-xl font-black pt-1"
                        style={{ color: palette.primary }}
                      >
                        ₹{formatInr(data.cashAnalytics.inflows.personalUpiRamanInr)}
                      </div>
                      <Progress
                        value={data.cashAnalytics.inflowPercentages.personalUpiRamanPct}
                        className="h-2 rounded-full"
                      />
                      <div className="text-[10px] text-muted-foreground flex justify-between font-mono">
                        <span>Share of cash pool</span>
                        <span className="font-bold">
                          {data.cashAnalytics.inflowPercentages.personalUpiRamanPct}%
                        </span>
                      </div>
                    </div>

                    {/* Channel 3: Personal UPI — Rishi */}
                    <div
                      style={{ background: palette.cardBgGradient }}
                      className={cn(
                        "p-4 rounded-2xl border-t-2 border-l border-r border-b-3 space-y-2.5 shadow-[0_8px_16px_-4px_rgba(0,0,0,0.06)]",
                        palette.cardBorder,
                        "border-t-white/90 border-b-black/15",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          style={{
                            background: palette.activePillBg,
                            color: palette.activePillText,
                          }}
                          className="p-2 rounded-xl shadow-2xs border-t border-white/40"
                        >
                          <Smartphone className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground">
                            Personal UPI — Rishi
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            Customer UPI credits
                          </div>
                        </div>
                      </div>
                      <div
                        className="font-mono text-xl font-black pt-1"
                        style={{ color: palette.primary }}
                      >
                        ₹{formatInr(data.cashAnalytics.inflows.personalUpiRishiInr)}
                      </div>
                      <Progress
                        value={data.cashAnalytics.inflowPercentages.personalUpiRishiPct}
                        className="h-2 rounded-full"
                      />
                      <div className="text-[10px] text-muted-foreground flex justify-between font-mono">
                        <span>Share of cash pool</span>
                        <span className="font-bold">
                          {data.cashAnalytics.inflowPercentages.personalUpiRishiPct}%
                        </span>
                      </div>
                    </div>

                    {/* Channel 4: Customer Direct Vendor Offsets */}
                    <div className="p-4 rounded-2xl border-t-2 border-l border-r border-b-3 border-teal-200 dark:border-teal-800 bg-teal-50/40 dark:bg-teal-950/20 space-y-2.5 shadow-[0_8px_16px_-4px_rgba(0,0,0,0.06)] border-t-white/90 border-b-teal-400/80">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-teal-600 text-white shadow-2xs">
                          <Scale className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground">
                            Direct Quarry Offsets
                          </div>
                          <div className="text-[10px] text-teal-800 dark:text-teal-300 font-bold">
                            Zero SFT audit risk!
                          </div>
                        </div>
                      </div>
                      <div className="font-mono text-xl font-black text-teal-700 dark:text-teal-300 pt-1">
                        ₹{formatInr(data.cashAnalytics.inflows.directVendorOffsetsInr)}
                      </div>
                      <Progress
                        value={data.cashAnalytics.inflowPercentages.directVendorOffsetsPct}
                        className="h-2 rounded-full"
                      />
                      <div className="text-[10px] text-muted-foreground flex justify-between font-mono">
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
