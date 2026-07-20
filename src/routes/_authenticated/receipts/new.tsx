import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Field } from "@/components/forms/Field";
import {
  FormLayout,
  FormSection,
  FormGrid,
  FormActions,
  FormSummary,
  FormSummaryRow,
} from "@/components/forms/FormLayout";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { createReceipt, listOpenInvoicesForCustomer } from "@/lib/receipts/api";
import { RECEIPT_METHODS, RECEIPT_METHOD_LABELS } from "@/lib/receipts/schema";
import { invalidateReceipt } from "@/lib/query-invalidation";
import { formatInr, formatDate } from "@/lib/format";

const search = z.object({
  customer: z.string().uuid().optional(),
  invoice: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/receipts/new")({
  ssr: false,
  validateSearch: (s) => search.parse(s),
  component: NewReceiptPage,
});

type AllocRow = { invoice_id: string; amount: number; invoice_no: string; balance_due: number };

function NewReceiptPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const preset = Route.useSearch();

  const [customerId, setCustomerId] = useState<string | null>(preset.customer ?? null);
  const [receivedAt, setReceivedAt] = useState<string>(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<(typeof RECEIPT_METHODS)[number]>("bank_transfer");
  const [bankName, setBankName] = useState("");
  const [accountUsed, setAccountUsed] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [tds, setTds] = useState<number>(0);
  const [charges, setCharges] = useState<number>(0);
  const [remarks, setRemarks] = useState("");
  const [allocations, setAllocations] = useState<AllocRow[]>([]);

  const invoicesQuery = useQuery({
    queryKey: customerId
      ? qk.receipts.openInvoices(customerId)
      : ["receipts", "openInvoices", "none"],
    queryFn: () => listOpenInvoicesForCustomer(customerId!),
    enabled: !!customerId,
  });

  // Preselect the invoice + amount when we arrived from an invoice detail
  // page via `?invoice=…`. Fires once, when the invoice list resolves.
  useEffect(() => {
    if (!preset.invoice || !invoicesQuery.data) return;
    if (allocations.some((a) => a.invoice_id === preset.invoice)) return;
    const inv = invoicesQuery.data.find((i) => i.id === preset.invoice);
    if (!inv) return;
    const balance = Number(inv.balance_due) || 0;
    setAllocations((prev) => [
      ...prev,
      { invoice_id: inv.id, amount: balance, invoice_no: inv.invoice_no, balance_due: balance },
    ]);
    if (amount === 0) setAmount(balance);
    // Only run once per (customer, invoice) preset combo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoicesQuery.data, preset.invoice]);

  const net = Math.max(0, amount - tds - charges);
  const alloc = useMemo(
    () => allocations.reduce((s, a) => s + Number(a.amount || 0), 0),
    [allocations],
  );
  const unallocated = net - alloc;
  const overAllocated = alloc > net + 0.01;

  const mut = useMutation({
    mutationFn: () =>
      createReceipt({
        customer_id: customerId!,
        received_at: receivedAt,
        amount,
        method,
        bank_name: bankName || null,
        account_used: accountUsed || null,
        reference_no: referenceNo || null,
        cheque_no: chequeNo || null,
        cheque_date: chequeDate || null,
        tds_amount: tds,
        bank_charges: charges,
        remarks: remarks || null,
        allocations: allocations
          .map((a) => ({ invoice_id: a.invoice_id, amount: a.amount }))
          .filter((a) => a.amount > 0),
      }),
    onSuccess: (r) => {
      toast.success(`Receipt ${r.receipt_no} created`);
      invalidateReceipt(qc, r.id, customerId ?? undefined);
      nav({ to: "/receipts/$receiptId", params: { receiptId: r.id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  function toggleInvoice(inv: { id: string; invoice_no: string; balance_due: number }) {
    setAllocations((prev) => {
      if (prev.some((p) => p.invoice_id === inv.id))
        return prev.filter((p) => p.invoice_id !== inv.id);
      const remaining = Math.max(0, net - prev.reduce((s, a) => s + a.amount, 0));
      const suggested = Math.min(Number(inv.balance_due), remaining);
      return [
        ...prev,
        {
          invoice_id: inv.id,
          amount: suggested,
          invoice_no: inv.invoice_no,
          balance_due: Number(inv.balance_due),
        },
      ];
    });
  }

  const canSave = !!customerId && amount > 0 && !overAllocated && !!method && !!receivedAt;
  const hint = overAllocated
    ? "Allocations exceed the net receipt amount."
    : !customerId
      ? "Select a customer to begin."
      : amount <= 0
        ? "Enter a receipt amount greater than zero."
        : unallocated > 0
          ? `${formatInr(unallocated)} will be saved as an unallocated advance.`
          : null;

  return (
    <div>
      <PageHeader
        title="New receipt"
        subtitle="Record a customer receipt. Leave allocations empty to save it as an unallocated advance."
        actions={
          <Button variant="ghost" size="sm" onClick={() => nav({ to: "/receipts" })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        }
      />

      <FormLayout
        busy={mut.isPending}
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave) mut.mutate();
        }}
      >
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-10 md:col-span-2">
            <FormSection
              title="Receipt information"
              description="Who paid, how much, and when it was received."
            >
              <FormGrid>
                <Field label="Customer" required>
                  <EntityPicker
                    type="customer"
                    value={customerId}
                    onChange={(id) => {
                      setCustomerId(id);
                      setAllocations([]);
                    }}
                  />
                </Field>
                <Field label="Received on" required>
                  <Input
                    type="date"
                    value={receivedAt}
                    onChange={(e) => setReceivedAt(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Amount" required>
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                  />
                </Field>
                <Field label="Method" required>
                  <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECEIPT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {RECEIPT_METHOD_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FormGrid>
            </FormSection>

            <FormSection
              title="Bank & reference"
              description="Optional — used for reconciliation and audit."
            >
              <FormGrid>
                <Field label="Bank name">
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank"
                  />
                </Field>
                <Field label="Account used">
                  <Input
                    value={accountUsed}
                    onChange={(e) => setAccountUsed(e.target.value)}
                    placeholder="e.g. Current A/c 12345"
                  />
                </Field>
                <Field label="UTR / Transaction #">
                  <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
                </Field>
                <Field label="Cheque #">
                  <Input value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} />
                </Field>
                <Field label="Cheque date">
                  <Input
                    type="date"
                    value={chequeDate}
                    onChange={(e) => setChequeDate(e.target.value)}
                  />
                </Field>
              </FormGrid>
            </FormSection>

            <FormSection
              title="Deductions"
              description="TDS and bank charges reduce the net amount available for allocation."
            >
              <FormGrid>
                <Field label="TDS deducted">
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={tds || ""}
                    onChange={(e) => setTds(Number(e.target.value) || 0)}
                  />
                </Field>
                <Field label="Bank charges">
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={charges || ""}
                    onChange={(e) => setCharges(Number(e.target.value) || 0)}
                  />
                </Field>
                <Field label="Remarks" className="md:col-span-2">
                  <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </Field>
              </FormGrid>
            </FormSection>

            <FormSection
              title="Allocate to open invoices"
              description="Select invoices to settle. Anything unallocated stays on the customer ledger as an advance."
            >
              {!customerId ? (
                <p className="py-6 text-sm text-muted-foreground">
                  Select a customer to view open invoices.
                </p>
              ) : invoicesQuery.isLoading ? (
                <p className="py-6 text-sm text-muted-foreground">Loading open invoices…</p>
              ) : (invoicesQuery.data ?? []).length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  No open invoices — this receipt will be saved as an unallocated advance.
                </p>
              ) : (
                <div className="rounded-md border border-border/60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Issued</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right">Allocate</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(invoicesQuery.data ?? []).map((inv) => {
                        const row = allocations.find((a) => a.invoice_id === inv.id);
                        return (
                          <TableRow key={inv.id}>
                            <TableCell className="font-mono text-xs">{inv.invoice_no}</TableCell>
                            <TableCell className="text-sm">{formatDate(inv.issue_date)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatInr(inv.total)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatInr(inv.balance_due)}
                            </TableCell>
                            <TableCell className="text-right">
                              {row ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  inputMode="decimal"
                                  className="ml-auto w-32 text-right tabular-nums"
                                  value={row.amount}
                                  onChange={(e) =>
                                    setAllocations((prev) =>
                                      prev.map((p) =>
                                        p.invoice_id === inv.id
                                          ? { ...p, amount: Number(e.target.value) }
                                          : p,
                                      ),
                                    )
                                  }
                                />
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleInvoice(inv as never)}
                                >
                                  Allocate
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>
                              {row && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Remove allocation for ${inv.invoice_no}`}
                                  onClick={() => toggleInvoice(inv as never)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </FormSection>
          </div>

          <div className="md:sticky md:top-4 md:self-start">
            <FormSummary>
              <FormSummaryRow label="Gross amount" value={formatInr(amount)} />
              <FormSummaryRow label="Less: TDS" value={formatInr(-tds)} tone="muted" />
              <FormSummaryRow label="Less: Bank charges" value={formatInr(-charges)} tone="muted" />
              <div className="my-1 border-t border-border/60" />
              <FormSummaryRow label="Net" value={formatInr(net)} emphasis />
              <div className="my-1 border-t border-border/60" />
              <FormSummaryRow label="Allocated" value={formatInr(alloc)} />
              <FormSummaryRow
                label="Unallocated advance"
                value={formatInr(unallocated)}
                emphasis={unallocated > 0}
                tone={overAllocated ? "warning" : unallocated > 0 ? "positive" : "default"}
              />
            </FormSummary>
          </div>
        </div>

        <FormActions
          busy={mut.isPending}
          hint={hint}
          secondary={
            <Button type="button" variant="ghost" onClick={() => nav({ to: "/receipts" })}>
              Cancel
            </Button>
          }
          primary={
            <Button type="submit" disabled={!canSave || mut.isPending}>
              <Save className="mr-2 h-4 w-4" /> Save receipt
            </Button>
          }
        />
      </FormLayout>
    </div>
  );
}
