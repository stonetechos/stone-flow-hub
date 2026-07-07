/** Build a Stone Tech placeholder context for a given ERP document. */
import { supabase } from "@/integrations/supabase/client";
import { money, fmtDate, type StoneTechContext } from "./render";

export type DocEntityType =
  | "estimate" | "quote" | "invoice" | "receipt"
  | "sales_order" | "dispatch" | "purchase_order" | "reminder" | "followup";

interface BuildOpts {
  entityType: DocEntityType;
  entityId: string;
  paymentLinkUrl?: string | null;
}

export async function buildDocumentContext({ entityType, entityId, paymentLinkUrl }: BuildOpts): Promise<{
  ctx: StoneTechContext;
  customerId: string | null;
  vendorId?: string | null;
  projectId: string | null;
  defaultTo?: { email?: string; phone?: string };
}> {
  const link = paymentLinkUrl ? `Pay online: ${paymentLinkUrl}` : "";

  switch (entityType) {
    case "estimate": {
      const { data: e } = await supabase.from("estimates").select("*, customer:customers(id,name,email,phone), project:projects(id,name), items:estimate_items(*)").eq("id", entityId).maybeSingle();
      const it = (e?.items?.[0] ?? {}) as Record<string, unknown>;
      return {
        customerId: e?.customer?.id ?? null,
        projectId: e?.project?.id ?? null,
        defaultTo: { email: e?.customer?.email ?? undefined, phone: e?.customer?.phone ?? undefined },
        ctx: {
          CustomerName: e?.customer?.name ?? "", ProjectName: e?.project?.name ?? "",
          EstimateNo: e?.estimate_no ?? "",
          StoneType: String(it["stone_type"] ?? ""), SurfaceFinish: String(it["surface_finish"] ?? ""),
          EdgeFinish: String(it["edge_finish"] ?? ""), Material: String(it["description"] ?? ""),
          Area: String(it["quantity"] ?? ""), Uom: String(it["unit"] ?? "sqft"),
          Quantity: String(it["quantity"] ?? ""),
          MaterialCost: money(Number(e?.subtotal ?? 0)),
          InstallationCost: money(0), ManufacturingCost: money(0),
          GST: money(Number(e?.gst_amount ?? 0)),
          Advance: money(Number(e?.total ?? 0) * 0.5),
          InvoiceAmount: money(Number(e?.total ?? 0)),
          PaymentLink: link,
          Date: fmtDate(e?.created_at),
        },
      };
    }
    case "quote": {
      const { data: q } = await supabase.from("quotes").select("*, customer:customers(id,name,email,phone), project:projects(id,name)").eq("id", entityId).maybeSingle();
      return {
        customerId: q?.customer?.id ?? null, projectId: q?.project?.id ?? null,
        defaultTo: { email: q?.customer?.email ?? undefined, phone: q?.customer?.phone ?? undefined },
        ctx: {
          CustomerName: q?.customer?.name ?? "", ProjectName: q?.project?.name ?? "",
          QuotationNo: q?.quote_no ?? "",
          GST: money(Number(q?.gst_amount ?? 0)),
          InvoiceAmount: money(Number(q?.total ?? 0)),
          PaymentLink: link, Date: fmtDate(q?.created_at),
        },
      };
    }
    case "invoice": {
      const { data: i } = await supabase.from("invoices").select("*, customer:customers(id,name,email,phone), project:projects(id,name)").eq("id", entityId).maybeSingle();
      return {
        customerId: i?.customer?.id ?? null, projectId: i?.project?.id ?? null,
        defaultTo: { email: i?.customer?.email ?? undefined, phone: i?.customer?.phone ?? undefined },
        ctx: {
          CustomerName: i?.customer?.name ?? "", ProjectName: i?.project?.name ?? "",
          InvoiceNo: i?.invoice_no ?? "",
          InvoiceAmount: money(Number(i?.total ?? 0)),
          Outstanding: money(Number(i?.balance_due ?? 0)),
          GST: money(Number(i?.gst_amount ?? 0)),
          PaymentLink: link, Date: fmtDate(i?.issue_date ?? i?.created_at),
        },
      };
    }
    case "receipt": {
      const { data: r } = await supabase.from("receipts").select("*, customer:customers(id,name,email,phone)").eq("id", entityId).maybeSingle();
      return {
        customerId: r?.customer?.id ?? null, projectId: null,
        defaultTo: { email: r?.customer?.email ?? undefined, phone: r?.customer?.phone ?? undefined },
        ctx: {
          CustomerName: r?.customer?.name ?? "", ReceiptNo: r?.receipt_no ?? "",
          InvoiceAmount: money(Number(r?.net_amount ?? r?.amount ?? 0)),
          Date: fmtDate(r?.received_at),
        },
      };
    }
    case "sales_order": {
      const { data: so } = await supabase.from("sales_orders").select("*, customer:customers(id,name,email,phone), project:projects(id,name)").eq("id", entityId).maybeSingle();
      return {
        customerId: so?.customer?.id ?? null, projectId: so?.project?.id ?? null,
        defaultTo: { email: so?.customer?.email ?? undefined, phone: so?.customer?.phone ?? undefined },
        ctx: {
          CustomerName: so?.customer?.name ?? "", ProjectName: so?.project?.name ?? "",
          SoNo: so?.so_no ?? "",
          InvoiceAmount: money(Number(so?.total ?? 0)),
          Date: fmtDate(so?.created_at),
        },
      };
    }
    case "dispatch": {
      const { data: d } = await supabase.from("dispatches").select("*, customer:customers(id,name,email,phone), project:projects(id,name)").eq("id", entityId).maybeSingle();
      return {
        customerId: d?.customer?.id ?? null, projectId: d?.project?.id ?? null,
        defaultTo: { email: d?.customer?.email ?? undefined, phone: d?.customer?.phone ?? undefined },
        ctx: {
          CustomerName: d?.customer?.name ?? "", ProjectName: d?.project?.name ?? "",
          DispatchNo: d?.dispatch_no ?? "", DispatchDate: fmtDate(d?.dispatched_at ?? d?.created_at),
          Tracking: d?.tracking_no ?? "",
          Date: fmtDate(d?.created_at),
        },
      };
    }
    case "purchase_order": {
      const { data: po } = await supabase.from("purchase_orders").select("*, vendor:vendors(id,name,email,phone)").eq("id", entityId).maybeSingle();
      return {
        customerId: null, vendorId: po?.vendor?.id ?? null, projectId: null,
        defaultTo: { email: po?.vendor?.email ?? undefined, phone: po?.vendor?.phone ?? undefined },
        ctx: {
          VendorName: po?.vendor?.name ?? "", PoNo: po?.po_no ?? "",
          InvoiceAmount: money(Number(po?.total ?? 0)),
          GST: money(Number(po?.gst_amount ?? 0)),
          Date: fmtDate(po?.created_at),
        },
      };
    }
    default:
      return { customerId: null, projectId: null, ctx: { PaymentLink: link } };
  }
}
