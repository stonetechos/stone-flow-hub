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
import { getSalesOrder, updateSalesOrder } from "@/lib/sales-orders/api";
import { SALES_ORDER_STATUSES, type SalesOrderCreateInput } from "@/lib/sales-orders/schema";
import { listCustomers } from "@/lib/customers/api";
import { listProjectsForPicker } from "@/lib/projects/api";
import { listQuotes } from "@/lib/quotes/api";

export const Route = createFileRoute("/_authenticated/sales-orders/$id/edit")({
  ssr: false,
  component: EditSalesOrderPage,
});

function EditSalesOrderPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: qk.salesOrders.byId(id), queryFn: () => getSalesOrder(id) });
  const customers = useQuery({ queryKey: qk.customers.list(""), queryFn: () => listCustomers() });
  const projects = useQuery({ queryKey: qk.projects.list(""), queryFn: () => listProjectsForPicker() });
  const quotes = useQuery({ queryKey: qk.quotes.list(""), queryFn: () => listQuotes() });

  const [form, setForm] = useState<SalesOrderCreateInput | null>(null);
  useEffect(() => {
    if (query.data) {
      const r = query.data;
      setForm({
        quote_id: r.quote_id,
        project_id: r.project_id,
        customer_id: r.customer_id,
        status: r.status,
        order_date: r.order_date,
        delivery_date: r.delivery_date,
        notes: r.notes,
      });
    }
  }, [query.data]);

  const mut = useMutation({
    mutationFn: (input: SalesOrderCreateInput) => updateSalesOrder(id, input),
    onSuccess: () => {
      toast.success("Sales order updated");
      qc.invalidateQueries({ queryKey: qk.salesOrders.all });
      nav({ to: "/sales-orders/$id", params: { id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (query.isLoading || !form) return <LoadingBlock />;
  if (query.error) return <ErrorBlock message={toUserMessage(query.error)} />;

  const set = <K extends keyof SalesOrderCreateInput>(k: K, v: SalesOrderCreateInput[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div>
      <PageHeader title={`Edit ${query.data?.so_no ?? ""}`} />
      <QuickForm
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate(form);
        }}
        busy={mut.isPending}
      >
        <QuickForm.QuickFill>
          <Field label="Customer">
            <Select
              value={form.customer_id ?? ""}
              onValueChange={(v) => set("customer_id", v || null)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(customers.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Order date" required>
            <Input
              type="date"
              value={form.order_date}
              onChange={(e) => set("order_date", e.target.value)}
              required
            />
          </Field>
        </QuickForm.QuickFill>
        <QuickForm.MoreDetails>
          <Field label="Project">
            <Select
              value={form.project_id ?? ""}
              onValueChange={(v) => set("project_id", v || null)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(projects.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Source quote">
            <Select value={form.quote_id ?? ""} onValueChange={(v) => set("quote_id", v || null)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(quotes.data ?? []).map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.quote_no}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onValueChange={(v) => set("status", v as SalesOrderCreateInput["status"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SALES_ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Delivery date">
            <Input
              type="date"
              value={form.delivery_date ?? ""}
              onChange={(e) => set("delivery_date", e.target.value || null)}
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
            onClick={() => nav({ to: "/sales-orders/$id", params: { id } })}
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
