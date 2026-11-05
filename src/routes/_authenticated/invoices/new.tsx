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
  Receipt,
  FileText,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { EntityPicker } from "@/components/forms/EntityPicker";
import { CatalogProductSelect } from "@/components/quotes/CatalogProductSelect";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { listQuotes, convertQuoteToInvoice, type QuoteListItem } from "@/lib/quotes/api";
import {
  createInvoice,
  getNextInvoiceNo,
  listVoidInvoices,
  getVoidInvoiceDateWindow,
  reuseVoidInvoice,
} from "@/lib/invoices/api";
import type { InvoiceCreateInput } from "@/lib/invoices/schema";
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
} from "@/lib/dispatch/api";
import type { FlaggedChallanDiscrepancy } from "@/lib/dispatch/variance";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
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

interface DirectItemRow {
  id: string;
  productId: string | null;
  description: string;
  quantity: number | string;
  unit: string;
  unit_price: number | string;
  tax_pct: number;
  hsn_sac: string;
  notes: string;
}

function NewInvoicePage() {
  const nav = useNavigate();
  const preset = Route.useSearch();
  const qc = useQueryClient();

  // Mode: direct sales invoice without quote VS convert from quote
  const [mode, setMode] = useState<"direct" | "convert">(() =>
    preset.quote || preset.so ? "convert" : "direct",
  );

  // Common numbering & date state
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedVoidInvoiceId, setSelectedVoidInvoiceId] = useState<string | null>(
    preset.reuseInvoiceId ?? null,
  );

  // Direct Invoice fields
  const [directCustomer, setDirectCustomer] = useState<string | null>(preset.customer ?? null);
  const [directProject, setDirectProject] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().slice(0, 10);
  });
  const [directNotes, setDirectNotes] = useState("");
  const [directTerms, setDirectTerms] = useState(
    "Payment due within 15 days of invoice date. Goods once sold will not be taken back.",
  );
  const [directDispatchRemarks, setDirectDispatchRemarks] = useState("");
  const [directLrNo, setDirectLrNo] = useState("");

  const [directItems, setDirectItems] = useState<DirectItemRow[]>([
    {
      id: "item-init",
      productId: null,
      description: "",
      quantity: 1,
      unit: "sqft",
      unit_price: "",
      tax_pct: 18,
      hsn_sac: "68022190",
      notes: "",
    },
  ]);

  const addDirectItem = () => {
    setDirectItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: null,
        description: "",
        quantity: 1,
        unit: "sqft",
        unit_price: "",
        tax_pct: 18,
        hsn_sac: "68022190",
        notes: "",
      },
    ]);
  };

  const updateDirectItem = (id: string, patch: Partial<DirectItemRow>) => {
    setDirectItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeDirectItem = (id: string) => {
    setDirectItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  };

  const subtotal = useMemo(() => {
    return directItems.reduce((acc, it) => {
      const q = Number(it.quantity) || 0;
      const p = Number(it.unit_price) || 0;
      return acc + q * p;
    }, 0);
  }, [directItems]);

  const taxAmount = useMemo(() => {
    return directItems.reduce((acc, it) => {
      const q = Number(it.quantity) || 0;
      const p = Number(it.unit_price) || 0;
      const rate = Number(it.tax_pct) || 0;
      return acc + (q * p * rate) / 100;
    }, 0);
  }, [directItems]);

  const grandTotal = subtotal + taxAmount;

  const createDirectMut = useMutation({
    mutationFn: (payload: InvoiceCreateInput) => createInvoice(payload),
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: qk.invoices.all });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(`Invoice ${inv.invoice_no} created successfully!`, {
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
    },
  });

  const handleCreateDirectInvoice = () => {
    if (!directCustomer) {
      toast.error("Please select a customer for this invoice.");
      return;
    }

    for (let i = 0; i < directItems.length; i++) {
      const it = directItems[i];
      if (!it.description.trim()) {
        toast.error(`Item #${i + 1} requires a description or stone product.`);
        return;
      }
      const qty = Number(it.quantity);
      if (!qty || qty <= 0) {
        toast.error(`Item #${i + 1} (${it.description}) must have quantity > 0.`);
        return;
      }
      const price = Number(it.unit_price);
      if (isNaN(price) || price < 0) {
        toast.error(`Item #${i + 1} (${it.description}) cannot have a negative price.`);
        return;
      }
    }

    createDirectMut.mutate({
      customer_id: directCustomer,
      project_id: directProject || undefined,
      issue_date: invoiceDate,
      due_date: dueDate || undefined,
      notes: directNotes.trim() || undefined,
      terms: directTerms.trim() || undefined,
      dispatch_remarks: directDispatchRemarks.trim() || undefined,
      lr_no: directLrNo.trim() || undefined,
      reuse_invoice_id: selectedVoidInvoiceId || undefined,
      items: directItems.map((it, idx) => ({
        product_id: it.productId || null,
        description: it.description.trim(),
        quantity: Number(it.quantity),
        unit: it.unit || "sqft",
        unit_price: Number(it.unit_price) || 0,
        tax_pct: Number(it.tax_pct) || 0,
        hsn_sac: it.hsn_sac.trim() || "68022190",
        notes: it.notes.trim() || undefined,
        sort_order: idx,
      })),
    });
  };

  // Convert Quotation state
  const [q, setQ] = useState("");
  const query = useQuery({ queryKey: qk.quotes.list(q), queryFn: () => listQuotes(q) });
  const [busyId, setBusyId] = useState<string | null>(null);
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
        subtitle="Create a direct sales invoice or convert an accepted quotation."
        actions={
          <Button variant="ghost" onClick={() => nav({ to: "/invoices" })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        }
      />

      {/* Mode Switcher Tabs */}
      <div className="mb-4 flex items-center gap-2 border-b border-border/80 pb-3">
        <button
          type="button"
          onClick={() => setMode("direct")}
          className={cn(
            "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
            mode === "direct"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Receipt className="h-4 w-4" />
          Direct Invoice (No Quotation)
        </button>
        <button
          type="button"
          onClick={() => setMode("convert")}
          className={cn(
            "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
            mode === "convert"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <FileText className="h-4 w-4" />
          Convert from Quotation
          {eligible.length > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
              {eligible.length}
            </Badge>
          )}
        </button>
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

      {mode === "direct" ? (
        /* ================= DIRECT INVOICE (NO QUOTE) ================= */
        <div className="space-y-4">
          {/* Customer & Details Card */}
          <Card className="p-4 sm:p-5 shadow-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Customer <span className="text-destructive">*</span>
                </label>
                <EntityPicker
                  type="customer"
                  value={directCustomer}
                  onChange={(id) => {
                    setDirectCustomer(id);
                    setDirectProject(null);
                  }}
                  placeholder="Search and select customer…"
                  allowCreate
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Bill directly to an existing customer or click create to add a new one.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Project <span className="text-muted-foreground text-[11px]">(Optional)</span>
                </label>
                <EntityPicker
                  type="project"
                  value={directProject}
                  onChange={(id) => setDirectProject(id)}
                  filter={{ customerId: directCustomer || undefined }}
                  createDefaults={{ customer_id: directCustomer || "" }}
                  placeholder="Customer general project (default)"
                  allowCreate
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Auto-linked to the customer's general project if left unselected.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-border/50">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Invoice Date
                </label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Payment Due Date
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Transport / LR No.{" "}
                  <span className="text-muted-foreground text-[10px]">(Optional)</span>
                </label>
                <Input
                  placeholder="e.g. LR-998811"
                  value={directLrNo}
                  onChange={(e) => setDirectLrNo(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Delivery Remarks{" "}
                  <span className="text-muted-foreground text-[10px]">(Optional)</span>
                </label>
                <Input
                  placeholder="e.g. Direct dispatch via Tempo"
                  value={directDispatchRemarks}
                  onChange={(e) => setDirectDispatchRemarks(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </Card>

          {/* Line Items Card */}
          <Card className="p-4 sm:p-5 shadow-1 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Invoice Line Items</h3>
                <p className="text-xs text-muted-foreground">
                  Pick stone items from your catalog or enter custom descriptions with HSN, rates,
                  and GST.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addDirectItem}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add line
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="min-w-[280px]">Product / Description</TableHead>
                    <TableHead className="w-28">HSN/SAC</TableHead>
                    <TableHead className="w-24 text-right">Qty</TableHead>
                    <TableHead className="w-28">Unit</TableHead>
                    <TableHead className="w-28 text-right">Price (₹)</TableHead>
                    <TableHead className="w-24">GST %</TableHead>
                    <TableHead className="w-28 text-right">Amount (₹)</TableHead>
                    <TableHead className="w-12 text-center" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {directItems.map((item) => {
                    const lineAmt = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
                    return (
                      <TableRow key={item.id} className="align-top">
                        <TableCell className="space-y-1.5">
                          <CatalogProductSelect
                            value={item.description}
                            onChange={(val) => updateDirectItem(item.id, { description: val })}
                            onSelectCatalogItem={(cat) => {
                              updateDirectItem(item.id, {
                                productId: cat.id || null,
                                description: cat.name,
                                unit: cat.defaultUnit || "sqft",
                                unit_price: cat.defaultPrice ?? 0,
                                tax_pct: cat.defaultTaxPct ?? 18,
                                hsn_sac: cat.hsnCode || "68022190",
                              });
                            }}
                            placeholder="Select stone product or type description…"
                          />
                          <Input
                            placeholder="Item specification or notes (e.g. 30mm thickness, flamed finish)..."
                            value={item.notes}
                            onChange={(e) => updateDirectItem(item.id, { notes: e.target.value })}
                            className="h-7 text-[11px] text-muted-foreground"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.hsn_sac}
                            onChange={(e) => updateDirectItem(item.id, { hsn_sac: e.target.value })}
                            className="h-8 text-xs font-mono"
                            placeholder="6802"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="any"
                            min="0.001"
                            value={item.quantity}
                            onChange={(e) =>
                              updateDirectItem(item.id, { quantity: e.target.value })
                            }
                            className="h-8 text-xs text-right font-medium"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.unit}
                            onValueChange={(u) => updateDirectItem(item.id, { unit: u })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sqft">sqft</SelectItem>
                              <SelectItem value="sqm">sqm</SelectItem>
                              <SelectItem value="running ft">running ft</SelectItem>
                              <SelectItem value="nos">nos</SelectItem>
                              <SelectItem value="pcs">pcs</SelectItem>
                              <SelectItem value="box">box</SelectItem>
                              <SelectItem value="ton">ton</SelectItem>
                              <SelectItem value="lot">lot</SelectItem>
                              <SelectItem value="set">set</SelectItem>
                              <SelectItem value="bag">bag</SelectItem>
                              <SelectItem value="ltr">ltr</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) =>
                              updateDirectItem(item.id, { unit_price: e.target.value })
                            }
                            className="h-8 text-xs text-right font-mono"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={String(item.tax_pct)}
                            onValueChange={(tp) =>
                              updateDirectItem(item.id, { tax_pct: Number(tp) })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0%</SelectItem>
                              <SelectItem value="5">5%</SelectItem>
                              <SelectItem value="12">12%</SelectItem>
                              <SelectItem value="18">18%</SelectItem>
                              <SelectItem value="28">28%</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-xs pt-3">
                          ₹{formatInr(lineAmt)}
                        </TableCell>
                        <TableCell className="text-center pt-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeDirectItem(item.id)}
                            disabled={directItems.length <= 1}
                            title="Remove line"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-start">
              <Button type="button" variant="outline" size="sm" onClick={addDirectItem}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add another item
              </Button>
            </div>
          </Card>

          {/* Notes, Terms & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4 md:col-span-2 space-y-3 shadow-1">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Customer Notes / Remarks
                </label>
                <Textarea
                  placeholder="Notes or instructions to be displayed on the invoice..."
                  value={directNotes}
                  onChange={(e) => setDirectNotes(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Terms & Conditions
                </label>
                <Textarea
                  placeholder="Payment and warranty terms..."
                  value={directTerms}
                  onChange={(e) => setDirectTerms(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>
            </Card>

            <Card className="p-4 space-y-3 bg-muted/20 border-border/80 shadow-1 flex flex-col justify-between">
              <div className="space-y-2 text-xs">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground pb-1 border-b border-border/60">
                  Payment & Tax Summary
                </h4>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-mono font-medium text-foreground">
                    ₹{formatInr(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Total GST:</span>
                  <span className="font-mono font-medium text-foreground">
                    ₹{formatInr(taxAmount)}
                  </span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between items-baseline font-bold text-sm text-foreground">
                  <span>Grand Total:</span>
                  <span className="font-mono text-base text-primary">₹{formatInr(grandTotal)}</span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => nav({ to: "/invoices" })}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="w-full text-xs font-semibold"
                  disabled={createDirectMut.isPending}
                  onClick={handleCreateDirectInvoice}
                >
                  {createDirectMut.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Creating invoice…
                    </>
                  ) : (
                    <>
                      <Receipt className="mr-1.5 h-3.5 w-3.5" />
                      Create Invoice
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* ================= CONVERT FROM QUOTATION ================= */
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search accepted quotes…"
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

          {query.isLoading ? (
            <LoadingBlock />
          ) : query.error ? (
            <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
          ) : eligible.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-6 w-6" />}
              title="No eligible quotes to convert"
              message="There are no accepted quotations waiting for billing. You can create a direct sales invoice without a quotation, or view all quotations."
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => setMode("direct")}>
                    <Receipt className="mr-1.5 h-4 w-4" /> Create direct invoice
                  </Button>
                  <Button variant="outline" onClick={() => nav({ to: "/quotes" })}>
                    Go to quotes
                  </Button>
                </div>
              }
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
        </div>
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
