import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { createPayment } from "@/lib/payments/crud";
import { PAYMENT_METHODS, type PaymentCreateInput } from "@/lib/payments/schema";
import { listInvoices } from "@/lib/invoices/api";

export const Route = createFileRoute("/_authenticated/payments/new")({
  ssr: false,
  component: NewPaymentPage,
});

function NewPaymentPage() {
  const nav = useNavigate();
  const invoices = useQuery({ queryKey: qk.invoices.list(""), queryFn: () => listInvoices() });

  const [form, setForm] = useState<PaymentCreateInput>({
    invoice_id: "", amount: 0, method: "bank_transfer",
    paid_at: new Date().toISOString().slice(0, 10),
    reference_no: null, notes: null,
  });
  const set = <K extends keyof PaymentCreateInput>(k: K, v: PaymentCreateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: createPayment,
    onSuccess: (row) => { toast.success(`Payment ${row.payment_no} recorded`); nav({ to: "/payments/$id", params: { id: row.id } }); },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <div>
      <PageHeader title="New payment" subtitle="Record a payment received." />
      <QuickForm onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }} busy={mut.isPending}>
        <QuickForm.QuickFill>
          <Field label="Invoice" required>
            <Select value={form.invoice_id} onValueChange={(v) => set("invoice_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
              <SelectContent>
                {(invoices.data ?? []).map((i) => <SelectItem key={i.id} value={i.id}>{i.invoice_no}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Amount" required>
            <Input type="number" min={0} step="0.01" value={form.amount}
              onChange={(e) => set("amount", Number(e.target.value))} required />
          </Field>
        </QuickForm.QuickFill>

        <QuickForm.MoreDetails>
          <Field label="Method">
            <Select value={form.method} onValueChange={(v) => set("method", v as PaymentCreateInput["method"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m} className="capitalize">{m.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Paid at" required>
            <Input type="date" value={form.paid_at.slice(0, 10)}
              onChange={(e) => set("paid_at", e.target.value)} required />
          </Field>
          <Field label="Reference #">
            <Input value={form.reference_no ?? ""} onChange={(e) => set("reference_no", e.target.value || null)} />
          </Field>
        </QuickForm.MoreDetails>

        <QuickForm.Advanced>
          <Field label="Notes" className="md:col-span-2">
            <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} />
          </Field>
        </QuickForm.Advanced>

        <QuickForm.Actions>
          <Button type="button" variant="ghost" onClick={() => nav({ to: "/payments" })}>Cancel</Button>
          <Button type="submit" disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Record
          </Button>
        </QuickForm.Actions>
      </QuickForm>
    </div>
  );
}
