import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { RowActions } from "@/components/data/RowActions";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { createQuote, deleteQuote, listQuotes, type QuoteListItem } from "@/lib/quotes/api";
import { quoteItemInputSchema, type QuoteItemInput } from "@/lib/quotes/schema";
import { listProjectsForPicker } from "@/lib/projects/api";
import { formatInr } from "@/lib/format";

const search = z.object({
  new: z.string().optional(),
  project: z.string().uuid().optional(),
  enquiry: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/quotes/")({
  ssr: false,
  validateSearch: (s) => search.parse(s),
  component: QuotesPage,
});

function QuotesPage() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<QuoteListItem | null>(null);
  const params = Route.useSearch();
  const nav = useNavigate();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: qk.quotes.list(q), queryFn: () => listQuotes(q) });
  const del = useMutation({
    mutationFn: (id: string) => deleteQuote(id),
    onSuccess: () => { toast.success("Quote deleted"); qc.invalidateQueries({ queryKey: qk.quotes.all }); setToDelete(null); },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const rows = (query.data ?? []).filter((r) => statusFilter === "all" || r.status === statusFilter);

  useEffect(() => {
    if (params.new) {
      setOpen(true);
    }
  }, [params.new]);

  return (
    <div>
      <PageHeader
        title="Quotes"
        subtitle="Send priced offers, then convert to invoice."
        actions={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> New quote</Button>}
      />
      <div className="mb-3 flex items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by quote no…" className="max-w-md" />
      </div>

      {query.isLoading ? (
        <LoadingBlock />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No quotes yet"
          message="Create your first quote from a project."
          action={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> New quote</Button>}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data!.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">
                    <Link to="/quotes/$quoteId" params={{ quoteId: r.id }} className="text-primary hover:underline">
                      {r.quote_no}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{r.project?.name ?? "—"}</TableCell>
                  <TableCell>{r.customer?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{r.status}</Badge></TableCell>
                  <TableCell className="text-right">{formatInr(r.total)}</TableCell>
                  <TableCell>{r.valid_until ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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

type FormItem = QuoteItemInput & { key: string };

function emptyItem(): FormItem {
  return {
    key: Math.random().toString(36).slice(2),
    product_id: null,
    description: "",
    quantity: 1,
    unit: "sqft",
    unit_price: 0,
    tax_pct: 18,
  };
}

function CreateQuoteDialog({
  open, onOpenChange, initialProjectId, initialEnquiryId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialProjectId: string | null;
  initialEnquiryId: string | null;
}) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const projects = useQuery({ queryKey: qk.projects.list(""), queryFn: listProjectsForPicker });

  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [items, setItems] = useState<FormItem[]>([emptyItem()]);

  useEffect(() => {
    if (open) {
      setProjectId(initialProjectId ?? "");
      setValidUntil("");
      setNotes("");
      setTerms("");
      setItems([emptyItem()]);
    }
  }, [open, initialProjectId]);

  const totals = useMemo(() => {
    let sub = 0, tax = 0;
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
      qc.invalidateQueries({ queryKey: qk.quotes.all });
      qc.invalidateQueries({ queryKey: qk.dashboard });
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
      const r = quoteItemInputSchema.safeParse(it);
      if (!r.success) return toast.error(r.error.issues[0]?.message ?? "Invalid line item");
      parsedItems.push(r.data);
    }
    mutation.mutate({
      project_id: projectId,
      enquiry_id: initialEnquiryId,
      valid_until: validUntil || null,
      notes: notes || null,
      terms: terms || null,
      items: parsedItems,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>New quote</DialogTitle></DialogHeader>
        <QuickForm onSubmit={onSubmit} busy={mutation.isPending}>
          <QuickForm.QuickFill>
            <Field label="Project" required className="md:col-span-2">
              <Select value={projectId} onValueChange={setProjectId} disabled={!!initialProjectId}>
                <SelectTrigger><SelectValue placeholder={projects.isLoading ? "Loading…" : "Select project"} /></SelectTrigger>
                <SelectContent>
                  {(projects.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.customer?.name ?? "no customer"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="md:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium">Line items</label>
                <Button type="button" variant="ghost" size="sm" onClick={() => setItems((p) => [...p, emptyItem()])}>
                  <Plus className="mr-1 h-3 w-3" /> Add line
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.key} className="grid grid-cols-12 gap-2 rounded-sm border border-border bg-background p-2">
                    <Input className="col-span-5" placeholder="Description" value={it.description}
                      onChange={(e) => updateItem(it.key, { description: e.target.value })} />
                    <Input className="col-span-1" type="number" step="0.01" placeholder="Qty" value={it.quantity}
                      onChange={(e) => updateItem(it.key, { quantity: Number(e.target.value) })} />
                    <Input className="col-span-1" placeholder="Unit" value={it.unit ?? ""}
                      onChange={(e) => updateItem(it.key, { unit: e.target.value })} />
                    <Input className="col-span-2" type="number" step="0.01" placeholder="Rate" value={it.unit_price}
                      onChange={(e) => updateItem(it.key, { unit_price: Number(e.target.value) })} />
                    <Input className="col-span-2" type="number" step="0.01" placeholder="Tax %" value={it.tax_pct}
                      onChange={(e) => updateItem(it.key, { tax_pct: Number(e.target.value) })} />
                    <Button type="button" variant="ghost" size="icon" className="col-span-1"
                      onClick={() => removeItem(it.key)} disabled={items.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-end gap-6 text-sm">
                <div>Subtotal: <span className="font-medium">{formatInr(totals.sub)}</span></div>
                <div>Tax: <span className="font-medium">{formatInr(totals.tax)}</span></div>
                <div className="font-semibold">Total: {formatInr(totals.total)}</div>
              </div>
            </div>
          </QuickForm.QuickFill>

          <QuickForm.MoreDetails>
            <Field label="Valid until">
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
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
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create quote
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}
