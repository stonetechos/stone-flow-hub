/** Build a Stone Tech placeholder context for any ERP document. Uses loose casts because the
 *  join shape varies per table; runtime validated via `?.` chains and defaults. */
import { supabase } from "@/integrations/supabase/client";
import { money, fmtDate, type StoneTechContext } from "./render";

export type DocEntityType =
  | "estimate" | "quote" | "invoice" | "receipt"
  | "sales_order" | "dispatch" | "purchase_order" | "reminder" | "followup";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

interface BuildOpts {
  entityType: DocEntityType;
  entityId: string;
  paymentLinkUrl?: string | null;
}

export interface BuiltContext {
  ctx: StoneTechContext;
  customerId: string | null;
  vendorId?: string | null;
  projectId: string | null;
  defaultTo?: { email?: string; phone?: string };
}

export async function buildDocumentContext({ entityType, entityId, paymentLinkUrl }: BuildOpts): Promise<BuiltContext> {
  const link = paymentLinkUrl ? `Pay online: ${paymentLinkUrl}` : "";
  const from = (t: string) => (supabase.from as unknown as (n: string) => Any)(t);

  switch (entityType) {
    case "estimate": {
      const { data: e } = await from("estimates")
        .select("*, customer:customers(id,name,primary_email,primary_phone), project:projects(id,name), items:estimate_items(*)")
        .eq("id", entityId).maybeSingle();
      const it = (e?.items?.[0] ?? {}) as Any;
      return {
        customerId: e?.customer?.id ?? null, projectId: e?.project?.id ?? null,
        defaultTo: { email: e?.customer?.primary_email ?? undefined, phone: e?.customer?.primary_phone ?? undefined },
        ctx: {
          CustomerName: e?.customer?.name ?? "", ProjectName: e?.project?.name ?? "",
          EstimateNo: e?.estimate_no ?? "",
          StoneType: String(it.stone_type ?? ""), SurfaceFinish: String(it.surface_finish ?? ""),
          EdgeFinish: String(it.edge_finish ?? ""), Material: String(it.description ?? ""),
          Area: String(it.quantity ?? ""), Uom: String(it.unit ?? "sqft"), Quantity: String(it.quantity ?? ""),
          MaterialCost: money(Number(e?.material_cost ?? e?.subtotal ?? 0)),
          InstallationCost: money(Number(e?.installation_cost ?? 0)),
          ManufacturingCost: money(Number(e?.manufacturing_cost ?? 0)),
          GST: money(Number(e?.gst_amount ?? 0)),
          Advance: money(Number(e?.total ?? 0) * 0.5),
          InvoiceAmount: money(Number(e?.total ?? 0)),
          PaymentLink: link, Date: fmtDate(e?.created_at),
        },
      };
    }
    case "quote": {
      const { data: q } = await from("quotes")
        .select("*, customer:customers(id,name,primary_email,primary_phone), project:projects(id,name)")
        .eq("id", entityId).maybeSingle();
      return {
        customerId: q?.customer?.id ?? null, projectId: q?.project?.id ?? null,
        defaultTo: { email: q?.customer?.primary_email ?? undefined, phone: q?.customer?.primary_phone ?? undefined },
        ctx: {
          CustomerName: q?.customer?.name ?? "", ProjectName: q?.project?.name ?? "",
          QuotationNo: q?.quote_no ?? "",
          GST: money(Number(q?.tax_amount ?? 0)),
          InvoiceAmount: money(Number(q?.total ?? 0)),
          PaymentLink: link, Date: fmtDate(q?.created_at),
        },
      };
    }
    case "invoice": {
      const { data: i } = await from("invoices")
        .select("*, customer:customers(id,name,primary_email,primary_phone), project:projects(id,name)")
        .eq("id", entityId).maybeSingle();
      return {
        customerId: i?.customer?.id ?? null, projectId: i?.project?.id ?? null,
        defaultTo: { email: i?.customer?.primary_email ?? undefined, phone: i?.customer?.primary_phone ?? undefined },
        ctx: {
          CustomerName: i?.customer?.name ?? "", ProjectName: i?.project?.name ?? "",
          InvoiceNo: i?.invoice_no ?? "",
          InvoiceAmount: money(Number(i?.total ?? 0)),
          Outstanding: money(Number(i?.balance_due ?? 0)),
          GST: money(Number(i?.tax_amount ?? 0)),
          PaymentLink: link, Date: fmtDate(i?.issue_date ?? i?.created_at),
        },
      };
    }
    case "receipt": {
      const { data: r } = await from("receipts")
        .select("*, customer:customers(id,name,primary_email,primary_phone)")
        .eq("id", entityId).maybeSingle();
      return {
        customerId: r?.customer?.id ?? null, projectId: null,
        defaultTo: { email: r?.customer?.primary_email ?? undefined, phone: r?.customer?.primary_phone ?? undefined },
        ctx: {
          CustomerName: r?.customer?.name ?? "", ReceiptNo: r?.receipt_no ?? "",
          InvoiceAmount: money(Number(r?.net_amount ?? r?.amount ?? 0)),
          Date: fmtDate(r?.received_at),
        },
      };
    }
    case "sales_order": {
      const { data: so } = await from("sales_orders")
        .select("*, customer:customers(id,name,primary_email,primary_phone), project:projects(id,name)")
        .eq("id", entityId).maybeSingle();
      return {
        customerId: so?.customer?.id ?? null, projectId: so?.project?.id ?? null,
        defaultTo: { email: so?.customer?.primary_email ?? undefined, phone: so?.customer?.primary_phone ?? undefined },
        ctx: {
          CustomerName: so?.customer?.name ?? "", ProjectName: so?.project?.name ?? "",
          SoNo: so?.so_no ?? "", Date: fmtDate(so?.created_at),
        },
      };
    }
    case "dispatch": {
      const { data: d } = await from("dispatches")
        .select("*, sales_order:sales_orders(customer_id,project_id, customer:customers(id,name,primary_email,primary_phone), project:projects(id,name))")
        .eq("id", entityId).maybeSingle();
      const cust = d?.sales_order?.customer;
      const proj = d?.sales_order?.project;
      return {
        customerId: cust?.id ?? null, projectId: proj?.id ?? null,
        defaultTo: { email: cust?.primary_email ?? undefined, phone: cust?.primary_phone ?? undefined },
        ctx: {
          CustomerName: cust?.name ?? "", ProjectName: proj?.name ?? "",
          DispatchNo: d?.dispatch_no ?? "",
          DispatchDate: fmtDate(d?.dispatch_date ?? d?.created_at),
          Tracking: d?.tracking_no ?? "", Date: fmtDate(d?.created_at),
        },
      };
    }
    case "purchase_order": {
      const { data: po } = await from("purchase_orders")
        .select("*, vendor:vendors(id,name,primary_email,primary_phone)")
        .eq("id", entityId).maybeSingle();
      return {
        customerId: null, vendorId: po?.vendor?.id ?? null, projectId: null,
        defaultTo: { email: po?.vendor?.primary_email ?? undefined, phone: po?.vendor?.primary_phone ?? undefined },
        ctx: {
          VendorName: po?.vendor?.name ?? "", PoNo: po?.po_no ?? "",
          InvoiceAmount: money(Number(po?.total ?? 0)),
          Date: fmtDate(po?.created_at),
        },
      };
    }
    default:
      return { customerId: null, projectId: null, ctx: { PaymentLink: link } };
  }
}
