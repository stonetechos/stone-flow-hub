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
import { EntityPicker } from "@/components/forms/EntityPicker";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { invalidateSalesOrder } from "@/lib/query-invalidation";
import { getSalesOrder, updateSalesOrder } from "@/lib/sales-orders/api";
import { SALES_ORDER_STATUSES, type SalesOrderCreateInput } from "@/lib/sales-orders/schema";
import { allowedNextSalesOrderStatuses } from "@/lib/status-transitions";

export const Route = createFileRoute("/_authenticated/sales-orders/$id/edit")({
  ssr: false,
  component: EditSalesOrderPage,
});

function EditSalesOrderPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: qk.salesOrders.byId(id), queryFn: () => getSalesOrder(id) });

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
      invalidateSalesOrder(qc, id);
      nav({ to: "/sales-orders/$id", params: { id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (query.isLoading || !form || !query.data) return <LoadingBlock />;
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
            <EntityPicker
              type="customer"
              value={form.customer_id}
              onChange={(v) => set("customer_id", v)}
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
              onChange={(v) => set("project_id", v)}
              filter={{ customerId: form.customer_id ?? null }}
              createDefaults={{ customer_id: form.customer_id ?? "" }}
            />
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
                {SALES_ORDER_STATUSES.map((s) => {
                  const allowed = allowedNextSalesOrderStatuses(query.data!.status);
                  const disabled = !allowed.includes(s);
                  return (
                    <SelectItem
                      key={s}
                      value={s}
                      disabled={disabled}
                      className="capitalize"
                    >
                      {s.replace(/_/g, " ")}
                      {disabled ? " (blocked)" : ""}
                    </SelectItem>
                  );
                })}
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
