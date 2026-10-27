import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRightCircle,
  Loader2,
  X,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Truck,
  Plus,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Receipt } from "lucide-react";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { listQuotes, convertQuoteToInvoice, type QuoteListItem } from "@/lib/quotes/api";
import {
  getNextInvoiceNo,
  listVoidInvoices,
  getVoidInvoiceDateWindow,
  reuseVoidInvoice,
} from "@/lib/invoices/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getDispatchesForQuotes,
  listQuoteChallanDiscrepancies,
  linkQuoteToDispatch,
  listDispatches,
  type DispatchListItem,
} from "@/lib/dispatch/api";
import type { FlaggedChallanDiscrepancy } from "@/lib/dispatch/variance";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  // `new=1` is the guided-workflow entry-point flag; retained for URL clarity.
  new: z.string().optional(),
  quote: z.string().uuid().optional(),
  so: z.string().uuid().optional(),
  customer: z.string().uuid().optional(),
  reuseInvoiceId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/invoices/new")({
  ssr: false,
  validateSearch: (s) => searchSchema.parse(s),
  component: NewInvoicePage,
});

function NewInvoicePage() {
  const nav = useNavigate();
  const preset = Route.useSearch();
  const [q, setQ] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedVoidInvoiceId, setSelectedVoidInvoiceId] = useState<string | null>(
    preset.reuseInvoiceId ?? null,
  );
  const query = useQuery({ queryKey: qk.quotes.list(q), queryFn: () => listQuotes(q) });
  const [busyId, setBusyId] = useState<string | null>(null);
  const qc = useQueryClient();
  const [linkingQuote, setLinkingQuote] = useState<QuoteListItem | null>(null);

  const allDispatchesQ = useQuery({
    queryKey: qk.dispatch.list("", ""),
    queryFn: () => listDispatches("", ""),
    enabled: !!linkingQuote,
  });

  const linkMut = useMutation({
    mutationFn: async (params: {
      quoteId: string;
      dispatchId: string;
      customerId?: string | null;
      projectId?: string | null;
      quoteNo?: string | null;
      dispatchNo?: string | null;
    }) => {
      await linkQuoteToDispatch(params);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", "new", "dispatches-by-quote"] });
      qc.invalidateQueries({ queryKey: ["dispatch"] });
      toast.success("Delivery challan linked to quotation");
      setLinkingQuote(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const voidInvoicesQ = useQuery({
    queryKey: ["invoices", "void-list"],
    queryFn: () => listVoidInvoices(),
  });

  const nextInvoiceNoQ = useQuery({
    queryKey: ["invoices", "next-no", invoiceDate],
    queryFn: () => getNextInvoiceNo(invoiceDate),
  });

  const voidWindowQ = useQuery({
    queryKey: ["invoices", "void-window", selectedVoidInvoiceId],
    queryFn: () => (selectedVoidInvoiceId ? getVoidInvoiceDateWindow(selectedVoidInvoiceId) : null),
    enabled: !!selectedVoidInvoiceId,
  });

  const voidInvoices = voidInvoicesQ.data ?? [];
  const selectedVoidInvoice = voidInvoices.find((v) => v.id === selectedVoidInvoiceId);

  const convert = useMutation({
    mutationFn: (args: {
      quoteId: string;
      issueDate?: string;
      dispatchId?: string;
      dispatchNo?: string;
    }) =>
      convertQuoteToInvoice({
        quote_id: args.quoteId,
        issue_date: args.issueDate,
        dispatch_id: args.dispatchId,
        dispatch_no: args.dispatchNo,
      }),
    onSuccess: (inv) => {
      toast.success(`Invoice ${inv.invoice_no} created`, {
        action: {
          label: "Record receipt",
          onClick: () =>
            nav({
              to: "/receipts/new",
              search: { invoice: inv.id, customer: inv.customer_id ?? undefined },
            }),
        },
      });
      nav({ to: "/invoices/$invoiceId", params: { invoiceId: inv.id } });
    },
    onError: (e) => {
      toast.error(toUserMessage(e));
      setBusyId(null);
    },
  });

  const reuseMut = useMutation({
    mutationFn: (args: { invoiceId: string; quoteId: string; issueDate?: string }) =>
      reuseVoidInvoice({
        invoiceId: args.invoiceId,
        quoteId: args.quoteId,
        issueDate: args.issueDate,
      }),
    onSuccess: (inv) => {
      toast.success(`Void Invoice ${inv.invoice_no} re-issued successfully!`, {
        action: {
          label: "Record receipt",
          onClick: () =>
            nav({
              to: "/receipts/new",
              search: { invoice: inv.id, customer: inv.customer_id ?? undefined },
            }),
        },
      });
      nav({ to: "/invoices/$invoiceId", params: { invoiceId: inv.id } });
    },
    onError: (e) => {
      toast.error(toUserMessage(e));
      setBusyId(null);
    },
  });

  // Scope the accepted-quote list by whatever context arrived on the URL.
  // A quote is eligible if it is:
  // 1. accepted, OR
  // 2. converted but has no active (non-cancelled) invoice (e.g. previous invoice was deleted)
  const eligible = useMemo(() => {
    const hasActiveInvoice = (r: QuoteListItem) => {
      const invoices = (r as { invoices?: Array<{ id: string; status: string }> | null }).invoices;
      return Array.isArray(invoices) && invoices.some((i) => i.status !== "cancelled");
    };

    const base = (query.data ?? []).filter(
      (r) => r.status === "accepted" || (r.status === "converted" && !hasActiveInvoice(r)),
    );
    if (preset.quote) return base.filter((r) => r.id === preset.quote);
    if (preset.customer) return base.filter((r) => r.customer_id === preset.customer);
    if (preset.so) {
      return base.filter(
        (r) => (r as { linked_sales_order_id?: string | null }).linked_sales_order_id === preset.so,
      );
    }
    return base;
  }, [query.data, preset.quote, preset.customer, preset.so]);

  const eligibleQuoteIds = useMemo(() => eligible.map((r) => r.id), [eligible]);
  const dispatchesQ = useQuery({
    queryKey: ["invoices", "new", "dispatches-by-quote", eligibleQuoteIds],
    queryFn: () => getDispatchesForQuotes(eligibleQuoteIds),
    enabled: eligibleQuoteIds.length > 0,
  });
  const dispatchesByQuote = dispatchesQ.data ?? {};

  const discrepanciesQ = useQuery({
    queryKey: ["dispatch", "discrepancies"],
    queryFn: listQuoteChallanDiscrepancies,
    staleTime: 45_000,
  });
  const discrepanciesByQuote = useMemo(() => {
    const map = new Map<string, FlaggedChallanDiscrepancy>();
    for (const d of discrepanciesQ.data ?? []) {
      map.set(d.quoteId, d);
    }
    return map;
  }, [discrepanciesQ.data]);

  const hasContextFilter = !!(preset.quote || preset.customer || preset.so);

  return (
    <div>
      <PageHeader
        title="New invoice"
        subtitle="Invoices are generated by converting an accepted quote."
        actions={
          <Button variant="ghost" onClick={() => nav({ to: "/invoices" })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search quotes…"
          className="max-w-md"
        />
        <div className="flex items-center gap-2 text-xs">
          <label
            htmlFor="inv-date-input"
            className="font-medium text-muted-foreground whitespace-nowrap"
          >
            Invoice date:
          </label>
          <Input
            id="inv-date-input"
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="w-36 h-9 text-xs"
          />
        </div>
        {hasContextFilter && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => nav({ to: "/invoices/new", search: {} })}
          >
            <X className="mr-1 h-3.5 w-3.5" /> Clear context filter
          </Button>
        )}
      </div>

      {/* Invoice Number Assignment & Void Reuse Control */}
      <div className="mb-4 rounded-xl border border-border/80 bg-muted/30 p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Assigned Invoice Number:
            </span>
            <Badge
              variant="outline"
              className={cn(
                "font-mono text-xs font-bold px-2.5 py-0.5",
                selectedVoidInvoiceId
                  ? "border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                  : "border-emerald-400 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
              )}
            >
              {selectedVoidInvoice
                ? `${selectedVoidInvoice.invoice_no} (Reusing Void Number)`
                : nextInvoiceNoQ.data || "Calculating…"}
            </Badge>
          </div>

          {voidInvoices.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Number Mode:</span>
              <div className="inline-flex rounded-lg border p-0.5 bg-background shadow-2xs">
                <button
                  type="button"
                  onClick={() => setSelectedVoidInvoiceId(null)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                    !selectedVoidInvoiceId
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Next Sequential ({nextInvoiceNoQ.data || "..."})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVoidInvoiceId(voidInvoices[0]?.id || null)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                    selectedVoidInvoiceId
                      ? "bg-amber-600 text-white font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Reuse Void ({voidInvoices.length} available)
                </button>
              </div>
            </div>
          )}
        </div>

        {selectedVoidInvoiceId && voidInvoices.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50 text-xs">
            <span className="text-muted-foreground font-medium">Select Void Invoice to reuse:</span>
            <Select
              value={selectedVoidInvoiceId}
              onValueChange={(v) => setSelectedVoidInvoiceId(v)}
            >
              <SelectTrigger className="w-56 h-8 text-xs font-mono font-bold">
                <SelectValue placeholder="Select void number" />
              </SelectTrigger>
              <SelectContent>
                {voidInvoices.map((vi) => (
                  <SelectItem key={vi.id} value={vi.id} className="font-mono text-xs">
                    {vi.invoice_no} ({vi.issue_date || "No date"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {voidWindowQ.data && (
              <span className="text-amber-800 dark:text-amber-300 text-xs bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded border border-amber-200 dark:border-amber-900/50 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                Recommended date window:{" "}
                <b>{voidWindowQ.data.suggested_min_date || "Start of FY"}</b> to{" "}
                <b>{voidWindowQ.data.suggested_max_date || "Next invoice"}</b>
              </span>
            )}
          </div>
        )}
      </div>

      {query.isLoading ? (
        <LoadingBlock />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : eligible.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-6 w-6" />}
          title="No eligible quotes"
          message="Mark a quote as Accepted first, then convert it here."
          action={<Button onClick={() => nav({ to: "/quotes" })}>Go to quotes</Button>}
        />
      ) : (
        <Card className="shadow-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote</TableHead>
                <TableHead>Delivery Challan</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {eligible.map((r) => {
                const challans = dispatchesByQuote[r.id] ?? [];
                const discrepancy = discrepanciesByQuote.get(r.id);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">
                      <Link
                        to="/quotes/$quoteId"
                        params={{ quoteId: r.id }}
                        className="text-primary hover:underline font-semibold"
                      >
                        {r.quote_no}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">
                      {challans.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {challans.map((d) => (
                            <div key={d.id} className="flex items-center gap-1.5 flex-wrap">
                              <Link
                                to="/dispatch/$id"
                                params={{ id: d.id }}
                                className="font-mono font-semibold text-primary hover:underline flex items-center gap-1"
                                title={`View Delivery Challan ${d.dispatch_no}`}
                              >
                                <Truck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                {d.dispatch_no}
                              </Link>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] px-1.5 py-0 capitalize",
                                  d.status === "delivered"
                                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    : "border-blue-400 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
                                )}
                              >
                                {d.status.replace(/_/g, " ")}
                              </Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                                title="Change or link another delivery challan"
                                onClick={() => setLinkingQuote(r)}
                              >
                                <Link2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          {discrepancy && (
                            <Badge
                              variant="outline"
                              className="w-fit text-[10px] border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 font-medium cursor-help"
                              title={discrepancy.report.summaryText}
                            >
                              <AlertTriangle className="mr-1 h-3 w-3 text-amber-600 shrink-0" />
                              Specs Differ ({discrepancy.report.varianceCount})
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="border-slate-300 text-slate-500 bg-slate-50 dark:bg-slate-900 text-[10px] w-fit font-normal"
                          >
                            Challan Pending
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[11px] px-1.5 text-primary hover:underline font-medium inline-flex items-center gap-1"
                              onClick={() => setLinkingQuote(r)}
                              title="Link an existing delivery challan to this quotation"
                            >
                              <Link2 className="h-3 w-3" /> Link Challan
                            </Button>
                            <span className="text-muted-foreground text-xs">•</span>
                            <Link
                              to="/dispatch/new"
                              search={{ quote: r.id, customer: r.customer_id }}
                              className="text-[11px] font-medium text-muted-foreground hover:text-primary hover:underline inline-flex items-center gap-0.5 whitespace-nowrap"
                              title="Raise a new Delivery Challan first before generating tax invoice"
                            >
                              <Plus className="h-3 w-3" /> New
                            </Link>
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{r.customer?.name ?? "—"}</TableCell>
                    <TableCell>{r.project?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={r.status === "converted" ? "secondary" : "outline"}
                        className="capitalize"
                      >
                        {r.status === "converted" ? "Ready to re-invoice" : r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatInr(r.total)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        disabled={busyId === r.id || convert.isPending || reuseMut.isPending}
                        className={cn(
                          selectedVoidInvoiceId && "bg-amber-600 hover:bg-amber-700 text-white",
                        )}
                        onClick={() => {
                          setBusyId(r.id);
                          if (selectedVoidInvoiceId) {
                            reuseMut.mutate({
                              invoiceId: selectedVoidInvoiceId,
                              quoteId: r.id,
                              issueDate: invoiceDate,
                            });
                          } else {
                            convert.mutate({
                              quoteId: r.id,
                              issueDate: invoiceDate,
                              dispatchId: challans[0]?.id,
                              dispatchNo: challans[0]?.dispatch_no,
                            });
                          }
                        }}
                      >
                        {busyId === r.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : selectedVoidInvoiceId ? (
                          <RefreshCw className="mr-1 h-3 w-3" />
                        ) : (
                          <ArrowRightCircle className="mr-1 h-3 w-3" />
                        )}
                        {selectedVoidInvoiceId ? "Reuse & Bill" : "Convert"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {linkingQuote && (
        <Dialog open={!!linkingQuote} onOpenChange={(open) => !open && setLinkingQuote(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Link Delivery Challan
              </DialogTitle>
              <DialogDescription>
                Associate an existing delivery challan with Quote #{linkingQuote.quote_no} (
                {linkingQuote.customer?.name} • {formatInr(linkingQuote.total)}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
              {allDispatchesQ.isLoading ? (
                <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading delivery challans…
                </div>
              ) : (allDispatchesQ.data ?? []).length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No delivery challans found.
                </div>
              ) : (
                (() => {
                  const candidateList = allDispatchesQ.data ?? [];
                  const customerMatches = candidateList.filter(
                    (d) => d.customer_id === linkingQuote.customer_id,
                  );
                  const otherMatches = candidateList.filter(
                    (d) => d.customer_id !== linkingQuote.customer_id,
                  );
                  const currentlyLinkedId = dispatchesByQuote[linkingQuote.id]?.[0]?.id;

                  return (
                    <div className="space-y-2">
                      {customerMatches.length > 0 && (
                        <div>
                          <div className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-1.5">
                            Challans for {linkingQuote.customer?.name}
                          </div>
                          <div className="space-y-1.5">
                            {customerMatches.map((d) => {
                              const isSelected = currentlyLinkedId === d.id;
                              return (
                                <button
                                  key={d.id}
                                  type="button"
                                  disabled={linkMut.isPending}
                                  onClick={() =>
                                    linkMut.mutate({
                                      quoteId: linkingQuote.id,
                                      dispatchId: d.id,
                                      customerId: linkingQuote.customer_id,
                                      projectId: linkingQuote.project_id,
                                      quoteNo: linkingQuote.quote_no,
                                      dispatchNo: d.dispatch_no,
                                    })
                                  }
                                  className={cn(
                                    "w-full text-left p-2.5 rounded-lg border transition-colors flex items-center justify-between gap-2",
                                    isSelected
                                      ? "border-primary bg-primary/10 text-primary font-medium"
                                      : "border-border hover:border-primary/50 hover:bg-muted/40",
                                  )}
                                >
                                  <div>
                                    <div className="font-mono font-bold text-xs flex items-center gap-1.5">
                                      {d.dispatch_no}
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-1 py-0 capitalize"
                                      >
                                        {d.status}
                                      </Badge>
                                    </div>
                                    <div className="text-[11px] text-muted-foreground mt-0.5">
                                      Date: {d.dispatch_date} • Carrier: {d.carrier || "Self"}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs font-semibold text-primary">
                                      {isSelected ? "Linked ✓" : "Select"}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {otherMatches.length > 0 && (
                        <div className="mt-3">
                          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                            Other Delivery Challans
                          </div>
                          <div className="space-y-1.5">
                            {otherMatches.slice(0, 10).map((d) => (
                              <button
                                key={d.id}
                                type="button"
                                disabled={linkMut.isPending}
                                onClick={() =>
                                  linkMut.mutate({
                                    quoteId: linkingQuote.id,
                                    dispatchId: d.id,
                                    customerId: linkingQuote.customer_id,
                                    projectId: linkingQuote.project_id,
                                    quoteNo: linkingQuote.quote_no,
                                    dispatchNo: d.dispatch_no,
                                  })
                                }
                                className="w-full text-left p-2 rounded-md border border-border/70 hover:border-primary/50 hover:bg-muted/30 transition-colors flex items-center justify-between text-xs"
                              >
                                <div>
                                  <span className="font-mono font-semibold">{d.dispatch_no}</span>
                                  <span className="text-muted-foreground ml-2">
                                    {d.customer?.name || "No customer"}
                                  </span>
                                </div>
                                <span className="text-[11px] text-muted-foreground">
                                  {d.dispatch_date}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setLinkingQuote(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
