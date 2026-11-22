import { useState } from "react";
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

export function SuperAdminFinancialRadarCard() {
  const [activeTab, setActiveTab] = useState<"hsn" | "upi" | "cash">("hsn");

  const query = useQuery<SuperAdminFinanceReport>({
    queryKey: ["superadmin-finance-report"],
    queryFn: () => getSuperAdminFinanceReport(),
    staleTime: 60_000,
  });

  const data = query.data;
  const isLoading = query.isLoading;

  const totalDeficit = data?.totalDeficitValueInr ?? 0;
  const deficitCount = data?.totalDeficitCount ?? 0;

  return (
    <Card className="border-border/80 shadow-sm overflow-hidden bg-gradient-to-b from-card to-muted/10">
      <CardHeader className="p-4 sm:p-5 border-b border-border/70 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-200 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5"
              >
                <ShieldAlert className="h-3 w-3 mr-1 text-purple-700" /> Super Admin Executive Only
              </Badge>
              {data && (
                <Badge variant="secondary" className="text-xs font-semibold">
                  {data.fyLabel} (1 Apr – 31 Mar)
                </Badge>
              )}
            </div>
            <CardTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <span>Financial Compliance & 4-Digit HSN Balancing Radar</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Automated statutory radar monitoring 4-digit HSN purchase invoice deficits, personal
              savings account ₹10L SFT limits (Income Tax Sec 285BA), and cash deal channel
              breakdown.
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
              Refresh
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 pt-3 border-t border-border/50 overflow-x-auto">
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
            <span>4-Digit HSN Purchase Radar</span>
            {deficitCount > 0 && (
              <span className="rounded-full bg-rose-500 text-white px-1.5 py-0.2 text-[10px] font-bold">
                {deficitCount} Deficits
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
            <span>Personal Accounts SFT Limits (₹10L)</span>
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
            <span>Cash Deals & Inflow Breakdown</span>
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground text-xs animate-pulse">
            Auditing 4-digit HSN inward/outward invoices and personal account SFT thresholds…
          </div>
        ) : !data ? (
          <div className="py-8 text-center text-muted-foreground text-xs">
            Financial telemetry currently unavailable.
          </div>
        ) : (
          <div className="space-y-4">
            {/* TAB 1: 4-DIGIT HSN PURCHASE DEFICIT RADAR */}
            {activeTab === "hsn" && (
              <div className="space-y-4">
                {/* Summary Banner */}
                <div
                  className={cn(
                    "p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                    totalDeficit > 0
                      ? "bg-rose-50/80 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800"
                      : "bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800",
                  )}
                >
                  <div className="flex items-start gap-3">
                    {totalDeficit > 0 ? (
                      <div className="rounded-full bg-rose-100 p-2 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                    ) : (
                      <div className="rounded-full bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        {totalDeficit > 0
                          ? `${deficitCount} HSN Product Categories Lack Adequate Purchase Invoices`
                          : "All Billed HSN Outward Supplies Are Covered by Purchase Invoices"}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-semibold text-foreground">Benchmark Rule:</span>{" "}
                        Products are matched and equated strictly by the first 4 numbers of the HSN
                        code. Deficit indicates outward customer bills generated without
                        corresponding quarry/supplier inward bills.
                      </p>
                    </div>
                  </div>

                  {totalDeficit > 0 && (
                    <div className="text-right sm:border-l sm:border-rose-200 sm:pl-4">
                      <div className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">
                        Required Inward Bills Value
                      </div>
                      <div className="text-lg font-black text-rose-700 dark:text-rose-400">
                        {formatInr(totalDeficit)}
                      </div>
                    </div>
                  )}
                </div>

                {/* HSN Comparison Table */}
                <div className="rounded-lg border border-border overflow-hidden">
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
                        <TableHead className="w-28 text-center font-bold text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.hsnSummary.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-6 text-xs text-muted-foreground"
                          >
                            No outward sales invoices found for {data.fyLabel}.
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.hsnSummary.map((row: HsnGroupSummary) => (
                          <TableRow
                            key={row.hsn4}
                            className={cn(
                              row.status === "deficit"
                                ? "bg-rose-50/30 hover:bg-rose-50/50 dark:bg-rose-950/10"
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
                              <div className="font-bold text-foreground">
                                {row.soldQty} {row.unit}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {formatInr(row.soldValue)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              <div className="font-bold text-foreground">
                                {row.purchasedQty} {row.unit}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {formatInr(row.purchasedValue)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {row.deficitQty > 0 ? (
                                <div className="space-y-0.5">
                                  <div className="font-black text-rose-700 dark:text-rose-400">
                                    {row.deficitQty} {row.unit}
                                  </div>
                                  <div className="text-[10px] font-bold text-rose-600 dark:text-rose-300">
                                    Deficit: {formatInr(row.deficitValue)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                                  0 {row.unit} (Covered)
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {row.status === "deficit" ? (
                                <Badge
                                  variant="outline"
                                  className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold uppercase tracking-wider"
                                >
                                  🚨 Needs Inward Bills
                                </Badge>
                              ) : row.status === "surplus" ? (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-medium"
                                >
                                  Inward Surplus
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-medium"
                                >
                                  ✅ Balanced
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Need to add supplier invoices to balance these HSN items? Record them in
                    Purchase Invoices or GRN Receipts.
                  </span>
                  <Link
                    to="/purchase-invoices"
                    className="inline-flex items-center text-primary font-bold hover:underline"
                  >
                    Go to Purchase Invoices →
                  </Link>
                </div>
              </div>
            )}

            {/* TAB 2: PERSONAL ACCOUNTS SFT LIMITS RADAR */}
            {activeTab === "upi" && (
              <div className="space-y-4">
                {/* Statutory Warning Box */}
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 flex items-start gap-3">
                  <div className="rounded-full bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 shrink-0">
                    <Scale className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 text-xs text-amber-950 dark:text-amber-200">
                    <h4 className="font-bold text-sm">
                      Income Tax Act Rule 114E (SFT-004) & Section 68 Scrutiny Shield
                    </h4>
                    <p className="leading-relaxed text-muted-foreground">
                      Indian banks are statutorily mandated to submit an annual{" "}
                      <strong>Statement of Financial Transactions (SFT)</strong> to the Income Tax
                      Department whenever cash or high-velocity business credits in a personal
                      savings account reach or exceed <strong>₹10,00,000 per financial year</strong>
                      . Exceeding this ceiling risks computer-assisted scrutiny notices under
                      Section 148A/68 with tax rates up to 78%.
                    </p>
                  </div>
                </div>

                {/* Account Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.personalAccounts.map((acc: PersonalAccountScrutiny) => {
                    const isHigh = acc.riskLevel === "high_risk" || acc.riskLevel === "critical";
                    const isCaution = acc.riskLevel === "caution";
                    const progressColor =
                      acc.riskLevel === "critical"
                        ? "bg-rose-600"
                        : acc.riskLevel === "high_risk"
                          ? "bg-amber-600"
                          : acc.riskLevel === "caution"
                            ? "bg-amber-500"
                            : "bg-emerald-600";

                    return (
                      <div
                        key={acc.accountKey}
                        className={cn(
                          "p-4 rounded-xl border space-y-3.5 transition-all",
                          isHigh
                            ? "bg-rose-50/40 border-rose-300 dark:bg-rose-950/20 shadow-xs"
                            : isCaution
                              ? "bg-amber-50/30 border-amber-200 dark:bg-amber-950/10"
                              : "bg-card border-border",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-primary/10 p-2 text-primary">
                              <Smartphone className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-bold text-sm text-foreground">
                                {acc.holderName} — {acc.accountName}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {acc.transactionCount} transactions logged in {acc.fyLabel}
                              </div>
                            </div>
                          </div>

                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-bold uppercase tracking-wider",
                              acc.riskLevel === "critical" &&
                                "bg-rose-100 text-rose-900 border-rose-300 animate-pulse",
                              acc.riskLevel === "high_risk" &&
                                "bg-amber-100 text-amber-900 border-amber-300",
                              acc.riskLevel === "caution" &&
                                "bg-yellow-100 text-yellow-900 border-yellow-300",
                              acc.riskLevel === "safe" &&
                                "bg-emerald-100 text-emerald-900 border-emerald-300",
                            )}
                          >
                            {acc.riskLevel === "critical"
                              ? "🔴 Critical SFT Risk"
                              : acc.riskLevel === "high_risk"
                                ? "🟠 High Risk"
                                : acc.riskLevel === "caution"
                                  ? "🟡 Moderate"
                                  : "🟢 Safe Headroom"}
                          </Badge>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-medium">
                              Cumulative FY Inflow:{" "}
                              <strong className="text-foreground">
                                {formatInr(acc.cumulativeInflowsInr)}
                              </strong>
                            </span>
                            <span className="font-bold text-foreground">
                              {acc.usagePercentage}% of ₹10L Limit
                            </span>
                          </div>

                          <div className="w-full bg-muted/60 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={cn("h-full transition-all duration-500", progressColor)}
                              style={{ width: `${Math.min(100, acc.usagePercentage)}%` }}
                            />
                          </div>

                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                              Headroom remaining before SFT notice: {formatInr(acc.headroomInr)}
                            </span>
                            <span className="text-muted-foreground">Limit: ₹10,00,000</span>
                          </div>
                        </div>

                        {/* Action Guidance */}
                        <div
                          className={cn(
                            "p-2.5 rounded-lg text-xs leading-relaxed",
                            isHigh
                              ? "bg-rose-100/70 text-rose-950 dark:bg-rose-900/40 dark:text-rose-200 border border-rose-200"
                              : "bg-muted/40 text-muted-foreground border border-border/50",
                          )}
                        >
                          <span className="font-bold text-foreground block mb-0.5">
                            Executive Recommendation:
                          </span>
                          {acc.recommendation}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: CASH DEALS & INFLOW CHANNELS */}
            {activeTab === "cash" && (
              <div className="space-y-5">
                {/* Top KPI Cards: Cash vs Invoiced Adoption */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl border border-border bg-card">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Total Quotations / Deals
                    </div>
                    <div className="text-xl font-black text-foreground mt-1">
                      {data.cashAnalytics.totalDealsCount}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Pipeline in {data.fyLabel}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20">
                    <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                      Cash Deals (Challan Only)
                    </div>
                    <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                      {data.cashAnalytics.cashDealsCount}
                    </div>
                    <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                      {data.cashAnalytics.cashDealAdoptionRate}% customer adoption
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 dark:bg-blue-950/20">
                    <div className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                      GST Invoiced Deals
                    </div>
                    <div className="text-xl font-black text-blue-700 dark:text-blue-400 mt-1">
                      {data.cashAnalytics.invoicedDealsCount}
                    </div>
                    <div className="text-[11px] text-blue-700 font-semibold mt-0.5">
                      {data.cashAnalytics.invoicedAdoptionRate}% customer adoption
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 dark:bg-purple-950/20">
                    <div className="text-[11px] font-semibold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                      Hybrid Deals (Split)
                    </div>
                    <div className="text-xl font-black text-purple-700 dark:text-purple-400 mt-1">
                      {data.cashAnalytics.hybridDealsCount}
                    </div>
                    <div className="text-[11px] text-purple-700 font-semibold mt-0.5">
                      Part GST + Part Cash
                    </div>
                  </div>
                </div>

                {/* Cash Inflow Decomposition */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Wallet className="h-3.5 w-3.5 text-primary" />
                      Cash Inflow Channels Decomposition
                    </h4>
                    <span className="text-xs font-bold text-foreground">
                      Total Cash Pool:{" "}
                      <span className="text-primary font-black text-sm">
                        {formatInr(data.cashAnalytics.inflows.totalCashPoolInr)}
                      </span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* 1. Currency Notes */}
                    <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Banknote className="h-4 w-4 text-emerald-600" />
                          Currency Notes
                        </span>
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {data.cashAnalytics.inflowPercentages.currencyNotesPct}%
                        </Badge>
                      </div>
                      <div className="text-lg font-black text-foreground">
                        {formatInr(data.cashAnalytics.inflows.currencyNotesInr)}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Physical cash received at counter & logged into drawer cashbook.
                      </p>
                    </div>

                    {/* 2. Raman Personal UPI */}
                    <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Smartphone className="h-4 w-4 text-primary" />
                          Personal UPI (Raman)
                        </span>
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {data.cashAnalytics.inflowPercentages.personalUpiRamanPct}%
                        </Badge>
                      </div>
                      <div className="text-lg font-black text-foreground">
                        {formatInr(data.cashAnalytics.inflows.personalUpiRamanInr)}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Digital personal UPI scanned by customer into Raman's account.
                      </p>
                    </div>

                    {/* 3. Rishi Personal UPI */}
                    <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Smartphone className="h-4 w-4 text-indigo-600" />
                          Personal UPI (Rishi)
                        </span>
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {data.cashAnalytics.inflowPercentages.personalUpiRishiPct}%
                        </Badge>
                      </div>
                      <div className="text-lg font-black text-foreground">
                        {formatInr(data.cashAnalytics.inflows.personalUpiRishiInr)}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Digital personal UPI scanned by customer into Rishi's account.
                      </p>
                    </div>

                    {/* 4. Direct Vendor / Agency Offset */}
                    <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <ArrowRightLeft className="h-4 w-4 text-amber-600" />
                          Direct Vendor Offsets
                        </span>
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {data.cashAnalytics.inflowPercentages.directVendorOffsetsPct}%
                        </Badge>
                      </div>
                      <div className="text-lg font-black text-foreground">
                        {formatInr(data.cashAnalytics.inflows.directVendorOffsetsInr)}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Customer paid quarry/driver directly against deal (zero SFT risk).
                      </p>
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
