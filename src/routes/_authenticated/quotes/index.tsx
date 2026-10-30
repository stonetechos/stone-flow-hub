import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Loader2,
  FileText,
  Trash2,
  Scale,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Boxes,
  PackageCheck,
  Truck,
  MessageCircle,
  Clock,
  Sparkles,
  Layers,
  Receipt,
} from "lucide-react";
import { parseQuoteVendorAssignment, assignVendorToQuote } from "@/lib/quotes/vendor-assignment";
import { AssignQuoteVendorDialog } from "@/components/quotes/AssignQuoteVendorDialog";
import { QuoteSendRfqDialog } from "@/components/rfqs/QuoteSendRfqDialog";
import { CustomerAssigneeSelect } from "@/components/customers/CustomerAssigneeSelect";
import { QuoteTermsManager } from "@/components/quotes/QuoteTermsManager";
import {
  detectClientProvidedSlabFromItems,
  detectDealScopeFromItems,
  generateQuoteTerms,
  type DealScope,
} from "@/lib/quotes/terms";
import { cn } from "@/lib/utils";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { CatalogProductSelect } from "@/components/quotes/CatalogProductSelect";
import {
  getQuoteSaleMode,
  getQuoteHybridSplit,
  SALE_MODE_CONFIG,
  type SaleMode,
} from "@/lib/quotes/sale-mode";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuoteComparisonDialog } from "@/components/quotes/QuoteComparisonDialog";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { RowActions } from "@/components/data/RowActions";
import { SafeDeleteDialog } from "@/components/mdm/SafeDeleteDialog";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useTablePrefs } from "@/hooks/use-table-prefs";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { createQuote, deleteQuote, listQuotes, type QuoteListItem } from "@/lib/quotes/api";
import {
  quoteItemInputSchema,
  QUOTE_CATEGORIES,
  QUOTE_CATEGORY_LABELS,
  type QuoteCategory,
  type QuoteItemInput,
} from "@/lib/quotes/schema";
import { EntityPicker } from "@/components/forms/EntityPicker";
import { invalidateQuote } from "@/lib/query-invalidation";
import { formatInr, formatDate } from "@/lib/format";
import {
  EstimateStudioCalculator,
  type EstimateStudioResult,
} from "@/components/quotes/EstimateStudioCalculator";
import {
  StoneMuralCalculator,
  type StoneMuralResult,
} from "@/components/quotes/StoneMuralCalculator";
import { NumericInput, PercentInput } from "@/components/forms/inputs/SmartInputs";

const search = z.object({
  new: z.string().optional(),
  project: z.string().uuid().optional(),
  enquiry: z.string().uuid().optional(),
  customer: z.string().uuid().optional(),
  status: z.string().optional(),
  studio: z.enum(["cladding", "mural"]).optional(),
});

export const Route = createFileRoute("/_authenticated/quotes/")({
  ssr: false,
  validateSearch: (s) => search.parse(s),
  component: QuotesPage,
});

