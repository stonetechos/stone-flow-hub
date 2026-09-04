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
import { invalidatePurchaseTransport } from "@/lib/query-invalidation";
import {
  getPurchaseTransportation,
  listCartingAgencies,
  listPurchaseTransportationItems,
  replacePurchaseTransportationItems,
  updatePurchaseTransportation,
} from "@/lib/purchase-transportation/api";
import {
  PURCHASE_TRANSPORT_STATUSES,
  type PurchaseTransportCreateInput,
  type PurchaseTransportItemInput,
} from "@/lib/purchase-transportation/schema";
import { PurchaseTransportItemsEditor } from "@/components/purchase-transportation/PurchaseTransportItemsEditor";

export const Route = createFileRoute("/_authenticated/purchase-transport/$id/edit")({
  ssr: false,
  component: EditPurchaseTransportPage,
});

function EditPurchaseTransportPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.purchaseTransport.byId(id),
    queryFn: () => getPurchaseTransportation(id),
  });
  const itemsQuery = useQuery({
    queryKey: qk.purchaseTransport.items(id),
    queryFn: () => listPurchaseTransportationItems(id),
  });
  const agencies = useQuery({
    queryKey: qk.cartingAgencies.list(),
    queryFn: () => listCartingAgencies(),
  });

  const [form, setForm] = useState<PurchaseTransportCreateInput | null>(null);
  const [items, setItems] = useState<PurchaseTransportItemInput[]>([]);
  useEffect(() => {
    if (query.data) {
      const r = query.data;
      setForm({
        purchase_order_id: r.purchase_order_id,
        vendor_id: r.vendor_id,
        project_id: r.project_id,
        carting_agency_id: r.carting_agency_id,
        status: r.status,
        transport_date: r.transport_date,
        vehicle_no: r.vehicle_no,
        driver_name: r.driver_name,
        driver_phone: r.driver_phone,
        lr_no: r.lr_no,
        delivered_by: r.delivered_by,
        received_by: r.received_by,
        freight_amount: r.freight_amount,
        amount_paid: r.amount_paid,
        remarks: r.remarks,
        notes: r.notes,
      });
    }
  }, [query.data]);
  useEffect(() => {
    if (itemsQuery.data) {
      setItems(
        itemsQuery.data.map((it) => ({
          id: it.id,
          product_id: it.product_id,
          product_name: it.product_name,
          description: it.description,
          unit: it.unit,
          quantity: it.quantity,
          sort_order: it.sort_order,
        })),
      );
    }
  }, [itemsQuery.data]);

  const mut = useMutation({
    mutationFn: async (payload: {
      form: PurchaseTransportCreateInput;
      items: PurchaseTransportItemInput[];
    }) => {
      const row = await updatePurchaseTransportation(id, payload.form);
      await replacePurchaseTransportationItems(id, payload.items);
      return row;
    },
    onSuccess: (row) => {
      toast.success("Shipment updated");
      invalidatePurchaseTransport(qc, id, row.vendor_id ?? undefined);
      nav({ to: "/purchase-transport/$id", params: { id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (query.isLoading || !form) return <LoadingBlock />;
  if (query.error) return <ErrorBlock message={toUserMessage(query.error)} />;

  const set = <K extends keyof PurchaseTransportCreateInput>(
    k: K,
    v: PurchaseTransportCreateInput[K],
  ) => setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div>
      <PageHeader title={`Edit ${query.data?.transport_no ?? ""}`} />
      <QuickForm
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate({ form, items });
        }}
        busy={mut.isPending}
      >
        <QuickForm.QuickFill>
          <Field label="Purchase order">
            <EntityPicker
              type="purchase_order"
              value={form.purchase_order_id ?? null}
              onChange={(v) => set("purchase_order_id", v)}
              filter={{ vendorId: form.vendor_id || null }}
              allowCreate={false}
            />
          </Field>
          <Field label="Vendor">
            <EntityPicker
              type="vendor"
              value={form.vendor_id ?? null}
              onChange={(v) => set("vendor_id", v)}
            />
          </Field>
          <Field label="Transport date" required>
            <Input
              type="date"
              value={form.transport_date}
              onChange={(e) => set("transport_date", e.target.value)}
              required
            />
          </Field>
          <Field label="Vehicle no.">
            <Input
              value={form.vehicle_no ?? ""}
              onChange={(e) => set("vehicle_no", e.target.value || null)}
            />
          </Field>
        </QuickForm.QuickFill>

        <QuickForm.MoreDetails>
          <Field label="Carting agency">
            <Select
              value={form.carting_agency_id ?? "none"}
              onValueChange={(v) => set("carting_agency_id", v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select agency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                {(agencies.data ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
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
          <Field label="LR / Consignment no.">
            <Input
              value={form.lr_no ?? ""}
              onChange={(e) => set("lr_no", e.target.value || null)}
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
          <Field label="Freight amount (₹)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.freight_amount}
              onChange={(e) => set("freight_amount", Number(e.target.value))}
            />
          </Field>
          <Field label="Amount paid (₹)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.amount_paid}
              onChange={(e) => set("amount_paid", Number(e.target.value))}
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onValueChange={(v) => set("status", v as PurchaseTransportCreateInput["status"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PURCHASE_TRANSPORT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </QuickForm.MoreDetails>

        <QuickForm.Advanced>
          <Field label="Shipment manifest" className="md:col-span-2">
            <PurchaseTransportItemsEditor value={items} onChange={setItems} />
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
          <Button
            type="button"
            variant="ghost"
            onClick={() => nav({ to: "/purchase-transport/$id", params: { id } })}
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
