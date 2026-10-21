import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRightCircle, Loader2, X, RefreshCw, AlertCircle } from "lucide-react";
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
    mutationFn: (args: { quoteId: string; issueDate?: string }) =>
      convertQuoteToInvoice({ quote_id: args.quoteId, issue_date: args.issueDate }),
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
                <TableHead>Customer</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {eligible.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      to="/quotes/$quoteId"
                      params={{ quoteId: r.id }}
                      className="text-primary hover:underline"
                    >
                      {r.quote_no}
                    </Link>
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
                          convert.mutate({ quoteId: r.id, issueDate: invoiceDate });
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
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
