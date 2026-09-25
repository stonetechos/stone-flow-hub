import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowLeftRight,
  Wallet,
  Banknote,
  HandCoins,
  Users,
  Factory,
  Layers,
  ArrowUpRight,
  Plus,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Calendar,
  Building2,
  Receipt,
  FileText,
  Landmark,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { AccountingGuard } from "@/components/auth/AccountingGuard";
import { formatInr, formatDate } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { listPaymentRegister, type PaymentRegisterRow } from "@/lib/payments/crud";
import { listVendorPayments, type VendorPaymentListItem } from "@/lib/vendor-payments/api";
import {
  listInstallationLedger,
  listInstallationLedgerSummaries,
  type InstallationLedgerRow,
  type InstallationAgencyLedgerSummary,
} from "@/lib/installation-ledger/api";
import { listInstallationAgencies } from "@/lib/installation-agencies/api";
import { listCustomers } from "@/lib/customers/api";
import { listCustomerLedgerSummaries } from "@/lib/customer-ledger/api";
import { listVendors } from "@/lib/vendors/api";
import { listVendorLedgerSummaries } from "@/lib/vendors/ledger";

type MoneyFlowTab =
  | "overview"
  | "customer-payments"
  | "vendor-payments"
  | "agency-payments"
  | "customer-ledgers"
  | "vendor-ledgers"
  | "agency-ledgers";

export const Route = createFileRoute("/_authenticated/money-flow")({
  ssr: false,
  component: MoneyFlowCommandCenterPage,
  validateSearch: (s: Record<string, unknown>): { tab?: string } => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
  }),
});

function MoneyFlowCommandCenterPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const [activeTab, setActiveTab] = useState<MoneyFlowTab>(
    (search.tab as MoneyFlowTab) || "overview",
  );

  useEffect(() => {
    if (search.tab) {
      setActiveTab(search.tab as MoneyFlowTab);
    }
  }, [search.tab]);

  // 1. Customer Receipts (Inflow)
  const customerPaymentsQ = useQuery({
    queryKey: qk.paymentRegister.list(""),
    queryFn: () => listPaymentRegister(""),
  });

  // 2. Vendor Payments (Outflow)
  const vendorPaymentsQ = useQuery({
    queryKey: qk.vendorPayments.all,
    queryFn: () => listVendorPayments(),
  });

  // 3. Agency Payments (Outflow)
  const agencyLedgerQ = useQuery({
    queryKey: qk.installationLedger.all(),
    queryFn: () => listInstallationLedger(),
  });

  // 4. Customer Ledgers (Receivables)
  const customerLedgerQ = useQuery({
    queryKey: ["customerLedger", "allSummaries"],
    queryFn: listCustomerLedgerSummaries,
    staleTime: 30_000,
  });

  // 5. Vendor Ledgers (Payables)
  const vendorLedgerQ = useQuery({
    queryKey: qk.vendorLedger.allSummaries,
    queryFn: listVendorLedgerSummaries,
    staleTime: 30_000,
  });

  // 6. Agency Ledgers (Payables)
  const agencySummariesQ = useQuery({
    queryKey: qk.installationLedger.summaries(),
    queryFn: listInstallationLedgerSummaries,
    staleTime: 30_000,
  });

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const custRows = customerPaymentsQ.data ?? [];
    const totalInflow = custRows.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

    const vendRows = vendorPaymentsQ.data ?? [];
    const totalVendorOutflow = vendRows.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

    const agencyRows = (agencyLedgerQ.data ?? []).filter((r) => Number(r.credit ?? 0) > 0);
    const totalAgencyOutflow = agencyRows.reduce((sum, r) => sum + Number(r.credit ?? 0), 0);

    const totalOutflow = totalVendorOutflow + totalAgencyOutflow;
    const netFlow = totalInflow - totalOutflow;

    // Customer Receivables (total positive customer balance)
    let totalReceivables = 0;
    if (customerLedgerQ.data) {
      for (const item of customerLedgerQ.data.values()) {
        if (item.balance > 0) totalReceivables += item.balance;
      }
    }

    // Vendor Payables (total positive vendor outstanding)
    let totalVendorPayables = 0;
    if (vendorLedgerQ.data) {
      for (const item of vendorLedgerQ.data.values()) {
        if (item.outstanding > 0) totalVendorPayables += item.outstanding;
      }
    }

    // Agency Payables (total positive agency balance)
    let totalAgencyPayables = 0;
    if (agencySummariesQ.data) {
      for (const item of agencySummariesQ.data) {
        if (item.balance > 0) totalAgencyPayables += item.balance;
      }
    }

    const totalPayables = totalVendorPayables + totalAgencyPayables;

    return {
      totalInflow,
      totalVendorOutflow,
      totalAgencyOutflow,
      totalOutflow,
      netFlow,
      totalReceivables,
      totalVendorPayables,
      totalAgencyPayables,
      totalPayables,
      customerPaymentCount: custRows.length,
      vendorPaymentCount: vendRows.length,
      agencyPaymentCount: agencyRows.length,
    };
  }, [
    customerPaymentsQ.data,
    vendorPaymentsQ.data,
    agencyLedgerQ.data,
    customerLedgerQ.data,
    vendorLedgerQ.data,
    agencySummariesQ.data,
  ]);

  return (
    <AccountingGuard moduleName="Money Flow Command Center">
      <div className="space-y-6 pb-12">
        <PageHeader
          title={t("moneyFlow.title", "Money Flow")}
          subtitle={t(
            "moneyFlow.subtitle",
            "Unified capital radar: payments received from customers, disbursements to vendors & installation agencies, and running ledgers.",
          )}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                asChild
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <Link to="/receipts/new">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />{" "}
                  {t("moneyFlow.recordCustomerPayment", "Record Customer Payment")}
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-amber-600/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 font-semibold"
              >
                <Link to="/vendor-payments/new">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />{" "}
                  {t("moneyFlow.recordVendorPayment", "Record Vendor Payment")}
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-cyan-600/40 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 font-semibold"
              >
                <Link to="/agency-payments">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />{" "}
                  {t("moneyFlow.agencyDisbursements", "Agency Disbursements")}
                </Link>
              </Button>
            </div>
          }
        />

        {/* 6 High-Level Capital Radar Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* 1. Customer Receipts Inflow */}
          <Card
            onClick={() => setActiveTab("customer-payments")}
            className="cursor-pointer border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 via-background to-background dark:from-emerald-950/20 hover:border-emerald-500 transition-all shadow-xs"
          >
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  {t("moneyFlow.totalInflow", "Total Inflow")}
                </span>
                <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center dark:bg-emerald-900/50 dark:text-emerald-300">
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-xl font-extrabold tracking-tight text-foreground">
                {formatInr(metrics.totalInflow)}
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                <span>{t("moneyFlow.customerReceipts", "Customer Receipts")}</span>
                <Badge
                  variant="secondary"
                  className="text-[9px] px-1.5 py-0 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300"
                >
                  {metrics.customerPaymentCount} {t("moneyFlow.rec", "rec.")}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 2. Vendor Payments Outflow */}
          <Card
            onClick={() => setActiveTab("vendor-payments")}
            className="cursor-pointer border-amber-500/30 bg-gradient-to-br from-amber-50/50 via-background to-background dark:from-amber-950/20 hover:border-amber-500 transition-all shadow-xs"
          >
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  {t("moneyFlow.vendorOutflow", "Vendor Outflow")}
                </span>
                <div className="h-6 w-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center dark:bg-amber-900/50 dark:text-amber-300">
                  <Factory className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-xl font-extrabold tracking-tight text-foreground">
                {formatInr(metrics.totalVendorOutflow)}
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                <span>{t("moneyFlow.stoneSuppliers", "Stone Suppliers")}</span>
                <Badge
                  variant="secondary"
                  className="text-[9px] px-1.5 py-0 bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300"
                >
                  {metrics.vendorPaymentCount} {t("moneyFlow.paid", "paid")}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 3. Agency Payments Outflow */}
          <Card
            onClick={() => setActiveTab("agency-payments")}
            className="cursor-pointer border-cyan-500/30 bg-gradient-to-br from-cyan-50/50 via-background to-background dark:from-cyan-950/20 hover:border-cyan-500 transition-all shadow-xs"
          >
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                  {t("moneyFlow.agencyOutflow", "Agency Outflow")}
                </span>
                <div className="h-6 w-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center dark:bg-cyan-900/50 dark:text-cyan-300">
                  <HandCoins className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-xl font-extrabold tracking-tight text-foreground">
                {formatInr(metrics.totalAgencyOutflow)}
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                <span>{t("moneyFlow.siteInstallers", "Site Installers")}</span>
                <Badge
                  variant="secondary"
                  className="text-[9px] px-1.5 py-0 bg-cyan-100 dark:bg-cyan-950/50 text-cyan-800 dark:text-cyan-300"
                >
                  {metrics.agencyPaymentCount} {t("moneyFlow.paid", "paid")}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 4. Net Money Flow */}
          <Card className="border-border bg-card shadow-xs">
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                  {t("moneyFlow.netFlow", "Net Flow")}
                </span>
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center ${
                    metrics.netFlow >= 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                  }`}
                >
                  {metrics.netFlow >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                </div>
              </div>
              <div
                className={`text-xl font-extrabold tracking-tight ${
                  metrics.netFlow >= 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {metrics.netFlow >= 0
                  ? `+${formatInr(metrics.netFlow)}`
                  : formatInr(metrics.netFlow)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {t("moneyFlow.inflowMinusOutflows", "Inflow minus Outflows")}
              </div>
            </CardContent>
          </Card>

          {/* 5. Customer Receivables */}
          <Card
            onClick={() => setActiveTab("customer-ledgers")}
            className="cursor-pointer border-border hover:border-primary/50 transition-all shadow-xs"
          >
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("moneyFlow.receivables", "Receivables")}
                </span>
                <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                  <Users className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-xl font-extrabold tracking-tight text-foreground">
                {formatInr(metrics.totalReceivables)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {t("moneyFlow.clientsOwe", "Clients owe to atelier")}
              </div>
            </CardContent>
          </Card>

          {/* 6. Total Payables */}
          <Card
            onClick={() => setActiveTab("vendor-ledgers")}
            className="cursor-pointer border-border hover:border-primary/50 transition-all shadow-xs"
          >
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("moneyFlow.payables", "Payables")}
                </span>
                <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-xl font-extrabold tracking-tight text-foreground">
                {formatInr(metrics.totalPayables)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {t("moneyFlow.vendorsAgenciesDue", "Vendors & agencies due")}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unified Tabbed Navigation */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as MoneyFlowTab)}
          className="space-y-4"
        >
          <div className="overflow-x-auto pb-1">
            <TabsList className="inline-flex w-auto gap-1">
              <TabsTrigger value="overview" className="gap-1.5 text-xs">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>{t("moneyFlow.tabs.flowRadar", "Flow Radar")}</span>
              </TabsTrigger>
              <TabsTrigger value="customer-payments" className="gap-1.5 text-xs">
                <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                <span>{t("moneyFlow.tabs.customerPayments", "Customer Payments")}</span>
              </TabsTrigger>
              <TabsTrigger value="vendor-payments" className="gap-1.5 text-xs">
                <Banknote className="h-3.5 w-3.5 text-amber-600" />
                <span>{t("moneyFlow.tabs.vendorPayments", "Vendor Payments")}</span>
              </TabsTrigger>
              <TabsTrigger value="agency-payments" className="gap-1.5 text-xs">
                <HandCoins className="h-3.5 w-3.5 text-cyan-600" />
                <span>{t("moneyFlow.tabs.agencyPayments", "Agency Payments")}</span>
              </TabsTrigger>
              <TabsTrigger value="customer-ledgers" className="gap-1.5 text-xs">
                <Users className="h-3.5 w-3.5" />
                <span>{t("moneyFlow.tabs.customerLedgers", "Customer Ledgers")}</span>
              </TabsTrigger>
              <TabsTrigger value="vendor-ledgers" className="gap-1.5 text-xs">
                <Factory className="h-3.5 w-3.5" />
                <span>{t("moneyFlow.tabs.vendorLedgers", "Vendor Ledgers")}</span>
              </TabsTrigger>
              <TabsTrigger value="agency-ledgers" className="gap-1.5 text-xs">
                <Layers className="h-3.5 w-3.5" />
                <span>{t("moneyFlow.tabs.agencyLedgers", "Agency Ledgers")}</span>
              </TabsTrigger>
              <TabsTrigger value="gst" className="gap-1.5 text-xs" asChild>
                <Link to="/gst">
                  <Landmark className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Pay GST & Filing</span>
                </Link>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: FLOW RADAR OVERVIEW */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Inflow vs Outflow Distribution */}
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ArrowLeftRight className="h-4 w-4 text-primary" />
                    <span>
                      {t("moneyFlow.overview.inflowVsOutflow", "Inflow vs Outflow Distribution")}
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t(
                      "moneyFlow.overview.inflowVsOutflowDesc",
                      "Comparative split of incoming client funds vs outgoing supplier & contractor payouts.",
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {t("moneyFlow.overview.customerReceipts", "Customer Receipts")}
                      </span>
                      <span>{formatInr(metrics.totalInflow)}</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{
                          width: `${
                            metrics.totalInflow + metrics.totalOutflow > 0
                              ? Math.round(
                                  (metrics.totalInflow /
                                    (metrics.totalInflow + metrics.totalOutflow)) *
                                    100,
                                )
                              : 50
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        {t("moneyFlow.overview.vendorMaterialPayments", "Vendor Material Payments")}
                      </span>
                      <span>{formatInr(metrics.totalVendorOutflow)}</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{
                          width: `${
                            metrics.totalOutflow > 0
                              ? Math.round(
                                  (metrics.totalVendorOutflow / metrics.totalOutflow) * 100,
                                )
                              : 50
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-cyan-700 dark:text-cyan-400">
                        <span className="h-2 w-2 rounded-full bg-cyan-500" />
                        {t(
                          "moneyFlow.overview.installationAgencyDisbursements",
                          "Installation Agency Disbursements",
                        )}
                      </span>
                      <span>{formatInr(metrics.totalAgencyOutflow)}</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{
                          width: `${
                            metrics.totalOutflow > 0
                              ? Math.round(
                                  (metrics.totalAgencyOutflow / metrics.totalOutflow) * 100,
                                )
                              : 50
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">
                      {t("moneyFlow.overview.totalOutflows", "Total Outflows:")}
                    </span>
                    <span className="font-bold text-foreground">
                      {formatInr(metrics.totalOutflow)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Navigation Cards */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card
                  onClick={() => setActiveTab("customer-payments")}
                  className="cursor-pointer hover:border-primary/50 transition-all p-5 flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                    <h3 className="font-bold text-sm text-foreground">
                      {t(
                        "moneyFlow.overview.customerPaymentsRegister",
                        "Customer Payments Register",
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t(
                        "moneyFlow.overview.customerPaymentsRegisterDesc",
                        "Track advances, milestone receipts, and payment modes across all client architectural projects.",
                      )}
                    </p>
                  </div>
                  <div className="pt-4 flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <span>
                      {t(
                        "moneyFlow.overview.customerPaymentsRecorded",
                        `${metrics.customerPaymentCount} Payments Recorded`,
                      )}
                    </span>
                    <span>{t("moneyFlow.overview.viewRegister", "View Register →")}</span>
                  </div>
                </Card>

                <Card
                  onClick={() => setActiveTab("vendor-payments")}
                  className="cursor-pointer hover:border-primary/50 transition-all p-5 flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 flex items-center justify-center">
                        <Banknote className="h-5 w-5" />
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                    <h3 className="font-bold text-sm text-foreground">
                      {t("moneyFlow.overview.vendorPaymentsRegister", "Vendor Payments Register")}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t(
                        "moneyFlow.overview.vendorPaymentsRegisterDesc",
                        "Settle purchase orders, advance payments, and invoice clearings for marble blocks and stone slabs.",
                      )}
                    </p>
                  </div>
                  <div className="pt-4 flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400">
                    <span>
                      {t(
                        "moneyFlow.overview.vendorPaymentsRecorded",
                        `${metrics.vendorPaymentCount} Payments Recorded`,
                      )}
                    </span>
                    <span>{t("moneyFlow.overview.viewRegister", "View Register →")}</span>
                  </div>
                </Card>

                <Card
                  onClick={() => setActiveTab("agency-payments")}
                  className="cursor-pointer hover:border-primary/50 transition-all p-5 flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-9 w-9 rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400 flex items-center justify-center">
                        <HandCoins className="h-5 w-5" />
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                    <h3 className="font-bold text-sm text-foreground">
                      {t("moneyFlow.overview.agencyDisbursementsTitle", "Agency Disbursements")}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t(
                        "moneyFlow.overview.agencyDisbursementsDesc",
                        "Disburse labor and milestone payouts to installation teams and site fixing contractors.",
                      )}
                    </p>
                  </div>
                  <div className="pt-4 flex items-center justify-between text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                    <span>
                      {t(
                        "moneyFlow.overview.agencyPaymentsRecorded",
                        `${metrics.agencyPaymentCount} Payments Recorded`,
                      )}
                    </span>
                    <span>{t("moneyFlow.overview.viewRegister", "View Register →")}</span>
                  </div>
                </Card>

                <Card
                  onClick={() => setActiveTab("customer-ledgers")}
                  className="cursor-pointer hover:border-primary/50 transition-all p-5 flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-9 w-9 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 flex items-center justify-center">
                        <Users className="h-5 w-5" />
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                    <h3 className="font-bold text-sm text-foreground">
                      {t("moneyFlow.overview.customerVendorLedgers", "Customer & Vendor Ledgers")}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t(
                        "moneyFlow.overview.customerVendorLedgersDesc",
                        "Running balances, debit/credit audit trails, and printable PDF statements for every account.",
                      )}
                    </p>
                  </div>
                  <div className="pt-4 flex items-center justify-between text-xs font-semibold text-purple-700 dark:text-purple-400">
                    <span>
                      {t(
                        "moneyFlow.overview.auditedRunningStatements",
                        "Audited Running Statements",
                      )}
                    </span>
                    <span>{t("moneyFlow.overview.viewLedgers", "View Ledgers →")}</span>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: CUSTOMER PAYMENTS */}
          <TabsContent value="customer-payments">
            <CustomerPaymentsSection
              rows={customerPaymentsQ.data ?? []}
              isLoading={customerPaymentsQ.isLoading}
              error={customerPaymentsQ.error}
              onRetry={() => customerPaymentsQ.refetch()}
            />
          </TabsContent>

          {/* TAB 3: VENDOR PAYMENTS */}
          <TabsContent value="vendor-payments">
            <VendorPaymentsSection
              rows={vendorPaymentsQ.data ?? []}
              isLoading={vendorPaymentsQ.isLoading}
              error={vendorPaymentsQ.error}
              onRetry={() => vendorPaymentsQ.refetch()}
            />
          </TabsContent>

          {/* TAB 4: AGENCY PAYMENTS */}
          <TabsContent value="agency-payments">
            <AgencyPaymentsSection
              rows={agencyLedgerQ.data ?? []}
              isLoading={agencyLedgerQ.isLoading}
              error={agencyLedgerQ.error}
              onRetry={() => agencyLedgerQ.refetch()}
            />
          </TabsContent>

          {/* TAB 5: CUSTOMER LEDGERS */}
          <TabsContent value="customer-ledgers">
            <CustomerLedgersSection
              summaries={customerLedgerQ.data}
              isLoading={customerLedgerQ.isLoading}
              error={customerLedgerQ.error}
              onRetry={() => customerLedgerQ.refetch()}
            />
          </TabsContent>

          {/* TAB 6: VENDOR LEDGERS */}
          <TabsContent value="vendor-ledgers">
            <VendorLedgersSection
              summaries={vendorLedgerQ.data}
              isLoading={vendorLedgerQ.isLoading}
              error={vendorLedgerQ.error}
              onRetry={() => vendorLedgerQ.refetch()}
            />
          </TabsContent>

          {/* TAB 7: AGENCY LEDGERS */}
          <TabsContent value="agency-ledgers">
            <AgencyLedgersSection
              summaries={agencySummariesQ.data ?? []}
              isLoading={agencySummariesQ.isLoading}
              error={agencySummariesQ.error}
              onRetry={() => agencySummariesQ.refetch()}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AccountingGuard>
  );
}

// ======================================================================
// SECTION 1: CUSTOMER PAYMENTS
// ======================================================================
function CustomerPaymentsSection({
  rows,
  isLoading,
  error,
  onRetry,
}: {
  rows: PaymentRegisterRow[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(() => {
    if (!dq) return rows;
    const term = dq.toLowerCase();
    return rows.filter(
      (r) =>
        r.doc_no.toLowerCase().includes(term) ||
        (r.customer_name && r.customer_name.toLowerCase().includes(term)) ||
        (r.reference_no && r.reference_no.toLowerCase().includes(term)) ||
        (r.invoice_no && r.invoice_no.toLowerCase().includes(term)) ||
        r.method.toLowerCase().includes(term),
    );
  }, [rows, dq]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (isLoading) return <SkeletonTable rows={5} columns={6} />;
  if (error) return <ErrorBlock message={toUserMessage(error)} onRetry={onRetry} />;

  return (
    <div className="space-y-4">
      <DataToolbar
        count={filtered.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder={t(
          "moneyFlow.customerPayments.searchPlaceholder",
          "Search customer receipts by number, customer, invoice or ref...",
        )}
        action={
          <Button asChild size="sm">
            <Link to="/receipts/new">
              <Plus className="mr-1.5 h-3.5 w-3.5" />{" "}
              {t("moneyFlow.recordCustomerPayment", "Record Customer Payment")}
            </Link>
          </Button>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          title={t("moneyFlow.customerPayments.emptyTitle", "No customer receipts found")}
          message={
            q
              ? t("moneyFlow.adjustSearch", "Try adjusting your search query.")
              : t("moneyFlow.customerPayments.recordFirst", "Record your first customer receipt.")
          }
        />
      ) : (
        <DataTableShell
          footer={
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.receiptDocNo", "Receipt / Doc #")}</TableHead>
                <TableHead>{t("table.customer", "Customer")}</TableHead>
                <TableHead>{t("table.invoice", "Invoice")}</TableHead>
                <TableHead>{t("table.method", "Method")}</TableHead>
                <TableHead>{t("table.date", "Date")}</TableHead>
                <TableHead className="text-right">{t("table.amount", "Amount")}</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs font-semibold text-foreground">
                    {p.doc_no}
                  </TableCell>
                  <TableCell className="font-medium text-xs">
                    {p.customer_name || t("common.directCustomer", "Direct Customer")}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {p.invoice_no || "—"}
                  </TableCell>
                  <TableCell className="text-xs capitalize">{p.method}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(p.paid_at)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                    {formatInr(p.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                      <Link
                        to={p.source === "receipt" ? "/receipts/$receiptId" : "/payments/$id"}
                        params={p.source === "receipt" ? { receiptId: p.id } : { id: p.id }}
                      >
                        <span>{t("common.view", "View")}</span>
                        <ArrowUpRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </div>
  );
}

// ======================================================================
// SECTION 2: VENDOR PAYMENTS
// ======================================================================
function VendorPaymentsSection({
  rows,
  isLoading,
  error,
  onRetry,
}: {
  rows: VendorPaymentListItem[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(() => {
    if (!dq) return rows;
    const term = dq.toLowerCase();
    return rows.filter(
      (r) =>
        r.payment_no.toLowerCase().includes(term) ||
        (r.vendor?.company_name && r.vendor.company_name.toLowerCase().includes(term)) ||
        (r.purchase_order?.po_no && r.purchase_order.po_no.toLowerCase().includes(term)) ||
        (r.reference_no && r.reference_no.toLowerCase().includes(term)) ||
        (r.method && r.method.toLowerCase().includes(term)),
    );
  }, [rows, dq]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (isLoading) return <SkeletonTable rows={5} columns={6} />;
  if (error) return <ErrorBlock message={toUserMessage(error)} onRetry={onRetry} />;

  return (
    <div className="space-y-4">
      <DataToolbar
        count={filtered.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder={t(
          "moneyFlow.vendorPayments.searchPlaceholder",
          "Search vendor disbursements by payment #, vendor, PO, or ref...",
        )}
        action={
          <Button asChild size="sm">
            <Link to="/vendor-payments/new">
              <Plus className="mr-1.5 h-3.5 w-3.5" />{" "}
              {t("moneyFlow.recordVendorPayment", "Record Vendor Payment")}
            </Link>
          </Button>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          title={t("moneyFlow.vendorPayments.emptyTitle", "No vendor payments found")}
          message={
            q
              ? t("moneyFlow.adjustSearch", "Try adjusting your search query.")
              : t("moneyFlow.vendorPayments.recordFirst", "Record your first vendor payment.")
          }
        />
      ) : (
        <DataTableShell
          footer={
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.paymentNo", "Payment #")}</TableHead>
                <TableHead>{t("table.vendor", "Vendor")}</TableHead>
                <TableHead>{t("table.poReference", "PO Reference")}</TableHead>
                <TableHead>{t("table.type", "Type")}</TableHead>
                <TableHead>{t("table.date", "Date")}</TableHead>
                <TableHead className="text-right">{t("table.amount", "Amount")}</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs font-semibold text-foreground">
                    {p.payment_no}
                  </TableCell>
                  <TableCell className="font-medium text-xs">
                    {p.vendor?.company_name || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {p.purchase_order?.po_no || "—"}
                  </TableCell>
                  <TableCell className="text-xs capitalize">
                    <Badge variant="outline" className="text-[10px]">
                      {p.payment_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(p.paid_at)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-xs text-amber-700 dark:text-amber-400">
                    {formatInr(p.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                      <Link to="/vendor-payments/$id" params={{ id: p.id }}>
                        <span>{t("common.view", "View")}</span>
                        <ArrowUpRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </div>
  );
}

// ======================================================================
// SECTION 3: AGENCY PAYMENTS
// ======================================================================
function AgencyPaymentsSection({
  rows,
  isLoading,
  error,
  onRetry,
}: {
  rows: InstallationLedgerRow[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const agenciesQ = useQuery({
    queryKey: qk.installationAgencies.list(),
    queryFn: () => listInstallationAgencies(false),
  });

  const agencyMap = useMemo(
    () => new Map((agenciesQ.data ?? []).map((a) => [a.id, a])),
    [agenciesQ.data],
  );

  // Only payments (credit > 0)
  const paymentRows = useMemo(() => {
    const payments = rows.filter((r) => Number(r.credit ?? 0) > 0);
    payments.sort((a, b) => (b.entry_date > a.entry_date ? 1 : -1));

    if (!dq) return payments;
    const term = dq.toLowerCase();
    return payments.filter((p) => {
      const agency = agencyMap.get(p.installation_agency_id);
      return (
        agency?.name.toLowerCase().includes(term) ||
        agency?.code.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        (p.ref_no && p.ref_no.toLowerCase().includes(term))
      );
    });
  }, [rows, dq, agencyMap]);

  const pageRows = paymentRows.slice((page - 1) * pageSize, page * pageSize);

  if (isLoading || agenciesQ.isLoading) return <SkeletonTable rows={5} columns={5} />;
  if (error) return <ErrorBlock message={toUserMessage(error)} onRetry={onRetry} />;

  return (
    <div className="space-y-4">
      <DataToolbar
        count={paymentRows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder={t(
          "moneyFlow.agencyPayments.searchPlaceholder",
          "Search installation disbursements by agency, description, or ref...",
        )}
        action={
          <Button asChild size="sm">
            <Link to="/agency-payments">
              <Plus className="mr-1.5 h-3.5 w-3.5" />{" "}
              {t("moneyFlow.agencyPayments.recordButton", "Record Agency Payment")}
            </Link>
          </Button>
        }
      />

      {paymentRows.length === 0 ? (
        <EmptyState
          title={t("moneyFlow.agencyPayments.emptyTitle", "No agency disbursements found")}
          message={
            q
              ? t("moneyFlow.adjustSearch", "Try adjusting your search query.")
              : t(
                  "moneyFlow.agencyPayments.recordFirst",
                  "Record your first installation agency payment.",
                )
          }
        />
      ) : (
        <DataTableShell
          footer={
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={paymentRows.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.date", "Date")}</TableHead>
                <TableHead>{t("table.agency", "Agency")}</TableHead>
                <TableHead>{t("table.description", "Description")}</TableHead>
                <TableHead>{t("table.referenceNo", "Reference #")}</TableHead>
                <TableHead className="text-right">{t("table.amountPaid", "Amount Paid")}</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((p) => {
                const agency = agencyMap.get(p.installation_agency_id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(p.entry_date)}
                    </TableCell>
                    <TableCell className="font-medium text-xs">
                      {agency?.name || "Agency"}
                      {agency?.code && (
                        <span className="ml-1.5 text-[10px] text-muted-foreground font-mono">
                          ({agency.code})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.description}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {p.ref_no || "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-xs text-cyan-700 dark:text-cyan-400">
                      {formatInr(p.credit)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                        <Link
                          to="/installation-ledger/$agencyId"
                          params={{ agencyId: p.installation_agency_id }}
                        >
                          <span>{t("moneyFlow.ledger", "Ledger")}</span>
                          <ArrowUpRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </div>
  );
}

// ======================================================================
// SECTION 4: CUSTOMER LEDGERS
// ======================================================================
function CustomerLedgersSection({
  summaries,
  isLoading,
  error,
  onRetry,
}: {
  summaries:
    | Map<string, { totalDebit: number; totalCredit: number; balance: number; entryCount: number }>
    | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const customersQ = useQuery({
    queryKey: qk.customers.list(dq),
    queryFn: () => listCustomers(dq),
  });

  const rows = useMemo(() => {
    if (!customersQ.data || !summaries) return [];
    return customersQ.data
      .map((c) => ({ customer: c, summary: summaries.get(c.id) }))
      .sort((a, b) => ((b.summary?.balance ?? 0) > (a.summary?.balance ?? 0) ? 1 : -1));
  }, [customersQ.data, summaries]);

  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  if (isLoading || customersQ.isLoading) return <SkeletonTable rows={5} columns={5} />;
  if (error || customersQ.error) {
    return <ErrorBlock message={toUserMessage(error || customersQ.error)} onRetry={onRetry} />;
  }

  return (
    <div className="space-y-4">
      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder={t(
          "moneyFlow.customerLedgers.searchPlaceholder",
          "Search customer accounts by name, phone or company...",
        )}
        action={
          <Button asChild size="sm">
            <Link to="/receipts/new">
              <Plus className="mr-1.5 h-3.5 w-3.5" />{" "}
              {t("moneyFlow.customerLedgers.recordReceipt", "Record Receipt")}
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title={t("moneyFlow.customerLedgers.emptyTitle", "No customer ledger accounts found")}
          message={t("moneyFlow.customerLedgers.emptyDesc", "No customer activity yet.")}
        />
      ) : (
        <DataTableShell
          footer={
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={rows.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.customer", "Customer")}</TableHead>
                <TableHead>{t("table.phone", "Phone")}</TableHead>
                <TableHead className="text-right">
                  {t("table.totalInvoicedDr", "Total Invoiced (Dr)")}
                </TableHead>
                <TableHead className="text-right">
                  {t("table.totalPaidCr", "Total Paid (Cr)")}
                </TableHead>
                <TableHead className="text-right">
                  {t("table.currentBalance", "Current Balance")}
                </TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map(({ customer, summary }) => {
                const bal = summary?.balance ?? 0;
                return (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium text-xs">
                      <div>{customer.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {customer.customer_code}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {customer.primary_phone || customer.city || "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatInr(summary?.totalDebit ?? 0)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      {formatInr(summary?.totalCredit ?? 0)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-xs">
                      <span
                        className={
                          bal > 0
                            ? "text-rose-600 dark:text-rose-400"
                            : bal < 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground"
                        }
                      >
                        {formatInr(bal)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1">
                        <Link to="/ledger/$customerId" params={{ customerId: customer.id }}>
                          <span>{t("moneyFlow.statement", "Statement")}</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </div>
  );
}

// ======================================================================
// SECTION 5: VENDOR LEDGERS
// ======================================================================
function VendorLedgersSection({
  summaries,
  isLoading,
  error,
  onRetry,
}: {
  summaries:
    | Map<
        string,
        { totalDebit: number; totalCredit: number; outstanding: number; entryCount: number }
      >
    | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const vendorsQ = useQuery({
    queryKey: qk.vendors.list(dq),
    queryFn: () => listVendors(dq),
  });

  const rows = useMemo(() => {
    if (!vendorsQ.data || !summaries) return [];
    return vendorsQ.data
      .map((v) => ({ vendor: v, summary: summaries.get(v.id) }))
      .sort((a, b) => ((b.summary?.outstanding ?? 0) > (a.summary?.outstanding ?? 0) ? 1 : -1));
  }, [vendorsQ.data, summaries]);

  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  if (isLoading || vendorsQ.isLoading) return <SkeletonTable rows={5} columns={5} />;
  if (error || vendorsQ.error) {
    return <ErrorBlock message={toUserMessage(error || vendorsQ.error)} onRetry={onRetry} />;
  }

  return (
    <div className="space-y-4">
      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder={t(
          "moneyFlow.vendorLedgers.searchPlaceholder",
          "Search stone vendors & suppliers...",
        )}
        action={
          <Button asChild size="sm">
            <Link to="/vendor-payments/new">
              <Plus className="mr-1.5 h-3.5 w-3.5" />{" "}
              {t("moneyFlow.recordVendorPayment", "Record Vendor Payment")}
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title={t("moneyFlow.vendorLedgers.emptyTitle", "No vendor ledger accounts found")}
          message={t("moneyFlow.vendorLedgers.emptyDesc", "No vendor transactions recorded.")}
        />
      ) : (
        <DataTableShell
          footer={
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={rows.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.vendorQuarry", "Vendor / Quarry")}</TableHead>
                <TableHead>{t("table.contact", "Contact")}</TableHead>
                <TableHead className="text-right">
                  {t("table.totalInvoicedDr", "Total Invoiced (Dr)")}
                </TableHead>
                <TableHead className="text-right">
                  {t("table.totalPaidCr", "Total Paid (Cr)")}
                </TableHead>
                <TableHead className="text-right">{t("table.balanceDue", "Balance Due")}</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map(({ vendor, summary }) => {
                const out = summary?.outstanding ?? 0;
                return (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium text-xs">
                      <div>{vendor.company_name}</div>
                      {vendor.contact_person && (
                        <div className="text-[11px] text-muted-foreground">
                          {vendor.contact_person}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {vendor.city || vendor.gst_number || "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatInr(summary?.totalDebit ?? 0)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-amber-600 dark:text-amber-400 font-semibold">
                      {formatInr(summary?.totalCredit ?? 0)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-xs">
                      <span
                        className={
                          out > 0
                            ? "text-rose-600 dark:text-rose-400"
                            : out < 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground"
                        }
                      >
                        {formatInr(out)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1">
                        <Link to="/vendors/$vendorId/ledger" params={{ vendorId: vendor.id }}>
                          <span>{t("moneyFlow.ledger", "Ledger")}</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </div>
  );
}

// ======================================================================
// SECTION 6: AGENCY LEDGERS
// ======================================================================
function AgencyLedgersSection({
  summaries,
  isLoading,
  error,
  onRetry,
}: {
  summaries: InstallationAgencyLedgerSummary[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(() => {
    if (!dq) return summaries;
    const term = dq.toLowerCase();
    return summaries.filter(
      (s) =>
        s.agency_name.toLowerCase().includes(term) || s.agency_code.toLowerCase().includes(term),
    );
  }, [summaries, dq]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (isLoading) return <SkeletonTable rows={5} columns={5} />;
  if (error) return <ErrorBlock message={toUserMessage(error)} onRetry={onRetry} />;

  return (
    <div className="space-y-4">
      <DataToolbar
        count={filtered.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder={t(
          "moneyFlow.agencyLedgers.searchPlaceholder",
          "Search installation agencies...",
        )}
        action={
          <Button asChild size="sm">
            <Link to="/agency-payments">
              <Plus className="mr-1.5 h-3.5 w-3.5" />{" "}
              {t("moneyFlow.agencyLedgers.disbursePayment", "Disburse Payment")}
            </Link>
          </Button>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          title={t("moneyFlow.agencyLedgers.emptyTitle", "No installation agencies found")}
          message={t("moneyFlow.agencyLedgers.emptyDesc", "No agency ledger activity recorded.")}
        />
      ) : (
        <DataTableShell
          footer={
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.agencyName", "Agency Name")}</TableHead>
                <TableHead>{t("table.agencyCode", "Agency Code")}</TableHead>
                <TableHead className="text-right">
                  {t("table.totalChargedDr", "Total Charged (Dr)")}
                </TableHead>
                <TableHead className="text-right">
                  {t("table.totalPaidCr", "Total Paid (Cr)")}
                </TableHead>
                <TableHead className="text-right">{t("table.balanceDue", "Balance Due")}</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((agency) => (
                <TableRow key={agency.installation_agency_id}>
                  <TableCell className="font-medium text-xs">{agency.agency_name}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {agency.agency_code}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {formatInr(agency.total_debit)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-cyan-600 dark:text-cyan-400 font-semibold">
                    {formatInr(agency.total_credit)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-xs">
                    <span
                      className={
                        agency.balance > 0
                          ? "text-rose-600 dark:text-rose-400"
                          : agency.balance < 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                      }
                    >
                      {formatInr(agency.balance)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1">
                      <Link
                        to="/installation-ledger/$agencyId"
                        params={{ agencyId: agency.installation_agency_id }}
                      >
                        <span>{t("moneyFlow.ledger", "Ledger")}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </div>
  );
}
