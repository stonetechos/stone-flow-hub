import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getInvoice, updateInvoice } from "@/lib/invoices/api";
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
