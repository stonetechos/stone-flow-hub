import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput, PercentInput } from "@/components/forms/inputs/SmartInputs";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  addInvoiceItem,
  deleteInvoiceItem,
  getInvoice,
  getInvoiceItems,
  updateInvoice,
  updateInvoiceItem,
  type InvoiceItemPatch,
  type InvoiceItemRow,
} from "@/lib/invoices/api";
import type { InvoiceUpdateInput } from "@/lib/invoices/schema";
import { invalidateInvoice } from "@/lib/query-invalidation";

export const Route = createFileRoute("/_authenticated/invoices/$invoiceId/edit")({
  ssr: false,
  component: EditInvoicePage,
});

function EditInvoicePage() {
  const { invoiceId } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.invoices.byId(invoiceId),
    queryFn: () => getInvoice(invoiceId),
  });
  const [form, setForm] = useState<InvoiceUpdateInput>({
    due_date: null,
    notes: null,
    terms: null,
  });

  useEffect(() => {
    if (query.data) {
      setForm({
        due_date: query.data.due_date ?? null,
        notes: query.data.notes ?? null,
        terms: query.data.terms ?? null,
      });
    }
  }, [query.data]);

  const set = <K extends keyof InvoiceUpdateInput>(k: K, v: InvoiceUpdateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () => updateInvoice(invoiceId, form),
    onSuccess: () => {
      toast.success("Invoice updated");
      invalidateInvoice(qc, invoiceId);
      nav({ to: "/invoices/$invoiceId", params: { invoiceId } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (query.isLoading) return <LoadingBlock />;
  if (query.error)
    return <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />;
  if (!query.data) return <ErrorBlock message="Invoice not found." />;

  return (
    <div>
      <PageHeader
        title={`Edit ${query.data.invoice_no}`}
        subtitle="Update invoice metadata."
        actions={
          <Button
            variant="ghost"
            onClick={() => nav({ to: "/invoices/$invoiceId", params: { invoiceId } })}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        }
      />
      <InvoiceLineItemsEditor invoiceId={invoiceId} />

      <QuickForm
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
        busy={mut.isPending}
      >
        <QuickForm.QuickFill>
          <Field label="Due date">
            <Input
              type="date"
              value={form.due_date ?? ""}
              onChange={(e) => set("due_date", e.target.value || null)}
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
            onClick={() => nav({ to: "/invoices/$invoiceId", params: { invoiceId } })}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
          </Button>
        </QuickForm.Actions>
      </QuickForm>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Invoice Line Items Editor                                          */
/* ------------------------------------------------------------------ */

type InvoiceDraftRow = {
  id: string;
  description: string;
  quantity: string;
  unit: string | null;
  unit_price: string;
  tax_pct: string;
  hsn_sac: string;
};

function toInvoiceDraft(row: InvoiceItemRow): InvoiceDraftRow {
  const anyRow = row as unknown as { hsn_sac?: string | null };
  return {
    id: row.id,
    description: row.description ?? "",
    quantity: String(row.quantity ?? ""),
    unit: row.unit ?? null,
    unit_price: String(row.unit_price ?? ""),
    tax_pct: String(row.tax_pct ?? ""),
    hsn_sac: anyRow.hsn_sac ?? "",
  };
}

function InvoiceLineItemsEditor({ invoiceId }: { invoiceId: string }) {
  const qc = useQueryClient();
  const itemsQuery = useQuery({
    queryKey: qk.invoices.items(invoiceId),
    queryFn: () => getInvoiceItems(invoiceId),
  });

  const [rows, setRows] = useState<InvoiceDraftRow[]>([]);
  useEffect(() => {
    if (!itemsQuery.data) return;
    setRows((prev) => {
      const serverIds = itemsQuery.data.map((r) => r.id);
      const prevIds = prev.map((r) => r.id);
      const idsChanged =
        serverIds.length !== prevIds.length || serverIds.some((id, i) => id !== prevIds[i]);
      if (idsChanged) return itemsQuery.data.map(toInvoiceDraft);
      const byId = new Map(prev.map((r) => [r.id, r]));
      return itemsQuery.data.map((server) => byId.get(server.id) ?? toInvoiceDraft(server));
    });
  }, [itemsQuery.data]);

  const invalidate = () => {
    invalidateInvoice(qc, invoiceId);
    qc.invalidateQueries({ queryKey: qk.invoices.items(invoiceId) });
  };

  const addMut = useMutation({
    mutationFn: () =>
      addInvoiceItem(invoiceId, {
        description: "New line",
        quantity: 1,
        unit_price: 0,
        tax_pct: 0,
        hsn_sac: null,
      }),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteInvoiceItem(id),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const patchMut = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: InvoiceItemPatch }) =>
      updateInvoiceItem(id, patch),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const updateRow = (id: string, key: keyof InvoiceDraftRow, value: string | null) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

  const commit = (id: string, key: keyof InvoiceDraftRow, original: InvoiceItemRow | undefined) => {
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
    }
  };

  const originalsById = useMemo(() => {
    const map = new Map<string, InvoiceItemRow>();
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
            {rows.map((r) => {
              const original = originalsById.get(r.id);
              return (
                <div key={r.id} className="rounded-md border border-border p-3">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                    <div className="md:col-span-4">
                      <label className="text-xs text-muted-foreground">Description</label>
                      <Input
                        value={r.description}
                        onChange={(e) => updateRow(r.id, "description", e.target.value)}
                        onBlur={() => commit(r.id, "description", original)}
                      />
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
                    <div className="md:col-span-1">
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
                      <label className="text-xs text-muted-foreground">Rate</label>
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
                      <PercentInput
                        value={r.tax_pct}
                        onChange={(val) => updateRow(r.id, "tax_pct", val)}
                        onBlur={() => commit(r.id, "tax_pct", original)}
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => delMut.mutate(r.id)}
                        disabled={delMut.isPending || rows.length === 1}
                        aria-label="Delete line item"
                      >
                        <Trash2 className="h-4 w-4" />
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
