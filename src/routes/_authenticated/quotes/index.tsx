import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { RowActions } from "@/components/data/RowActions";
import { SafeDeleteDialog } from "@/components/mdm/SafeDeleteDialog";
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
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const params = Route.useSearch();
  const [statusFilter, setStatusFilter] = useState<string>(params.status ?? "all");
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<QuoteListItem | null>(null);
  const nav = useNavigate();
  const qc = useQueryClient();
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
  const rows = (query.data ?? []).filter(
    (r) => statusFilter === "all" || r.status === statusFilter,
  );

  useEffect(() => {
    if (params.new) {
      setOpen(true);
    }
  }, [params.new]);
  useEffect(() => {
    if (params.status && params.status !== statusFilter) {
      setStatusFilter(params.status);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.status]);


  return (
    <div>
      <PageHeader
        title="Quotes"
        subtitle="Send priced offers, then convert to invoice."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New quote
          </Button>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by quote no…"
          className="max-w-md"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
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
      </div>

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No quotes yet"
          message="Create your first quote from a project."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New quote
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border border-border bg-card shadow-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
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
                  <TableCell className="font-medium">{r.project?.name ?? "—"}</TableCell>
                  <TableCell>{r.customer?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatInr(r.total)}</TableCell>
                  <TableCell>{r.valid_until ?? "—"}</TableCell>
                  <TableCell>
                    <RowActions
                      onEdit={() => nav({ to: "/quotes/$quoteId/edit", params: { quoteId: r.id } })}
                      onDelete={() => setToDelete(r)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
  const [category, setCategory] = useState<QuoteCategory | "">("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [items, setItems] = useState<FormItem[]>([emptyItem("")]);

  useEffect(() => {
    if (open) {
      setProjectId(initialProjectId ?? "");
      setCategory("");
      setValidUntil("");
      setNotes("");
      setTerms("");
      setItems([emptyItem("")]);
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
    if (!projectId) return toast.error("Pick a project");
    const parsedItems: QuoteItemInput[] = [];
    for (const it of items) {
      const r = quoteItemInputSchema.safeParse({
        product_id: it.product_id,
        description: it.description,
        quantity: it.quantity,
        unit: it.unit,
        unit_price: it.unit_price === "" ? 0 : it.unit_price,
        tax_pct: it.tax_pct === "" ? 0 : it.tax_pct,
        fulfilment: it.fulfilment || null,
      });
      if (!r.success) return toast.error(r.error.issues[0]?.message ?? "Invalid line item");
      parsedItems.push(r.data);
    }
    mutation.mutate({
      project_id: projectId,
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>New quote</DialogTitle>
        </DialogHeader>
        <QuickForm onSubmit={onSubmit} busy={mutation.isPending}>
          <QuickForm.QuickFill>
            <Field label="Project" required className="md:col-span-2">
              <EntityPicker
                type="project"
                value={projectId || null}
                onChange={(id) => setProjectId(id ?? "")}
                disabled={!!initialProjectId}
              />
            </Field>

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
                    <LineField label="Description" className="col-span-12 md:col-span-4">
                      <Input
                        placeholder="e.g. Monsoon Black Crazy"
                        value={it.description}
                        onChange={(e) => updateItem(it.key, { description: e.target.value })}
                      />
                    </LineField>
                    <LineField label="Quantity" className="col-span-6 md:col-span-1">
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        value={it.quantity}
                        onChange={(e) => updateItem(it.key, { quantity: e.target.value })}
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
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        value={it.unit_price}
                        onChange={(e) => updateItem(it.key, { unit_price: e.target.value })}
                      />
                    </LineField>
                    <LineField label="GST %" className="col-span-6 md:col-span-1">
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        value={it.tax_pct}
                        onChange={(e) => updateItem(it.key, { tax_pct: e.target.value })}
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
            <Button type="submit" disabled={mutation.isPending}>
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
