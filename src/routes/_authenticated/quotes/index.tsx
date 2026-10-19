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
} from "lucide-react";
import { parseQuoteVendorAssignment, assignVendorToQuote } from "@/lib/quotes/vendor-assignment";
import { AssignQuoteVendorDialog } from "@/components/quotes/AssignQuoteVendorDialog";
import { QuoteSendRfqDialog } from "@/components/rfqs/QuoteSendRfqDialog";
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
      { key: "no", label: "Quote / Customer", required: true },
      { key: "saleMode", label: "Sale Mode" },
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

      {/* Mode of Sale Sub-Tabs: Cash Sales vs Invoiced Sales vs Hybrid */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-2">
        <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
          <FileText className="h-3.5 w-3.5 text-slate-400" />
          <span>Mode of Sale:</span>
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
          Invoiced Sales · Tax Bills ({quoteCounts.invoiced})
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
          Cash Sales · Challans Only ({quoteCounts.cash})
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
          Hybrid ({quoteCounts.hybrid})
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
                {!isHidden("no") && <TableHead>Quote / Customer</TableHead>}
                {!isHidden("saleMode") && <TableHead className="w-36">Sale Mode</TableHead>}
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
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-foreground text-xs truncate max-w-[160px] sm:max-w-none">
                            {r.customer?.name ?? "—"}
                          </span>
                          <Link
                            to="/quotes/$quoteId"
                            params={{ quoteId: r.id }}
                            className="font-mono text-[11px] text-primary hover:underline truncate"
                          >
                            {r.quote_no}
                          </Link>
                        </div>
                      </TableCell>
                    )}
                    {!isHidden("saleMode") && (
                      <TableCell>
                        {(() => {
                          const mode = getQuoteSaleMode(r);
                          const cfg = SALE_MODE_CONFIG[mode];
                          return (
                            <div className="flex flex-col gap-1 items-start">
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
                              {mode === "cash" && (
                                <Link
                                  to="/dispatch/new"
                                  search={{ quote: r.id, customer: r.customer_id }}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:underline"
                                >
                                  <Truck className="h-3 w-3" />
                                  <span>Challan Only</span>
                                </Link>
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
                    {!isHidden("customer") && <TableCell>{r.customer?.name ?? "—"}</TableCell>}
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
                              onClick={() => setAssigningQuote(r)}
                              className="inline-flex items-center px-1.5 py-0.5 text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              title="More options (Vendor, Promised date, Godown)"
                            >
                              <span>+ Assign</span>
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setRfqQuote(r)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded transition-colors cursor-pointer"
                              title="Send optional WhatsApp RFQ to vendors"
                            >
                              <MessageCircle className="h-3 w-3 text-emerald-600" />
                              <span>RFQ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setAssigningQuote(r)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              title="Assign vendor or stock"
                            >
                              <span>+ Assign</span>
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
    quantity: "",
    unit: "sqft",
    unit_price: "",
    tax_pct: isCash ? "0" : "18",
    hsn_sac: "",
    fulfilment: defaultFulfilment,
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

  const mutation = useMutation({
    mutationFn: createQuote,
    onSuccess: (row) => {
      toast.success(`Quote ${row.quote_no} created`);
      invalidateQuote(qc, row.id);
      onOpenChange(false);
      nav({ to: "/quotes/$quoteId", params: { quoteId: row.id } });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  function updateItem(key: string, patch: Partial<FormItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }
  function removeItem(key: string) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.key !== key)));
  }

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
      mutation.mutate({
        project_id: initialProjectId ? projectId : undefined,
        customer_id: initialProjectId ? undefined : customerId,
        enquiry_id: initialEnquiryId,
        category: category || (mode === "stone_mural" ? "material_and_labour" : null),
        valid_until: validUntil || null,
        notes: [notes, discountNote].filter(Boolean).join("\n\n") || null,
        terms: terms || null,
        sale_mode: saleMode,
        hybrid_cash_amount:
          saleMode === "hybrid" && hybridCashAmount ? Number(hybridCashAmount) : undefined,
        hybrid_invoiced_amount:
          saleMode === "hybrid" && hybridInvoicedAmount ? Number(hybridInvoicedAmount) : undefined,
        items: calcResult.items.map((it) => ({
          ...it,
          tax_pct: saleMode === "cash" ? 0 : it.tax_pct,
        })),
        wall_estimate: calcResult.worksheet as Record<string, unknown>,
      });
      return;
    }

    const parsedItems: QuoteItemInput[] = [];
    for (const it of items) {
      const r = quoteItemInputSchema.safeParse({
        product_id: it.product_id,
        description: it.description,
        quantity: it.quantity,
        unit: it.unit,
        unit_price: it.unit_price === "" ? 0 : it.unit_price,
        tax_pct: saleMode === "cash" ? 0 : it.tax_pct === "" ? 0 : it.tax_pct,
        hsn_sac: it.hsn_sac || null,
        fulfilment: it.fulfilment || null,
      });
      if (!r.success) return toast.error(r.error.issues[0]?.message ?? "Invalid line item");
      parsedItems.push(r.data);
    }
    mutation.mutate({
      project_id: initialProjectId ? projectId : undefined,
      customer_id: initialProjectId ? undefined : customerId,
      enquiry_id: initialEnquiryId,
      category: category || null,
      valid_until: validUntil || null,
      notes: notes || null,
      terms: terms || null,
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
        className={mode !== "manual" ? "max-w-5xl max-h-[90vh] overflow-y-auto" : "max-w-4xl"}
      >
        <DialogHeader>
          <DialogTitle>New quote</DialogTitle>
        </DialogHeader>
        <QuickForm onSubmit={onSubmit} busy={mutation.isPending}>
          <QuickForm.QuickFill>
            <div className="md:col-span-2 flex gap-1.5 rounded-sm border border-border bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={`flex-1 rounded-sm px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                  mode === "manual"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Manual line items
              </button>
              <button
                type="button"
                onClick={() => setMode("wall_cladding")}
                className={`flex-1 rounded-sm px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                  mode === "wall_cladding" || mode === "calculator"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Wall Cladding Studio
              </button>
              <button
                type="button"
                onClick={() => setMode("stone_mural")}
                className={`flex-1 rounded-sm px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                  mode === "stone_mural"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Stone Mural Studio
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

            <Field label="Category" className="md:col-span-2">
              <Select
                value={category || "none"}
                onValueChange={(v) => setCategory(v === "none" ? "" : (v as QuoteCategory))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {QUOTE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {QUOTE_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Mode of Sale" className="md:col-span-2">
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
                  <FileText className="h-3.5 w-3.5" />
                  <span>Invoiced Sale (GST Bill)</span>
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
                  <span>Cash Sale (Challan Only · No GST)</span>
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
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  <span>Hybrid (Invoiced + Cash)</span>
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setItems((p) => [...p, emptyItem(category, saleMode === "cash")])
                    }
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add line
                  </Button>
                </div>
                <div className="space-y-3">
                  {items.map((it) => (
                    <div
                      key={it.key}
                      className="grid grid-cols-12 gap-3 rounded-sm border border-border bg-background p-3"
                    >
                      <LineField
                        label="Description / Product"
                        className="col-span-12 md:col-span-3"
                      >
                        <CatalogProductSelect
                          value={it.description}
                          onChange={(val) => updateItem(it.key, { description: val })}
                          onSelectCatalogItem={(cat) => {
                            updateItem(it.key, {
                              description: cat.name,
                              unit: cat.defaultUnit,
                              unit_price: cat.defaultPrice
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
                      <LineField label="Quantity" className="col-span-6 md:col-span-1">
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
                      <LineField label="Rate (₹)" className="col-span-6 md:col-span-2">
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
                      <LineField label="Fulfilment" className="col-span-10 md:col-span-2">
                        <Select
                          value={it.fulfilment || "inherit"}
                          onValueChange={(v) =>
                            updateItem(it.key, {
                              fulfilment: v === "inherit" ? "" : (v as QuoteCategory),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inherit">— Inherit quote —</SelectItem>
                            {QUOTE_CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {QUOTE_CATEGORY_LABELS[c]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </LineField>
                      <div className="col-span-2 md:col-span-1 flex items-end justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove line item"
                          onClick={() => removeItem(it.key)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
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
                <EstimateStudioCalculator projectId={projectId || null} onResult={setCalcResult} />
              </div>
            )}

            {mode === "stone_mural" && (
              <div className="md:col-span-2">
                <StoneMuralCalculator projectId={projectId || null} onResult={setCalcResult} />
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
            <Field label="Terms" className="md:col-span-2">
              <Textarea rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} />
            </Field>
          </QuickForm.Advanced>

          <QuickForm.Actions>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || (mode !== "manual" && !calcResult)}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create quote
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}

function LineField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
