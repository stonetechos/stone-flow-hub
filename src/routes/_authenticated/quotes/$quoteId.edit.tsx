import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Loader2,
  Plus,
  Trash2,
  UserCheck,
  ImagePlus,
  Image as ImageIcon,
  X as XIcon,
} from "lucide-react";
import { ReassignCustomerDialog } from "@/components/quotes/ReassignCustomerDialog";
import { useRoles } from "@/hooks/use-roles";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput, PercentInput } from "@/components/forms/inputs/SmartInputs";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { Badge } from "@/components/ui/badge";

import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  addQuoteItem,
  deleteQuoteItem,
  getQuote,
  getQuoteItems,
  reorderQuoteItems,
  updateQuote,
  updateQuoteItem,
  updateQuoteItemImage,
  type QuoteItemRow,
} from "@/lib/quotes/api";
import { resolveAllQuoteImages, getLineItemImage } from "@/lib/quotes/quote-images";
import {
  QUOTE_CATEGORIES,
  QUOTE_CATEGORY_LABELS,
  type QuoteCategory,
  type QuoteUpdateInput,
} from "@/lib/quotes/schema";
import { invalidateQuote } from "@/lib/query-invalidation";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CatalogProductSelect } from "@/components/quotes/CatalogProductSelect";
import {
  getQuoteSaleMode,
  getQuoteHybridSplit,
  SALE_MODE_CONFIG,
  type SaleMode,
} from "@/lib/quotes/sale-mode";

export const Route = createFileRoute("/_authenticated/quotes/$quoteId/edit")({
  ssr: false,
  component: EditQuotePage,
});

