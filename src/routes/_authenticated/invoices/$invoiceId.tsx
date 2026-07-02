import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, ExternalLink, Link as LinkIcon, Ban, Plus, Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { AttachmentsPanel, NotesPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { deleteInvoice } from "@/lib/invoices/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Field } from "@/components/forms/Field";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  getInvoice,
  getInvoiceItems,
  getInvoicePaymentLinks,
  getInvoicePayments,
  recordManualPayment,
  setInvoiceStatus,
} from "@/lib/invoices/api";
import { formatInr } from "@/lib/format";
import type { RecordPaymentInput } from "@/lib/invoices/schema";
import type { DbTable } from "@/lib/types";
import { createRazorpayLink, cancelRazorpayLink } from "@/lib/payments/razorpay.functions";

type InvoiceStatus = DbTable<"invoices">["status"];

export const Route = createFileRoute("/_authenticated/invoices/$invoiceId")({
  ssr: false,
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const { invoiceId } = Route.useParams();
  const qc = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);

  const inv = useQuery({ queryKey: qk.invoices.byId(invoiceId), queryFn: () => getInvoice(invoiceId) });
  const items = useQuery({ queryKey: qk.invoices.items(invoiceId), queryFn: () => getInvoiceItems(invoiceId) });
  const payments = useQuery({ queryKey: qk.invoices.payments(invoiceId), queryFn: () => getInvoicePayments(invoiceId) });
  const links = useQuery({ queryKey: qk.invoices.links(invoiceId), queryFn: () => getInvoicePaymentLinks(invoiceId) });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: qk.invoices.byId(invoiceId) });
    qc.invalidateQueries({ queryKey: qk.invoices.payments(invoiceId) });
    qc.invalidateQueries({ queryKey: qk.invoices.links(invoiceId) });
    qc.invalidateQueries({ queryKey: qk.invoices.all });
    qc.invalidateQueries({ queryKey: qk.dashboard });
  };

  const statusMut = useMutation({
    mutationFn: (s: InvoiceStatus) => setInvoiceStatus({ invoice_id: invoiceId, status: s as "draft" | "sent" | "cancelled" | "overdue" }),
    onSuccess: () => { toast.success("Status updated"); invalidateAll(); },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const linkMut = useMutation({
    mutationFn: () => createRazorpayLink({ data: { invoice_id: invoiceId } }),
    onSuccess: (r) => {
      toast.success("Payment link created");
      invalidateAll();
      if (r?.short_url) window.open(r.short_url, "_blank", "noopener");
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelRazorpayLink({ data: { payment_link_id: id } }),
    onSuccess: () => { toast.success("Link cancelled"); invalidateAll(); },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  if (inv.isLoading) return <LoadingBlock />;
  if (inv.error) return <ErrorBlock message={toUserMessage(inv.error)} onRetry={() => inv.refetch()} />;
  if (!inv.data) return <ErrorBlock message="Invoice not found." />;

  const invoice = inv.data;
  const activeLink = (links.data ?? []).find((l) => l.status === "created");
  const balance = Number(invoice.balance_due ?? 0);

  return (
    <div>
      <div className="mb-2">
        <Link to="/invoices" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to invoices
        </Link>
      </div>

      <PageHeader
        title={invoice.invoice_no}
        subtitle={`${invoice.customer?.name ?? "—"} • ${invoice.project?.name ?? "—"}`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => linkMut.mutate()}
              disabled={linkMut.isPending || balance <= 0 || !!activeLink}
              title={activeLink ? "A link is already active" : undefined}
            >
              {linkMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
              Razorpay link
            </Button>
            <Button onClick={() => setPayOpen(true)} disabled={balance <= 0}>
              <Plus className="mr-2 h-4 w-4" /> Record payment
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-1 md:col-span-2">
          <CardHeader><CardTitle className="text-sm">Line items</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Tax %</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(items.data ?? []).map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">{it.description}</TableCell>
                    <TableCell className="text-right">{it.quantity}</TableCell>
                    <TableCell>{it.unit ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatInr(it.unit_price)}</TableCell>
                    <TableCell className="text-right">{it.tax_pct}%</TableCell>
                    <TableCell className="text-right">{formatInr(it.line_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex flex-col items-end gap-1 text-sm">
              <div>Subtotal: <span className="font-medium">{formatInr(invoice.subtotal)}</span></div>
              <div>Tax: <span className="font-medium">{formatInr(invoice.tax_amount)}</span></div>
              <div>Total: <span className="font-medium">{formatInr(invoice.total)}</span></div>
              <div>Paid: <span className="font-medium">{formatInr(invoice.amount_paid)}</span></div>
              <div className="text-base font-semibold">Balance: {formatInr(invoice.balance_due)}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-1">
          <CardHeader><CardTitle className="text-sm">Status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Badge variant="outline" className="capitalize">{invoice.status}</Badge>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Change status</label>
              <Select value={invoice.status} onValueChange={(v) => statusMut.mutate(v as InvoiceStatus)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-muted-foreground">
                Paid/partially_paid are set automatically as payments are recorded.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-1 md:col-span-2">
          <CardHeader><CardTitle className="text-sm">Payments</CardTitle></CardHeader>
          <CardContent>
            {(payments.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.data!.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.payment_no}</TableCell>
                      <TableCell>{new Date(p.paid_at).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell className="capitalize">{p.method.replace("_", " ")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.reference_no ?? p.razorpay_payment_id ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatInr(p.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-1">
          <CardHeader><CardTitle className="text-sm">Payment links</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(links.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No links yet.</p>
            ) : (
              (links.data ?? []).map((l) => (
                <div key={l.id} className="rounded-sm border border-border p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono">{l.link_no}</span>
                    <Badge variant="outline" className="capitalize">{l.status}</Badge>
                  </div>
                  <div className="mt-1">{formatInr(l.amount)}</div>
                  {l.short_url && (
                    <a href={l.short_url} target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-1 text-primary hover:underline">
                      Open link <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {l.status === "created" && (
                    <Button size="sm" variant="ghost" className="mt-1 h-7 w-full"
                      onClick={() => cancelMut.mutate(l.id)} disabled={cancelMut.isPending}>
                      <Ban className="mr-1 h-3 w-3" /> Cancel
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <RecordPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        invoiceId={invoiceId}
        maxAmount={balance}
      />
    </div>
  );
}

function RecordPaymentDialog({
  open, onOpenChange, invoiceId, maxAmount,
}: { open: boolean; onOpenChange: (o: boolean) => void; invoiceId: string; maxAmount: number }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<RecordPaymentInput>({
    invoice_id: invoiceId,
    amount: maxAmount,
    method: "bank_transfer",
    paid_at: null,
    reference_no: null,
    notes: null,
  });

  const mutation = useMutation({
    mutationFn: recordManualPayment,
    onSuccess: () => {
      toast.success("Payment recorded");
      qc.invalidateQueries({ queryKey: qk.invoices.byId(invoiceId) });
      qc.invalidateQueries({ queryKey: qk.invoices.payments(invoiceId) });
      qc.invalidateQueries({ queryKey: qk.invoices.all });
      qc.invalidateQueries({ queryKey: qk.dashboard });
      onOpenChange(false);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const set = <K extends keyof RecordPaymentInput>(k: K, v: RecordPaymentInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(form);
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Amount (INR)" required hint={`Balance: ${formatInr(maxAmount)}`}>
              <Input type="number" step="0.01" value={form.amount}
                onChange={(e) => set("amount", Number(e.target.value))} required />
            </Field>
            <Field label="Method" required>
              <Select value={form.method} onValueChange={(v) => set("method", v as RecordPaymentInput["method"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="upi_manual">UPI (manual)</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Paid on">
              <Input type="date" value={form.paid_at ?? ""}
                onChange={(e) => set("paid_at", e.target.value || null)} />
            </Field>
            <Field label="Reference no.">
              <Input value={form.reference_no ?? ""}
                onChange={(e) => set("reference_no", e.target.value || null)} />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea rows={2} value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
