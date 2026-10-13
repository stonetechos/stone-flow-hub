import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft } from "lucide-react";
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
import {
  getDispatch,
  listDispatchItems,
  replaceDispatchItems,
  updateDispatch,
} from "@/lib/dispatch/api";
import {
  DISPATCH_STATUSES,
  type DispatchCreateInput,
  type DispatchItemInput,
} from "@/lib/dispatch/schema";
import { listSalesOrdersForPicker } from "@/lib/sales-orders/api";
import { invalidateDispatch } from "@/lib/query-invalidation";
import { allowedNextDispatchStatuses } from "@/lib/status-transitions";
import { DispatchItemsEditor } from "@/components/dispatch/DispatchItemsEditor";
import { CartingAgencySelect } from "@/components/dispatch/CartingAgencySelect";

import { getQuote, getQuoteItems, listQuotes } from "@/lib/quotes/api";
import { formatInr } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { EntityPicker } from "@/components/forms/EntityPicker";

export const Route = createFileRoute("/_authenticated/dispatch/$id/edit")({
  ssr: false,
  component: EditDispatchPage,
});

function EditDispatchPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: qk.dispatch.byId(id), queryFn: () => getDispatch(id) });
  const itemsQuery = useQuery({
    queryKey: qk.dispatch.items(id),
    queryFn: () => listDispatchItems(id),
  });
  const orders = useQuery({
    queryKey: qk.salesOrders.list("", ""),
    queryFn: listSalesOrdersForPicker,
  });
  const quotesList = useQuery({
    queryKey: qk.quotes.list(""),
    queryFn: () => listQuotes(""),
  });

  const [form, setForm] = useState<DispatchCreateInput | null>(null);
  const [items, setItems] = useState<DispatchItemInput[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  useEffect(() => {
    if (query.data) {
      const r = query.data;
      setForm({
        sales_order_id: r.sales_order_id,
        customer_id: r.customer_id,
        project_id: r.project_id,
        status: r.status,
        dispatch_date: r.dispatch_date,
        carrier: r.carrier,
        tracking_no: r.tracking_no,
        site_address: r.site_address,
        vehicle_no: r.vehicle_no,
        driver_name: r.driver_name,
        driver_phone: r.driver_phone,
        lr_no: r.lr_no,
        delivered_by: r.delivered_by,
        received_by: r.received_by,
        carting_charge: Number(r.carting_charge ?? 0),
        remarks: r.remarks,
        notes: r.notes,
      });
    }
  }, [query.data]);

  // Auto-detect linked quote from notes or customer
  useEffect(() => {
    if (quotesList.data && query.data && !selectedQuoteId) {
      const notes = query.data.notes || "";
      const matched = quotesList.data.find(
        (q) =>
          notes.includes(q.quote_no) ||
          (query.data?.customer_id && q.customer_id === query.data.customer_id),
      );
      if (matched) {
        setSelectedQuoteId(matched.id);
      }
    }
  }, [quotesList.data, query.data, selectedQuoteId]);

  const handleQuoteSelect = async (quoteId: string | null) => {
    setSelectedQuoteId(quoteId);
    if (!quoteId) return;
    try {
      const [quote, quoteItems] = await Promise.all([getQuote(quoteId), getQuoteItems(quoteId)]);
      if (quote) {
        setForm((f) =>
          f
            ? {
                ...f,
                customer_id: f.customer_id ?? quote.customer_id,
                project_id: f.project_id ?? quote.project_id,
                notes: f.notes
                  ? f.notes.includes(quote.quote_no)
                    ? f.notes
                    : `${f.notes}\nLinked Quote: #${quote.quote_no}`
                  : `Delivery challan for Quote #${quote.quote_no}`,
              }
            : f,
        );
        if (quoteItems && quoteItems.length > 0) {
          setItems(
            quoteItems.map((qi, idx) => ({
              product_id: qi.product_id,
              product_name: qi.description || null,
              description: qi.description || "Stone item",
              unit: qi.unit || "sqft",
              quantity: Number(qi.quantity) || 1,
              sort_order: idx + 1,
            })),
          );
          toast.success(`Loaded ${quoteItems.length} items from Quote #${quote.quote_no}`);
        } else {
          toast.info(`Linked Quote #${quote.quote_no}`);
        }
      }
    } catch {
      toast.error("Failed to load quotation details");
    }
  };

  useEffect(() => {
    if (itemsQuery.data) {
      setItems(
        itemsQuery.data.map((it) => ({
          id: it.id,
          sales_order_item_id: it.sales_order_item_id,
          product_id: it.product_id,
          product_name: it.product_name,
          description: it.description,
          unit: it.unit,
          quantity: Number(it.quantity),
          sort_order: it.sort_order,
        })),
      );
    }
  }, [itemsQuery.data]);

  const mut = useMutation({
    mutationFn: async (payload: { form: DispatchCreateInput; items: DispatchItemInput[] }) => {
      await updateDispatch(id, payload.form);
      await replaceDispatchItems(id, payload.items);
    },
    onSuccess: () => {
      toast.success("Delivery challan updated");
      invalidateDispatch(qc, id);
      nav({ to: "/dispatch/$id", params: { id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (query.isLoading || !form || !query.data) return <LoadingBlock />;
  if (query.error) return <ErrorBlock message={toUserMessage(query.error)} />;

  const set = <K extends keyof DispatchCreateInput>(k: K, v: DispatchCreateInput[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const linkedQuote = (quotesList.data ?? []).find(
    (q) =>
      q.id === selectedQuoteId ||
      (form?.notes && form.notes.includes(q.quote_no)) ||
      (query.data?.notes && query.data.notes.includes(q.quote_no)),
  );
  const quoteTotal = linkedQuote ? Number(linkedQuote.total) : 0;
  const cartingCharge = Number(form?.carting_charge ?? 0);
  const totalAmount = quoteTotal + cartingCharge;

  return (
    <div>
      <PageHeader
        title={`Edit ${query.data?.dispatch_no ?? ""}`}
        subtitle="Update delivery details, challan date, transport, and line items."
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => nav({ to: "/dispatch/$id", params: { id } })}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        }
      />

      <div className="mb-4 rounded-xl border border-primary/25 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
            Total Dispatch Amount
          </div>
          <div className="text-2xl font-bold font-mono text-primary flex items-baseline gap-2">
            {formatInr(totalAmount)}
            {linkedQuote && (
              <span className="text-xs font-normal text-muted-foreground font-sans">
                (Quotation #{linkedQuote.quote_no}: {formatInr(linkedQuote.total)} + Carting:{" "}
                {formatInr(cartingCharge)})
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground font-medium">Status:</span>
          <Badge variant="outline" className="font-semibold capitalize">
            {form.status === "in_transit"
              ? "Dispatched for delivery"
              : form.status === "planned"
                ? "Planned"
                : form.status === "delivered"
                  ? "Delivered"
                  : form.status}
          </Badge>
        </div>
      </div>

      <QuickForm
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate({ form, items });
        }}
        busy={mut.isPending}
      >
        <QuickForm.QuickFill>
          <Field label="Quotation (Link Quote / Pull items & value)">
            <Select
              value={selectedQuoteId ?? "none"}
              onValueChange={(v) => handleQuoteSelect(v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select quotation to pull items…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None (Custom Challan) —</SelectItem>
                {(quotesList.data ?? []).map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.quote_no} — {q.customer?.name ?? "Customer"} ({formatInr(q.total)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Customer">
            <EntityPicker
              type="customer"
              value={form.customer_id ?? null}
              onChange={(cid) => set("customer_id", cid)}
              placeholder="Search customers…"
            />
          </Field>
          <Field label="Sales order (optional)">
            <Select
              value={form.sales_order_id ?? "none"}
              onValueChange={(v) => set("sales_order_id", v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select SO (if applicable)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {(orders.data ?? []).map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.so_no}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Delivery / Challan date" required>
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
          <Field label="Status">
            <Select
              value={form.status}
              onValueChange={(v) => set("status", v as DispatchCreateInput["status"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in_transit">Dispatched for delivery</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Carting agency / Carrier">
            <CartingAgencySelect
              value={form.carrier}
              onChange={(c) => set("carrier", c)}
              onAgencyAutoFill={({ phone, contactPerson }) => {
                if (!form.driver_phone && phone) set("driver_phone", phone);
                if (!form.driver_name && contactPerson) set("driver_name", contactPerson);
              }}
            />
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
              excludeDispatchId={id}
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
          <Button
            type="button"
            variant="ghost"
            onClick={() => nav({ to: "/dispatch/$id", params: { id } })}
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
