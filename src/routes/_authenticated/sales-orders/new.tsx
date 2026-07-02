import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { createSalesOrder } from "@/lib/sales-orders/api";
import { SALES_ORDER_STATUSES, type SalesOrderCreateInput } from "@/lib/sales-orders/schema";
import { listCustomers } from "@/lib/customers/api";
import { listProjectsForPicker } from "@/lib/projects/api";
import { listQuotes } from "@/lib/quotes/api";

export const Route = createFileRoute("/_authenticated/sales-orders/new")({
  ssr: false,
  component: NewSalesOrderPage,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function NewSalesOrderPage() {
  const nav = useNavigate();
  const customers = useQuery({ queryKey: qk.customers.list(""), queryFn: () => listCustomers() });
  const projects = useQuery({ queryKey: qk.projects.list(""), queryFn: listProjectsForPicker });
  const quotes = useQuery({ queryKey: qk.quotes.list(""), queryFn: () => listQuotes() });

  const [form, setForm] = useState<SalesOrderCreateInput>({
    quote_id: null,
    project_id: null,
    customer_id: null,
    status: "draft",
    order_date: today(),
    delivery_date: null,
    notes: null,
  });
  const set = <K extends keyof SalesOrderCreateInput>(k: K, v: SalesOrderCreateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: createSalesOrder,
    onSuccess: (row) => {
      toast.success(`Sales order ${row.so_no} created`);
      nav({ to: "/sales-orders/$id", params: { id: row.id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <div>
      <PageHeader title="New sales order" subtitle="Confirm a customer commitment." />
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
                <SelectValue placeholder="Select customer" />
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
                <SelectValue placeholder="Select project" />
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
                <SelectValue placeholder="Optional" />
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
          <Button type="button" variant="ghost" onClick={() => nav({ to: "/sales-orders" })}>
            Cancel
          </Button>
          <Button type="submit" disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
          </Button>
        </QuickForm.Actions>
      </QuickForm>
    </div>
  );
}
