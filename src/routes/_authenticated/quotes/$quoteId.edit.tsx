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
} from "lucide-react";
import { ReassignCustomerDialog } from "@/components/quotes/ReassignCustomerDialog";
import { useRoles } from "@/hooks/use-roles";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  type QuoteItemRow,
} from "@/lib/quotes/api";
import {
  QUOTE_CATEGORIES,
  QUOTE_CATEGORY_LABELS,
  type QuoteCategory,
  type QuoteUpdateInput,
} from "@/lib/quotes/schema";
import { invalidateQuote } from "@/lib/query-invalidation";
import { formatInr } from "@/lib/format";

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
  const [form, setForm] = useState<QuoteUpdateInput>({
    category: null,
    valid_until: null,
    notes: null,
    terms: null,
  });

  useEffect(() => {
    if (query.data) {
      const raw = (query.data as { category?: string | null }).category ?? null;
      const cat = (QUOTE_CATEGORIES as readonly string[]).includes(raw ?? "")
        ? (raw as QuoteCategory)
        : null;
      setForm({
        category: cat,
        valid_until: query.data.valid_until ?? null,
        notes: query.data.notes ?? null,
        terms: query.data.terms ?? null,
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

  // Editing is only allowed while the quote is a Draft. Every other status
  // locks commercials; users must use "Create revision" from the detail page
  // to obtain a new draft.
  const status = query.data.status;
  if (status !== "draft") {
    return (
      <div>
        <PageHeader
          title={`Edit ${query.data.quote_no}`}
          subtitle="Editing is not available for this quote."
          actions={
            <Button
              variant="ghost"
              onClick={() => nav({ to: "/quotes/$quoteId", params: { quoteId } })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          }
        />
        <Card className="shadow-1">
          <CardContent className="py-8 text-sm text-muted-foreground">
            This quote is <span className="font-medium capitalize">{status}</span> and its
            commercials are locked. To change quantities, rates, GST, fulfilment or notes, open the
            quote and choose <span className="font-medium">Create revision</span> — that duplicates
            it into a new draft while preserving this version for audit.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Edit ${query.data.quote_no}`}
        subtitle="Draft quote — full editing enabled."
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

      <LineItemsEditor quoteId={quoteId} defaultFulfilment={form.category ?? null} />

      <QuickForm
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
        busy={mut.isPending}
      >
        <QuickForm.QuickFill>
          <Field label="Category">
            <Select
              value={form.category ?? "none"}
              onValueChange={(v) => set("category", v === "none" ? null : (v as QuoteCategory))}
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
          <Field label="Valid until">
            <Input
              type="date"
              value={form.valid_until ?? ""}
              onChange={(e) => set("valid_until", e.target.value || null)}
            />
          </Field>
        </QuickForm.QuickFill>

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
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
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
  quantity: string;
  unit: string | null;
  unit_price: string;
  tax_pct: string;
  fulfilment: string | null;
};

function toDraft(row: QuoteItemRow): DraftRow {
  const anyRow = row as unknown as { fulfilment?: string | null };
  return {
    id: row.id,
    description: row.description ?? "",
    quantity: String(row.quantity ?? ""),
    unit: row.unit ?? null,
    unit_price: String(row.unit_price ?? ""),
    tax_pct: String(row.tax_pct ?? ""),
    fulfilment: anyRow.fulfilment ?? null,
  };
}

function LineItemsEditor({
  quoteId,
  defaultFulfilment,
}: {
  quoteId: string;
  defaultFulfilment: string | null;
}) {
  const qc = useQueryClient();
  const itemsQuery = useQuery({
    queryKey: qk.quotes.items(quoteId),
    queryFn: () => getQuoteItems(quoteId),
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
  };

  const addMut = useMutation({
    mutationFn: () =>
      addQuoteItem(quoteId, {
        description: "New line",
        quantity: 1,
        unit_price: 0,
        tax_pct: 0,
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
    mutationFn: async ({ id, patch }: { id: string; patch: Parameters<typeof updateQuoteItem>[1] }) =>
      updateQuoteItem(id, patch),
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
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, description: original.description } : r)));
        return;
      }
      if (v !== original.description) patchMut.mutate({ id, patch: { description: v } });
    } else if (key === "quantity") {
      const n = Number(row.quantity);
      if (!Number.isFinite(n) || n <= 0) {
        toast.error("Qty must be > 0");
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, quantity: String(original.quantity) } : r)));
        return;
      }
      if (n !== Number(original.quantity)) patchMut.mutate({ id, patch: { quantity: n } });
    } else if (key === "unit_price") {
      const n = Number(row.unit_price);
      if (!Number.isFinite(n) || n < 0) {
        toast.error("Rate must be ≥ 0");
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, unit_price: String(original.unit_price) } : r)));
        return;
      }
      if (n !== Number(original.unit_price)) patchMut.mutate({ id, patch: { unit_price: n } });
    } else if (key === "tax_pct") {
      const n = Number(row.tax_pct);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        toast.error("GST must be between 0 and 100");
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, tax_pct: String(original.tax_pct) } : r)));
        return;
      }
      if (n !== Number(original.tax_pct)) patchMut.mutate({ id, patch: { tax_pct: n } });
    } else if (key === "unit") {
      const v = row.unit?.trim() || null;
      if (v !== (original.unit ?? null)) patchMut.mutate({ id, patch: { unit: v } });
    }
  };

  const commitFulfilment = (id: string, value: string | null, original: QuoteItemRow | undefined) => {
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
        <CardTitle className="text-sm">Line items</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => addMut.mutate()}
          disabled={addMut.isPending}
        >
          {addMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Add line
        </Button>
      </CardHeader>
      <CardContent>
        {itemsQuery.isLoading ? (
          <div className="py-4 text-sm text-muted-foreground">Loading items…</div>
        ) : rows.length === 0 ? (
          <div className="py-4 text-sm text-muted-foreground">
            No line items yet. Use “Add line” to add one.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r, i) => {
              const original = originalsById.get(r.id);
              const lineTotal =
                (Number(r.quantity) || 0) *
                (Number(r.unit_price) || 0) *
                (1 + (Number(r.tax_pct) || 0) / 100);
              return (
                <div key={r.id} className="rounded-md border border-border p-3">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                    <div className="md:col-span-5">
                      <label className="text-xs text-muted-foreground">Description</label>
                      <Input
                        value={r.description}
                        onChange={(e) => updateRow(r.id, "description", e.target.value)}
                        onBlur={() => commit(r.id, "description", original)}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-xs text-muted-foreground">Qty</label>
                      <Input
                        type="number"
                        step="any"
                        min={0}
                        value={r.quantity}
                        onChange={(e) => updateRow(r.id, "quantity", e.target.value)}
                        onBlur={() => commit(r.id, "quantity", original)}
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
                      <label className="text-xs text-muted-foreground">Rate</label>
                      <Input
                        type="number"
                        step="any"
                        min={0}
                        value={r.unit_price}
                        onChange={(e) => updateRow(r.id, "unit_price", e.target.value)}
                        onBlur={() => commit(r.id, "unit_price", original)}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-xs text-muted-foreground">GST %</label>
                      <Input
                        type="number"
                        step="any"
                        min={0}
                        max={100}
                        value={r.tax_pct}
                        onChange={(e) => updateRow(r.id, "tax_pct", e.target.value)}
                        onBlur={() => commit(r.id, "tax_pct", original)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-muted-foreground">Fulfilment</label>
                      <Select
                        value={r.fulfilment ?? "inherit"}
                        onValueChange={(v) => {
                          const val = v === "inherit" ? null : v;
                          updateRow(r.id, "fulfilment", val);
                          commitFulfilment(r.id, val, original);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inherit">Inherit quote</SelectItem>
                          {QUOTE_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {QUOTE_CATEGORY_LABELS[c]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
