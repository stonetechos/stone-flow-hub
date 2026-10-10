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
} from "lucide-react";
import { parseQuoteVendorAssignment } from "@/lib/quotes/vendor-assignment";
import { AssignQuoteVendorDialog } from "@/components/quotes/AssignQuoteVendorDialog";
import { cn } from "@/lib/utils";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { z } from "zod";
import { useTranslation } from "react-i18next";
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
import { formatInr } from "@/lib/format";
import {
  EstimateStudioCalculator,
  type EstimateStudioResult,
} from "@/components/quotes/EstimateStudioCalculator";
import { NumericInput, PercentInput } from "@/components/forms/inputs/SmartInputs";

const search = z.object({
  new: z.string().optional(),
  project: z.string().uuid().optional(),
  enquiry: z.string().uuid().optional(),
  status: z.string().optional(),
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

  const [vendorFilter, setVendorFilter] = useState<"all" | "accepted" | "unassigned" | "assigned">(
    "all",
  );
  const [assigningQuote, setAssigningQuote] = useState<QuoteListItem | null>(null);

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "no", label: "No.", required: true },
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

  const quoteCounts = useMemo(() => {
    const all = query.data ?? [];
    let accepted = 0;
    let unassigned = 0;
    let assigned = 0;
    for (const r of all) {
      if (r.status === "accepted") {
        accepted++;
        const a = parseQuoteVendorAssignment(r);
        if (a.isAssigned) {
          assigned++;
        } else {
          unassigned++;
        }
      }
    }
    return { all: all.length, accepted, unassigned, assigned };
  }, [query.data]);

  const rows = useMemo(() => {
    let list = query.data ?? [];
    if (vendorFilter === "accepted") {
      list = list.filter((r) => r.status === "accepted");
    } else if (vendorFilter === "unassigned") {
      list = list.filter(
        (r) => r.status === "accepted" && !parseQuoteVendorAssignment(r).isAssigned,
      );
    } else if (vendorFilter === "assigned") {
      list = list.filter(
        (r) => r.status === "accepted" && parseQuoteVendorAssignment(r).isAssigned,
      );
    } else if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
    return list;
  }, [query.data, vendorFilter, statusFilter]);

  useEffect(() => setPage(1), [dq, statusFilter, vendorFilter]);
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
          All Quotes ({quoteCounts.all})
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
            "px-2.5 py-1 text-xs font-medium rounded-md transition-all border shrink-0 flex items-center gap-1.5",
            vendorFilter === "unassigned"
              ? "bg-rose-700 text-white border-rose-700 shadow-2xs font-semibold"
              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
          )}
        >
          <AlertCircle className="h-3.5 w-3.5 text-rose-500" />⚠ Unassigned Yet (
          {quoteCounts.unassigned})
        </button>
        <button
          type="button"
          onClick={() => {
            setVendorFilter("assigned");
            setPage(1);
          }}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md transition-all border shrink-0 flex items-center gap-1.5",
            vendorFilter === "assigned"
              ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs font-semibold"
              : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Assigned to Vendor ({quoteCounts.assigned})
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
        <SkeletonTable rows={6} columns={8} />
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                {!isHidden("no") && <TableHead>No.</TableHead>}
                {!isHidden("project") && <TableHead>Project</TableHead>}
                {!isHidden("customer") && <TableHead>Customer</TableHead>}
                {!isHidden("status") && <TableHead>Status</TableHead>}
                {!isHidden("vendor") && <TableHead className="w-48">Vendor Assignment</TableHead>}
                {!isHidden("deliveryDate") && (
                  <TableHead className="w-40">Promised Delivery</TableHead>
                )}
                {!isHidden("total") && <TableHead className="text-right">Total</TableHead>}
                {!isHidden("valid") && <TableHead>Valid until</TableHead>}
                <TableHead className="w-12" />
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
                      <TableCell className="font-mono text-xs">
                        <Link
                          to="/quotes/$quoteId"
                          params={{ quoteId: r.id }}
                          className="text-primary hover:underline"
                        >
                          {r.quote_no}
                        </Link>
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
                        {assignment.isAssigned ? (
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
                          <button
                            type="button"
                            onClick={() => setAssigningQuote(r)}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 transition-colors shadow-2xs group cursor-pointer"
                            title="Accepted order is not assigned to a vendor yet — Click to assign"
                          >
                            <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 animate-pulse" />
                            <span>Unassigned Yet</span>
                            <span className="text-[10px] bg-rose-200/80 px-1 py-0.2 rounded text-rose-800 font-bold ml-0.5 group-hover:bg-rose-300">
                              + Assign
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAssigningQuote(r)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors group cursor-pointer"
                            title="Assign vendor"
                          >
                            <span>—</span>
                            <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                              + Assign
                            </span>
                          </button>
                        )}
                      </TableCell>
                    )}
                    {!isHidden("deliveryDate") && (
                      <TableCell className="text-xs">
                        {assignment.promisedDeliveryDate ? (
                          <button
                            type="button"
                            onClick={() => setAssigningQuote(r)}
                            className="inline-flex items-center gap-1 text-slate-700 hover:text-primary hover:underline font-mono cursor-pointer"
                            title="Click to change promised delivery date"
                          >
                            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{assignment.promisedDeliveryDate.slice(0, 10)}</span>
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
                    {!isHidden("valid") && <TableCell>{r.valid_until ?? "—"}</TableCell>}
                    <TableCell>
                      <RowActions
                        extra={
                          <DropdownMenuItem onClick={() => setAssigningQuote(r)}>
                            <Building2 className="mr-2 h-4 w-4" />
                            Assign Vendor / Delivery Date
                          </DropdownMenuItem>
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
          currentVendorId={parseQuoteVendorAssignment(assigningQuote).vendorId}
          currentVendorName={parseQuoteVendorAssignment(assigningQuote).vendorName}
          currentPromisedDate={parseQuoteVendorAssignment(assigningQuote).promisedDeliveryDate}
          onSuccess={() => {
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

function emptyItem(defaultFulfilment: QuoteCategory | "" = ""): FormItem {
  return {
    key: Math.random().toString(36).slice(2),
    product_id: null,
    description: "",
    quantity: "",
    unit: "sqft",
    unit_price: "",
    tax_pct: "18",
    hsn_sac: "",
    fulfilment: defaultFulfilment,
  };
}

function CreateQuoteDialog({
  open,
  onOpenChange,
  initialProjectId,
  initialEnquiryId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialProjectId: string | null;
  initialEnquiryId: string | null;
}) {
  const qc = useQueryClient();
  const nav = useNavigate();

  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [customerId, setCustomerId] = useState("");
  const [category, setCategory] = useState<QuoteCategory | "">("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [items, setItems] = useState<FormItem[]>([emptyItem("")]);
  const [mode, setMode] = useState<"manual" | "calculator">("manual");
  const [calcResult, setCalcResult] = useState<EstimateStudioResult | null>(null);

  useEffect(() => {
    if (open) {
      setProjectId(initialProjectId ?? "");
      setCustomerId("");
      setCategory("");
      setValidUntil("");
      setNotes("");
      setTerms("");
      setItems([emptyItem("")]);
      setMode("manual");
      setCalcResult(null);
    }
  }, [open, initialProjectId]);

  const totals = useMemo(() => {
    let sub = 0,
      tax = 0;
    for (const it of items) {
      const line = Number(it.quantity || 0) * Number(it.unit_price || 0);
      sub += line;
      tax += (line * Number(it.tax_pct || 0)) / 100;
    }
    return { sub, tax, total: sub + tax };
  }, [items]);

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

    if (mode === "calculator") {
      if (!calcResult || calcResult.items.length === 0) {
        return toast.error("Add at least one wall and product in the calculator first");
      }
      const discount = calcResult.worksheet.discount;
      const discountNote =
        discount.applied && discount.eligible
          ? `Estimate Studio: ${discount.pct}% discount applied (${formatInr(discount.amount)} off) — final estimate total ${formatInr(calcResult.total)}. This quote's own stored total below is the pre-discount subtotal, since quotations have no discount field yet.`
          : null;
      mutation.mutate({
        project_id: initialProjectId ? projectId : undefined,
        customer_id: initialProjectId ? undefined : customerId,
        enquiry_id: initialEnquiryId,
        category: category || null,
        valid_until: validUntil || null,
        notes: [notes, discountNote].filter(Boolean).join("\n\n") || null,
        terms: terms || null,
        items: calcResult.items,
        wall_estimate: calcResult.worksheet,
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
        tax_pct: it.tax_pct === "" ? 0 : it.tax_pct,
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
      items: parsedItems,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={mode === "calculator" ? "max-w-5xl max-h-[90vh] overflow-y-auto" : "max-w-4xl"}
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
                className={`flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === "manual"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Manual line items
              </button>
              <button
                type="button"
                onClick={() => setMode("calculator")}
                className={`flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === "calculator"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Wall Cladding Calculator
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

            {mode === "manual" && (
              <div className="md:col-span-2">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium">Line items</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setItems((p) => [...p, emptyItem(category)])}
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
                      <LineField label="Description" className="col-span-12 md:col-span-3">
                        <Input
                          placeholder="e.g. Monsoon Black Crazy"
                          value={it.description}
                          onChange={(e) => updateItem(it.key, { description: e.target.value })}
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
                        <PercentInput
                          placeholder="0"
                          value={it.tax_pct}
                          onChange={(val) => updateItem(it.key, { tax_pct: val })}
                        />
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
                  <div>
                    Tax: <span className="font-medium">{formatInr(totals.tax)}</span>
                  </div>
                  <div className="font-semibold">Total: {formatInr(totals.total)}</div>
                </div>
              </div>
            )}

            {mode === "calculator" && (
              <div className="md:col-span-2">
                <EstimateStudioCalculator projectId={projectId || null} onResult={setCalcResult} />
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
              disabled={mutation.isPending || (mode === "calculator" && !calcResult)}
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