function QuotesPage() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const params = Route.useSearch();
  const [statusFilter, setStatusFilter] = useState<string>(params.status ?? "all");
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<QuoteListItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("quotes");
  const nav = useNavigate();
  const qc = useQueryClient();

  const [vendorFilter, setVendorFilter] = useState<
    "all" | "accepted" | "unassigned" | "assigned" | "in_stock"
  >("all");
  const [saleModeFilter, setSaleModeFilter] = useState<"all" | "invoiced" | "cash" | "hybrid">(
    "all",
  );
  const [assigningQuote, setAssigningQuote] = useState<QuoteListItem | null>(null);
  const [rfqQuote, setRfqQuote] = useState<QuoteListItem | null>(null);

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "no", label: "Quote #", required: true },
      { key: "saleMode", label: "Deal Type" },
      { key: "date", label: "Quote Date" },
      { key: "project", label: "Project" },
      { key: "customer", label: "Customer" },
      { key: "status", label: "Status" },
      { key: "vendor", label: "Vendor Assignment" },
      { key: "deliveryDate", label: "Promised Delivery" },
      { key: "total", label: "Total" },
      { key: "valid", label: "Valid until" },
    ],
    [],
  );

  const query = useQuery({ queryKey: qk.quotes.list(dq), queryFn: () => listQuotes(dq) });
  const del = useMutation({
    mutationFn: (id: string) => deleteQuote(id),
    onSuccess: () => {
      toast.success("Quote deleted");
      invalidateQuote(qc);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const quickLiftStockMut = useMutation({
    mutationFn: (quote: QuoteListItem) =>
      assignVendorToQuote({
        quoteId: quote.id,
        fulfilmentType: "stock_lifted",
        vendorId: "stock_lifted",
        vendorName: "Material Lifted from Stock",
        stockLocation: "Lifted from Stock / Yard",
        notes: "Marked as material lifted from stock (RFQ not required)",
      }),
    onSuccess: (_, quote) => {
      toast.success(`Quote ${quote.quote_no} marked: Material lifted from stock`);
      invalidateQuote(qc);
    },
    onError: (err) => {
      toast.error(toUserMessage(err));
    },
  });

  const quoteCounts = useMemo(() => {
    const all = query.data ?? [];
    let accepted = 0;
    let unassigned = 0;
    let assigned = 0;
    let inStock = 0;
    let invoiced = 0;
    let cash = 0;
    let hybrid = 0;
    for (const r of all) {
      const mode = getQuoteSaleMode(r);
      if (mode === "cash") cash++;
      else if (mode === "hybrid") hybrid++;
      else invoiced++;

      if (r.status === "accepted") {
        accepted++;
        const a = parseQuoteVendorAssignment(r);
        if (
          a.fulfilmentType === "in_stock" ||
          a.fulfilmentType === "stock_lifted" ||
          a.isOrderCompleted
        ) {
          inStock++;
        } else if (a.fulfilmentType === "vendor" || a.isAssigned) {
          assigned++;
        } else {
          unassigned++;
        }
      }
    }
    return { all: all.length, accepted, unassigned, assigned, inStock, invoiced, cash, hybrid };
  }, [query.data]);

  const rows = useMemo(() => {
    let list = query.data ?? [];
    if (saleModeFilter !== "all") {
      list = list.filter((r) => getQuoteSaleMode(r) === saleModeFilter);
    }
    if (vendorFilter === "accepted") {
      list = list.filter((r) => r.status === "accepted");
    } else if (vendorFilter === "unassigned") {
      list = list.filter((r) => {
        if (r.status !== "accepted") return false;
        const a = parseQuoteVendorAssignment(r);
        return !a.isAssigned && !a.isOrderCompleted && a.fulfilmentType === "unassigned";
      });
    } else if (vendorFilter === "assigned") {
      list = list.filter(
        (r) => r.status === "accepted" && parseQuoteVendorAssignment(r).fulfilmentType === "vendor",
      );
    } else if (vendorFilter === "in_stock") {
      list = list.filter((r) => {
        if (r.status !== "accepted") return false;
        const a = parseQuoteVendorAssignment(r);
        return (
          a.fulfilmentType === "in_stock" ||
          a.fulfilmentType === "stock_lifted" ||
          a.isOrderCompleted
        );
      });
    } else if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
    return list;
  }, [query.data, saleModeFilter, vendorFilter, statusFilter]);

  useEffect(() => setPage(1), [dq, statusFilter, vendorFilter, saleModeFilter]);
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 4) {
        next.add(id);
      } else {
        toast.error("You can compare up to 4 quotes at a time.");
      }
      return next;
    });
  }

  useEffect(() => {
    if (params.new) setOpen(true);
  }, [params.new]);
  useEffect(() => {
    if (params.status && params.status !== statusFilter) setStatusFilter(params.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.status]);

  return (
    <div>
      <PageHeader title="Quotes" subtitle="Send priced offers, then convert to invoice." />

      {/* Deal Type Sub-Tabs Filter: GST Deals vs Cash Deals vs Hybrid Deals */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-2">
        <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
          <Receipt className="h-3.5 w-3.5 text-slate-400" />
          <span>Deal Type:</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setSaleModeFilter("all");
            setPage(1);
          }}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md transition-all border shrink-0",
            saleModeFilter === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-2xs font-semibold"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
          )}
        >
          All Quotes ({quoteCounts.all})
        </button>
        <button
          type="button"
          onClick={() => {
            setSaleModeFilter("invoiced");
            setPage(1);
          }}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md transition-all border shrink-0 flex items-center gap-1.5",
            saleModeFilter === "invoiced"
              ? "bg-blue-700 text-white border-blue-700 shadow-2xs font-semibold"
              : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          GST Deals ({quoteCounts.invoiced})
        </button>
        <button
          type="button"
          onClick={() => {
            setSaleModeFilter("cash");
            setPage(1);
          }}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md transition-all border shrink-0 flex items-center gap-1.5",
            saleModeFilter === "cash"
              ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs font-semibold"
              : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
          )}
        >
          <Truck className="h-3.5 w-3.5 text-emerald-600" />
          Cash Deals ({quoteCounts.cash})
        </button>
        <button
          type="button"
          onClick={() => {
            setSaleModeFilter("hybrid");
            setPage(1);
          }}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md transition-all border shrink-0 flex items-center gap-1.5",
            saleModeFilter === "hybrid"
              ? "bg-purple-700 text-white border-purple-700 shadow-2xs font-semibold"
              : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
          Hybrid Deals ({quoteCounts.hybrid})
        </button>
      </div>

      {/* Quick Order / Vendor Sub-Tabs Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-3">
        <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          <span>Orders & Fulfilment:</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setVendorFilter("all");
            setStatusFilter("all");
            setPage(1);
          }}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md transition-all border shrink-0",
            vendorFilter === "all" && statusFilter === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-2xs font-semibold"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
          )}
        >
          All ({quoteCounts.all})
        </button>
        <button
          type="button"
          onClick={() => {
            setVendorFilter("accepted");
            setPage(1);
          }}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md transition-all border shrink-0 flex items-center gap-1.5",
            vendorFilter === "accepted"
              ? "bg-sky-700 text-white border-sky-700 shadow-2xs font-semibold"
              : "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100",
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-sky-600" />
          Approved / Accepted Orders ({quoteCounts.accepted})
        </button>
        <button
          type="button"
          onClick={() => {
            setVendorFilter("unassigned");
            setPage(1);
          }}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md transition-all border shrink-0 flex items-center gap-1.5 cursor-pointer",
            vendorFilter === "unassigned"
              ? "bg-amber-600 text-white border-amber-600 shadow-2xs font-semibold"
              : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100",
          )}
        >
          <Clock className="h-3.5 w-3.5 text-amber-600" />
          Awaiting Fulfilment ({quoteCounts.unassigned})
        </button>
        <button
          type="button"
          onClick={() => {
            setVendorFilter("assigned");
            setPage(1);
          }}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md transition-all border shrink-0 flex items-center gap-1.5 cursor-pointer",
            vendorFilter === "assigned"
              ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs font-semibold"
              : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Assigned to Vendor ({quoteCounts.assigned})
        </button>
        <button
          type="button"
          onClick={() => {
            setVendorFilter("in_stock");
            setPage(1);
          }}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md transition-all border shrink-0 flex items-center gap-1.5 cursor-pointer",
            vendorFilter === "in_stock"
              ? "bg-blue-700 text-white border-blue-700 shadow-2xs font-semibold"
              : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
          )}
        >
          <Boxes className="h-3.5 w-3.5 text-blue-600" />
          In-House / Stock Lifted ({quoteCounts.inStock})
        </button>
      </div>

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Search by quote no…"
        primaryFilter={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-40 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
            </SelectContent>
          </Select>
        }
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          <div className="flex items-center gap-2">
            {compareIds.size >= 2 && (
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => setCompareOpen(true)}
              >
                <Scale className="mr-1.5 h-3.5 w-3.5" /> {t("quotes.compare", "Compare")} (
                {compareIds.size})
              </Button>
            )}
            <Button size="sm" className="h-8" onClick={() => setOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> {t("quotes.newQuote", "New quote")}
            </Button>
          </div>
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={9} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No quotes yet"
          message="Create your first quote from a project."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> {t("quotes.newQuote", "New quote")}
            </Button>
          }
        />
      ) : (
        <DataTableShell
          density={prefs.density}
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
          <Table className="min-w-[1200px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                {!isHidden("no") && <TableHead className="w-36">Quote #</TableHead>}
                {!isHidden("saleMode") && <TableHead className="w-36">Deal Type</TableHead>}
                {!isHidden("date") && <TableHead className="w-28">Quote Date</TableHead>}
                {!isHidden("project") && <TableHead>Project</TableHead>}
                {!isHidden("customer") && <TableHead>Customer</TableHead>}
                {!isHidden("status") && <TableHead>Status</TableHead>}
                {!isHidden("vendor") && <TableHead className="w-48">Vendor Assignment</TableHead>}
                {!isHidden("deliveryDate") && (
                  <TableHead className="w-36 whitespace-nowrap">Promised Delivery</TableHead>
                )}
                {!isHidden("total") && <TableHead className="text-right">Total</TableHead>}
                {!isHidden("valid") && (
                  <TableHead className="whitespace-nowrap">Valid until</TableHead>
                )}
                <TableHead className="w-12 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => {
                const assignment = parseQuoteVendorAssignment(r);
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox
                        checked={compareIds.has(r.id)}
                        onCheckedChange={() => toggleCompare(r.id)}
                        aria-label={`Select ${r.quote_no} for comparison`}
                      />
                    </TableCell>
                    {!isHidden("no") && (
                      <TableCell className="text-xs">
                        <Link
                          to="/quotes/$quoteId"
                          params={{ quoteId: r.id }}
                          className="font-mono text-xs font-semibold text-primary hover:underline truncate block"
                        >
                          {r.quote_no}
                        </Link>
                      </TableCell>
                    )}
                    {!isHidden("saleMode") && (
                      <TableCell>
                        {(() => {
                          const mode = getQuoteSaleMode(r);
                          const cfg = SALE_MODE_CONFIG[mode];
                          const activeInvoice = r.invoices?.find((i) => i.status !== "cancelled");
                          const isInvoiced = !!activeInvoice;

                          return (
                            <div className="flex flex-col gap-0.5 items-start">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold border",
                                  cfg.badgeTone,
                                )}
                              >
                                <span
                                  className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dotColor)}
                                />
                                <span>{cfg.shortLabel}</span>
                              </span>
                              {mode === "invoiced" ? (
                                isInvoiced && activeInvoice ? (
                                  <Link
                                    to="/invoices/$invoiceId"
                                    params={{ invoiceId: activeInvoice.id }}
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                                  >
                                    <CheckCircle2 className="h-3 w-3 text-blue-600" />
                                    <span>Invoiced ({activeInvoice.invoice_no})</span>
                                  </Link>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-normal">
                                    To be invoiced
                                  </span>
                                )
                              ) : mode === "cash" ? (
                                <Link
                                  to="/dispatch/new"
                                  search={{ quote: r.id, customer: r.customer_id }}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:underline"
                                >
                                  <Truck className="h-3 w-3" />
                                  <span>Challan Only</span>
                                </Link>
                              ) : (
                                <div className="flex items-center gap-1 text-[10px]">
                                  {isInvoiced && activeInvoice ? (
                                    <Link
                                      to="/invoices/$invoiceId"
                                      params={{ invoiceId: activeInvoice.id }}
                                      className="font-semibold text-purple-700 hover:underline inline-flex items-center gap-0.5"
                                    >
                                      <CheckCircle2 className="h-2.5 w-2.5 text-purple-600" />
                                      <span>Invoiced ({activeInvoice.invoice_no})</span>
                                    </Link>
                                  ) : (
                                    <span className="text-purple-700 font-normal">Bill</span>
                                  )}
                                  <span className="text-muted-foreground">+ Cash</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                    )}
                    {!isHidden("date") && (
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(r.issue_date || r.created_at)}
                      </TableCell>
                    )}
                    {!isHidden("project") && (
                      <TableCell className="font-medium">{r.project?.name ?? "—"}</TableCell>
                    )}
                    {!isHidden("customer") && (
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-xs text-foreground">
                            {r.customer?.name ?? "—"}
                          </span>
                          {r.customer?.id && (
                            <CustomerAssigneeSelect
                              customerId={r.customer.id}
                              customerName={r.customer.name}
                              workflowState={r.customer.workflow_state}
                              externalRef={r.customer.external_ref}
                              size="sm"
                            />
                          )}
                        </div>
                      </TableCell>
                    )}
                    {!isHidden("status") && (
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize font-medium",
                            r.status === "accepted" &&
                              "bg-emerald-50 text-emerald-700 border-emerald-200",
                            r.status === "sent" && "bg-sky-50 text-sky-700 border-sky-200",
                            r.status === "draft" && "bg-slate-50 text-slate-700 border-slate-200",
                            r.status === "rejected" && "bg-rose-50 text-rose-700 border-rose-200",
                          )}
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                    )}
                    {!isHidden("vendor") && (
                      <TableCell>
                        {assignment.fulfilmentType === "stock_lifted" ||
                        assignment.isOrderCompleted ? (
                          <button
                            type="button"
                            onClick={() => setAssigningQuote(r)}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors shadow-2xs group cursor-pointer text-left"
                            title="Material lifted from stock · No RFQ required. Click to view or edit."
                          >
                            <PackageCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span className="font-semibold truncate max-w-[140px]">
                              Material Lifted from Stock
                            </span>
                            {assignment.isOrderCompleted && (
                              <span className="text-[10px] bg-emerald-200/80 px-1 py-0.2 rounded text-emerald-900 font-bold ml-0.5">
                                Order Completed
                              </span>
                            )}
                          </button>
                        ) : assignment.fulfilmentType === "in_stock" ? (
                          <button
                            type="button"
                            onClick={() => setAssigningQuote(r)}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition-colors text-left group cursor-pointer"
                            title={
                              assignment.stockLocation
                                ? `Fulfilled from in-house stock (${assignment.stockLocation}) — Click to view/edit`
                                : "Fulfilled from in-house stock — Click to view/edit"
                            }
                          >
                            <Boxes className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            <span className="font-semibold truncate max-w-[130px]">
                              In-House Stock
                            </span>
                            {assignment.stockLocation && (
                              <span className="text-[10px] text-blue-600/80 max-w-[80px] truncate">
                                · {assignment.stockLocation}
                              </span>
                            )}
                          </button>
                        ) : assignment.isAssigned ? (
                          <button
                            type="button"
                            onClick={() => setAssigningQuote(r)}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors text-left group cursor-pointer"
                            title="Click to view or change assigned vendor"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="font-semibold truncate max-w-[130px]">
                              {assignment.vendorName}
                            </span>
                            <Building2 className="h-3 w-3 text-emerald-600 opacity-60 group-hover:opacity-100 shrink-0" />
                          </button>
                        ) : r.status === "accepted" ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => quickLiftStockMut.mutate(r)}
                              disabled={quickLiftStockMut.isPending}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors shadow-2xs cursor-pointer"
                              title="1-click: Mark material as lifted from stock (RFQ not required)"
                            >
                              <PackageCheck className="h-3 w-3 text-blue-600 shrink-0" />
                              <span>Lift from Stock</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setRfqQuote(r)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer"
                              title="Send optional WhatsApp RFQ to vendors"
                            >
                              <MessageCircle className="h-3 w-3 text-slate-500" />
                              <span>RFQ</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAssigningQuote(r);
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
                              title="Assign stone vendor or stock source"
                            >
                              <Boxes className="h-3 w-3 text-slate-500" />
                              <span>+ Vendor</span>
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRfqQuote(r);
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded transition-colors cursor-pointer"
                              title="Send optional WhatsApp RFQ to vendors"
                            >
                              <MessageCircle className="h-3 w-3 text-emerald-600" />
                              <span>RFQ</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAssigningQuote(r);
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
                              title="Assign stone vendor or stock source"
                            >
                              <Boxes className="h-3 w-3 text-slate-500" />
                              <span>+ Vendor</span>
                            </button>
                          </div>
                        )}
                      </TableCell>
                    )}
                    {!isHidden("deliveryDate") && (
                      <TableCell className="text-xs whitespace-nowrap">
                        {assignment.promisedDeliveryDate ? (
                          <button
                            type="button"
                            onClick={() => setAssigningQuote(r)}
                            className="inline-flex items-center gap-1 text-slate-700 hover:text-primary hover:underline font-mono cursor-pointer"
                            title="Click to change promised delivery date"
                          >
                            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{formatDate(assignment.promisedDeliveryDate)}</span>
                          </button>
                        ) : r.status === "accepted" ? (
                          <button
                            type="button"
                            onClick={() => setAssigningQuote(r)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                            title="Promised delivery date missing — Click to set"
                          >
                            <Calendar className="h-3 w-3 text-amber-600 shrink-0" />
                            <span>+ Set Date</span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    {!isHidden("total") && (
                      <TableCell className="text-right tabular-nums">
                        {formatInr(r.total)}
                      </TableCell>
                    )}
                    {!isHidden("valid") && (
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {r.valid_until ? formatDate(r.valid_until) : "—"}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <RowActions
                        canEdit={true}
                        canDelete={true}
                        extra={
                          <>
                            <DropdownMenuItem
                              onClick={() =>
                                nav({
                                  to: "/dispatch/new",
                                  search: { quote: r.id, customer: r.customer_id },
                                })
                              }
                            >
                              <Truck className="mr-2 h-4 w-4 text-emerald-600" />
                              Issue Delivery Challan
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setRfqQuote(r)}>
                              <MessageCircle className="mr-2 h-4 w-4 text-emerald-600" />
                              WhatsApp RFQ / Sourcing
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAssigningQuote(r)}>
                              <Building2 className="mr-2 h-4 w-4" />
                              Assign Vendor / Delivery Date
                            </DropdownMenuItem>
                          </>
                        }
                        onEdit={() =>
                          nav({ to: "/quotes/$quoteId/edit", params: { quoteId: r.id } })
                        }
                        onDelete={() => setToDelete(r)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      <SafeDeleteDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        entityType="quote"
        entityId={toDelete?.id ?? null}
        entityLabel={toDelete ? toDelete.quote_no : ""}
        busy={del.isPending}
        onConfirmDelete={() => toDelete && del.mutate(toDelete.id)}
      />

      <CreateQuoteDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o && params.new) nav({ to: "/quotes", search: {} });
        }}
        initialProjectId={params.project ?? null}
        initialEnquiryId={params.enquiry ?? null}
        initialCustomerId={params.customer ?? null}
        initialStudio={params.studio}
      />

      {compareOpen && (
        <QuoteComparisonDialog
          quoteIds={Array.from(compareIds)}
          onOpenChange={(o) => {
            if (!o) setCompareOpen(false);
          }}
        />
      )}

      {assigningQuote && (
        <AssignQuoteVendorDialog
          open={!!assigningQuote}
          onOpenChange={(o) => {
            if (!o) setAssigningQuote(null);
          }}
          quoteId={assigningQuote.id}
          quoteNo={assigningQuote.quote_no}
          currentFulfilmentType={parseQuoteVendorAssignment(assigningQuote).fulfilmentType}
          currentStockLocation={parseQuoteVendorAssignment(assigningQuote).stockLocation}
          currentVendorId={parseQuoteVendorAssignment(assigningQuote).vendorId}
          currentVendorName={parseQuoteVendorAssignment(assigningQuote).vendorName}
          currentPromisedDate={parseQuoteVendorAssignment(assigningQuote).promisedDeliveryDate}
          onSuccess={() => {
            invalidateQuote(qc);
          }}
        />
      )}

      {rfqQuote && (
        <QuoteSendRfqDialog
          open={!!rfqQuote}
          onOpenChange={(o) => {
            if (!o) setRfqQuote(null);
          }}
          quoteId={rfqQuote.id}
          quoteNo={rfqQuote.quote_no}
          customerName={rfqQuote.customer?.name}
          projectId={rfqQuote.project_id}
          customerId={rfqQuote.customer_id}
          enquiryId={rfqQuote.enquiry_id}
          onAssigned={() => {
            invalidateQuote(qc);
          }}
        />
      )}
    </div>
  );
}

// Numeric line-item fields are stored as raw strings so users can type freely
// (decimals, backspaced values, empty state) without a numeric coerce hijacking
// the cursor, dropping trailing decimals, or forcing a leading zero.
type FormItem = {
  key: string;
  product_id: string | null;
  description: string;
  notes: string;
  quantity: string;
  unit: string | null;
  unit_price: string;
  tax_pct: string;
  hsn_sac: string;
  fulfilment: QuoteCategory | "";
};

function emptyItem(defaultFulfilment: QuoteCategory | "" = "", isCash = false): FormItem {
  return {
    key: Math.random().toString(36).slice(2),
    product_id: null,
    description: "",
    notes: "",
    quantity: "",
    unit: "sqft",
    unit_price: "",
    tax_pct: isCash ? "0" : "18",
    hsn_sac: "",
    fulfilment: defaultFulfilment,
  };
}

function emptyCartingItem(isCash = false): FormItem {
  return {
    key: Math.random().toString(36).slice(2),
    product_id: null,
    description: "Local Carting & Transportation",
    notes: "Site delivery via tempo / pickup from yard to site",
    quantity: "1",
    unit: "trip",
    unit_price: "1500",
    tax_pct: isCash ? "0" : "5",
    hsn_sac: "9965",
    fulfilment: "",
  };
}

function CreateQuoteDialog({
  open,
  onOpenChange,
  initialProjectId,
  initialEnquiryId,
  initialCustomerId,
  initialStudio,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialProjectId: string | null;
  initialEnquiryId: string | null;
  initialCustomerId?: string | null;
  initialStudio?: "cladding" | "mural";
}) {
  const qc = useQueryClient();
  const nav = useNavigate();

  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [customerId, setCustomerId] = useState(initialCustomerId ?? "");
  const [category, setCategory] = useState<QuoteCategory | "">("");
  const [saleMode, setSaleMode] = useState<SaleMode>("invoiced");
  const [hybridCashAmount, setHybridCashAmount] = useState("");
  const [hybridInvoicedAmount, setHybridInvoicedAmount] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [dealScope, setDealScope] = useState<DealScope>("supply_only");
  const [isClientProvidedSlab, setIsClientProvidedSlab] = useState<boolean>(false);
  const [deliveryDays, setDeliveryDays] = useState<string>("15");
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [items, setItems] = useState<FormItem[]>([emptyItem("", false)]);
  const [mode, setMode] = useState<"manual" | "wall_cladding" | "stone_mural" | "calculator">(
    initialStudio === "mural"
      ? "stone_mural"
      : initialStudio === "cladding"
        ? "wall_cladding"
        : "manual",
  );
  const [calcResult, setCalcResult] = useState<EstimateStudioResult | StoneMuralResult | null>(
    null,
  );

  useEffect(() => {
    if (open) {
      setProjectId(initialProjectId ?? "");
      setCustomerId(initialCustomerId ?? "");
      setCategory("");
      setSaleMode("invoiced");
      setHybridCashAmount("");
      setHybridInvoicedAmount("");
      setValidUntil("");
      setNotes("");
      setTerms("");
      setDealScope("supply_only");
      setIsClientProvidedSlab(false);
      setDeliveryDays("15");
      setDeliveryDate("");
      setItems([emptyItem("", false)]);
      if (initialStudio === "mural") setMode("stone_mural");
      else if (initialStudio === "cladding") setMode("wall_cladding");
      else setMode("manual");
      setCalcResult(null);
    }
  }, [open, initialProjectId, initialCustomerId, initialStudio]);

  const totals = useMemo(() => {
    let sub = 0,
      tax = 0;
    for (const it of items) {
      const line = Number(it.quantity || 0) * Number(it.unit_price || 0);
      sub += line;
      if (saleMode !== "cash") {
        tax += (line * Number(it.tax_pct || 0)) / 100;
      }
    }
    return {
      sub,
      tax: saleMode === "cash" ? 0 : tax,
      total: saleMode === "cash" ? sub : sub + tax,
    };
  }, [items, saleMode]);

  const effectiveTotal = useMemo(() => {
    if (mode === "manual") return totals.total;
    return calcResult ? calcResult.total : totals.total;
  }, [mode, totals.total, calcResult]);

  useEffect(() => {
    if (mode === "manual") {
      setDealScope(detectDealScopeFromItems(items));
      setIsClientProvidedSlab(detectClientProvidedSlabFromItems(items));
    } else if (calcResult) {
      const hasInstall = calcResult.items.some(
        (i) =>
          i.fulfilment === "supply_and_installation" ||
          i.description.toLowerCase().includes("installation") ||
          i.description.toLowerCase().includes("labour"),
      );
      setDealScope(hasInstall ? "supply_and_installation" : "supply_only");
      setIsClientProvidedSlab(
        detectClientProvidedSlabFromItems(calcResult.items, calcResult.worksheet),
      );
    }
  }, [items, calcResult, mode]);

  const mutation = useMutation({
    mutationFn: createQuote,
    onSuccess: (row) => {
      toast.success(`Quote ${row.quote_no} created`);
      invalidateQuote(qc, row.id);
      onOpenChange(false);
      nav({ to: "/quotes/$quoteId", params: { quoteId: row.id } });
    },
    onError: (err) => {
      console.error("[CreateQuoteDialog] Quote creation failed:", err);
      toast.error(toUserMessage(err), { duration: 6000 });
    },
  });

  function updateItem(key: string, patch: Partial<FormItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }
  function removeItem(key: string) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.key !== key)));
  }

  const handleTransferToManual = () => {
    if (!calcResult || calcResult.items.length === 0) {
      toast.error("Please add dimensions and products to calculate items first");
      return;
    }
    const newItems: FormItem[] = calcResult.items.map((it) => ({
      key: Math.random().toString(36).slice(2),
      product_id: it.product_id ?? "",
      description: it.description,
      quantity: String(it.quantity),
      unit: it.unit || "sqft",
      unit_price: String(it.unit_price),
      tax_pct: saleMode === "cash" ? "0" : it.tax_pct !== undefined ? String(it.tax_pct) : "18",
      notes: it.notes || "",
      hsn_sac: it.hsn_sac || "",
      fulfilment: it.fulfilment || "",
    }));
    setItems(newItems);
    const muralScene =
      calcResult &&
      "scenario" in calcResult.worksheet &&
      calcResult.worksheet.scenario === "stone_mural"
        ? calcResult.worksheet.sceneDescription
        : undefined;
    if (muralScene) {
      setNotes((prev) =>
        prev
          ? `${prev}\n\nMural Scene & Scope: ${muralScene}`
          : `Mural Scene & Scope: ${muralScene}`,
      );
    }
    setMode("manual");
    toast.success(
      "Imported into line items! You can now freely edit, modify quantities/rates, or add notes before creating the quote.",
    );
  };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (initialProjectId) {
      if (!projectId) return toast.error("Pick a project");
    } else if (!customerId) {
      return toast.error("Pick a customer");
    }

    if (mode === "wall_cladding" || mode === "stone_mural" || mode === "calculator") {
      if (!calcResult || calcResult.items.length === 0) {
        return toast.error("Complete the calculation in the studio first");
      }
      const discount = "discount" in calcResult.worksheet ? calcResult.worksheet.discount : null;
      const discountNote =
        discount && discount.applied && discount.eligible
          ? `Estimate Studio: ${discount.pct}% discount applied (${formatInr(discount.amount)} off) — final estimate total ${formatInr(calcResult.total)}. This quote's own stored total below is the pre-discount subtotal, since quotations have no discount field yet.`
          : null;
      const sceneNote =
        calcResult &&
        "scenario" in calcResult.worksheet &&
        calcResult.worksheet.scenario === "stone_mural" &&
        calcResult.worksheet.sceneDescription
          ? `Mural Scene & Scope: ${calcResult.worksheet.sceneDescription}`
          : null;
      mutation.mutate({
        project_id: initialProjectId ? projectId : undefined,
        customer_id: initialProjectId ? undefined : customerId,
        enquiry_id: initialEnquiryId,
        category:
          category ||
          (mode === "stone_mural"
            ? "material_and_labour"
            : mode === "wall_cladding" || mode === "calculator"
              ? calcResult?.worksheet &&
                "installation" in calcResult.worksheet &&
                (calcResult.worksheet.installationAmount ?? 0) === 0
                ? "supply_only"
                : "supply_and_installation"
              : null),
        valid_until: validUntil || null,
        notes: [notes, discountNote, sceneNote].filter(Boolean).join("\n\n") || null,
        terms: terms ? terms.trim() : null,
        sale_mode: saleMode,
        hybrid_cash_amount:
          saleMode === "hybrid" && hybridCashAmount ? Number(hybridCashAmount) : undefined,
        hybrid_invoiced_amount:
          saleMode === "hybrid" && hybridInvoicedAmount ? Number(hybridInvoicedAmount) : undefined,
        items: calcResult.items.map((it) => ({
          ...it,
          quantity: Math.round(Number(it.quantity) * 100) / 100,
          tax_pct: saleMode === "cash" ? 0 : it.tax_pct,
        })),
        wall_estimate: calcResult.worksheet as Record<string, unknown>,
      });
      return;
    }

    // Filter out completely blank lines (e.g. if an extra line was clicked accidentally)
    const nonBlankItems = items.filter((it) => {
      if (items.length === 1) return true;
      const hasDesc = it.description.trim().length > 0;
      const hasQty = Number(it.quantity) > 0;
      const hasPrice = Number(it.unit_price) > 0;
      const hasNotes = it.notes.trim().length > 0;
      return hasDesc || hasQty || hasPrice || hasNotes;
    });

    if (nonBlankItems.length === 0) {
      return toast.error("Please add at least one line item with a Description / Product");
    }

    const parsedItems: QuoteItemInput[] = [];
    for (let i = 0; i < nonBlankItems.length; i++) {
      const it = nonBlankItems[i];
      const lineNum = i + 1;
      if (!it.description.trim()) {
        return toast.error(`Line ${lineNum}: Description / Product * is required`);
      }
      if (!it.quantity || Number(it.quantity) <= 0) {
        return toast.error(`Line ${lineNum}: Quantity * must be greater than 0`);
      }
      const r = quoteItemInputSchema.safeParse({
        product_id: it.product_id,
        description: it.description,
        notes: it.notes.trim() || null,
        quantity: it.quantity,
        unit: it.unit,
        unit_price: it.unit_price === "" ? 0 : it.unit_price,
        tax_pct: saleMode === "cash" ? 0 : it.tax_pct === "" ? 0 : it.tax_pct,
        hsn_sac: it.hsn_sac || null,
        fulfilment: it.fulfilment || null,
      });
      if (!r.success) {
        return toast.error(`Line ${lineNum}: ${r.error.issues[0]?.message ?? "Invalid line item"}`);
      }
      parsedItems.push(r.data);
    }
    mutation.mutate({
      project_id: initialProjectId ? projectId : undefined,
      customer_id: initialProjectId ? undefined : customerId,
      enquiry_id: initialEnquiryId,
      category: category || null,
      valid_until: validUntil || null,
      notes: notes || null,
      terms: terms ? terms.trim() : null,
      sale_mode: saleMode,
      hybrid_cash_amount:
        saleMode === "hybrid" && hybridCashAmount ? Number(hybridCashAmount) : undefined,
      hybrid_invoiced_amount:
        saleMode === "hybrid" && hybridInvoicedAmount ? Number(hybridInvoicedAmount) : undefined,
      items: parsedItems,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        noAutoScroll
        className="max-w-5xl w-[95vw] h-[88vh] max-h-[88vh] flex flex-col p-6 overflow-hidden"
      >
        <DialogHeader className="shrink-0 pb-2 border-b">
          <DialogTitle>New quote</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 pr-1 py-1 -mr-1">
          <QuickForm onSubmit={onSubmit} busy={mutation.isPending}>
            <QuickForm.QuickFill>
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-lg border border-border bg-slate-100/80 dark:bg-slate-900/80 mb-3">
                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer border",
                    mode === "manual"
                      ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/25"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60",
                  )}
                >
                  <FileText className="h-4 w-4" />
                  <span>Manual line items</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("wall_cladding")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer border",
                    mode === "wall_cladding" || mode === "calculator"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/25"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60",
                  )}
                >
                  <Layers className="h-4 w-4" />
                  <span>Wall Cladding Calculator</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("stone_mural")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer border",
                    mode === "stone_mural"
                      ? "bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-500/25"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60",
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Stone Mural Calculator</span>
                </button>
              </div>

              {initialProjectId ? (
                <Field label="Project" required className="md:col-span-2">
                  <EntityPicker
                    type="project"
                    value={projectId || null}
                    onChange={(id) => setProjectId(id ?? "")}
                    disabled
                  />
                </Field>
              ) : (
                <Field label="Customer" required className="md:col-span-2">
                  <EntityPicker
                    type="customer"
                    value={customerId || null}
                    onChange={(id) => setCustomerId(id ?? "")}
                    placeholder="Search registered customers…"
                  />
                </Field>
              )}

              <Field label="Deal Scope (Work Flow)" className="md:col-span-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {QUOTE_CATEGORIES.map((c) => {
                    const isSelected = category === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(isSelected ? "" : c)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold border transition-all cursor-pointer text-center",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background text-foreground border-border hover:bg-muted/50",
                        )}
                      >
                        <span>{QUOTE_CATEGORY_LABELS[c]}</span>
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="Deal Type (Billing)" className="md:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSaleMode("invoiced");
                      setItems((prev) =>
                        prev.map((it) => ({
                          ...it,
                          tax_pct: it.tax_pct === "0" ? "18" : it.tax_pct,
                        })),
                      );
                    }}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold border transition-all cursor-pointer",
                      saleMode === "invoiced"
                        ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                    )}
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    <span>GST Deal (Tax Bill)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSaleMode("cash");
                      setItems((prev) => prev.map((it) => ({ ...it, tax_pct: "0" })));
                    }}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold border transition-all cursor-pointer",
                      saleMode === "cash"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                    )}
                  >
                    <Truck className="h-3.5 w-3.5" />
                    <span>Cash Deal (Challan Only)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaleMode("hybrid")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold border transition-all cursor-pointer",
                      saleMode === "hybrid"
                        ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                    )}
                  >
                    <Scale className="h-3.5 w-3.5" />
                    <span>Hybrid Deal (GST + Cash)</span>
                  </button>
                </div>
                {saleMode === "cash" && (
                  <p className="text-[11px] text-emerald-700 font-medium mt-1.5 flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      GST percentage is removed. Amounts are added as-is without tax. Only Delivery
                      Challans will be sent.
                    </span>
                  </p>
                )}
                {saleMode === "hybrid" && (
                  <div className="grid grid-cols-2 gap-3 mt-2 p-2.5 rounded-md bg-purple-50 border border-purple-200">
                    <div>
                      <label className="text-[11px] font-medium text-purple-900 block mb-1">
                        Cash Amount (Challan · No GST)
                      </label>
                      <NumericInput
                        placeholder="0"
                        value={hybridCashAmount}
                        onChange={setHybridCashAmount}
                        min={0}
                        allowDecimal
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-purple-900 block mb-1">
                        Invoiced Amount (With GST Bill)
                      </label>
                      <NumericInput
                        placeholder="0"
                        value={hybridInvoicedAmount}
                        onChange={setHybridInvoicedAmount}
                        min={0}
                        allowDecimal
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  </div>
                )}
              </Field>

              {mode === "manual" && (
                <div className="md:col-span-2">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium">Line items</label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setItems((p) => [...p, emptyCartingItem(saleMode === "cash")])
                        }
                        className="h-8 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:text-amber-950 text-xs font-medium cursor-pointer"
                        title="Add optional local carting / transport charge"
                      >
                        <Truck className="mr-1.5 h-3.5 w-3.5 text-amber-700" />+ Add Local Carting
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setItems((p) => [...p, emptyItem(category, saleMode === "cash")])
                        }
                        className="h-8 text-xs cursor-pointer"
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add line
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {items.map((it, idx) => (
                      <div
                        key={it.key}
                        className="grid grid-cols-12 gap-3 rounded-sm border border-border bg-background p-3"
                      >
                        <div className="col-span-12 flex items-center justify-between border-b pb-1.5 mb-0.5 text-xs">
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                              {idx + 1}
                            </span>
                            Line Item {idx + 1}
                          </span>
                          {items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              onClick={() => removeItem(it.key)}
                              title="Delete this line item"
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove line
                            </Button>
                          )}
                        </div>

                        <LineField
                          label={
                            <span>
                              Description / Product{" "}
                              <span className="text-destructive font-bold">*</span>
                            </span>
                          }
                          className="col-span-12 md:col-span-4"
                        >
                          <CatalogProductSelect
                            value={it.description}
                            onChange={(val) => updateItem(it.key, { description: val })}
                            onSelectCatalogItem={(cat) => {
                              const isCarting =
                                cat.category === "carting" || cat.id.startsWith("cart_");
                              updateItem(it.key, {
                                description: cat.name,
                                unit: cat.defaultUnit,
                                quantity:
                                  isCarting && (!it.quantity || it.quantity === "0")
                                    ? "1"
                                    : it.quantity,
                                unit_price:
                                  cat.defaultPrice !== undefined && cat.defaultPrice !== null
                                    ? String(cat.defaultPrice)
                                    : it.unit_price,
                                hsn_sac: cat.hsnCode || it.hsn_sac,
                                tax_pct:
                                  saleMode === "cash"
                                    ? "0"
                                    : cat.defaultTaxPct !== undefined
                                      ? String(cat.defaultTaxPct)
                                      : it.tax_pct,
                              });
                            }}
                          />
                        </LineField>
                        <LineField label="HSN Code" className="col-span-6 md:col-span-2">
                          <Input
                            placeholder="4-8 digits"
                            value={it.hsn_sac}
                            onChange={(e) =>
                              updateItem(it.key, {
                                hsn_sac: e.target.value.replace(/\D/g, "").slice(0, 8),
                              })
                            }
                          />
                        </LineField>
                        <LineField
                          label={
                            <span>
                              Quantity <span className="text-destructive font-bold">*</span>
                            </span>
                          }
                          className="col-span-6 md:col-span-2"
                        >
                          <NumericInput
                            placeholder="0"
                            value={it.quantity}
                            onChange={(val) => updateItem(it.key, { quantity: val })}
                            min={0}
                            allowDecimal
                          />
                        </LineField>
                        <LineField label="Unit" className="col-span-6 md:col-span-1">
                          <Input
                            placeholder="sqft"
                            value={it.unit ?? ""}
                            onChange={(e) => updateItem(it.key, { unit: e.target.value })}
                          />
                        </LineField>
                        <LineField
                          label={
                            <span>
                              Rate (₹) <span className="text-destructive font-bold">*</span>
                            </span>
                          }
                          className="col-span-6 md:col-span-2"
                        >
                          <NumericInput
                            placeholder="0"
                            value={it.unit_price}
                            onChange={(val) => updateItem(it.key, { unit_price: val })}
                            min={0}
                            allowDecimal
                          />
                        </LineField>
                        <LineField label="GST %" className="col-span-6 md:col-span-1">
                          {saleMode === "cash" ? (
                            <div
                              className="h-9 px-2 flex items-center justify-center text-xs font-semibold text-slate-400 bg-slate-50 border rounded-md"
                              title="0% GST for Cash Sale"
                            >
                              0%
                            </div>
                          ) : (
                            <PercentInput
                              placeholder="0"
                              value={it.tax_pct}
                              onChange={(val) => updateItem(it.key, { tax_pct: val })}
                            />
                          )}
                        </LineField>
                        <LineField
                          label="Product Notes (Material Details & Size Specs)"
                          hint="Blank box for exact material description, dimensions, finish, etc."
                          className="col-span-12"
                        >
                          <Input
                            placeholder="e.g. 50mm thick sandstone, honed surface, 4ft × 2ft slab sizes, chamfered edges..."
                            value={it.notes}
                            onChange={(e) => updateItem(it.key, { notes: e.target.value })}
                          />
                        </LineField>
                      </div>
                    ))}
                  </div>

                  {/* Optional Local Carting Provision */}
                  {!items.some(
                    (it) =>
                      it.hsn_sac === "9965" ||
                      it.description.toLowerCase().includes("carting") ||
                      it.description.toLowerCase().includes("transport"),
                  ) && (
                    <div className="mt-3 flex items-center justify-between rounded-md border border-dashed border-amber-300 bg-amber-50/50 p-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-amber-700" />
                        <div>
                          <span className="font-semibold text-amber-950">
                            Local Carting &amp; Transportation
                          </span>
                          <span className="ml-1 text-[11px] text-amber-700">
                            (Optional — site delivery via tempo/pickup)
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setItems((p) => [...p, emptyCartingItem(saleMode === "cash")])
                        }
                        className="h-7 border-amber-300 bg-white text-amber-900 hover:bg-amber-100 text-xs font-medium cursor-pointer"
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add carting (₹1,500)
                      </Button>
                    </div>
                  )}

                  <div className="mt-2 flex justify-end gap-6 text-sm">
                    <div>
                      Subtotal: <span className="font-medium">{formatInr(totals.sub)}</span>
                    </div>
                    {saleMode !== "cash" && (
                      <div>
                        Tax: <span className="font-medium">{formatInr(totals.tax)}</span>
                      </div>
                    )}
                    <div>
                      Total:{" "}
                      <span className="font-bold text-slate-900">{formatInr(totals.total)}</span>
                      {saleMode === "cash" && (
                        <span className="text-[11px] text-emerald-700 ml-1.5 font-semibold">
                          (Cash · No GST)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(mode === "wall_cladding" || mode === "calculator") && (
                <div className="md:col-span-2">
                  <EstimateStudioCalculator
                    projectId={projectId || null}
                    category={category}
                    onCategoryChange={setCategory}
                    onResult={setCalcResult}
                    onTransferToManual={handleTransferToManual}
                  />
                </div>
              )}

              {mode === "stone_mural" && (
                <div className="md:col-span-2">
                  <StoneMuralCalculator
                    projectId={projectId || null}
                    category={category}
                    onCategoryChange={setCategory}
                    onResult={setCalcResult}
                    onTransferToManual={handleTransferToManual}
                  />
                </div>
              )}
            </QuickForm.QuickFill>

            <QuickForm.MoreDetails>
              <Field label="Valid until">
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </Field>
            </QuickForm.MoreDetails>

            <QuickForm.Advanced>
              <Field label="Notes" className="md:col-span-2">
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
              <div className="md:col-span-2">
                <QuoteTermsManager
                  terms={terms}
                  onChangeTerms={setTerms}
                  dealScope={dealScope}
                  onChangeDealScope={setDealScope}
                  totalAmount={effectiveTotal}
                  initialTimelineDays={deliveryDays}
                  initialDeliveryDate={deliveryDate}
                  clientProvidedSlab={isClientProvidedSlab}
                  onChangeClientProvidedSlab={setIsClientProvidedSlab}
                  onTimelineChange={({ mode: tMode, days: tDays, date: tDate }) => {
                    if (tMode === "days") setDeliveryDays(tDays || "15");
                    if (tMode === "date") setDeliveryDate(tDate || "");
                  }}
                />
              </div>
            </QuickForm.Advanced>

            <QuickForm.Actions>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || (mode !== "manual" && !calcResult)}
              >
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
                quote
              </Button>
            </QuickForm.Actions>
          </QuickForm>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LineField({
  label,
  hint,
  className,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between">
        <label className="block text-xs font-medium text-muted-foreground">{label}</label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
