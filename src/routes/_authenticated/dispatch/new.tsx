import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { createDispatch } from "@/lib/dispatch/api";
import { DISPATCH_STATUSES, type DispatchCreateInput } from "@/lib/dispatch/schema";
import { listSalesOrdersForPicker } from "@/lib/sales-orders/api";

const search = z.object({
  so: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/dispatch/new")({
  ssr: false,
  validateSearch: (s) => search.parse(s),
  component: NewDispatchPage,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function NewDispatchPage() {
  const nav = useNavigate();
  const params = Route.useSearch();
  const orders = useQuery({
    queryKey: qk.salesOrders.list("", ""),
    queryFn: listSalesOrdersForPicker,
  });

  const [form, setForm] = useState<DispatchCreateInput>({
    sales_order_id: params.so ?? null,
    status: "planned",
    dispatch_date: today(),
    carrier: null,
    tracking_no: null,
    notes: null,
  });
  const set = <K extends keyof DispatchCreateInput>(k: K, v: DispatchCreateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: createDispatch,
    onSuccess: (row) => {
      toast.success(`Dispatch ${row.dispatch_no} created`);
      nav({ to: "/dispatch/$id", params: { id: row.id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <div>
      <PageHeader title="New dispatch" subtitle="Plan an outbound shipment." />
      <QuickForm
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate(form);
        }}
        busy={mut.isPending}
      >
        <QuickForm.QuickFill>
          <Field label="Sales order">
            <Select
              value={form.sales_order_id ?? ""}
              onValueChange={(v) => set("sales_order_id", v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select SO" />
              </SelectTrigger>
              <SelectContent>
                {(orders.data ?? []).map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.so_no}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Dispatch date" required>
            <Input
              type="date"
              value={form.dispatch_date}
              onChange={(e) => set("dispatch_date", e.target.value)}
              required
            />
          </Field>
        </QuickForm.QuickFill>

        <QuickForm.MoreDetails>
          <Field label="Status">
            <Select
              value={form.status}
              onValueChange={(v) => set("status", v as DispatchCreateInput["status"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISPATCH_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Carrier">
            <Input
              value={form.carrier ?? ""}
              onChange={(e) => set("carrier", e.target.value || null)}
            />
          </Field>
          <Field label="Tracking #">
            <Input
              value={form.tracking_no ?? ""}
              onChange={(e) => set("tracking_no", e.target.value || null)}
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
          <Button type="button" variant="ghost" onClick={() => nav({ to: "/dispatch" })}>
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
