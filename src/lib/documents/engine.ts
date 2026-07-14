/**
 * Document Communication Engine — single source of truth for turning any
 * ERP document into a branded `PdfDoc` for Preview / Print / Download PDF
 * / Email. Every module (Estimate, Quotation, Sales Order, Purchase Order,
 * Invoice, Receipt, Delivery Challan) goes through this file.
 *
 * DO NOT add per-module renderers elsewhere — extend the switch here.
 */
import { formatInr } from "@/lib/format";
import type { PdfDoc, PdfLine, PdfMeta, PdfParty } from "@/lib/pdf/generator";

import { getEstimate, getEstimateItems, getEstimateSchedule } from "@/lib/estimates/api";
import { getQuote, getQuoteItems } from "@/lib/quotes/api";
import { getInvoice, getInvoiceItems } from "@/lib/invoices/api";
import { getReceipt, getReceiptAllocations } from "@/lib/receipts/api";
import { getSalesOrder, listSalesOrderItems } from "@/lib/sales-orders/api";
import { getPurchaseOrder } from "@/lib/purchase-orders/api";
import { getDispatch, listDispatchItems } from "@/lib/dispatch/api";
import { supabase } from "@/integrations/supabase/client";

export type DocumentEntity =
  | "estimate"
  | "quote"
  | "sales_order"
  | "purchase_order"
  | "invoice"
  | "receipt"
  | "delivery_challan";

export interface DocumentEntityMeta {
  /** Recipient display name (customer / vendor). */
  toName: string;
  /** Best-known recipient email (customer.primary_email / vendor.email). */
  toEmail: string | null;
  /** Document number used in email subject etc. */
  docNumber: string;
  customerId: string | null;
  vendorId: string | null;
  projectId: string | null;
}

export interface BuiltDocument {
  doc: PdfDoc;
  meta: DocumentEntityMeta;
}

function inr(n: number | string | null | undefined) {
  const v = typeof n === "string" ? Number(n) : (n ?? 0);
  return formatInr(Number.isFinite(v) ? v : 0);
}

function num(n: number | string | null | undefined): number {
  const v = typeof n === "string" ? Number(n) : (n ?? 0);
  return Number.isFinite(v) ? Number(v) : 0;
}

/**
 * Build GST breakdown rows from item aggregates. Returns [] when no item
 * carries CGST/SGST/IGST — historical rows fall back to the legacy single
 * "Tax" line the caller passes in. Never fabricates statutory values.
 */
type GstItem = {
  cgst_amount?: number | string | null;
  sgst_amount?: number | string | null;
  igst_amount?: number | string | null;
};
function gstTotalsFromItems(items: ReadonlyArray<GstItem>): PdfMeta[] {
  const has = items.some(
    (it) => it.cgst_amount != null || it.sgst_amount != null || it.igst_amount != null,
  );
  if (!has) return [];
  const cgst = items.reduce((s, it) => s + num(it.cgst_amount), 0);
  const sgst = items.reduce((s, it) => s + num(it.sgst_amount), 0);
  const igst = items.reduce((s, it) => s + num(it.igst_amount), 0);
  const out: PdfMeta[] = [];
  if (cgst > 0) out.push({ label: "CGST", value: inr(cgst) });
  if (sgst > 0) out.push({ label: "SGST", value: inr(sgst) });
  if (igst > 0) out.push({ label: "IGST", value: inr(igst) });
  return out;
}

async function fetchCustomer(id: string | null | undefined) {
  if (!id) return null;
  const { data } = await supabase
    .from("customers")
    .select("id,name,primary_email,primary_phone,billing_address,city,state,pincode,gst_number")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}
