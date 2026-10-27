import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Truck, FileText, CheckCircle2 } from "lucide-react";
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
import { Field } from "@/components/forms/Field";
import { FormLayout, FormSection, FormGrid, FormActions } from "@/components/forms/FormLayout";
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
import { getInvoice, getInvoiceItems } from "@/lib/invoices/api";
import { formatInr } from "@/lib/format";
import { invalidateDispatch } from "@/lib/query-invalidation";
import { DispatchItemsEditor } from "@/components/dispatch/DispatchItemsEditor";
import { CartingAgencySelect } from "@/components/dispatch/CartingAgencySelect";
import { EntityPicker } from "@/components/forms/EntityPicker";
import { recordConversion } from "@/lib/lineage/api";
import { dispatchSystemNotification } from "@/lib/notifications/systemNotifications.functions";
import { compareQuoteAndDispatchItems } from "@/lib/dispatch/variance";
import { findBestQuoteForCustomer } from "@/lib/dispatch/matching";

const search = z.object({
  so: z.string().uuid().optional(),
  customer: z.string().uuid().optional(),
  quote: z.string().uuid().optional(),
  invoice: z.string().uuid().optional(),
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

  const customerQuotes = useMemo(() => {
    if (!form.customer_id || !quotesList.data) return [];
    return quotesList.data.filter((q) => q.customer_id === form.customer_id);
  }, [form.customer_id, quotesList.data]);

  const otherQuotes = useMemo(() => {
    if (!quotesList.data) return [];
    if (!form.customer_id) return quotesList.data;
    return quotesList.data.filter((q) => q.customer_id !== form.customer_id);
  }, [form.customer_id, quotesList.data]);

  const handleCustomerSelect = (customerId: string | null) => {
    set("customer_id", customerId);
    if (!customerId) return;

    if (!selectedQuoteId && quotesList.data) {
      const best = findBestQuoteForCustomer(customerId, quotesList.data, form.project_id);
      if (best) {
        handleQuoteSelect(best.id);
        toast.info(
          `Auto-linked open Quotation #${best.quote_no} (${formatInr(best.total)}) for this customer`,
        );
      }
    }
  };

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

  // Preload customer/project/items when Invoice chosen
  useQuery({
    queryKey: ["dispatch", "new", "invoice-defaults", params.invoice ?? ""],
    queryFn: async () => {
      if (!params.invoice) return null;
      const [inv, invItems] = await Promise.all([
        getInvoice(params.invoice),
        getInvoiceItems(params.invoice),
      ]);
      if (inv) {
        setForm((f) => ({
          ...f,
          customer_id: f.customer_id ?? inv.customer_id,
          project_id: f.project_id ?? inv.project_id,
          notes: f.notes ?? `Delivery challan for Invoice #${inv.invoice_no}`,
        }));
        if (invItems && invItems.length > 0) {
          setItems(
            invItems.map((it, idx) => ({
              product_id: (it as unknown as { product_id?: string | null }).product_id || null,
              product_name: it.description || null,
              description: it.description || "Stone item",
              unit: it.unit || "sqft",
              quantity: Number(it.quantity) || 1,
              sort_order: idx + 1,
            })),
          );
          toast.success(`Loaded ${invItems.length} items from Invoice #${inv.invoice_no}`);
        }
      }
      return { inv, invItems };
    },
    enabled: !!params.invoice,
  });

  const mut = useMutation({
    mutationFn: async (payload: { form: DispatchCreateInput; items: DispatchItemInput[] }) => {
      if (!payload.form.customer_id && !payload.form.sales_order_id) {
        throw new Error("Please select a customer or sales order");
      }
      const linkedQuoteId = selectedQuoteId ?? params.quote ?? null;
      let quoteObj: Awaited<ReturnType<typeof getQuote>> = null;
      let quoteItems: Awaited<ReturnType<typeof getQuoteItems>> = [];

      if (linkedQuoteId) {
        try {
          const [qRes, qiRes] = await Promise.all([
            getQuote(linkedQuoteId),
            getQuoteItems(linkedQuoteId),
          ]);
          quoteObj = qRes;
          quoteItems = qiRes;

          const tag = `[Quote: ${quoteObj?.quote_no || "Quotation"} | QUO_ID:${linkedQuoteId}]`;
          if (!payload.form.notes?.includes(tag)) {
            payload.form.notes = payload.form.notes ? `${payload.form.notes}\n${tag}` : tag;
          }
        } catch (e) {
          console.warn("[dispatch/new] failed to load quote for linkage", e);
        }
      }

      const row = await createDispatch({ ...payload.form, quote_id: linkedQuoteId });
      if (payload.items.length > 0) {
        await replaceDispatchItems(row.id, payload.items);
      }

      // Check variance if quote was linked
      let varianceReport: ReturnType<typeof compareQuoteAndDispatchItems> | null = null;
      if (linkedQuoteId && quoteObj) {
        void recordConversion({
          sourceType: "quote",
          sourceId: linkedQuoteId,
          targetType: "dispatch",
          targetId: row.id,
          customerId: payload.form.customer_id,
          projectId: payload.form.project_id,
          meta: { quote_no: quoteObj.quote_no, dispatch_no: row.dispatch_no },
        }).catch((err) => console.warn("[lineage] recordConversion failed", err));

        varianceReport = compareQuoteAndDispatchItems(quoteItems, payload.items);
        if (varianceReport.hasVariance) {
          void dispatchSystemNotification({
            scope: "admin",
            tier: "critical",
            title: `⚠️ Challan Discrepancy: ${row.dispatch_no} vs ${quoteObj.quote_no}`,
            body: `Delivery Challan ${row.dispatch_no} has product discrepancies against Quote #${quoteObj.quote_no}: ${varianceReport.summaryText}. Flagged on dashboard.`,
            entityType: "dispatch",
            entityId: row.id,
            linkPath: `/dispatch/${row.id}`,
          });
        }
      }

      return { row, varianceReport, quoteNo: quoteObj?.quote_no };
    },
    onSuccess: ({ row, varianceReport, quoteNo }) => {
      if (varianceReport?.hasVariance) {
        toast.warning(
          `Delivery challan ${row.dispatch_no} created with ${varianceReport.varianceCount} product discrepancy(s) against Quote #${quoteNo}. Super admins flagged on dashboard.`,
          { duration: 7000 },
        );
      } else {
        toast.success(`Delivery challan ${row.dispatch_no} created`);
      }
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

      <FormLayout
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate({ form, items });
        }}
        busy={mut.isPending}
      >
        <FormSection
          title="Challan Details"
          description="Link to an approved quote or order, and verify customer and challan date."
        >
          <FormGrid>
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
                  {form.customer_id && customerQuotes.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[11px] font-bold text-primary uppercase tracking-wider bg-primary/5">
                        Quotes for selected customer
                      </div>
                      {customerQuotes.map((q) => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.quote_no} — {formatInr(q.total)} ({q.status})
                        </SelectItem>
                      ))}
                      <div className="px-2 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/40 mt-1">
                        Other quotes
                      </div>
                    </>
                  )}
                  {otherQuotes.map((q) => (
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
                onChange={(id) => handleCustomerSelect(id)}
                placeholder="Search customers…"
              />
            </Field>
            {form.customer_id && !selectedQuoteId && customerQuotes.length > 0 && (
              <div className="col-span-full rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    Customer has {customerQuotes.length} active quotation(s). Link one to pull items
                    & establish lineage:
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {customerQuotes.map((cq) => (
                    <Button
                      key={cq.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-primary/40 hover:bg-primary hover:text-primary-foreground"
                      onClick={() => handleQuoteSelect(cq.id)}
                    >
                      Link {cq.quote_no} ({formatInr(cq.total)})
                    </Button>
                  ))}
                </div>
              </div>
            )}
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
          </FormGrid>
        </FormSection>

        <FormSection
          title="Transport & Logistics"
          description="Carrier, vehicle, driver details, carting charges, and delivery site address."
        >
          <FormGrid>
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
                placeholder="LR / Bilty no."
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
                value={form.carting_charge === 0 ? "" : form.carting_charge}
                placeholder="0"
                onChange={(e) => set("carting_charge", Number(e.target.value || 0))}
              />
            </Field>
          </FormGrid>
          <div className="mt-4">
            <Field label="Site address">
              <Textarea
                rows={2}
                value={form.site_address ?? ""}
                onChange={(e) => set("site_address", e.target.value || null)}
                placeholder="Delivery location or site address"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="Delivery Challan Line Items (Products, Adhesives & Sealers)"
          description="Specify natural stone products, adhesives, and sealers to accompany this delivery."
        >
          <DispatchItemsEditor
            salesOrderId={form.sales_order_id ?? null}
            quoteId={selectedQuoteId ?? null}
            value={items}
            onChange={setItems}
          />
        </FormSection>

        <FormSection
          title="Remarks & Internal Notes"
          description="Additional dispatch instructions or internal references."
        >
          <FormGrid>
            <Field label="Remarks">
              <Textarea
                rows={2}
                value={form.remarks ?? ""}
                onChange={(e) => set("remarks", e.target.value || null)}
                placeholder="Remarks visible on challan"
              />
            </Field>
            <Field label="Internal notes">
              <Textarea
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value || null)}
                placeholder="Internal team notes (not printed on challan)"
              />
            </Field>
          </FormGrid>
        </FormSection>

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
      </FormLayout>
    </div>
  );
}
