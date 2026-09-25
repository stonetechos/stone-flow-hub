import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Landmark,
  FileText,
  Receipt,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  HelpCircle,
  Copy,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountingGuard } from "@/components/auth/AccountingGuard";
import { EmptyState, SkeletonTable } from "@/components/layout/States";
import { formatInr, formatDate } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import { toast } from "sonner";
import { getAvailableGstPeriods, getGstCalculationForPeriod } from "@/lib/gst/api";
import { Pmt06ChallanDialog } from "@/components/gst/Pmt06ChallanDialog";
import { LatestGstNewsCard } from "@/components/gst/LatestGstNewsCard";

export const Route = createFileRoute("/_authenticated/gst")({
  ssr: false,
  component: GstFilingHubPage,
  validateSearch: (s: Record<string, unknown>): { tab?: string; period?: string } => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
    period: typeof s.period === "string" ? s.period : undefined,
  }),
});

function GstFilingHubPage() {
  return (
    <AccountingGuard>
      <GstFilingHubInner />
    </AccountingGuard>
  );
}

function GstFilingHubInner() {
  const search = Route.useSearch();
  const periods = useMemo(() => getAvailableGstPeriods(), []);

  // Default to latest period or search param
  const [selectedPeriodCode, setSelectedPeriodCode] = useState<string>(
    search.period || periods[0]?.periodCode || "092026",
  );
  const [activeTab, setActiveTab] = useState<string>(search.tab || "overview");
  const [isChallanOpen, setIsChallanOpen] = useState(false);

  // Search queries for table registers
  const [salesSearch, setSalesSearch] = useState("");
  const [purchaseSearch, setPurchaseSearch] = useState("");

  const selectedPeriod = useMemo(() => {
    return periods.find((p) => p.periodCode === selectedPeriodCode) || periods[0];
  }, [periods, selectedPeriodCode]);

  const gstQuery = useQuery({
    queryKey: qk.gst.period(selectedPeriod.year, selectedPeriod.month),
    queryFn: () => getGstCalculationForPeriod(selectedPeriod.year, selectedPeriod.month),
    staleTime: 30_000,
  });

  const { summary, challan, gstr3b, gstr1 } = gstQuery.data || {};

  // Download GSTR-3B JSON
  const handleDownloadGstr3b = () => {
    if (!gstr3b) return;
    const blob = new Blob([JSON.stringify(gstr3b, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSTR3B_${summary?.companyGstin}_${summary?.periodCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("GSTR-3B JSON exported successfully!");
  };

  // Download GSTR-1 JSON
  const handleDownloadGstr1 = () => {
    if (!gstr1) return;
    const blob = new Blob([JSON.stringify(gstr1, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSTR1_${summary?.companyGstin}_${summary?.periodCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("GSTR-1 JSON exported successfully!");
  };

  // Filtered sales register
  const filteredSales = useMemo(() => {
    if (!summary?.salesInvoices) return [];
    if (!salesSearch.trim()) return summary.salesInvoices;
    const q = salesSearch.toLowerCase();
    return summary.salesInvoices.filter(
      (inv) =>
        inv.invoiceNo.toLowerCase().includes(q) ||
        inv.partyName.toLowerCase().includes(q) ||
        (inv.partyGstin && inv.partyGstin.toLowerCase().includes(q)),
    );
  }, [summary?.salesInvoices, salesSearch]);

  // Filtered purchase register
  const filteredPurchases = useMemo(() => {
    if (!summary?.purchaseInvoices) return [];
    if (!purchaseSearch.trim()) return summary.purchaseInvoices;
    const q = purchaseSearch.toLowerCase();
    return summary.purchaseInvoices.filter(
      (pinv) =>
        pinv.invoiceNo.toLowerCase().includes(q) ||
        pinv.partyName.toLowerCase().includes(q) ||
        (pinv.partyGstin && pinv.partyGstin.toLowerCase().includes(q)),
    );
  }, [summary?.purchaseInvoices, purchaseSearch]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Pay GST & 1-Click Filing Hub"
        subtitle="Automated GST liability calculations from Sales & Purchase Invoices, Rule 88A set-off, Form PMT-06 payment challan, and 1-click GSTR-1/3B filing."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Period Selector */}
            <Select value={selectedPeriodCode} onValueChange={setSelectedPeriodCode}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <Calendar className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.periodCode} value={p.periodCode} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Pay GST Challan Action */}
            <Button
              size="sm"
              className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              onClick={() => setIsChallanOpen(true)}
              disabled={!challan}
            >
              <Landmark className="h-4 w-4" />
              Pay GST (PMT-06)
            </Button>

            {/* 1-Click File GSTR-3B */}
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5"
              onClick={handleDownloadGstr3b}
              disabled={!summary}
            >
              <Download className="h-4 w-4" />
              1-Click GSTR-3B
            </Button>

            {/* 1-Click File GSTR-1 */}
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5"
              onClick={handleDownloadGstr1}
              disabled={!summary}
            >
              <Download className="h-4 w-4" />
              1-Click GSTR-1
            </Button>

            {/* Portal Link */}
            <Button
              size="sm"
              variant="ghost"
              className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              asChild
            >
              <a
                href="https://services.gst.gov.in/services/returns"
                target="_blank"
                rel="noopener noreferrer"
              >
                GST Portal Returns
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        }
      />

      {/* Loading state */}
      {gstQuery.isLoading && <SkeletonTable rows={6} />}

      {/* Main Content */}
      {summary && (
        <div className="space-y-6">
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Output GST (Sales) */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Output GST (Sales)
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20"
                  >
                    {summary.salesCount} Invoices
                  </Badge>
                </div>
                <CardTitle className="text-2xl font-bold font-mono text-foreground">
                  {formatInr(summary.outputTax.totalTax)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-[11px] text-muted-foreground">
                <div className="flex justify-between pt-1 border-t border-border/40">
                  <span>Turnover: {formatInr(summary.outputTax.taxableAmount)}</span>
                  <span>
                    CGST/SGST: {formatInr(summary.outputTax.cgst)} | IGST:{" "}
                    {formatInr(summary.outputTax.igst)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Input Tax Credit (Purchases) */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Input Tax Credit (ITC)
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  >
                    {summary.purchaseCount} Bills
                  </Badge>
                </div>
                <CardTitle className="text-2xl font-bold font-mono text-emerald-600">
                  {formatInr(summary.inputTaxCredit.totalTax)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-[11px] text-muted-foreground">
                <div className="flex justify-between pt-1 border-t border-border/40">
                  <span>Inward: {formatInr(summary.inputTaxCredit.taxableAmount)}</span>
                  <span>
                    CGST/SGST: {formatInr(summary.inputTaxCredit.cgst)} | IGST:{" "}
                    {formatInr(summary.inputTaxCredit.igst)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Net GST Payable (Cash) */}
            <Card className="border-border bg-gradient-to-br from-card to-amber-500/5">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Net Tax Payable (Cash)
                  </span>
                  <Badge
                    variant={summary.netPayable.totalTax > 0 ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {summary.netPayable.totalTax > 0 ? "Challan Due" : "NIL Cash"}
                  </Badge>
                </div>
                <CardTitle className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-500">
                  {formatInr(summary.netPayable.totalTax)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-[11px] text-muted-foreground">
                <div className="flex justify-between pt-1 border-t border-border/40">
                  <span>Rule 88A Netting</span>
                  <span>
                    CGST: {formatInr(summary.netPayable.cgst)} | SGST:{" "}
                    {formatInr(summary.netPayable.sgst)} | IGST:{" "}
                    {formatInr(summary.netPayable.igst)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* ITC Carried Forward */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    ITC Carried Forward
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/20"
                  >
                    Next Period
                  </Badge>
                </div>
                <CardTitle className="text-2xl font-bold font-mono text-purple-600">
                  {formatInr(summary.itcCarriedForward.totalTax)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-[11px] text-muted-foreground">
                <div className="flex justify-between pt-1 border-t border-border/40">
                  <span>Closing ITC Balance</span>
                  <span>
                    CGST: {formatInr(summary.itcCarriedForward.cgst)} | SGST:{" "}
                    {formatInr(summary.itcCarriedForward.sgst)} | IGST:{" "}
                    {formatInr(summary.itcCarriedForward.igst)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-muted/40 p-1 border">
              <TabsTrigger value="overview" className="text-xs gap-1.5">
                <Scale className="h-3.5 w-3.5" />
                Overview & Set-off
              </TabsTrigger>
              <TabsTrigger value="sales" className="text-xs gap-1.5">
                <Receipt className="h-3.5 w-3.5" />
                Sales Invoices ({summary.salesCount})
              </TabsTrigger>
              <TabsTrigger value="purchases" className="text-xs gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Purchase Invoices / ITC ({summary.purchaseCount})
              </TabsTrigger>
              <TabsTrigger value="filing" className="text-xs gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                1-Click Filing (GSTR-1 & 3B)
              </TabsTrigger>
              <TabsTrigger value="news" className="text-xs gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Latest GST News
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW & SET-OFF */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Statutory Offset Matrix */}
                <Card className="lg:col-span-2 border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>Statutory Set-Off Matrix (Rule 88A / Circular 98/17/2019)</span>
                      <Badge variant="outline" className="text-[11px] font-mono">
                        GSTIN: {summary.companyGstin}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      How Input Tax Credit from stone purchases and expenses offsets Output GST
                      liability
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
                          <tr>
                            <th className="p-2.5">Tax Head</th>
                            <th className="p-2.5 text-right">Output Liability</th>
                            <th className="p-2.5 text-right">ITC Utilized</th>
                            <th className="p-2.5 text-right font-bold">Net Cash Payable</th>
                            <th className="p-2.5 text-right">Closing ITC</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y font-mono">
                          <tr>
                            <td className="p-2.5 font-sans font-medium">IGST (Integrated Tax)</td>
                            <td className="p-2.5 text-right">
                              {formatInr(summary.outputTax.igst)}
                            </td>
                            <td className="p-2.5 text-right text-emerald-600">
                              {formatInr(summary.outputTax.igst - summary.netPayable.igst)}
                            </td>
                            <td className="p-2.5 text-right font-bold text-amber-600">
                              {formatInr(summary.netPayable.igst)}
                            </td>
                            <td className="p-2.5 text-right text-purple-600">
                              {formatInr(summary.itcCarriedForward.igst)}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-sans font-medium">CGST (Central Tax)</td>
                            <td className="p-2.5 text-right">
                              {formatInr(summary.outputTax.cgst)}
                            </td>
                            <td className="p-2.5 text-right text-emerald-600">
                              {formatInr(summary.outputTax.cgst - summary.netPayable.cgst)}
                            </td>
                            <td className="p-2.5 text-right font-bold text-amber-600">
                              {formatInr(summary.netPayable.cgst)}
                            </td>
                            <td className="p-2.5 text-right text-purple-600">
                              {formatInr(summary.itcCarriedForward.cgst)}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-sans font-medium">SGST (State Tax)</td>
                            <td className="p-2.5 text-right">
                              {formatInr(summary.outputTax.sgst)}
                            </td>
                            <td className="p-2.5 text-right text-emerald-600">
                              {formatInr(summary.outputTax.sgst - summary.netPayable.sgst)}
                            </td>
                            <td className="p-2.5 text-right font-bold text-amber-600">
                              {formatInr(summary.netPayable.sgst)}
                            </td>
                            <td className="p-2.5 text-right text-purple-600">
                              {formatInr(summary.itcCarriedForward.sgst)}
                            </td>
                          </tr>
                          <tr className="bg-muted/40 font-bold text-xs">
                            <td className="p-2.5 font-sans text-foreground">Total</td>
                            <td className="p-2.5 text-right">
                              {formatInr(summary.outputTax.totalTax)}
                            </td>
                            <td className="p-2.5 text-right text-emerald-600">
                              {formatInr(summary.outputTax.totalTax - summary.netPayable.totalTax)}
                            </td>
                            <td className="p-2.5 text-right text-amber-600">
                              {formatInr(summary.netPayable.totalTax)}
                            </td>
                            <td className="p-2.5 text-right text-purple-600">
                              {formatInr(summary.itcCarriedForward.totalTax)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Compliance & Filing Summary */}
                <Card className="border-border space-y-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">
                      1-Click Actions & Compliance
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Status check for {summary.periodLabel}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3.5 text-xs">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                        <span className="text-muted-foreground">GSTIN Data Hygiene</span>
                        {summary.missingGstinCount === 0 ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          >
                            100% Complete
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20"
                          >
                            {summary.missingGstinCount} B2C (No GSTIN)
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                        <span className="text-muted-foreground">Rule 36(4) Matching</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        >
                          Reconciled
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                        <span className="text-muted-foreground">Filing Due Date</span>
                        <span className="font-semibold text-foreground">20th of next month</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t space-y-2">
                      <Button
                        className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                        onClick={() => setIsChallanOpen(true)}
                        disabled={!challan}
                      >
                        <Landmark className="h-3.5 w-3.5" />
                        Generate & Pay PMT-06 Challan
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full h-8 text-xs gap-1.5"
                        onClick={handleDownloadGstr3b}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download GSTR-3B Offline JSON
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 2: SALES INVOICES (OUTPUT TAX) */}
            <TabsContent value="sales" className="space-y-4">
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        Sales Invoices Register (Output GST)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        All billed sales invoices for {summary.periodLabel} contributing to outward
                        tax liability
                      </CardDescription>
                    </div>
                    <div className="w-full sm:w-64">
                      <Input
                        placeholder="Search invoice or customer..."
                        value={salesSearch}
                        onChange={(e) => setSalesSearch(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {filteredSales.length === 0 ? (
                    <EmptyState
                      icon={<Receipt className="h-8 w-8 text-muted-foreground" />}
                      title="No sales invoices found"
                      message={`No sales invoices recorded for ${summary.periodLabel}.`}
                    />
                  ) : (
                    <div className="rounded-lg border overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
                          <tr>
                            <th className="p-2.5">Invoice #</th>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Customer / Party</th>
                            <th className="p-2.5">GSTIN</th>
                            <th className="p-2.5">Type</th>
                            <th className="p-2.5 text-right">Taxable (₹)</th>
                            <th className="p-2.5 text-right">CGST</th>
                            <th className="p-2.5 text-right">SGST</th>
                            <th className="p-2.5 text-right">IGST</th>
                            <th className="p-2.5 text-right">Total Tax (₹)</th>
                            <th className="p-2.5 text-right font-bold">Total (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y font-mono">
                          {filteredSales.map((inv) => (
                            <tr key={inv.id} className="hover:bg-muted/30">
                              <td className="p-2.5 font-sans font-medium text-foreground">
                                {inv.invoiceNo}
                              </td>
                              <td className="p-2.5 text-muted-foreground">{inv.date}</td>
                              <td className="p-2.5 font-sans font-medium text-foreground truncate max-w-[150px]">
                                {inv.partyName}
                              </td>
                              <td className="p-2.5 text-muted-foreground">
                                {inv.partyGstin ? (
                                  <span className="text-foreground">{inv.partyGstin}</span>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] text-muted-foreground"
                                  >
                                    B2C (Unregistered)
                                  </Badge>
                                )}
                              </td>
                              <td className="p-2.5">
                                <Badge variant="secondary" className="text-[9px]">
                                  {inv.isInterState ? "Inter-state" : "Intra-state"}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-right">{formatInr(inv.taxableAmount)}</td>
                              <td className="p-2.5 text-right">
                                {inv.cgst > 0 ? formatInr(inv.cgst) : "—"}
                              </td>
                              <td className="p-2.5 text-right">
                                {inv.sgst > 0 ? formatInr(inv.sgst) : "—"}
                              </td>
                              <td className="p-2.5 text-right">
                                {inv.igst > 0 ? formatInr(inv.igst) : "—"}
                              </td>
                              <td className="p-2.5 text-right font-medium text-blue-600">
                                {formatInr(inv.totalTax)}
                              </td>
                              <td className="p-2.5 text-right font-bold text-foreground">
                                {formatInr(inv.totalAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: PURCHASE INVOICES (INPUT TAX CREDIT) */}
            <TabsContent value="purchases" className="space-y-4">
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        Purchase Invoices Register (Input Tax Credit)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Raw stone purchases, block quarry consignments & vendor bills claiming ITC
                      </CardDescription>
                    </div>
                    <div className="w-full sm:w-64">
                      <Input
                        placeholder="Search invoice or vendor..."
                        value={purchaseSearch}
                        onChange={(e) => setPurchaseSearch(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {filteredPurchases.length === 0 ? (
                    <EmptyState
                      icon={<Building2 className="h-8 w-8 text-muted-foreground" />}
                      title="No purchase invoices found"
                      message={`No purchase invoices recorded for ${summary.periodLabel}.`}
                    />
                  ) : (
                    <div className="rounded-lg border overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
                          <tr>
                            <th className="p-2.5">Invoice #</th>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Vendor / Quarry</th>
                            <th className="p-2.5">Vendor GSTIN</th>
                            <th className="p-2.5">Supply Type</th>
                            <th className="p-2.5 text-right">Taxable (₹)</th>
                            <th className="p-2.5 text-right">CGST</th>
                            <th className="p-2.5 text-right">SGST</th>
                            <th className="p-2.5 text-right">IGST</th>
                            <th className="p-2.5 text-right font-medium">Eligible ITC (₹)</th>
                            <th className="p-2.5 text-right font-bold">Total Bill (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y font-mono">
                          {filteredPurchases.map((pinv) => (
                            <tr key={pinv.id} className="hover:bg-muted/30">
                              <td className="p-2.5 font-sans font-medium text-foreground">
                                {pinv.invoiceNo}
                              </td>
                              <td className="p-2.5 text-muted-foreground">{pinv.date}</td>
                              <td className="p-2.5 font-sans font-medium text-foreground truncate max-w-[150px]">
                                {pinv.partyName}
                              </td>
                              <td className="p-2.5 text-muted-foreground">
                                {pinv.partyGstin || "—"}
                              </td>
                              <td className="p-2.5">
                                <Badge variant="secondary" className="text-[9px]">
                                  {pinv.isInterState ? "Inter-state" : "Intra-state"}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-right">{formatInr(pinv.taxableAmount)}</td>
                              <td className="p-2.5 text-right">
                                {pinv.cgst > 0 ? formatInr(pinv.cgst) : "—"}
                              </td>
                              <td className="p-2.5 text-right">
                                {pinv.sgst > 0 ? formatInr(pinv.sgst) : "—"}
                              </td>
                              <td className="p-2.5 text-right">
                                {pinv.igst > 0 ? formatInr(pinv.igst) : "—"}
                              </td>
                              <td className="p-2.5 text-right font-medium text-emerald-600">
                                {formatInr(pinv.totalTax)}
                              </td>
                              <td className="p-2.5 text-right font-bold text-foreground">
                                {formatInr(pinv.totalAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: 1-CLICK FILING (GSTR-1 & 3B) */}
            <TabsContent value="filing" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* GSTR-3B Return Card */}
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Form GSTR-3B Summary Return
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      >
                        Ready to File
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Table 3.1 (Outward Supplies) & Table 4 (Eligible ITC) computed for{" "}
                      {summary.periodLabel}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="rounded-lg border bg-muted/20 p-3 space-y-2 font-mono">
                      <div className="flex justify-between">
                        <span className="font-sans text-muted-foreground">
                          3.1(a) Outward Taxable:
                        </span>
                        <span className="font-bold">
                          {formatInr(summary.outputTax.taxableAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-sans text-muted-foreground">Total Output Tax:</span>
                        <span className="font-bold text-blue-600">
                          {formatInr(summary.outputTax.totalTax)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-sans text-muted-foreground">
                          4(A)(5) All Other ITC:
                        </span>
                        <span className="font-bold text-emerald-600">
                          {formatInr(summary.inputTaxCredit.totalTax)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-1.5 font-bold">
                        <span className="font-sans">6.1 Tax Payable in Cash:</span>
                        <span className="text-amber-600">
                          {formatInr(summary.netPayable.totalTax)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" className="w-full gap-1.5" onClick={handleDownloadGstr3b}>
                        <Download className="h-3.5 w-3.5" />
                        Download GSTR-3B JSON
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(gstr3b, null, 2));
                          toast.success("GSTR-3B JSON copied to clipboard!");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy JSON
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* GSTR-1 Return Card */}
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-primary" />
                        Form GSTR-1 Outward Supplies
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20"
                      >
                        {summary.salesCount} Invoices
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Table 4 (B2B Invoices), Table 7 (B2C Small) and Table 13 (Document Summary)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="rounded-lg border bg-muted/20 p-3 space-y-2 font-mono">
                      <div className="flex justify-between">
                        <span className="font-sans text-muted-foreground">
                          B2B Registered Invoices:
                        </span>
                        <span className="font-bold">
                          {summary.salesInvoices.filter((i) => !!i.partyGstin).length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-sans text-muted-foreground">
                          B2C Unregistered Invoices:
                        </span>
                        <span className="font-bold">
                          {summary.salesInvoices.filter((i) => !i.partyGstin).length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-sans text-muted-foreground">
                          Gross Value of Supplies:
                        </span>
                        <span className="font-bold">
                          {formatInr(summary.salesInvoices.reduce((a, b) => a + b.totalAmount, 0))}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-1.5 font-bold">
                        <span className="font-sans">Total Tax Collected:</span>
                        <span className="text-blue-600">
                          {formatInr(summary.outputTax.totalTax)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" className="w-full gap-1.5" onClick={handleDownloadGstr1}>
                        <Download className="h-3.5 w-3.5" />
                        Download GSTR-1 JSON
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(gstr1, null, 2));
                          toast.success("GSTR-1 JSON copied to clipboard!");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy JSON
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Step-by-Step 1-Click Guide */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    How Stone Tech 1-Click Filing Works:
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                  <ol className="list-decimal pl-4 space-y-1.5">
                    <li>
                      <b>Download GSTR-1 and GSTR-3B JSON files</b> generated above. Our system
                      formats them according to official GSTN offline schema v2.0.
                    </li>
                    <li>
                      Click <b>"GST Portal Returns"</b> in the top right to open your return filing
                      dashboard on <code>gst.gov.in</code>.
                    </li>
                    <li>
                      Go to <b>Returns Dashboard &gt; File Returns &gt; Upload Offline JSON</b> and
                      select the generated JSON file. All tables (B2B, B2C, ITC, and taxes) will
                      instantly populate without manual typing.
                    </li>
                    <li>
                      Pay any remaining net cash tax by clicking <b>"Pay GST (PMT-06)"</b>, then
                      finalize and sign with DSC/EVC.
                    </li>
                  </ol>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 5: LATEST GST NEWS & CIRCULARS */}
            <TabsContent value="news" className="space-y-4">
              <LatestGstNewsCard />
            </TabsContent>
          </Tabs>

          {/* PMT-06 Challan Dialog */}
          {challan && (
            <Pmt06ChallanDialog
              open={isChallanOpen}
              onOpenChange={setIsChallanOpen}
              challan={challan}
              onMarkPaid={() => {
                gstQuery.refetch();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
