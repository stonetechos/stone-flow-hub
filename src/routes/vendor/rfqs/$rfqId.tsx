/** RFQ detail — two-column, sticky quote panel. */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Save, Send, Loader2, Paperclip, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/forms/Field";
import { QuickForm } from "@/components/forms/QuickForm";
import { getVendorRfqDetail, markRfqViewed } from "@/lib/vendor-portal/rfq";
import { getExistingQuote, saveQuoteDraft, submitQuote } from "@/lib/vendor-portal/quote";
import { listAttachments, uploadAttachment } from "@/lib/attachments/api";
import { FilePreview } from "@/components/vendor-portal/FilePreview";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/vendor/rfqs/$rfqId")({
  component: RfqDetail,
});

interface DraftState {
  price_total: string;
  freight_inr: string;
  dispatch_days: string;
  gst_included: boolean;
  stock_available: boolean;
  valid_until: string;
  remarks: string;
  quote_pdf_file_id: string | null;
}

const EMPTY: DraftState = {
  price_total: "",
  freight_inr: "",
  dispatch_days: "",
  gst_included: false,
  stock_available: false,
  valid_until: "",
  remarks: "",
  quote_pdf_file_id: null,
};

function RfqDetail() {
  const { rfqId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const detail = useQuery({
    queryKey: ["vendor", "rfq", rfqId],
    queryFn: () => getVendorRfqDetail(rfqId),
  });

  // Fire-and-forget viewed marker.
  useEffect(() => {
    void markRfqViewed(rfqId).then(() => {
      void qc.invalidateQueries({ queryKey: ["vendor", "inbox"] });
      void qc.invalidateQueries({ queryKey: ["vendor", "kpis"] });
    });
  }, [rfqId, qc]);

  const existing = useQuery({
    queryKey: ["vendor", "quote", rfqId],
    queryFn: () => getExistingQuote(rfqId),
  });

  const attachments = useQuery({
    queryKey: ["vendor", "rfq-files", rfqId],
    queryFn: async () => {
      if (!detail.data) return [];
      const [rfqFiles, reqFiles] = await Promise.all([
        listAttachments("rfq", detail.data.rfq.id),
        listAttachments("vendor_request", rfqId),
      ]);
      return [...rfqFiles, ...reqFiles];
    },
    enabled: !!detail.data,
  });

  const [draft, setDraft] = useState<DraftState>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Hydrate the form from existing quote once.
  useEffect(() => {
    if (existing.data && !dirty) {
      const e = existing.data;
      setDraft({
        price_total: e.total_inr ? String(e.total_inr) : "",
        freight_inr: e.freight_inr != null ? String(e.freight_inr) : "",
        dispatch_days: e.dispatch_days != null ? String(e.dispatch_days) : "",
        gst_included: !!e.gst_included,
        stock_available: !!e.stock_available,
        valid_until: e.valid_until ?? "",
        remarks: e.remarks ?? "",
        quote_pdf_file_id: e.quote_pdf_file_id ?? null,
      });
    }
  }, [existing.data, dirty]);

  const submitted = !!existing.data?.submitted_at;
  const locked = submitted || !!existing.data?.is_approved || !!existing.data?.rejected_at;

  const parsed = useMemo(() => ({
    price_total: draft.price_total ? Number(draft.price_total) : undefined,
    freight_inr: draft.freight_inr ? Number(draft.freight_inr) : null,
    dispatch_days: draft.dispatch_days ? parseInt(draft.dispatch_days, 10) : null,
    gst_included: draft.gst_included,
    stock_available: draft.stock_available,
    valid_until: draft.valid_until || null,
    remarks: draft.remarks || null,
    quote_pdf_file_id: draft.quote_pdf_file_id,
  }), [draft]);

  // Auto-save (debounced).
  useEffect(() => {
    if (!dirty || locked) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          setSaving(true);
          await saveQuoteDraft(rfqId, parsed);
          setSavedAt(new Date());
          setDirty(false);
          void qc.invalidateQueries({ queryKey: ["vendor", "quote", rfqId] });
        } catch (e) {
          toast.error(toUserMessage(e));
        } finally {
          setSaving(false);
        }
      })();
    }, 800);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [dirty, parsed, rfqId, qc, locked]);

  // Warn on unload with unsaved changes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty || saving) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, saving]);

  function patch<K extends keyof DraftState>(k: K, v: DraftState[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
    setDirty(true);
  }

  async function onSubmitQuote() {
    if (dirty || saving) {
      try {
        setSaving(true);
        await saveQuoteDraft(rfqId, parsed);
        setSavedAt(new Date());
        setDirty(false);
      } catch (e) {
        toast.error(toUserMessage(e));
        setSaving(false);
        return;
      } finally {
        setSaving(false);
      }
    }
    if (!parsed.price_total || parsed.price_total <= 0) {
      toast.error("Enter a price before submitting.");
      return;
    }
    try {
      setSubmitting(true);
      await submitQuote(rfqId);
      toast.success("Quote submitted");
      void qc.invalidateQueries({ queryKey: ["vendor", "quote", rfqId] });
      void qc.invalidateQueries({ queryKey: ["vendor", "inbox"] });
      void qc.invalidateQueries({ queryKey: ["vendor", "kpis"] });
      await navigate({ to: "/vendor/rfqs", search: { filter: "submitted", q: "" } });
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function onUploadPdf(file: File) {
    if (!detail.data) return;
    setUploadingPdf(true);
    try {
      // Create the quote row first if missing so we have an entity_id.
      let quoteId = existing.data?.id;
      if (!quoteId) {
        const saved = await saveQuoteDraft(rfqId, parsed);
        quoteId = saved.id;
        setDirty(false);
      }
      const row = await uploadAttachment({
        entityType: "vendor_quote",
        entityId: quoteId,
        folder: "other",
        file,
      });
      patch("quote_pdf_file_id", row.id);
      toast.success("Quote PDF attached");
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setUploadingPdf(false);
    }
  }

  if (detail.isLoading) return <LoadingBlock />;
  if (detail.error)
    return <ErrorBlock message={toUserMessage(detail.error)} onRetry={() => detail.refetch()} />;
  if (!detail.data) return <ErrorBlock message="RFQ not found." />;
  const { rfq, items, projectName, request } = detail.data;

  return (
    <div>
      <div className="mb-2">
        <Link
          to="/vendor/rfqs"
          search={{ filter: "all", q: "" }}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to inbox
        </Link>
      </div>
      <PageHeader
        title={projectName ?? "Untitled project"}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{rfq.rfq_no}</span>
            {rfq.due_date && <Badge variant="outline">Due {rfq.due_date}</Badge>}
            {submitted && <Badge variant="secondary">Submitted</Badge>}
            {existing.data?.is_approved && <Badge className="bg-success">Approved</Badge>}
            {existing.data?.rejected_at && <Badge variant="destructive">Rejected</Badge>}
            {request.revision_requested_at && !submitted && (
              <Badge variant="destructive">Revision requested</Badge>
            )}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* LEFT: RFQ content */}
        <div className="min-w-0 space-y-4">
          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm">Products requested</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items listed.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((it) => (
                    <li key={it.id} className="py-2 first:pt-0 last:pb-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="min-w-0 font-medium">{it.product_name_snapshot}</div>
                        <div className="shrink-0 text-sm text-muted-foreground">
                          {it.quantity} {it.unit}
                        </div>
                      </div>
                      {it.specs && (
                        <div className="mt-0.5 text-xs text-muted-foreground">{it.specs}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {rfq.notes && (
            <Card className="shadow-1">
              <CardHeader>
                <CardTitle className="text-sm">Notes from Stone Tech</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{rfq.notes}</p>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Paperclip className="h-3.5 w-3.5" /> Attachments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attachments.isLoading ? (
                <div className="text-xs text-muted-foreground">Loading…</div>
              ) : (attachments.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No attachments.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {(attachments.data ?? []).map((f) => (
                    <FilePreview key={f.id} file={f} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: sticky quote submission */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <Card className="shadow-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Your quote</CardTitle>
              <div className="text-xs text-muted-foreground">
                {saving
                  ? "Saving…"
                  : savedAt
                    ? `Saved ${savedAt.toLocaleTimeString()}`
                    : "Auto-saves as you type"}
              </div>
            </CardHeader>
            <CardContent>
              <QuickForm onSubmit={(e) => { e.preventDefault(); void onSubmitQuote(); }}>
                <QuickForm.QuickFill>
                  <Field label="Price (₹)" required htmlFor="q-price">
                    <Input
                      id="q-price"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={draft.price_total}
                      disabled={locked}
                      onChange={(e) => patch("price_total", e.target.value)}
                    />
                  </Field>
                  <Field label="Freight (₹)" htmlFor="q-freight">
                    <Input
                      id="q-freight"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={draft.freight_inr}
                      disabled={locked}
                      onChange={(e) => patch("freight_inr", e.target.value)}
                    />
                  </Field>
                  <Field label="Dispatch (days)" htmlFor="q-days">
                    <Input
                      id="q-days"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={draft.dispatch_days}
                      disabled={locked}
                      onChange={(e) => patch("dispatch_days", e.target.value)}
                    />
                  </Field>
                  <div className="flex flex-col justify-end gap-2 pb-1">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={draft.stock_available}
                        disabled={locked}
                        onCheckedChange={(v) => patch("stock_available", !!v)}
                      />
                      Stock available
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={draft.gst_included}
                        disabled={locked}
                        onCheckedChange={(v) => patch("gst_included", !!v)}
                      />
                      GST included
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Quote PDF (optional)">
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/60">
                        {uploadingPdf ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        {draft.quote_pdf_file_id
                          ? "PDF attached — replace"
                          : "Upload your quotation PDF"}
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          disabled={locked || uploadingPdf}
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void onUploadPdf(f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </Field>
                  </div>
                </QuickForm.QuickFill>

                <QuickForm.MoreDetails>
                  <Field label="Valid until" htmlFor="q-valid">
                    <Input
                      id="q-valid"
                      type="date"
                      value={draft.valid_until}
                      disabled={locked}
                      onChange={(e) => patch("valid_until", e.target.value)}
                    />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Remarks" htmlFor="q-remarks">
                      <Textarea
                        id="q-remarks"
                        value={draft.remarks}
                        disabled={locked}
                        rows={3}
                        onChange={(e) => patch("remarks", e.target.value)}
                        placeholder="Payment terms, availability notes, etc."
                      />
                    </Field>
                  </div>
                </QuickForm.MoreDetails>

                <div className="sticky bottom-0 -mx-4 mt-3 flex items-center justify-between gap-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
                  <div className="text-xs text-muted-foreground">
                    {locked
                      ? submitted
                        ? "Locked — submitted"
                        : "Locked"
                      : dirty
                        ? "Unsaved changes"
                        : "All changes saved"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!dirty || saving || locked}
                      onClick={async () => {
                        try {
                          setSaving(true);
                          await saveQuoteDraft(rfqId, parsed);
                          setSavedAt(new Date());
                          setDirty(false);
                        } catch (e) {
                          toast.error(toUserMessage(e));
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      {saving ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="mr-1 h-3.5 w-3.5" />
                      )}
                      Save draft
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={locked || submitting}
                    >
                      {submitting ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="mr-1 h-3.5 w-3.5" />
                      )}
                      Submit quote
                    </Button>
                  </div>
                </div>
              </QuickForm>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