async function fetchVendor(id: string | null | undefined) {
  if (!id) return null;
  const { data } = await supabase
    .from("vendors")
    .select("id,company_name,email,mobile_number,address,city,state,pincode,gst_number")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

function customerParty(
  c: {
    name: string;
    billing_address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    gst_number: string | null;
    primary_email: string | null;
    primary_phone: string | null;
  } | null,
): PdfParty {
  if (!c) return { name: "—" };
  const parts = [c.billing_address, [c.city, c.state, c.pincode].filter(Boolean).join(", ")].filter(
    (s): s is string => Boolean(s && s.trim()),
  );
  return {
    name: c.name,
    address: parts.join("\n") || undefined,
    gstin: c.gst_number ?? undefined,
    email: c.primary_email ?? undefined,
    phone: c.primary_phone ?? undefined,
  };
}
function vendorParty(
  v: {
    company_name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    gst_number: string | null;
    email: string | null;
    mobile_number: string | null;
  } | null,
): PdfParty {
  if (!v) return { name: "—" };
  const parts = [v.address, [v.city, v.state, v.pincode].filter(Boolean).join(", ")].filter(
    (s): s is string => Boolean(s && s.trim()),
  );
  return {
    name: v.company_name,
    address: parts.join("\n") || undefined,
    gstin: v.gst_number ?? undefined,
    email: v.email ?? undefined,
    phone: v.mobile_number ?? undefined,
  };
}

/** Build a fully-populated PdfDoc from live ERP data. */
export async function buildDocument(entity: DocumentEntity, id: string): Promise<BuiltDocument> {
  switch (entity) {
    case "estimate": {
      const e = await getEstimate(id);
      if (!e) throw new Error("Estimate not found");
      const items = await getEstimateItems(id);
      const schedule = await getEstimateSchedule(id);
      const cust = await fetchCustomer(e.customer_id);
      const lines: PdfLine[] = items.map((it) => ({
        label: it.description,
        hsn: (it as { hsn_sac?: string | null }).hsn_sac ?? undefined,
        qty: it.quantity ?? "",
        unit: it.unit ?? "",
        rate: inr(it.unit_price),
        amount: inr(it.line_total),
      }));
      const gstSplit = gstTotalsFromItems(items as unknown as GstItem[]);
      const totals: PdfMeta[] = [
        { label: "Subtotal", value: inr(e.subtotal) },
        ...(Number(e.margin_amount) > 0
          ? [{ label: `Margin (${e.margin_pct}%)`, value: inr(e.margin_amount) }]
          : []),
        ...(gstSplit.length
          ? gstSplit
          : [{ label: `GST (${e.gst_pct}%)`, value: inr(e.gst_amount) }]),
        { label: "Total", value: inr(e.total) },
      ];
      const schedNotes = schedule.length
        ? "Payment schedule: " +
          schedule.map((s) => `${s.label} ${s.pct}% (${inr(s.amount)})`).join(" · ")
        : "";
      return {
        doc: {
          kind: "estimate",
          title: "Estimate",
          number: e.estimate_no,
          date: e.created_at?.slice(0, 10) ?? "",
          to: customerParty(cust),
          meta: [
            { label: "Project", value: e.project?.name ?? "—" },
            { label: "Valid until", value: e.valid_until ?? "—" },
          ],
          lines,
          totals,
          notes: [schedNotes, e.notes ?? ""].filter(Boolean).join("\n\n") || undefined,
          terms: e.terms ?? undefined,
        },
        meta: {
          toName: cust?.name ?? "—",
          toEmail: cust?.primary_email ?? null,
          docNumber: e.estimate_no,
          customerId: e.customer_id,
          vendorId: null,
          projectId: e.project_id,
        },
      };
    }

    case "quote": {
      const q = await getQuote(id);
      if (!q) throw new Error("Quotation not found");
      const items = await getQuoteItems(id);
      const cust = await fetchCustomer(q.customer_id);
      const lines: PdfLine[] = items.map((it) => ({
        label: it.description,
        hsn: (it as { hsn_sac?: string | null }).hsn_sac ?? undefined,
        qty: it.quantity,
        unit: it.unit ?? "",
        rate: inr(it.unit_price),
        amount: inr(it.line_total),
      }));
      const gstSplit = gstTotalsFromItems(items as unknown as GstItem[]);
      const totals: PdfMeta[] = [
        { label: "Subtotal", value: inr(q.subtotal) },
        ...(gstSplit.length ? gstSplit : [{ label: "Tax", value: inr(q.tax_amount) }]),
        { label: "Total", value: inr(q.total) },
      ];
      return {
        doc: {
          kind: "quotation",
          title: "Quotation",
          number: q.quote_no,
          date: q.issue_date ?? q.created_at?.slice(0, 10) ?? "",
          to: customerParty(cust),
          meta: [
            { label: "Project", value: q.project?.name ?? "—" },
            { label: "Valid until", value: q.valid_until ?? "—" },
          ],
          lines,
          totals,
          notes: q.notes ?? undefined,
          terms: q.terms ?? undefined,
        },
        meta: {
          toName: cust?.name ?? "—",
          toEmail: cust?.primary_email ?? null,
          docNumber: q.quote_no,
          customerId: q.customer_id,
          vendorId: null,
          projectId: q.project_id,
        },
      };
    }

    case "sales_order": {
      const so = await getSalesOrder(id);
      if (!so) throw new Error("Sales order not found");
      const items = await listSalesOrderItems(id);
      const cust = await fetchCustomer(so.customer_id);
      const lines: PdfLine[] = items.map((it) => ({
        label: it.description ?? it.product_name ?? "",
        hsn: (it as { hsn_sac?: string | null }).hsn_sac ?? undefined,
        qty: it.quantity,
        unit: it.unit ?? "",
        rate: inr(it.unit_price),
        amount: inr(it.line_total),
      }));
      const gstSplit = gstTotalsFromItems(items as unknown as GstItem[]);
      const totals: PdfMeta[] = [
        { label: "Subtotal", value: inr(so.subtotal) },
        ...(Number(so.discount) > 0 ? [{ label: "Discount", value: inr(so.discount) }] : []),
        ...(Number(so.freight) > 0 ? [{ label: "Freight", value: inr(so.freight) }] : []),
        ...(Number(so.other_charges) > 0
          ? [{ label: "Other charges", value: inr(so.other_charges) }]
          : []),
        ...(gstSplit.length ? gstSplit : [{ label: "Tax", value: inr(so.tax_amount) }]),
        { label: "Total", value: inr(so.total) },
      ];
      return {
        doc: {
          kind: "sales_order",
          title: "Sales Order",
          number: so.so_no,
          date: so.order_date ?? so.created_at?.slice(0, 10) ?? "",
          to: customerParty(cust),
          meta: [
            { label: "Project", value: so.project?.name ?? "—" },
            { label: "Delivery date", value: so.delivery_date ?? "—" },
          ],
          lines,
          totals,
          notes: so.notes ?? undefined,
        },
        meta: {
          toName: cust?.name ?? "—",
          toEmail: cust?.primary_email ?? null,
          docNumber: so.so_no,
          customerId: so.customer_id,
          vendorId: null,
          projectId: so.project_id,
        },
      };
    }

    case "purchase_order": {
      const po = await getPurchaseOrder(id);
      if (!po) throw new Error("Purchase order not found");
      const ven = await fetchVendor(po.vendor_id);
      return {
        doc: {
          kind: "purchase_order",
          title: "Purchase Order",
          number: po.po_no,
          date: po.order_date ?? po.created_at?.slice(0, 10) ?? "",
          to: vendorParty(ven),
          meta: [
            { label: "Project", value: po.project?.name ?? "—" },
            { label: "Expected date", value: po.expected_date ?? "—" },
            { label: "Status", value: po.status },
            {
              label: "Payment terms",
              value: po.payment_schedule
                ? String(
                    typeof po.payment_schedule === "object"
                      ? JSON.stringify(po.payment_schedule)
                      : po.payment_schedule,
                  )
                : "—",
            },
          ],
          notes: po.notes ?? undefined,
        },
        meta: {
          toName: ven?.company_name ?? "—",
          toEmail: ven?.email ?? null,
          docNumber: po.po_no,
          customerId: null,
          vendorId: po.vendor_id,
          projectId: po.project_id,
        },
      };
    }

    case "invoice": {
      const i = await getInvoice(id);
      if (!i) throw new Error("Invoice not found");
      const items = await getInvoiceItems(id);
      const cust = await fetchCustomer(i.customer_id);
      const lines: PdfLine[] = items.map((it) => ({
        label: it.description,
        qty: it.quantity,
        unit: it.unit ?? "",
        rate: inr(it.unit_price),
        amount: inr(it.line_total),
      }));
      const totals: PdfMeta[] = [
        { label: "Subtotal", value: inr(i.subtotal) },
        { label: "Tax", value: inr(i.tax_amount) },
        { label: "Total", value: inr(i.total) },
        ...(Number(i.amount_paid) > 0 ? [{ label: "Amount paid", value: inr(i.amount_paid) }] : []),
        { label: "Balance due", value: inr(i.balance_due) },
      ];
      return {
        doc: {
          kind: "invoice",
          title: "Tax Invoice",
          number: i.invoice_no,
          date: i.issue_date ?? i.created_at?.slice(0, 10) ?? "",
          to: customerParty(cust),
          meta: [
            { label: "Project", value: i.project?.name ?? "—" },
            { label: "Due date", value: i.due_date ?? "—" },
            { label: "Status", value: i.status },
          ],
          lines,
          totals,
          notes: i.notes ?? undefined,
          terms: i.terms ?? undefined,
        },
        meta: {
          toName: cust?.name ?? "—",
          toEmail: cust?.primary_email ?? null,
          docNumber: i.invoice_no,
          customerId: i.customer_id,
          vendorId: null,
          projectId: i.project_id,
        },
      };
    }

    case "receipt": {
      const r = await getReceipt(id);
      if (!r) throw new Error("Receipt not found");
      const alloc = await getReceiptAllocations(id);
      const cust = await fetchCustomer(r.customer_id);
      const lines: PdfLine[] = alloc.map((a) => ({
        label: `Applied to invoice ${a.invoice?.invoice_no ?? a.invoice_id}`,
        qty: 1,
        unit: "",
        rate: inr(a.amount),
        amount: inr(a.amount),
      }));
      const totals: PdfMeta[] = [
        { label: "Amount received", value: inr(r.amount) },
        ...(Number(r.tds_amount) > 0 ? [{ label: "TDS", value: inr(r.tds_amount) }] : []),
        ...(Number(r.bank_charges) > 0
          ? [{ label: "Bank charges", value: inr(r.bank_charges) }]
          : []),
        { label: "Net amount", value: inr(r.net_amount) },
      ];
      return {
        doc: {
          kind: "receipt",
          title: "Payment Receipt",
          number: r.receipt_no,
          date: r.received_at?.slice(0, 10) ?? "",
          to: customerParty(cust),
          meta: [
            { label: "Method", value: r.method },
            { label: "Bank", value: r.bank_name ?? "—" },
            { label: "Reference", value: r.reference_no ?? r.cheque_no ?? "—" },
            { label: "Allocated", value: inr(r.allocated_amount) },
            { label: "Unallocated", value: inr(r.unallocated_amount) },
          ],
          lines: lines.length ? lines : undefined,
          totals,
          notes:
            r.remarks ??
            "Received with thanks. Please retain this acknowledgment for your records.",
        },
        meta: {
          toName: cust?.name ?? "—",
          toEmail: cust?.primary_email ?? null,
          docNumber: r.receipt_no,
          customerId: r.customer_id,
          vendorId: null,
          projectId: null,
        },
      };
    }

    case "delivery_challan": {
      const d = await getDispatch(id);
      if (!d) throw new Error("Dispatch not found");
      const items = await listDispatchItems(id);
      const cust = await fetchCustomer(d.customer_id);
      const lines: PdfLine[] = items.map((it) => ({
        label: it.description ?? it.product_name ?? "",
        qty: it.quantity,
        unit: it.unit ?? "",
      }));
      return {
        doc: {
          kind: "delivery_challan",
          title: "Delivery Challan",
          number: d.dispatch_no,
          date: d.dispatch_date ?? d.created_at?.slice(0, 10) ?? "",
          to: customerParty(cust),
          meta: [
            { label: "Site address", value: d.site_address ?? "—" },
            { label: "Vehicle", value: d.vehicle_no ?? "—" },
            { label: "Driver", value: d.driver_name ?? "—" },
            { label: "Driver phone", value: d.driver_phone ?? "—" },
            { label: "LR / Tracking", value: d.lr_no ?? d.tracking_no ?? "—" },
            { label: "Carrier", value: d.carrier ?? "—" },
          ],
          lines,
          notes:
            d.remarks ??
            "Goods dispatched in good condition. Please acknowledge receipt on this challan.",
        },
        meta: {
          toName: cust?.name ?? "—",
          toEmail: cust?.primary_email ?? null,
          docNumber: d.dispatch_no,
          customerId: d.customer_id,
          vendorId: null,
          projectId: d.project_id,
        },
      };
    }
  }
}

/** Mapping to `message_queue.related_type` for Communication Timeline. */
export function relatedTypeFor(entity: DocumentEntity): string {
  return entity;
}

/** Human-readable label per entity. */
export const DOC_ENTITY_LABEL: Record<DocumentEntity, string> = {
  estimate: "Estimate",
  quote: "Quotation",
  sales_order: "Sales Order",
  purchase_order: "Purchase Order",
  invoice: "Invoice",
  receipt: "Receipt",
  delivery_challan: "Delivery Challan",
};
