import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { EntityPicker } from "@/components/forms/EntityPicker";
import { toUserMessage } from "@/lib/errors";
import { invalidateSalesOrder } from "@/lib/query-invalidation";
import { createSalesOrder } from "@/lib/sales-orders/api";
import { convertQuoteToSalesOrder, listQuotes } from "@/lib/quotes/api";
import { qk } from "@/lib/query-keys";
import { formatInr } from "@/lib/format";
import { SALES_ORDER_STATUSES, type SalesOrderCreateInput } from "@/lib/sales-orders/schema";

const search = z.object({
  project: z.string().uuid().optional(),
  customer: z.string().uuid().optional(),
  quote: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/sales-orders/new")({
  ssr: false,
  validateSearch: (s) => search.parse(s),
  component: NewSalesOrderPage,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function NewSalesOrderPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const params = Route.useSearch();

  const [form, setForm] = useState<SalesOrderCreateInput>({
    quote_id: params.quote ?? null,
    project_id: params.project ?? null,
    customer_id: params.customer ?? null,
    status: "draft",
    order_date: today(),
    delivery_date: null,
    notes: null,
  });
  const set = <K extends keyof SalesOrderCreateInput>(k: K, v: SalesOrderCreateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Accepted quotes eligible to be converted into this sales order. Scoped to
  // whichever customer/project is already chosen so the picker stays short.
  // Picking one and submitting calls the same server-side conversion the
  // Quote page uses, so line items and totals are copied — not left blank.
  const quotesQuery = useQuery({ queryKey: qk.quotes.list(""), queryFn: () => listQuotes("") });
  const eligibleQuotes = useMemo(() => {
    const base = (quotesQuery.data ?? []).filter((q) => q.status === "accepted");
    if (form.customer_id) return base.filter((q) => q.customer_id === form.customer_id);
    if (form.project_id) return base.filter((q) => q.project_id === form.project_id);
    return base;
  }, [quotesQuery.data, form.customer_id, form.project_id]);

  const createMut = useMutation({
    mutationFn: createSalesOrder,
    onSuccess: (row) => {
      toast.success(`Sales order ${row.so_no} created`);
      invalidateSalesOrder(qc, row.id);
      nav({ to: "/sales-orders/$id", params: { id: row.id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const convertMut = useMutation({
    mutationFn: (quoteId: string) => convertQuoteToSalesOrder(quoteId),
    onSuccess: (row) => {
      toast.success(`Sales order ${row.so_no} created — line items copied from the quote`);
      invalidateSalesOrder(qc, row.id);
      nav({ to: "/sales-orders/$id", params: { id: row.id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const busy = createMut.isPending || convertMut.isPending;

  return (
    <div>
      <PageHeader title="New sales order" subtitle="Confirm a customer commitment." />
      <QuickForm
        onSubmit={(e) => {
          e.preventDefault();
          // A linked quote must go through the conversion RPC so its line
          // items and totals come across — a bare insert would leave the
          // order empty even though `quote_id` looked correctly set.
          if (form.quote_id) {
            convertMut.mutate(form.quote_id);
          } else {
            createMut.mutate(form);
          }
        }}
        busy={busy}
      >
        <QuickForm.QuickFill>
          <Field label="Customer">
            <EntityPicker
              type="customer"
              value={form.customer_id}
              onChange={(id) => {
                set("customer_id", id);
                if (!id) set("project_id", null);
              }}
            />
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
            <EntityPicker
              type="project"
              value={form.project_id}
              onChange={(id, row) => {
                set("project_id", id);
                // Auto-fill customer from project when missing.
                const cust = (row as any)?.raw?.customer_id;
                if (id && !form.customer_id && cust) set("customer_id", cust);
              }}
              filter={{ customerId: form.customer_id ?? null }}
              createDefaults={{ customer_id: form.customer_id ?? "" }}
            />
          </Field>
          <Field
            label="Quote (optional)"
            hint="Pick an accepted quote to copy its line items and total into this order automatically. Leave blank for a manual, empty order."
          >
            <Select
              value={form.quote_id ?? "__none__"}
              onValueChange={(v) => set("quote_id", v === "__none__" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No quote — blank order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No quote — blank order</SelectItem>
                {eligibleQuotes.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.quote_no} — {q.customer?.name ?? "Unknown"} ({formatInr(q.total)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onValueChange={(v) => set("status", v as SalesOrderCreateInput["status"])}
              disabled={!!form.quote_id}
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
              disabled={!!form.quote_id}
            />
          </Field>
        </QuickForm.MoreDetails>

        <QuickForm.Advanced>
          <Field label="Notes" className="md:col-span-2">
            <Textarea
              rows={3}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
              disabled={!!form.quote_id}
            />
          </Field>
        </QuickForm.Advanced>

        <QuickForm.Actions>
          <Button type="button" variant="ghost" onClick={() => nav({ to: "/sales-orders" })}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {form.quote_id ? "Convert quote → Create" : "Create"}
          </Button>
        </QuickForm.Actions>
      </QuickForm>
    </div>
  );
}
