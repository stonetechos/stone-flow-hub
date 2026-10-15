import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Truck } from "lucide-react";
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
import { FormActions } from "@/components/forms/FormLayout";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { createDispatch, replaceDispatchItems } from "@/lib/dispatch/api";
import {
  DISPATCH_STATUSES,
  type DispatchCreateInput,
  type DispatchItemInput,
} from "@/lib/dispatch/schema";
import { getSalesOrder, listSalesOrdersForPicker } from "@/lib/sales-orders/api";
import { getQuote, getQuoteItems, listQuotes } from "@/lib/quotes/api";
import { formatInr } from "@/lib/format";
import { invalidateDispatch } from "@/lib/query-invalidation";
import { DispatchItemsEditor } from "@/components/dispatch/DispatchItemsEditor";
import { CartingAgencySelect } from "@/components/dispatch/CartingAgencySelect";
import { EntityPicker } from "@/components/forms/EntityPicker";

const search = z.object({
  so: z.string().uuid().optional(),
  customer: z.string().uuid().optional(),
  quote: z.string().uuid().optional(),
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
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(params.quote ?? null);

  const orders = useQuery({
    queryKey: qk.salesOrders.list("", ""),
    queryFn: listSalesOrdersForPicker,
  });

  const quotesList = useQuery({
    queryKey: qk.quotes.list(""),
    queryFn: () => listQuotes(""),
  });

  const [form, setForm] = useState<DispatchCreateInput>({
    sales_order_id: params.so ?? null,
    customer_id: params.customer ?? null,
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

  const handleQuoteSelect = async (quoteId: string | null) => {
    setSelectedQuoteId(quoteId);
    if (!quoteId) return;
    try {
      const [quote, quoteItems] = await Promise.all([getQuote(quoteId), getQuoteItems(quoteId)]);
      if (quote) {
        setForm((f) => ({
          ...f,
          customer_id: f.customer_id ?? quote.customer_id,
          project_id: f.project_id ?? quote.project_id,
          notes: f.notes ?? `Delivery challan for Quote #${quote.quote_no}`,
        }));
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
        }
      }
    } catch (e) {
      toast.error("Failed to load quotation line items");
    }
  };

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

  // Preload customer/project/items when Quote chosen (Cash delivery challan before invoice)
  const quoteQuery = useQuery({
    queryKey: ["dispatch", "new", "quote-defaults", params.quote ?? ""],
    queryFn: async () => {
      if (!params.quote) return null;
      const [quote, quoteItems] = await Promise.all([
        getQuote(params.quote),
        getQuoteItems(params.quote),
      ]);
      if (quote) {
        setForm((f) => ({
          ...f,
          customer_id: f.customer_id ?? quote.customer_id,
          project_id: f.project_id ?? quote.project_id,
          notes:
            f.notes ?? `Cash deal delivery challan before invoice for Quote #${quote.quote_no}`,
        }));
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
        }
      }
      return { quote, quoteItems };
    },
    enabled: !!params.quote,
  });

  const mut = useMutation({
    mutationFn: async (payload: { form: DispatchCreateInput; items: DispatchItemInput[] }) => {
      if (!payload.form.customer_id && !payload.form.sales_order_id) {
        throw new Error("Please select a customer or sales order");
      }
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
        title={params.quote ? "Delivery Challan (Cash Deal)" : "New delivery challan"}
        subtitle={
          params.quote
            ? "Issue delivery challan directly for approved quotation before invoice generation."
            : "Record what is leaving the yard for delivery to the customer."
        }
      />
      {quoteQuery.data?.quote && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Truck className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <div className="font-semibold">
                Cash Delivery Challan for Quote #{quoteQuery.data.quote.quote_no}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Customer: <strong>{quoteQuery.data.quote.customer?.name}</strong> • Items have been
                auto-populated from the approved quotation. You can deliver goods immediately before
                raising invoices.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prominent Total Dispatch Amount */}
      <div className="mb-4 rounded-xl border border-primary/25 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
            Total Dispatch Amount
          </div>
          <div className="text-2xl font-bold font-mono text-primary flex items-baseline gap-2">
            {formatInr(
              (quotesList.data ?? []).find((q) => q.id === selectedQuoteId)?.total
                ? Number((quotesList.data ?? []).find((q) => q.id === selectedQuoteId)!.total) +
                    Number(form.carting_charge ?? 0)
                : Number(form.carting_charge ?? 0),
            )}
            {selectedQuoteId && (
              <span className="text-xs font-normal text-muted-foreground font-sans">
                (Quotation #
                {(quotesList.data ?? []).find((q) => q.id === selectedQuoteId)?.quote_no}:{" "}
                {formatInr(
                  (quotesList.data ?? []).find((q) => q.id === selectedQuoteId)?.total ?? 0,
                )}{" "}
                + Carting: {formatInr(Number(form.carting_charge ?? 0))})
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground font-medium">Status:</span>
          <span className="font-semibold px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            {form.status === "in_transit"
              ? "Dispatched for delivery"
              : form.status === "planned"
                ? "Planned"
                : form.status === "delivered"
                  ? "Delivered"
                  : form.status}
          </span>
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
          <Field label="Customer" required>
            <EntityPicker
              type="customer"
              value={form.customer_id ?? null}
              onChange={(id) => set("customer_id", id)}
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
          <Field label="Site address" className="md:col-span-2">
            <Textarea
              rows={2}
              value={form.site_address ?? ""}
              onChange={(e) => set("site_address", e.target.value || null)}
            />
          </Field>

          {/* Prominent Delivery Challan Line Items */}
          <div className="md:col-span-2 rounded-lg border bg-card p-4 space-y-3 mt-2 shadow-2xs">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <span>Delivery Challan Line Items (Products, Adhesives & Sealers)</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Specify stone products, adhesives, and sealers to accompany this delivery.
                </p>
              </div>
            </div>
            <DispatchItemsEditor
              salesOrderId={form.sales_order_id ?? null}
              quoteId={selectedQuoteId ?? null}
              value={items}
              onChange={setItems}
            />
          </div>
        </QuickForm.MoreDetails>

        <QuickForm.Advanced>
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

        <FormActions
          busy={mut.isPending}
          secondary={
            <Button type="button" variant="ghost" onClick={() => nav({ to: "/dispatch" })}>
              Cancel
            </Button>
          }
          primary={
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create challan
            </Button>
          }
        />
      </QuickForm>
    </div>
  );
}