function EditQuotePage() {
  const { quoteId } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: qk.quotes.byId(quoteId), queryFn: () => getQuote(quoteId) });
  const roles = useRoles();
  const canReassign = roles.isAdmin || roles.isSalesManager;
  const [reassignOpen, setReassignOpen] = useState(false);
  const [saleMode, setSaleMode] = useState<SaleMode>("invoiced");
  const [form, setForm] = useState<QuoteUpdateInput>({
    category: null,
    valid_until: null,
    notes: null,
    terms: null,
    sale_mode: "invoiced",
    hybrid_cash_amount: null,
    hybrid_invoiced_amount: null,
  });

  useEffect(() => {
    if (query.data) {
      const raw = (query.data as { category?: string | null }).category ?? null;
      const cat = (QUOTE_CATEGORIES as readonly string[]).includes(raw ?? "")
        ? (raw as QuoteCategory)
        : null;
      const mode = getQuoteSaleMode(query.data);
      const split = getQuoteHybridSplit(query.data);
      setSaleMode(mode);
      setForm({
        category: cat,
        valid_until: query.data.valid_until ?? null,
        notes: query.data.notes ?? null,
        terms: query.data.terms ?? null,
        sale_mode: mode,
        hybrid_cash_amount: split.cashAmount,
        hybrid_invoiced_amount: split.invoicedAmount,
      });
    }
  }, [query.data]);

  const set = <K extends keyof QuoteUpdateInput>(k: K, v: QuoteUpdateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () => updateQuote(quoteId, form),
    onSuccess: () => {
      toast.success("Quote updated");
      invalidateQuote(qc, quoteId);
      nav({ to: "/quotes/$quoteId", params: { quoteId } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (query.isLoading) return <LoadingBlock />;
  if (query.error)
    return <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />;
  if (!query.data) return <ErrorBlock message="Quote not found." />;

  const status = query.data.status;
  const isDraft = status === "draft";

  return (
    <div>
      <PageHeader
        title={`Edit ${query.data.quote_no}`}
        subtitle={
          <div className="flex items-center gap-2">
            <span>
              {isDraft
                ? "Draft quote — full editing enabled."
                : `Active quote — updating line items and commercials.`}
            </span>
            <Badge variant="outline" className="capitalize text-xs font-semibold">
              {status}
            </Badge>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {canReassign && (
              <Button variant="outline" size="sm" onClick={() => setReassignOpen(true)}>
                <UserCheck className="mr-2 h-4 w-4" /> Change customer
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => nav({ to: "/quotes/$quoteId", params: { quoteId } })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        }
      />

      {/* Top Deal Configuration Card */}
      <Card className="mb-4 shadow-1 border-border/80">
        <CardContent className="p-4 space-y-3.5">
          {/* Top Row: Deal Scope (Category) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <span>Deal Scope (Work Flow)</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  — sets scope for all line items below
                </span>
              </label>
              {form.category && (
                <Badge variant="secondary" className="text-[11px] font-medium">
                  Active Scope: {QUOTE_CATEGORY_LABELS[form.category]}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {QUOTE_CATEGORIES.map((c) => {
                const isSelected = form.category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      set("category", c);
                      updateQuote(quoteId, { ...form, category: c })
                        .then(() => {
                          toast.success(`Quote scope updated to ${QUOTE_CATEGORY_LABELS[c]}`);
                          invalidateQuote(qc, quoteId);
                        })
                        .catch((err) => toast.error(toUserMessage(err)));
                    }}
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
          </div>

          {/* Second Row: Billing Deal Type & Validity */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-border/60">
            <div className="md:col-span-8">
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Deal Type (Billing)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSaleMode("invoiced");
                    set("sale_mode", "invoiced");
                  }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold border transition-all cursor-pointer",
                    saleMode === "invoiced"
                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <span>📄 GST Deal (Tax Bill)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSaleMode("cash");
                    set("sale_mode", "cash");
                  }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold border transition-all cursor-pointer",
                    saleMode === "cash"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <span>🚚 Cash Deal (Challan Only)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSaleMode("hybrid");
                    set("sale_mode", "hybrid");
                  }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold border transition-all cursor-pointer",
                    saleMode === "hybrid"
                      ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <span>⚖️ Hybrid Deal (GST + Cash)</span>
                </button>
              </div>
              {saleMode === "cash" && (
                <p className="text-[11px] text-emerald-700 font-medium mt-1.5">
                  GST percentage is removed (0%). Amounts are added as-is without tax. Only Delivery
                  Challans will be issued.
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
                      value={form.hybrid_cash_amount != null ? String(form.hybrid_cash_amount) : ""}
                      onChange={(v) => set("hybrid_cash_amount", v ? Number(v) : null)}
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
                      value={
                        form.hybrid_invoiced_amount != null
                          ? String(form.hybrid_invoiced_amount)
                          : ""
                      }
                      onChange={(v) => set("hybrid_invoiced_amount", v ? Number(v) : null)}
                      min={0}
                      allowDecimal
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="md:col-span-4">
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Valid until
              </label>
              <Input
                type="date"
                value={form.valid_until ?? ""}
                onChange={(e) => set("valid_until", e.target.value || null)}
                className="h-8.5 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <LineItemsEditor
        quoteId={quoteId}
        defaultFulfilment={form.category ?? null}
        saleMode={saleMode}
      />

      <QuickForm
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
        busy={mut.isPending}
      >
        <QuickForm.MoreDetails>
          <Field label="Notes" className="md:col-span-2">
            <Textarea
              rows={3}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
            />
          </Field>
          <Field label="Terms" className="md:col-span-2">
            <Textarea
              rows={3}
              value={form.terms ?? ""}
              onChange={(e) => set("terms", e.target.value || null)}
            />
          </Field>
        </QuickForm.MoreDetails>
        <QuickForm.Actions>
          <Button
            type="button"
            variant="ghost"
            onClick={() => nav({ to: "/quotes/$quoteId", params: { quoteId } })}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save quote settings
          </Button>
        </QuickForm.Actions>
      </QuickForm>

      {canReassign && (
        <ReassignCustomerDialog
          open={reassignOpen}
          onOpenChange={setReassignOpen}
          quoteId={quoteId}
          quoteNo={query.data.quote_no}
          currentCustomerId={query.data.customer_id}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Line items editor (draft only)                                      */
/* ------------------------------------------------------------------ */

type DraftRow = {
  id: string;
  description: string;
  notes: string;
  quantity: string;
  unit: string | null;
  unit_price: string;
  tax_pct: string;
  hsn_sac: string;
  fulfilment: string | null;
};

function toDraft(row: QuoteItemRow): DraftRow {
  const anyRow = row as unknown as {
    fulfilment?: string | null;
    hsn_sac?: string | null;
    notes?: string | null;
  };
  return {
    id: row.id,
    description: row.description ?? "",
    notes: anyRow.notes ?? "",
    quantity: String(row.quantity ?? ""),
    unit: row.unit ?? null,
    unit_price: String(row.unit_price ?? ""),
    tax_pct: String(row.tax_pct ?? ""),
    hsn_sac: anyRow.hsn_sac ?? "",
    fulfilment: anyRow.fulfilment ?? null,
  };
}

function LineItemsEditor({
  quoteId,
  defaultFulfilment,
  saleMode = "invoiced",
}: {
  quoteId: string;
  defaultFulfilment: string | null;
  saleMode?: SaleMode;
}) {
  const qc = useQueryClient();
  const quoteQuery = useQuery({
    queryKey: qk.quotes.byId(quoteId),
    queryFn: () => getQuote(quoteId),
  });
  const itemsQuery = useQuery({
    queryKey: qk.quotes.items(quoteId),
    queryFn: () => getQuoteItems(quoteId),
  });
  const quoteImages = useQuery({
    queryKey: ["quotes", "images", quoteId],
    queryFn: () => resolveAllQuoteImages(quoteQuery.data, itemsQuery.data ?? []),
    enabled: Boolean(quoteQuery.data && itemsQuery.data),
  });

  const [rows, setRows] = useState<DraftRow[]>([]);
  useEffect(() => {
    if (!itemsQuery.data) return;
    setRows((prev) => {
      const serverIds = itemsQuery.data.map((r) => r.id);
      const prevIds = prev.map((r) => r.id);
      const idsChanged =
        serverIds.length !== prevIds.length || serverIds.some((id, i) => id !== prevIds[i]);
      if (idsChanged) return itemsQuery.data.map(toDraft);
      // Preserve local uncommitted edits; only backfill rows we haven't touched
      // (identity by id + description).
      const byId = new Map(prev.map((r) => [r.id, r]));
      return itemsQuery.data.map((server) => byId.get(server.id) ?? toDraft(server));
    });
  }, [itemsQuery.data]);

  const invalidate = () => {
    invalidateQuote(qc, quoteId);
    qc.invalidateQueries({ queryKey: qk.quotes.items(quoteId) });
    qc.invalidateQueries({ queryKey: ["quotes", "images", quoteId] });
  };

  const updateImgMut = useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string | null }) => {
      await updateQuoteItemImage(quoteId, id, url);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Product photo updated");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const handleImageUpload = (rowId: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file should be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateImgMut.mutate({ id: rowId, url: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const addMut = useMutation({
    mutationFn: () =>
      addQuoteItem(quoteId, {
        description: "New line",
        quantity: 1,
        unit_price: 0,
        tax_pct: saleMode === "cash" ? 0 : 0,
        fulfilment: defaultFulfilment,
      }),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteQuoteItem(id),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const patchMut = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Parameters<typeof updateQuoteItem>[1];
    }) => updateQuoteItem(id, patch),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const reorderMut = useMutation({
    mutationFn: (ids: string[]) => reorderQuoteItems(ids),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const updateRow = (id: string, key: keyof DraftRow, value: string | null) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

  const commit = (id: string, key: keyof DraftRow, original: QuoteItemRow | undefined) => {
    const row = rows.find((r) => r.id === id);
    if (!row || !original) return;
    if (key === "description") {
      const v = row.description.trim();
      if (!v) {
        toast.error("Description is required");
        setRows((rs) =>
          rs.map((r) => (r.id === id ? { ...r, description: original.description } : r)),
        );
        return;
      }
      if (v !== original.description) patchMut.mutate({ id, patch: { description: v } });
    } else if (key === "quantity") {
      const n = Number(row.quantity);
      if (!Number.isFinite(n) || n <= 0) {
        toast.error("Qty must be > 0");
        setRows((rs) =>
          rs.map((r) => (r.id === id ? { ...r, quantity: String(original.quantity) } : r)),
        );
        return;
      }
      if (n !== Number(original.quantity)) patchMut.mutate({ id, patch: { quantity: n } });
    } else if (key === "unit_price") {
      const n = Number(row.unit_price);
      if (!Number.isFinite(n) || n < 0) {
        toast.error("Rate must be ≥ 0");
        setRows((rs) =>
          rs.map((r) => (r.id === id ? { ...r, unit_price: String(original.unit_price) } : r)),
        );
        return;
      }
      if (n !== Number(original.unit_price)) patchMut.mutate({ id, patch: { unit_price: n } });
    } else if (key === "tax_pct") {
      const n = Number(row.tax_pct);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        toast.error("GST must be between 0 and 100");
        setRows((rs) =>
          rs.map((r) => (r.id === id ? { ...r, tax_pct: String(original.tax_pct) } : r)),
        );
        return;
      }
      if (n !== Number(original.tax_pct)) patchMut.mutate({ id, patch: { tax_pct: n } });
    } else if (key === "unit") {
      const v = row.unit?.trim() || null;
      if (v !== (original.unit ?? null)) patchMut.mutate({ id, patch: { unit: v } });
    } else if (key === "hsn_sac") {
      const v = row.hsn_sac?.trim() || null;
      const orig = (original as unknown as { hsn_sac?: string | null }).hsn_sac ?? null;
      if (v !== orig) {
        if (v && !/^[0-9]{4,8}$/.test(v)) {
          toast.error("HSN must be 4 to 8 digits");
          setRows((rs) => rs.map((r) => (r.id === id ? { ...r, hsn_sac: orig ?? "" } : r)));
          return;
        }
        patchMut.mutate({ id, patch: { hsn_sac: v } });
      }
    } else if (key === "notes") {
      const v = row.notes.trim();
      const orig = ((original as unknown as { notes?: string | null }).notes ?? "").trim();
      if (v !== orig) {
        patchMut.mutate({ id, patch: { notes: v || null } });
      }
    }
  };

  const commitFulfilment = (
    id: string,
    value: string | null,
    original: QuoteItemRow | undefined,
  ) => {
    if (!original) return;
    const cur = (original as unknown as { fulfilment?: string | null }).fulfilment ?? null;
    if (value !== cur) patchMut.mutate({ id, patch: { fulfilment: value } });
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = rows.findIndex((r) => r.id === id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= rows.length) return;
    const copy = rows.slice();
    [copy[idx], copy[next]] = [copy[next]!, copy[idx]!];
    setRows(copy);
    reorderMut.mutate(copy.map((r) => r.id));
  };

  const originalsById = useMemo(() => {
    const map = new Map<string, QuoteItemRow>();
    (itemsQuery.data ?? []).forEach((it) => map.set(it.id, it));
    return map;
  }, [itemsQuery.data]);

  return (
    <Card className="mb-4 shadow-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <span>Line items</span>
          {defaultFulfilment && (
            <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">
              Scope:{" "}
              {QUOTE_CATEGORY_LABELS[defaultFulfilment as QuoteCategory] || defaultFulfilment}
            </Badge>
          )}
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => addMut.mutate()}
          disabled={addMut.isPending}
        >
          {addMut.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Add line
        </Button>
      </CardHeader>
      <CardContent>
        {itemsQuery.isLoading ? (
          <LoadingBlock label="Loading items…" />
        ) : rows.length === 0 ? (
          <EmptyState title="No line items yet" message="Use “Add line” to add one." />
        ) : (
          <div className="space-y-3">
            {rows.map((r, i) => {
              const original = originalsById.get(r.id);
              const lineImg = getLineItemImage(r, quoteImages.data ?? new Map());
              const lineTaxPct = saleMode === "cash" ? 0 : Number(r.tax_pct) || 0;
              const lineTotal =
                (Number(r.quantity) || 0) * (Number(r.unit_price) || 0) * (1 + lineTaxPct / 100);
              return (
                <div key={r.id} className="rounded-md border border-border p-3">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                    <div className="md:col-span-4">
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">Description & Photo</label>
                        {lineImg && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-primary">
                            <ImageIcon className="h-3 w-3" /> Photo attached
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {lineImg ? (
                          <div
                            className="group relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-border bg-muted/30"
                            title="Hover to remove photo"
                          >
                            <img
                              src={lineImg}
                              alt={r.description}
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => updateImgMut.mutate({ id: r.id, url: null })}
                              className="absolute inset-0 flex items-center justify-center bg-destructive/85 text-white opacity-0 transition group-hover:opacity-100"
                              title="Remove photo"
                            >
                              <XIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label
                            className="flex h-9 w-9 shrink-0 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/20 text-muted-foreground transition hover:border-primary/50 hover:bg-muted/40 hover:text-primary"
                            title="Attach product photo"
                          >
                            <ImagePlus className="h-4 w-4" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(r.id, file);
                              }}
                            />
                          </label>
                        )}
                        <div className="min-w-0 flex-1">
                          <CatalogProductSelect
                            value={r.description}
                            onChange={(val) => {
                              updateRow(r.id, "description", val);
                              if (val.trim()) {
                                patchMut.mutate({ id: r.id, patch: { description: val.trim() } });
                              }
                            }}
                            onSelectCatalogItem={(prod) => {
                              updateRow(r.id, "description", prod.name);
                              const patchObj: Parameters<typeof updateQuoteItem>[1] = {
                                description: prod.name,
                              };
                              if (prod.defaultUnit) {
                                updateRow(r.id, "unit", prod.defaultUnit);
                                patchObj.unit = prod.defaultUnit;
                              }
                              if (prod.hsnCode) {
                                updateRow(r.id, "hsn_sac", prod.hsnCode);
                                patchObj.hsn_sac = prod.hsnCode;
                              }
                              if (prod.defaultPrice !== undefined && prod.defaultPrice !== null) {
                                updateRow(r.id, "unit_price", String(prod.defaultPrice));
                                patchObj.unit_price = prod.defaultPrice;
                              }
                              if (prod.category === "sealer" || prod.defaultUnit === "ltr") {
                                const currentQty = Number(r.quantity) || 0;
                                const convertedQty =
                                  currentQty > 10
                                    ? Math.ceil(currentQty / 50)
                                    : currentQty > 0
                                      ? currentQty
                                      : 1;
                                updateRow(r.id, "quantity", String(convertedQty));
                                patchObj.quantity = convertedQty;
                              }
                              if (saleMode === "cash") {
                                updateRow(r.id, "tax_pct", "0");
                                patchObj.tax_pct = 0;
                              } else if (prod.defaultTaxPct !== undefined) {
                                updateRow(r.id, "tax_pct", String(prod.defaultTaxPct));
                                patchObj.tax_pct = prod.defaultTaxPct;
                              }
                              patchMut.mutate({ id: r.id, patch: patchObj });
                            }}
                            placeholder="Search or enter product…"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-muted-foreground">HSN Code</label>
                      <Input
                        placeholder="4-8 digits"
                        value={r.hsn_sac}
                        onChange={(e) =>
                          updateRow(r.id, "hsn_sac", e.target.value.replace(/\D/g, "").slice(0, 8))
                        }
                        onBlur={() => commit(r.id, "hsn_sac", original)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-muted-foreground">Qty</label>
                      <NumericInput
                        value={r.quantity}
                        onChange={(val) => updateRow(r.id, "quantity", val)}
                        onBlur={() => commit(r.id, "quantity", original)}
                        min={0}
                        allowDecimal
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-xs text-muted-foreground">Unit</label>
                      <Input
                        value={r.unit ?? ""}
                        onChange={(e) => updateRow(r.id, "unit", e.target.value)}
                        onBlur={() => commit(r.id, "unit", original)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-muted-foreground">Rate (₹)</label>
                      <NumericInput
                        value={r.unit_price}
                        onChange={(val) => updateRow(r.id, "unit_price", val)}
                        onBlur={() => commit(r.id, "unit_price", original)}
                        min={0}
                        allowDecimal
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-xs text-muted-foreground">GST %</label>
                      {saleMode === "cash" ? (
                        <div
                          title="Cash sale: 0% GST (Challan only)"
                          className="h-9 px-2 flex items-center justify-center text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-200 rounded-md cursor-not-allowed"
                        >
                          0%
                        </div>
                      ) : (
                        <PercentInput
                          value={r.tax_pct}
                          onChange={(val) => updateRow(r.id, "tax_pct", val)}
                          onBlur={() => commit(r.id, "tax_pct", original)}
                        />
                      )}
                    </div>
                    <div className="md:col-span-12 mt-1 pt-2 border-t border-dashed border-border/70">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Product Notes (Material Details & Size Specs)
                        </label>
                        <span className="text-[10px] text-muted-foreground">
                          Blank box for describing slabs, thickness, finish, dimensions, etc.
                        </span>
                      </div>
                      <Textarea
                        rows={2}
                        placeholder="Describe what exactly the material is and the size specs (e.g. 50mm sandstone, honed, 4ft × 2ft slab sizes, chamfered edges)..."
                        value={r.notes ?? ""}
                        onChange={(e) => updateRow(r.id, "notes", e.target.value)}
                        onBlur={() => commit(r.id, "notes", original)}
                        className="text-xs resize-y bg-background"
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => move(r.id, -1)}
                        disabled={i === 0 || reorderMut.isPending}
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => move(r.id, 1)}
                        disabled={i === rows.length - 1 || reorderMut.isPending}
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>Line total: {formatInr(lineTotal)}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => delMut.mutate(r.id)}
                        disabled={delMut.isPending}
                      >
                        <Trash2 className="mr-1 h-4 w-4" /> Remove
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
