import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { createDispatch, replaceDispatchItems } from "@/lib/dispatch/api";
import {
  DISPATCH_STATUSES,
  type DispatchCreateInput,
  type DispatchItemInput,
} from "@/lib/dispatch/schema";
import { getSalesOrder, listSalesOrdersForPicker } from "@/lib/sales-orders/api";
import { invalidateDispatch } from "@/lib/query-invalidation";
import { DispatchItemsEditor } from "@/components/dispatch/DispatchItemsEditor";

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
  const qc = useQueryClient();
  const params = Route.useSearch();
  const orders = useQuery({
    queryKey: qk.salesOrders.list("", ""),
    queryFn: listSalesOrdersForPicker,
  });

  const [form, setForm] = useState<DispatchCreateInput>({
    sales_order_id: params.so ?? null,
    customer_id: null,
    project_id: null,
    status: "planned",
    dispatch_date: today(),
    carrier: null,
    tracking_no: null,
    site_address: null,
    vehicle_no: null,
    driver_name: null,
    driver_phone: null,
    lr_no: null,
    delivered_by: null,
    received_by: null,
    carting_charge: 0,
    remarks: null,
    notes: null,
  });
  const [items, setItems] = useState<DispatchItemInput[]>([]);

  const set = <K extends keyof DispatchCreateInput>(k: K, v: DispatchCreateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Preload carting default + customer/project when SO chosen
  useQuery({
    queryKey: ["dispatch", "new", "so-defaults", form.sales_order_id ?? ""],
    queryFn: async () => {
      if (!form.sales_order_id) return null;
      const so = await getSalesOrder(form.sales_order_id);
      if (so) {
        const soDefault = (so as unknown as { default_carting_charge?: number })
          .default_carting_charge;
        setForm((f) => ({
          ...f,
          customer_id: f.customer_id ?? so.customer_id,
          project_id: f.project_id ?? so.project_id,
          carting_charge: f.carting_charge > 0 ? f.carting_charge : Number(soDefault ?? 0),
        }));
      }
      return so;
    },
    enabled: !!form.sales_order_id,
  });

  const mut = useMutation({
    mutationFn: async (payload: { form: DispatchCreateInput; items: DispatchItemInput[] }) => {
      const row = await createDispatch(payload.form);
      if (payload.items.length > 0) {
        await replaceDispatchItems(row.id, payload.items);
      }
      return row;
    },
    onSuccess: (row) => {
      toast.success(`Delivery challan ${row.dispatch_no} created`);
      invalidateDispatch(qc, row.id);
      nav({ to: "/dispatch/$id", params: { id: row.id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="New delivery challan"
        subtitle="Record what is leaving the yard against a sales order."
      />
      <QuickForm
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate({ form, items });
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
          <Field label="Challan date" required>
            <Input
              type="date"
              value={form.dispatch_date}
              onChange={(e) => set("dispatch_date", e.target.value)}
              required
            />
          </Field>
          <Field label="Vehicle no.">
            <Input
              value={form.vehicle_no ?? ""}
              onChange={(e) => set("vehicle_no", e.target.value || null)}
              placeholder="MH 12 AB 1234"
            />
          </Field>
          <Field label="LR / Consignment no.">
            <Input
              value={form.lr_no ?? ""}
              onChange={(e) => set("lr_no", e.target.value || null)}
            />
          </Field>
        </QuickForm.QuickFill>

        <QuickForm.MoreDetails>
          <Field label="Driver name">
            <Input
              value={form.driver_name ?? ""}
              onChange={(e) => set("driver_name", e.target.value || null)}
            />
          </Field>
          <Field label="Driver phone">
            <Input
              value={form.driver_phone ?? ""}
              onChange={(e) => set("driver_phone", e.target.value || null)}
            />
          </Field>
          <Field label="Carrier / Transport">
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
          <Field label="Delivered by">
            <Input
              value={form.delivered_by ?? ""}
              onChange={(e) => set("delivered_by", e.target.value || null)}
            />
          </Field>
          <Field label="Received by">
            <Input
              value={form.received_by ?? ""}
              onChange={(e) => set("received_by", e.target.value || null)}
            />
          </Field>
          <Field label="Carting charge (₹)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.carting_charge}
              onChange={(e) => set("carting_charge", Number(e.target.value))}
            />
          </Field>
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
          <Field label="Site address" className="md:col-span-2">
            <Textarea
              rows={2}
              value={form.site_address ?? ""}
              onChange={(e) => set("site_address", e.target.value || null)}
            />
          </Field>
        </QuickForm.MoreDetails>

        <QuickForm.Advanced>
          <Field label="Material" className="md:col-span-2">
            <DispatchItemsEditor
              salesOrderId={form.sales_order_id ?? null}
              value={items}
              onChange={setItems}
            />
          </Field>
          <Field label="Remarks" className="md:col-span-2">
            <Textarea
              rows={2}
              value={form.remarks ?? ""}
              onChange={(e) => set("remarks", e.target.value || null)}
            />
          </Field>
          <Field label="Internal notes" className="md:col-span-2">
            <Textarea
              rows={2}
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
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create challan
          </Button>
        </QuickForm.Actions>
      </QuickForm>
    </div>
  );
}
