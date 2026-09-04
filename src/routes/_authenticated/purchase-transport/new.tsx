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
import { EntityPicker } from "@/components/forms/EntityPicker";
import { toUserMessage } from "@/lib/errors";
import { invalidatePurchaseTransport } from "@/lib/query-invalidation";
import { qk } from "@/lib/query-keys";
import {
  createPurchaseTransportation,
  listCartingAgencies,
  replacePurchaseTransportationItems,
} from "@/lib/purchase-transportation/api";
import { getPurchaseOrder } from "@/lib/purchase-orders/api";
import {
  PURCHASE_TRANSPORT_STATUSES,
  type PurchaseTransportCreateInput,
  type PurchaseTransportItemInput,
} from "@/lib/purchase-transportation/schema";
import { PurchaseTransportItemsEditor } from "@/components/purchase-transportation/PurchaseTransportItemsEditor";

const search = z.object({
  po: z.string().uuid().optional(),
  vendor: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/purchase-transport/new")({
  ssr: false,
  validateSearch: (s) => search.parse(s),
  component: NewPurchaseTransportPage,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function NewPurchaseTransportPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const params = Route.useSearch();
  const agencies = useQuery({
    queryKey: qk.cartingAgencies.list(),
    queryFn: () => listCartingAgencies(),
  });

  const [form, setForm] = useState<PurchaseTransportCreateInput>({
    purchase_order_id: params.po ?? null,
    vendor_id: params.vendor ?? null,
    project_id: null,
    carting_agency_id: null,
    status: "planned",
    transport_date: today(),
    vehicle_no: null,
    driver_name: null,
    driver_phone: null,
    lr_no: null,
    delivered_by: null,
    received_by: null,
    freight_amount: 0,
    amount_paid: 0,
    remarks: null,
    notes: null,
  });
  const [items, setItems] = useState<PurchaseTransportItemInput[]>([]);

  const set = <K extends keyof PurchaseTransportCreateInput>(
    k: K,
    v: PurchaseTransportCreateInput[K],
  ) => setForm((f) => ({ ...f, [k]: v }));

  // Preload vendor/project when a PO is chosen (mirrors dispatch/new.tsx's SO preload).
  useQuery({
    queryKey: ["purchase-transport", "new", "po-defaults", form.purchase_order_id ?? ""],
    queryFn: async () => {
      if (!form.purchase_order_id) return null;
      const po = await getPurchaseOrder(form.purchase_order_id);
      if (po) {
        setForm((f) => ({
          ...f,
          vendor_id: f.vendor_id ?? po.vendor_id,
          project_id: f.project_id ?? po.project_id,
        }));
      }
      return po;
    },
    enabled: !!form.purchase_order_id,
  });

  const mut = useMutation({
    mutationFn: async (payload: {
      form: PurchaseTransportCreateInput;
      items: PurchaseTransportItemInput[];
    }) => {
      const row = await createPurchaseTransportation(payload.form);
      if (payload.items.length > 0) {
        await replacePurchaseTransportationItems(row.id, payload.items);
      }
      return row;
    },
    onSuccess: (row) => {
      toast.success(`${row.transport_no} logged`);
      invalidatePurchaseTransport(qc, row.id, row.vendor_id ?? undefined);
      nav({ to: "/purchase-transport/$id", params: { id: row.id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Log an inbound shipment"
        subtitle="Record what's arriving from a vendor — carting agency, driver and freight."
      />
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
              placeholder="MH 12 AB 1234"
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
          <Button type="button" variant="ghost" onClick={() => nav({ to: "/purchase-transport" })}>
            Cancel
          </Button>
          <Button type="submit" disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Log shipment
          </Button>
        </QuickForm.Actions>
      </QuickForm>
    </div>
  );
}
