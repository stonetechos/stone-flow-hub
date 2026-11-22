import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
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
  Truck,
  Layers,
  Package,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ReassignCustomerDialog } from "@/components/quotes/ReassignCustomerDialog";
import { QuoteTermsManager } from "@/components/quotes/QuoteTermsManager";
import { QuoteWallDetailsEditor } from "@/components/quotes/QuoteWallDetailsEditor";
import {
  categorizeQuoteItem,
  sortQuoteItemsCategorically,
  QUOTE_ITEM_CATEGORY_LABELS,
  QUOTE_ITEM_CATEGORY_BADGE_CLASSES,
} from "@/lib/quotes/quoteCategories";
import {
  type DealScope,
  detectClientProvidedSlabFromItems,
  hasClientBreakageDisclaimer,
  hasEarlyPaymentDiscountDisclaimer,
  ensureTermsHaveCashDealGstClause,
  stripCashDealGstClause,
} from "@/lib/quotes/terms";
import { useRoles } from "@/hooks/use-roles";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput, PercentInput } from "@/components/forms/inputs/SmartInputs";
import { UnitPicker } from "@/components/forms/UnitPicker";
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
import { compressImageToDataUrl } from "@/lib/images/compress";
import { supabase } from "@/integrations/supabase/client";
import { FILES_BUCKET } from "@/lib/constants";
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
import {
  resolveAllQuoteImages,
  getLineItemImage,
  getLineItemImages,
} from "@/lib/quotes/quote-images";
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
  const itemsQuery = useQuery({
    queryKey: qk.quotes.items(quoteId),
    queryFn: () => getQuoteItems(quoteId),
  });
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
      const wf = (query.data.workflow_state as Record<string, unknown> | null) ?? {};
      const offerActive =
        wf.include_prepayment_offer !== undefined
          ? Boolean(wf.include_prepayment_offer)
          : query.data.terms
            ? hasEarlyPaymentDiscountDisclaimer(query.data.terms)
            : true;

      setForm({
        category: cat,
        valid_until: query.data.valid_until ?? null,
        notes: query.data.notes ?? null,
        terms: query.data.terms ?? null,
        sale_mode: mode,
        hybrid_cash_amount: split.cashAmount,
        hybrid_invoiced_amount: split.invoicedAmount,
        include_prepayment_offer: offerActive,
      });
    }
  }, [query.data]);

  const set = <K extends keyof QuoteUpdateInput>(k: K, v: QuoteUpdateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () => {
      const payload: QuoteUpdateInput = {
        ...form,
        terms:
          saleMode === "cash" && form.terms
            ? ensureTermsHaveCashDealGstClause(form.terms)
            : form.terms,
      };
      return updateQuote(quoteId, payload);
    },
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
                    const newTerms = form.terms ? stripCashDealGstClause(form.terms) : form.terms;
                    if (form.terms) {
                      set("terms", newTerms);
                    }
                    updateQuote(quoteId, { ...form, sale_mode: "invoiced", terms: newTerms })
                      .then(() => {
                        toast.success("Billing mode updated to GST Deal (Tax Bill)");
                        invalidateQuote(qc, quoteId);
                      })
                      .catch((err) => toast.error(toUserMessage(err)));
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
                    const newTerms = form.terms
                      ? ensureTermsHaveCashDealGstClause(form.terms)
                      : form.terms;
                    if (form.terms) {
                      set("terms", newTerms);
                    }
                    updateQuote(quoteId, { ...form, sale_mode: "cash", terms: newTerms })
                      .then(() => {
                        toast.success("Billing mode updated to Cash Deal (Challan Only)");
                        invalidateQuote(qc, quoteId);
                      })
                      .catch((err) => toast.error(toUserMessage(err)));
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
                    updateQuote(quoteId, { ...form, sale_mode: "hybrid" })
                      .then(() => {
                        toast.success("Billing mode updated to Hybrid Deal (GST + Cash)");
                        invalidateQuote(qc, quoteId);
                      })
                      .catch((err) => toast.error(toUserMessage(err)));
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

      <QuoteWallDetailsEditor
        quoteId={quoteId}
        wallEstimate={query.data?.wall_estimate}
        existingItems={itemsQuery.data ?? []}
        saleMode={saleMode}
        defaultFulfilment={form.category ?? null}
      />

      <LineItemsEditor
        quoteId={quoteId}
        defaultFulfilment={form.category ?? null}
        saleMode={saleMode}
      />

      <QuoteTermsManager
        className="mb-4"
        terms={form.terms ?? ""}
        onChangeTerms={(t) => set("terms", t || null)}
        includePrepaymentOffer={form.include_prepayment_offer}
        onChangeIncludePrepaymentOffer={(inc) => set("include_prepayment_offer", inc)}
        isCashDeal={saleMode === "cash"}
        dealScope={
          form.category === "supply_and_installation" ? "supply_and_installation" : "supply_only"
        }
        onChangeDealScope={(s: DealScope) =>
          set(
            "category",
            s === "supply_and_installation" ? "supply_and_installation" : "supply_only",
          )
        }
        totalAmount={Number(query.data?.total) || 0}
        clientProvidedSlab={
          detectClientProvidedSlabFromItems(undefined, query.data?.wall_estimate) ||
          hasClientBreakageDisclaimer(form.terms)
        }
      />

      <QuickForm
        scrollable={false}
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
        busy={mut.isPending}
      >
        <QuickForm.MoreDetails>
          <Field label="Internal Notes" className="md:col-span-2">
            <Textarea
              rows={3}
              placeholder="Internal notes (optional, not printed on PDF)..."
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
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
    unit_price:
      row.unit_price != null && Number(row.unit_price) !== 0 ? String(row.unit_price) : "",
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
    queryKey: [
      "quotes",
      "images",
      quoteId,
      JSON.stringify(
        (quoteQuery.data?.workflow_state as Record<string, unknown> | null)?.line_item_images ?? {},
      ),
      JSON.stringify(
        (quoteQuery.data?.workflow_state as Record<string, unknown> | null)
          ?.line_item_multi_images ?? {},
      ),
      itemsQuery.data?.length,
    ],
    queryFn: () => resolveAllQuoteImages(quoteQuery.data, itemsQuery.data ?? []),
    enabled: Boolean(quoteQuery.data && itemsQuery.data),
  });

  const [rows, setRows] = useState<DraftRow[]>([]);
  useEffect(() => {
    if (!itemsQuery.data) return;
    const sorted = sortQuoteItemsCategorically(itemsQuery.data);
    setRows((prev) => {
      if (prev.length === 0) return sorted.map(toDraft);
      const prevMap = new Map(prev.map((r) => [r.id, r]));
      return sorted.map((server) => {
        const draft = toDraft(server);
        const existing = prevMap.get(server.id);
        if (!existing) return draft;
        // Prioritize server numeric values (quantity, rate, tax) whenever updated from DB or estimator sync
        const serverQtyStr = String(server.quantity ?? "");
        const serverRateStr =
          server.unit_price != null && Number(server.unit_price) !== 0
            ? String(server.unit_price)
            : "";
        return {
          ...draft,
          quantity: serverQtyStr,
          unit_price: serverRateStr,
          description: existing.description.trim() ? existing.description : draft.description,
          notes: existing.notes !== "" ? existing.notes : draft.notes,
          hsn_sac: existing.hsn_sac !== "" ? existing.hsn_sac : draft.hsn_sac,
          tax_pct: existing.tax_pct !== "" ? existing.tax_pct : draft.tax_pct,
        };
      });
    });
  }, [itemsQuery.data]);

  // Auto-sync sort_order in database if existing items are out of categorical order
  const lastReorderedSigRef = useRef<string>("");
  useEffect(() => {
    if (!itemsQuery.data || itemsQuery.data.length <= 1) return;
    const sorted = sortQuoteItemsCategorically(itemsQuery.data);
    const currentSig = itemsQuery.data.map((it) => it.id).join(",");
    const sortedSig = sorted.map((it) => it.id).join(",");
    if (currentSig !== sortedSig && lastReorderedSigRef.current !== sortedSig) {
      lastReorderedSigRef.current = sortedSig;
      reorderQuoteItems(sorted.map((it) => it.id))
        .then(() => {
          qc.invalidateQueries({ queryKey: qk.quotes.items(quoteId) });
        })
        .catch((err) => {
          console.warn("[quotes] Auto-reorder failed:", err);
        });
    }
  }, [itemsQuery.data, quoteId, qc]);

  const [uploadingRowId, setUploadingRowId] = useState<string | null>(null);

  const invalidate = () => {
    invalidateQuote(qc, quoteId);
    qc.invalidateQueries({ queryKey: qk.quotes.items(quoteId) });
    qc.invalidateQueries({ queryKey: ["quotes", "images", quoteId] });
  };

  const updateImgMut = useMutation({
    mutationFn: async ({ id, url, desc }: { id: string; url: string | null; desc?: string }) => {
      return updateQuoteItemImage(quoteId, id, url, desc);
    },
    onSuccess: (res, vars) => {
      qc.setQueryData(["quotes", "images", quoteId], (prev: Map<string, string> | undefined) => {
        const next = new Map(prev ?? []);
        next.delete(vars.id);
        next.delete(`${vars.id}_all`);
        if (vars.desc) {
          next.delete(vars.desc.trim().toLowerCase());
          next.delete(`${vars.desc.trim().toLowerCase()}_all`);
        }
        return next;
      });
      if (res?.workflow_state) {
        qc.setQueryData(qk.quotes.byId(quoteId), (old: unknown) => {
          if (!old || typeof old !== "object") return old;
          return { ...old, workflow_state: res.workflow_state };
        });
      }
      invalidate();
      if (!vars.url) {
        toast.success("Photo removed from line item");
      } else {
        toast.success("Product photo updated");
      }
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const handleImageUpload = async (rowId: string, files: File[]) => {
    const validFiles = files.filter(
      (f) => f.type.startsWith("image/") && f.size <= 15 * 1024 * 1024,
    );
    if (validFiles.length === 0) {
      toast.error("Please upload valid image file(s) under 15MB");
      return;
    }

    setUploadingRowId(rowId);
    const toastId = toast.loading(
      `Compressing and attaching ${validFiles.length} photo${validFiles.length > 1 ? "s" : ""}…`,
    );

    try {
      const processedUrls: string[] = [];
      for (const file of validFiles) {
        // Ultra-high-definition compression (2400px, 0.92 quality) preserving fine text, CAD diagrams, and relief textures for crisp zoom
        const compressedDataUrl = await compressImageToDataUrl(file, 2400, 0.92);
        let finalUrl = compressedDataUrl;

        try {
          const res = await fetch(compressedDataUrl);
          const blob = await res.blob();
          const safeExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
          const storagePath = `quotes/${quoteId}/line_items/${rowId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${safeExt}`;

          const { data: upData, error: upErr } = await supabase.storage
            .from(FILES_BUCKET)
            .upload(storagePath, blob, {
              contentType: "image/jpeg",
              upsert: true,
            });

          if (!upErr && upData) {
            const { data: pubData } = supabase.storage.from(FILES_BUCKET).getPublicUrl(storagePath);
            if (pubData?.publicUrl) {
              finalUrl = pubData.publicUrl;
            }
          }
        } catch (storageErr) {
          console.warn("[quotes] Storage upload fallback to compressed dataUrl:", storageErr);
        }
        processedUrls.push(finalUrl);
      }

      const currentRow = rows.find((r) => r.id === rowId);
      const existing = getLineItemImages(
        currentRow ?? { id: rowId },
        quoteImages.data ?? new Map(),
      );
      const mergedUrls = Array.from(new Set([...processedUrls, ...existing]));

      const res = await updateQuoteItemImage(quoteId, rowId, mergedUrls, currentRow?.description);

      // Immediately set the image into the quoteImages cache so it displays without refreshing
      qc.setQueryData(["quotes", "images", quoteId], (prev: Map<string, string> | undefined) => {
        const next = new Map(prev ?? []);
        if (mergedUrls.length > 0) {
          next.set(rowId, mergedUrls[0]);
          next.set(`${rowId}_all`, JSON.stringify(mergedUrls));
          if (currentRow?.description) {
            next.set(currentRow.description.trim().toLowerCase(), mergedUrls[0]);
            next.set(
              `${currentRow.description.trim().toLowerCase()}_all`,
              JSON.stringify(mergedUrls),
            );
          }
        }
        return next;
      });

      if (res?.workflow_state) {
        qc.setQueryData(qk.quotes.byId(quoteId), (old: unknown) => {
          if (!old || typeof old !== "object") return old;
          return { ...old, workflow_state: res.workflow_state };
        });
      }

      invalidate();
      toast.success(
        `Attached ${validFiles.length} photo${validFiles.length > 1 ? "s" : ""} to item`,
        { id: toastId },
      );
    } catch (err) {
      toast.error(toUserMessage(err), { id: toastId });
    } finally {
      setUploadingRowId(null);
    }
  };

  const addMut = useMutation({
    mutationFn: async ({
      description = "New Stone Cladding Product",
      targetIndex,
      unit = "sq.ft",
      unitPrice = 0,
      quantity = 1,
      hsn = "68022190",
    }: {
      description?: string;
      targetIndex?: number;
      unit?: string;
      unitPrice?: number;
      quantity?: number;
      hsn?: string;
    } = {}) => {
      // 1. Add quote item
      const newItem = await addQuoteItem(quoteId, {
        description,
        quantity,
        unit,
        unit_price: unitPrice,
        tax_pct: saleMode === "cash" ? 0 : 0,
        hsn_sac: saleMode === "cash" ? null : hsn,
        fulfilment: defaultFulfilment,
      });

      // 2. Order items:
      // If targetIndex is specified (e.g. from "+ Insert line below") and not a stone product, use it.
      // Stone products are ALWAYS placed categorically under stone products at top (e.g. under 1 & 2, placed at 3).
      let insertAt = targetIndex;
      const isProduct = categorizeQuoteItem({ description, unit, hsn_sac: hsn }) === "product";
      if (insertAt !== undefined && !isProduct) {
        const curIds = rows.map((r) => r.id).filter((id) => id !== newItem.id);
        curIds.splice(insertAt, 0, newItem.id);
        await reorderQuoteItems(curIds);
      } else {
        const freshItems = await getQuoteItems(quoteId);
        const sorted = sortQuoteItemsCategorically(freshItems);
        await reorderQuoteItems(sorted.map((it) => it.id));
        const newPos = sorted.findIndex((it) => it.id === newItem.id);
        insertAt = newPos >= 0 ? newPos : 0;
      }
      return { newItem, insertAt };
    },
    onSuccess: ({ insertAt }) => {
      invalidate();
      toast.success(`Line item placed into category group at position #${insertAt + 1}`);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const addCartingMut = useMutation({
    mutationFn: () =>
      addQuoteItem(quoteId, {
        description: "Local Carting & Transportation",
        quantity: 1,
        unit: "trip",
        unit_price: 1500,
        tax_pct: saleMode === "cash" ? 0 : 5,
        hsn_sac: saleMode === "cash" ? null : "9965",
        notes: "Site delivery via tempo / pickup from yard to site",
        fulfilment: defaultFulfilment,
        sort_order: rows.length + 1,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Local Carting added to quotation");
    },
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
    onSuccess: (updated) => {
      invalidate();
      if (updated) {
        setRows((current) => current.map((r) => (r.id === updated.id ? toDraft(updated) : r)));
      }
    },
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
      const n = row.unit_price === "" ? 0 : Number(row.unit_price);
      if (!Number.isFinite(n) || n < 0) {
        toast.error("Rate must be ≥ 0");
        setRows((rs) =>
          rs.map((r) =>
            r.id === id
              ? {
                  ...r,
                  unit_price:
                    original.unit_price != null && Number(original.unit_price) !== 0
                      ? String(original.unit_price)
                      : "",
                }
              : r,
          ),
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
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const fresh = await getQuoteItems(quoteId);
              const sorted = sortQuoteItemsCategorically(fresh);
              await reorderQuoteItems(sorted.map((it) => it.id));
              invalidate();
              toast.success("Organized into Products → Labour → Adhesives → Sealers → Carting!");
            }}
            className="h-8 border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium cursor-pointer shadow-2xs"
            title="Club items: Products → Installation Labour → Adhesives → Sealers → Sealer Labour → Carting"
          >
            <Layers className="mr-1.5 h-3.5 w-3.5 text-slate-600" />
            Auto-Organize Categories
          </Button>

          {/* Add Stone Cladding Line */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => addMut.mutate({ description: "New Stone Cladding Product" })}
            disabled={addMut.isPending}
            className="h-8 border-cyan-300 bg-cyan-50 text-cyan-900 hover:bg-cyan-100 hover:text-cyan-950 text-xs font-semibold cursor-pointer shadow-2xs"
            title="Add stone cladding product (placed under stone products at top)"
          >
            {addMut.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-3.5 w-3.5 text-cyan-700" />
            )}
            + Add Stone Cladding Line
          </Button>

          {/* Add Adhesive / Chemical Line (Major Category) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={addMut.isPending}
                className="h-8 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:text-amber-950 text-xs font-semibold cursor-pointer shadow-2xs"
                title="Add adhesive line (placed under the Adhesives & Chemicals category)"
              >
                <Package className="mr-1.5 h-3.5 w-3.5 text-amber-700" />
                + Add Adhesive
                <ChevronDown className="ml-1 h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="text-xs font-semibold text-slate-700">
                Adhesives & Chemicals (Major Category)
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer flex flex-col items-start gap-0.5 py-1.5"
                onClick={() =>
                  addMut.mutate({
                    description: "Standard Cement Based Stone Adhesive White",
                    unit: "bag",
                    unitPrice: 900,
                    hsn: "3506",
                    quantity: 1,
                  })
                }
              >
                <div className="flex items-center justify-between w-full font-medium text-xs">
                  <span>⚪ White Cement Adhesive</span>
                  <span className="text-emerald-700 font-semibold">₹900/bag</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Polymer-modified for light/white stones & mosaics
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer flex flex-col items-start gap-0.5 py-1.5"
                onClick={() =>
                  addMut.mutate({
                    description: "Standard Cementitious Stone Adhesive Grey",
                    unit: "bag",
                    unitPrice: 800,
                    hsn: "3506",
                    quantity: 1,
                  })
                }
              >
                <div className="flex items-center justify-between w-full font-medium text-xs">
                  <span>🔘 Grey Cement Adhesive</span>
                  <span className="text-emerald-700 font-semibold">₹800/bag</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  High-strength standard for darker stone claddings
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer flex flex-col items-start gap-0.5 py-1.5"
                onClick={() =>
                  addMut.mutate({
                    description: "No-Limit Grey Adhesive",
                    unit: "bag",
                    unitPrice: 1650,
                    hsn: "3506",
                    quantity: 1,
                  })
                }
              >
                <div className="flex items-center justify-between w-full font-medium text-xs">
                  <span>⚡ No-Limit Grey Adhesive</span>
                  <span className="text-emerald-700 font-semibold">₹1,650/bag</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Zero vertical slip, extreme adhesion for facades
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer flex flex-col items-start gap-0.5 py-1.5"
                onClick={() =>
                  addMut.mutate({
                    description: "PU Based Adhesive",
                    unit: "bucket",
                    unitPrice: 1650,
                    hsn: "3506",
                    quantity: 1,
                  })
                }
              >
                <div className="flex items-center justify-between w-full font-medium text-xs">
                  <span>🪣 PU Based Adhesive (Bucket)</span>
                  <span className="text-emerald-700 font-semibold">₹1,650/bucket</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Polyurethane for metal, drywall, or timber substrates
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-xs font-medium text-amber-900"
                onClick={() =>
                  addMut.mutate({
                    description: "Adhesive — Cementitious Stone Adhesive",
                    unit: "bag",
                    unitPrice: 800,
                    hsn: "3506",
                    quantity: 1,
                  })
                }
              >
                <Plus className="mr-1.5 h-3.5 w-3.5 text-amber-700" />
                Custom Adhesive Line
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add Sealer / Chemical Line (Major Category) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={addMut.isPending}
                className="h-8 border-purple-300 bg-purple-50 text-purple-900 hover:bg-purple-100 hover:text-purple-950 text-xs font-semibold cursor-pointer shadow-2xs"
                title="Add sealer line (placed under the Sealers & Repellents category)"
              >
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-purple-700" />
                + Add Sealer
                <ChevronDown className="ml-1 h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="text-xs font-semibold text-slate-700">
                Sealers & Repellents (Major Category)
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer flex flex-col items-start gap-0.5 py-1.5"
                onClick={() =>
                  addMut.mutate({
                    description: "Sealer Chemical — Solvent Based Water Oil and Dust Repellent",
                    unit: "ltr",
                    unitPrice: 2500,
                    hsn: "38249900",
                    quantity: 1,
                  })
                }
              >
                <div className="flex items-center justify-between w-full font-medium text-xs">
                  <span>🛡️ Solvent Based Oil & Dust Repellent</span>
                  <span className="text-emerald-700 font-semibold">₹2,500/ltr</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  50 sq.ft coverage/ltr · Deep penetrating oleophobic
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer flex flex-col items-start gap-0.5 py-1.5"
                onClick={() =>
                  addMut.mutate({
                    description: "Sealer Chemical — Water Based Water Repellent",
                    unit: "ltr",
                    unitPrice: 1700,
                    hsn: "38249900",
                    quantity: 1,
                  })
                }
              >
                <div className="flex items-center justify-between w-full font-medium text-xs">
                  <span>💧 Water Based Water Repellent</span>
                  <span className="text-emerald-700 font-semibold">₹1,700/ltr</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  550 sq.ft coverage/ltr · Invisible breathable silicone
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer flex flex-col items-start gap-0.5 py-1.5"
                onClick={() =>
                  addMut.mutate({
                    description: "Wetlook Sealer (Gloss Finish)",
                    unit: "ltr",
                    unitPrice: 3000,
                    hsn: "38249900",
                    quantity: 1,
                  })
                }
              >
                <div className="flex items-center justify-between w-full font-medium text-xs">
                  <span>✨ Wetlook Sealer (Gloss Finish)</span>
                  <span className="text-emerald-700 font-semibold">₹3,000/ltr</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  60 sq.ft coverage/ltr · Color enhancing gloss
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer flex flex-col items-start gap-0.5 py-1.5"
                onClick={() =>
                  addMut.mutate({
                    description: "Back Coat Protective Sealer",
                    unit: "ltr",
                    unitPrice: 3000,
                    hsn: "38249900",
                    quantity: 1,
                  })
                }
              >
                <div className="flex items-center justify-between w-full font-medium text-xs">
                  <span>🛡️ Back Coat Sealer</span>
                  <span className="text-emerald-700 font-semibold">₹3,000/ltr</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  100 sq.ft coverage/ltr · Anti-efflorescence barrier
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-xs font-medium text-purple-900"
                onClick={() =>
                  addMut.mutate({
                    description: "Sealer Chemical",
                    unit: "ltr",
                    unitPrice: 1700,
                    hsn: "38249900",
                    quantity: 1,
                  })
                }
              >
                <Plus className="mr-1.5 h-3.5 w-3.5 text-purple-700" />
                Custom Sealer Line
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add Local Carting */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => addCartingMut.mutate()}
            disabled={addCartingMut.isPending}
            className="h-8 border-orange-300 bg-orange-50 text-orange-900 hover:bg-orange-100 hover:text-orange-950 text-xs font-medium cursor-pointer"
            title="Add optional local carting / transport charge"
          >
            {addCartingMut.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Truck className="mr-1.5 h-3.5 w-3.5 text-orange-700" />
            )}
            + Add Local Carting
          </Button>

          {/* Generic Add Line */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => addMut.mutate({ description: "New line" })}
            disabled={addMut.isPending}
            className="h-8 text-xs font-medium"
          >
            {addMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add line
          </Button>
        </div>
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
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-12">
                    <div
                      className={cn(
                        "col-span-2",
                        saleMode === "cash" ? "md:col-span-6" : "md:col-span-4",
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between gap-1 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          {(() => {
                            const cat = categorizeQuoteItem(r);
                            return (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-semibold px-1.5 py-0 border",
                                  QUOTE_ITEM_CATEGORY_BADGE_CLASSES[cat],
                                )}
                              >
                                #{i + 1} · {QUOTE_ITEM_CATEGORY_LABELS[cat]}
                              </Badge>
                            );
                          })()}
                        </div>
                        {lineImg && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-primary">
                            <ImageIcon className="h-3 w-3" /> Photo attached
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Hidden file input for this line item, usable for both initial attach and change photo */}
                        <input
                          id={`file-input-${r.id}`}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files ?? []);
                            if (files.length > 0) void handleImageUpload(r.id, files);
                            e.target.value = "";
                          }}
                        />

                        {uploadingRowId === r.id ? (
                          <div className="flex h-10 w-12 shrink-0 items-center justify-center rounded-md border border-primary/40 bg-primary/5">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          </div>
                        ) : lineImg ? (
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Thumbnail with click to change / replace */}
                            <div
                              onClick={() => document.getElementById(`file-input-${r.id}`)?.click()}
                              className="group relative h-10 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-slate-50 cursor-pointer transition hover:ring-2 hover:ring-primary/40"
                              title="Click to add / replace photos (multiple supported)"
                            >
                              <img
                                src={lineImg}
                                alt={r.description}
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 transition group-hover:opacity-100 text-[9px] font-semibold text-center px-0.5">
                                Change
                              </div>
                            </div>
                            {/* Explicit Remove Button */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                updateImgMut.mutate({
                                  id: r.id,
                                  desc: r.description,
                                  url: null,
                                })
                              }
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Remove photo from line item"
                            >
                              <XIcon className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <label
                            htmlFor={`file-input-${r.id}`}
                            className="flex h-10 w-10 shrink-0 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/20 text-muted-foreground transition hover:border-primary/50 hover:bg-muted/40 hover:text-primary"
                            title="Attach product photo"
                          >
                            <ImagePlus className="h-4 w-4" />
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
                              const displayTitle = prod.code || prod.name;
                              updateRow(r.id, "description", displayTitle);
                              const patchObj: Parameters<typeof updateQuoteItem>[1] = {
                                description: displayTitle,
                              };
                              if (prod.defaultUnit) {
                                updateRow(r.id, "unit", prod.defaultUnit);
                                patchObj.unit = prod.defaultUnit;
                              }
                              if (saleMode === "cash") {
                                updateRow(r.id, "hsn_sac", "");
                                patchObj.hsn_sac = null;
                              } else if (prod.hsnCode) {
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
                              if (prod.category === "carting" || prod.id.startsWith("cart_")) {
                                const currentQty = Number(r.quantity) || 0;
                                if (currentQty <= 0) {
                                  updateRow(r.id, "quantity", "1");
                                  patchObj.quantity = 1;
                                }
                              }
                              if (saleMode === "cash") {
                                updateRow(r.id, "tax_pct", "0");
                                patchObj.tax_pct = 0;
                              } else if (prod.defaultTaxPct !== undefined) {
                                updateRow(r.id, "tax_pct", String(prod.defaultTaxPct));
                                patchObj.tax_pct = prod.defaultTaxPct;
                              }
                              if (prod.code && displayTitle !== prod.code) {
                                const codeTag = `Catalog Code: ${prod.code}`;
                                if (!r.notes || !r.notes.includes("Catalog Code")) {
                                  const newNotes = r.notes ? `${r.notes}\n${codeTag}` : codeTag;
                                  updateRow(r.id, "notes", newNotes);
                                  patchObj.notes = newNotes;
                                }
                              }
                              patchMut.mutate({ id: r.id, patch: patchObj });
                              if (prod.image && !lineImg) {
                                void updateQuoteItemImage(
                                  quoteId,
                                  r.id,
                                  prod.image,
                                  prod.name,
                                ).then(() => {
                                  invalidate();
                                });
                              }
                            }}
                            placeholder="Search by code (e.g. 080, 80), stone, or adhesive…"
                          />
                        </div>
                      </div>
                    </div>
                    {saleMode !== "cash" && (
                      <div className="col-span-2 sm:col-span-1 md:col-span-2">
                        <label className="text-xs text-muted-foreground">HSN Code</label>
                        <Input
                          placeholder="4-8 digits"
                          value={r.hsn_sac}
                          onChange={(e) =>
                            updateRow(
                              r.id,
                              "hsn_sac",
                              e.target.value.replace(/\D/g, "").slice(0, 8),
                            )
                          }
                          onBlur={() => commit(r.id, "hsn_sac", original)}
                        />
                      </div>
                    )}
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-xs text-muted-foreground">
                        Qty <span className="text-destructive font-bold">*</span>
                      </label>
                      <NumericInput
                        value={r.quantity}
                        onChange={(val) => updateRow(r.id, "quantity", val)}
                        onBlur={() => commit(r.id, "quantity", original)}
                        min={0}
                        allowDecimal
                      />
                    </div>
                    <div className="col-span-1 md:col-span-1">
                      <label className="text-xs text-muted-foreground">Unit</label>
                      <UnitPicker
                        value={r.unit}
                        onChange={(val) => {
                          updateRow(r.id, "unit", val);
                          commit(r.id, "unit", original);
                        }}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-xs text-muted-foreground">
                        Rate (₹) <span className="text-destructive font-bold">*</span>
                      </label>
                      <NumericInput
                        placeholder="0"
                        value={r.unit_price}
                        onChange={(val) => updateRow(r.id, "unit_price", val)}
                        onBlur={() => commit(r.id, "unit_price", original)}
                        min={0}
                        allowDecimal
                      />
                    </div>
                    <div className="col-span-1 md:col-span-1">
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
                    <div className="col-span-2 md:col-span-12 mt-1 pt-2 border-t border-dashed border-border/70">
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
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => move(r.id, -1)}
                        disabled={i === 0 || reorderMut.isPending}
                        aria-label="Move up"
                        className="h-7 w-7"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => move(r.id, 1)}
                        disabled={i === rows.length - 1 || reorderMut.isPending}
                        aria-label="Move down"
                        className="h-7 w-7"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      {(() => {
                        const cat = categorizeQuoteItem(r);
                        const isAdhesive = cat === "adhesive";
                        const isWhite = (r.description || "").toLowerCase().includes("white");
                        const isGrey = (r.description || "").toLowerCase().includes("grey");

                        let nextDesc = "New line";
                        let nextUnit = "sq.ft";
                        let nextPrice = 0;
                        let nextHsn = "68022190";
                        let buttonLabel = `Insert line below (Place at #${i + 2})`;
                        let buttonBorder = "border-cyan-200 text-cyan-800 hover:bg-cyan-50";

                        if (isAdhesive) {
                          if (isWhite) {
                            nextDesc = "Standard Cementitious Stone Adhesive Grey";
                            nextUnit = "bag";
                            nextPrice = 800;
                            nextHsn = "3506";
                            buttonLabel = `+ Insert Grey Adhesive below (Place at #${i + 2})`;
                          } else if (isGrey) {
                            nextDesc = "Standard Cement Based Stone Adhesive White";
                            nextUnit = "bag";
                            nextPrice = 900;
                            nextHsn = "3506";
                            buttonLabel = `+ Insert White Adhesive below (Place at #${i + 2})`;
                          } else {
                            nextDesc = "Adhesive — Cementitious Stone Adhesive";
                            nextUnit = "bag";
                            nextPrice = 800;
                            nextHsn = "3506";
                            buttonLabel = `+ Insert another Adhesive below (Place at #${i + 2})`;
                          }
                          buttonBorder = "border-amber-300 text-amber-900 hover:bg-amber-50";
                        } else if (cat === "product") {
                          nextDesc = "New Stone Cladding Product";
                          nextUnit = "sq.ft";
                          nextPrice = 0;
                          nextHsn = "68022190";
                          buttonLabel = `+ Insert Stone Product below (Place at #${i + 2})`;
                          buttonBorder = "border-cyan-200 text-cyan-800 hover:bg-cyan-50";
                        } else if (cat === "sealer") {
                          nextDesc = "Sealer Chemical — Water Based Water Repellent";
                          nextUnit = "ltr";
                          nextPrice = 1700;
                          nextHsn = "38249900";
                          buttonLabel = `+ Insert Sealer line below (Place at #${i + 2})`;
                          buttonBorder = "border-purple-300 text-purple-900 hover:bg-purple-50";
                        } else if (cat === "installation_labour" || cat === "sealer_labour") {
                          nextDesc = "Installation Labour";
                          nextUnit = "sq.ft";
                          nextPrice = 80;
                          nextHsn = "9954";
                          buttonLabel = `+ Insert Labour line below (Place at #${i + 2})`;
                          buttonBorder = "border-blue-300 text-blue-900 hover:bg-blue-50";
                        } else if (cat === "carting") {
                          nextDesc = "Local Carting & Transportation";
                          nextUnit = "trip";
                          nextPrice = 1500;
                          nextHsn = "9965";
                          buttonLabel = `+ Insert Carting line below (Place at #${i + 2})`;
                          buttonBorder = "border-orange-300 text-orange-900 hover:bg-orange-50";
                        }

                        return (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              addMut.mutate({
                                targetIndex: i + 1,
                                description: nextDesc,
                                unit: nextUnit,
                                unitPrice: nextPrice,
                                hsn: nextHsn,
                              })
                            }
                            disabled={addMut.isPending}
                            className={cn(
                              "h-7 px-2 text-[11px] font-medium flex items-center gap-1 border border-dashed rounded cursor-pointer",
                              buttonBorder,
                            )}
                            title={`Insert item directly under #${i + 1}`}
                          >
                            <Plus className="h-3 w-3" />
                            <span>{buttonLabel}</span>
                          </Button>
                        );
                      })()}
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

            {!rows.some(
              (it) =>
                it.hsn_sac === "9965" ||
                it.description.toLowerCase().includes("carting") ||
                it.description.toLowerCase().includes("transport"),
            ) && (
              <div className="flex items-center justify-between rounded-md border border-dashed border-amber-300 bg-amber-50/50 p-2.5 text-xs">
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
                  onClick={() => addCartingMut.mutate()}
                  disabled={addCartingMut.isPending}
                  className="h-7 border-amber-300 bg-white text-amber-900 hover:bg-amber-100 text-xs font-medium cursor-pointer"
                >
                  {addCartingMut.isPending ? (
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="mr-1 h-3 w-3" />
                  )}
                  Add Carting
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
