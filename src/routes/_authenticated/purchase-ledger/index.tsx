/**
 * Purchase Ledger — vendor-side counterpart to the Sales Ledger (`/receipts`).
 *
 * Lists every supplying partner, running outstanding balance, billing totals,
 * and payment history. Provides seamless 1-click in-page ledger inspection,
 * manual entry logging, and real-time statement dispatch via WhatsApp/PDF.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Wallet, MessageCircle, FileText, ArrowUpRight, Building2, Phone } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Card, CardContent } from "@/components/ui/card";
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
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  listVendors,
  getVendorPhone,
  getVendorContactName,
  type VendorRow,
} from "@/lib/vendors/api";
import { detectVendorPartnerCategory, isSupplierCategory } from "@/lib/partners/directory";
import {
  listVendorLedger,
  listVendorLedgerSummaries,
  summariseLedger,
  sourceLabel,
} from "@/lib/vendors/ledger";
import { compareVendorLedgerRows } from "@/lib/ledger-sorting";
import { formatInr, formatDate } from "@/lib/format";
import { SupplierLedgerDrawer } from "@/components/vendors/SupplierLedgerDrawer";
import { ShareStatementDialog } from "@/components/statements/ShareStatementDialog";
import {
  getCurrentStatementTimestamp,
  type AccountingStatementData,
} from "@/lib/statements/accounting-statement";

export const Route = createFileRoute("/_authenticated/purchase-ledger/")({
  ssr: false,
  component: PurchaseLedgerIndexPage,
});

function PurchaseLedgerIndexPage() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Drawer & Direct Statement Dialog states
  const [drawerVendor, setDrawerVendor] = useState<VendorRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statementVendor, setStatementVendor] = useState<VendorRow | null>(null);
  const [statementOpen, setStatementOpen] = useState(false);

  const vendorsQ = useQuery({
    queryKey: qk.vendors.list(dq),
    queryFn: () => listVendors(dq),
  });
  const summariesQ = useQuery({
    queryKey: qk.vendorLedger.allSummaries,
    queryFn: listVendorLedgerSummaries,
    staleTime: 30_000,
  });

  const statementLedgerQ = useQuery({
    queryKey: qk.vendorLedger.byVendor(statementVendor?.id ?? ""),
    queryFn: () => listVendorLedger(statementVendor!.id),
    enabled: !!statementVendor && statementOpen,
  });

  const isLoading = vendorsQ.isLoading || summariesQ.isLoading;
  const error = vendorsQ.error ?? summariesQ.error;

  const rows = useMemo(() => {
    const summaries = summariesQ.data;
    if (!vendorsQ.data || !summaries) return [];
    return vendorsQ.data
      .filter((v) => isSupplierCategory(detectVendorPartnerCategory(v)))
      .map((v) => ({ vendor: v, summary: summaries.get(v.id) }))
      .sort(compareVendorLedgerRows);
  }, [vendorsQ.data, summariesQ.data]);

  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const totalBilled = rows.reduce((s, r) => s + (r.summary?.totalDebit ?? 0), 0);
  const totalPaid = rows.reduce((s, r) => s + (r.summary?.totalCredit ?? 0), 0);
  const totalOutstanding = rows.reduce((s, r) => s + (r.summary?.outstanding ?? 0), 0);

  // Direct statement data calculation
  const directStatementData: AccountingStatementData = useMemo(() => {
    const summary = summariseLedger(statementLedgerQ.data ?? []);
    const phone = getVendorPhone(statementVendor);
    const contact = getVendorContactName(statementVendor);

    return {
      party: {
        partyType: "vendor",
        id: statementVendor?.id ?? "",
        name: statementVendor?.company_name || "Supplier",
        code: statementVendor?.vendor_code,
        phone,
        whatsapp: phone,
        contactPerson: contact,
        city: statementVendor?.city,
      },
      asOfTimestamp: getCurrentStatementTimestamp(),
      totalDebit: summary.totalDebit,
      totalCredit: summary.totalCredit,
      balance: summary.outstanding,
      transactions: (statementLedgerQ.data ?? []).map((r) => ({
        date: r.entry_date,
        type: sourceLabel(r.source_type),
        refNo: r.ref_no || "—",
        description: r.description,
        debit: r.debit,
        credit: r.credit,
        runningBalance: r.running_balance,
      })),
    };
  }, [statementVendor, statementLedgerQ.data]);

  const handleOpenDrawer = (vendor: VendorRow) => {
    setDrawerVendor(vendor);
    setDrawerOpen(true);
  };

  const handleOpenStatement = (vendor: VendorRow, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setStatementVendor(vendor);
    setStatementOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        navId="vendor-ledger"
        title={t("purchaseLedger.title", "Suppliers Ledger")}
        subtitle={t(
          "purchaseLedger.subtitle",
          "Running balances, invoice statements, and payment history across supplying partners.",
        )}
      />

      {/* Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="shadow-2xs">
          <CardContent className="p-3.5">
            <span className="text-xs text-muted-foreground font-medium block">
              Total Supplier Bills
            </span>
            <span className="text-xl font-bold font-mono text-foreground mt-0.5 block">
              {formatInr(totalBilled)}
            </span>
          </CardContent>
        </Card>
        <Card className="shadow-2xs">
          <CardContent className="p-3.5">
            <span className="text-xs text-muted-foreground font-medium block">
              Total Paid to Suppliers
            </span>
            <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {formatInr(totalPaid)}
            </span>
          </CardContent>
        </Card>
        <Card className="shadow-2xs">
          <CardContent className="p-3.5">
            <span className="text-xs text-muted-foreground font-medium block">
              Net Payables Due
            </span>
            <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
              {formatInr(totalOutstanding)}
            </span>
          </CardContent>
        </Card>
      </div>

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={(v) => {
          setQ(v);
          setPage(1);
        }}
        searchPlaceholder={t(
          "purchaseLedger.searchPlaceholder",
          "Search supplier, code, GST, city…",
        )}
      />

      {isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : error ? (
        <ErrorBlock
          message={toUserMessage(error)}
          onRetry={() => {
            vendorsQ.refetch();
            summariesQ.refetch();
          }}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-6 w-6" />}
          title={t("purchaseLedger.empty.title", "No supplier partners found")}
          message={t(
            "purchaseLedger.empty.message",
            "Supplying partners will appear here with complete billing, payment records, and ledger statements.",
          )}
        />
      ) : (
        <DataTableShell
          footer={
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={rows.length}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("purchaseLedger.columns.vendor", "Supplier Partner")}</TableHead>
                <TableHead>{t("purchaseLedger.columns.lastActivity", "Last Activity")}</TableHead>
                <TableHead className="text-right">
                  {t("purchaseLedger.columns.totalDebit", "Total Debit (Billed)")}
                </TableHead>
                <TableHead className="text-right">
                  {t("purchaseLedger.columns.totalCredit", "Total Credit (Paid)")}
                </TableHead>
                <TableHead className="text-right">
                  {t("purchaseLedger.columns.outstanding", "Outstanding Due")}
                </TableHead>
                <TableHead className="text-right w-44">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map(({ vendor, summary }) => {
                const bal = summary?.outstanding ?? 0;
                const contact = getVendorContactName(vendor);
                const phone = getVendorPhone(vendor);

                return (
                  <TableRow
                    key={vendor.id}
                    onClick={() => handleOpenDrawer(vendor)}
                    className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/60 transition-colors"
                  >
                    <TableCell>
                      <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                        <span>{vendor.company_name}</span>
                        {vendor.vendor_code && (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 px-1 font-mono font-normal text-muted-foreground"
                          >
                            {vendor.vendor_code}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        {contact && <span>{contact}</span>}
                        {phone && <span>· {phone}</span>}
                        {vendor.city && <span>· {vendor.city}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {summary?.lastEntryAt ? formatDate(summary.lastEntryAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-mono text-xs">
                      {formatInr(summary?.totalDebit ?? 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-mono text-xs text-emerald-600 dark:text-emerald-400">
                      {formatInr(summary?.totalCredit ?? 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-mono font-semibold text-xs">
                      <span
                        className={
                          bal > 0
                            ? "text-amber-600 dark:text-amber-400"
                            : bal < 0
                              ? "text-blue-600"
                              : ""
                        }
                      >
                        {formatInr(bal)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px] font-medium gap-1 bg-white dark:bg-slate-900 shadow-2xs hover:bg-slate-100"
                          onClick={() => handleOpenDrawer(vendor)}
                          title="View complete chronological ledger statement"
                        >
                          <FileText className="h-3 w-3 text-primary" />
                          <span>Ledger</span>
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-2 text-[11px] font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                          onClick={(e) => handleOpenStatement(vendor, e)}
                          title="Share statement on WhatsApp, copy, or print"
                        >
                          <MessageCircle className="h-3 w-3" />
                          <span>Statement</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      {/* Supplier Ledger Drawer (Slide-Over inspection) */}
      <SupplierLedgerDrawer vendor={drawerVendor} open={drawerOpen} onOpenChange={setDrawerOpen} />

      {/* Direct Row Share Statement Dialog */}
      <ShareStatementDialog
        open={statementOpen}
        onOpenChange={setStatementOpen}
        data={directStatementData}
      />
    </div>
  );
}
