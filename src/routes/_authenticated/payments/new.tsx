import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { EntityPicker } from "@/components/forms/EntityPicker";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { createPayment } from "@/lib/payments/crud";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentCreateInput,
} from "@/lib/payments/schema";
import { listInvoices } from "@/lib/invoices/api";
import { createReceipt } from "@/lib/receipts/api";
import { RECEIPT_METHODS, RECEIPT_METHOD_LABELS } from "@/lib/receipts/schema";
import { invalidatePayment, invalidateReceipt } from "@/lib/query-invalidation";

const searchSchema = z.object({
  invoice: z.string().uuid().optional(),
  customer: z.string().uuid().optional(),
  mode: z.enum(["invoice", "advance"]).optional(),
});

export const Route = createFileRoute("/_authenticated/payments/new")({
  ssr: false,
  validateSearch: (s) => searchSchema.parse(s),
  component: NewPaymentPage,
});

type Mode = "invoice" | "advance";

function NewPaymentPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const params = Route.useSearch();
  const [mode, setMode] = useState<Mode>(params.mode ?? (params.customer && !params.invoice ? "advance" : "invoice"));

  return (
    <div>
      <PageHeader
        title="New payment"
        subtitle="Record a payment against an invoice, or record an advance payment before invoicing."
      />

      <div className="mb-4 rounded-md border border-border bg-card p-4 shadow-1">
        <div className="mb-2 text-sm font-medium">Payment type</div>
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as Mode)}
          className="flex flex-col gap-2 md:flex-row md:gap-6"
        >
          <div className="flex items-start gap-2">
            <RadioGroupItem value="invoice" id="mode-invoice" className="mt-1" />
            <Label htmlFor="mode-invoice" className="cursor-pointer">
              <div className="text-sm font-medium">Payment against invoice</div>
              <div className="text-xs text-muted-foreground">Link the payment to a specific invoice.</div>
            </Label>
          </div>
          <div className="flex items-start gap-2">
            <RadioGroupItem value="advance" id="mode-advance" className="mt-1" />
            <Label htmlFor="mode-advance" className="cursor-pointer">
              <div className="text-sm font-medium">Advance payment received</div>
              <div className="text-xs text-muted-foreground">
                Record a customer payment without an invoice. Updates the customer ledger and stays available for future allocation.
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {mode === "invoice" ? (
        <InvoicePaymentForm
          initialInvoiceId={params.invoice ?? ""}
          onCancel={() => nav({ to: "/payments" })}
          onCreated={(id) => nav({ to: "/payments/$id", params: { id } })}
        />
      ) : (
        <AdvanceReceiptForm
          initialCustomerId={params.customer ?? null}
          onCancel={() => nav({ to: "/payments" })}
          onCreated={(receiptId) => nav({ to: "/receipts/$receiptId", params: { receiptId } })}
        />
      )}
    </div>
  );

  function InvoicePaymentForm({
    initialInvoiceId,
    onCancel,
    onCreated,
  }: {
    initialInvoiceId: string;
    onCancel: () => void;
    onCreated: (id: string) => void;
  }) {
    const invoices = useQuery({ queryKey: qk.invoices.list(""), queryFn: () => listInvoices() });
    const [form, setForm] = useState<PaymentCreateInput>({
      invoice_id: initialInvoiceId,
      amount: 0,
      method: "bank_transfer",
      paid_at: new Date().toISOString().slice(0, 10),
      reference_no: null,
      notes: null,
    });
    const set = <K extends keyof PaymentCreateInput>(k: K, v: PaymentCreateInput[K]) =>
      setForm((f) => ({ ...f, [k]: v }));

    useEffect(() => {
      if (!form.invoice_id || form.amount) return;
      const match = (invoices.data ?? []).find((i) => i.id === form.invoice_id);
      if (match?.balance_due) set("amount", Number(match.balance_due));
       
    }, [form.invoice_id, invoices.data]);

    const mut = useMutation({
      mutationFn: createPayment,
      onSuccess: (row) => {
        toast.success(`Payment ${row.payment_no} recorded`);
        invalidatePayment(qc, row.id, row.invoice_id);
        onCreated(row.id);
      },
      onError: (e) => toast.error(toUserMessage(e)),
    });

    return (
      <QuickForm
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate(form);
        }}
        busy={mut.isPending}
      >
        <QuickForm.QuickFill>
          <Field label="Invoice" required>
            <Select value={form.invoice_id} onValueChange={(v) => set("invoice_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select invoice" />
              </SelectTrigger>
              <SelectContent>
                {(invoices.data ?? []).map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.invoice_no}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Amount" required>
            <Input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={form.amount ? form.amount : ""}
              onChange={(e) => set("amount", e.target.value === "" ? 0 : Number(e.target.value))}
              required
            />
          </Field>
        </QuickForm.QuickFill>

        <QuickForm.MoreDetails>
          <Field label="Method">
            <Select
              value={form.method}
              onValueChange={(v) => set("method", v as PaymentCreateInput["method"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Paid at" required>
            <Input
              type="date"
              value={form.paid_at.slice(0, 10)}
              onChange={(e) => set("paid_at", e.target.value)}
              required
            />
          </Field>
          <Field label="Reference #">
            <Input
              value={form.reference_no ?? ""}
              onChange={(e) => set("reference_no", e.target.value || null)}
            />
          </Field>
        </QuickForm.MoreDetails>

        <QuickForm.Advanced>
          <Field label="Notes" className="md:col-span-2">
            <Textarea
              rows={3}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
            />
          </Field>
        </QuickForm.Advanced>

        <QuickForm.Actions>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={mut.isPending || !form.invoice_id || form.amount <= 0}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Record
          </Button>
        </QuickForm.Actions>
      </QuickForm>
    );
  }

  function AdvanceReceiptForm({
    initialCustomerId,
    onCancel,
    onCreated,
  }: {
    initialCustomerId: string | null;
    onCancel: () => void;
    onCreated: (receiptId: string) => void;
  }) {
    const [customerId, setCustomerId] = useState<string | null>(initialCustomerId);
    const [amount, setAmount] = useState<number>(0);
    const [method, setMethod] = useState<(typeof RECEIPT_METHODS)[number]>("bank_transfer");
    const [receivedAt, setReceivedAt] = useState<string>(new Date().toISOString().slice(0, 10));
    const [referenceNo, setReferenceNo] = useState("");
    const [notes, setNotes] = useState("");

    const mut = useMutation({
      mutationFn: () =>
        createReceipt({
          customer_id: customerId!,
          received_at: receivedAt,
          amount,
          method,
          reference_no: referenceNo || null,
          remarks: notes || null,
          tds_amount: 0,
          bank_charges: 0,
          allocations: [],
        }),
      onSuccess: (row) => {
        toast.success(`Advance ${row.receipt_no} recorded`);
        invalidateReceipt(qc, row.id, customerId ?? undefined);
        onCreated(row.id);
      },
      onError: (e) => toast.error(toUserMessage(e)),
    });

    const canSave = !!customerId && amount > 0 && !!receivedAt;

    return (
      <QuickForm
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave) mut.mutate();
        }}
        busy={mut.isPending}
      >
        <QuickForm.QuickFill>
          <Field label="Customer" required>
            <EntityPicker type="customer" value={customerId} onChange={setCustomerId} />
          </Field>
          <Field label="Amount" required>
            <Input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={amount ? amount : ""}
              onChange={(e) => setAmount(e.target.value === "" ? 0 : Number(e.target.value))}
              required
            />
          </Field>
        </QuickForm.QuickFill>

        <QuickForm.MoreDetails>
          <Field label="Payment mode">
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
          <Field label="Payment date" required>
            <Input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} required />
          </Field>
          <Field label="Reference #">
            <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="UTR / Cheque / Txn ID" />
          </Field>
        </QuickForm.MoreDetails>

        <QuickForm.Advanced>
          <Field label="Notes" className="md:col-span-2">
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </QuickForm.Advanced>

        <QuickForm.Actions>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={mut.isPending || !canSave}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Record advance
          </Button>
        </QuickForm.Actions>
      </QuickForm>
    );
  }
}
