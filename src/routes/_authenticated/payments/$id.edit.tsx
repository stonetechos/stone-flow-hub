import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/layout/States";
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
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getPayment, updatePayment } from "@/lib/payments/crud";
import { PAYMENT_METHODS, type PaymentCreateInput } from "@/lib/payments/schema";
import { listInvoices } from "@/lib/invoices/api";
import { invalidatePayment } from "@/lib/query-invalidation";

export const Route = createFileRoute("/_authenticated/payments/$id/edit")({
  ssr: false,
  component: EditPaymentPage,
});

function EditPaymentPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: qk.paymentsAll.byId(id), queryFn: () => getPayment(id) });
  const invoices = useQuery({ queryKey: qk.invoices.list(""), queryFn: () => listInvoices() });

  const [form, setForm] = useState<PaymentCreateInput | null>(null);
  useEffect(() => {
    if (query.data) {
      const r = query.data;
      setForm({
        invoice_id: r.invoice_id,
        amount: Number(r.amount),
        method: r.method,
        paid_at: r.paid_at.slice(0, 10),
        reference_no: r.reference_no,
        notes: r.notes,
      });
    }
  }, [query.data]);

  const mut = useMutation({
    mutationFn: (input: PaymentCreateInput) => updatePayment(id, input),
    onSuccess: () => {
      toast.success("Payment updated");
      invalidatePayment(qc, id);
      nav({ to: "/payments/$id", params: { id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (query.isLoading || !form) return <LoadingBlock />;
  if (query.error) return <ErrorBlock message={toUserMessage(query.error)} />;

  const set = <K extends keyof PaymentCreateInput>(k: K, v: PaymentCreateInput[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div>
      <PageHeader title={`Edit ${query.data?.payment_no ?? ""}`} />
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
                <SelectValue />
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
                  <SelectItem key={m} value={m} className="capitalize">
                    {m.replace(/_/g, " ")}
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
          <Button
            type="button"
            variant="ghost"
            onClick={() => nav({ to: "/payments/$id", params: { id } })}
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
