/** Stone Tech placeholder resolver — merges document context into template body. */
import { interpolate } from "./templates";
import { formatInr } from "@/lib/format";

export type StoneTechContext = Partial<{
  CustomerName: string;
  VendorName: string;
  ProjectName: string;
  EstimateNo: string;
  QuotationNo: string;
  InvoiceNo: string;
  ReceiptNo: string;
  DispatchNo: string;
  PoNo: string;
  SoNo: string;
  Material: string;
  StoneType: string;
  SurfaceFinish: string;
  EdgeFinish: string;
  Area: string | number;
  Uom: string;
  SqFt: string | number;
  Quantity: string | number;
  InstallationCost: string;
  MaterialCost: string;
  ManufacturingCost: string;
  GST: string;
  Advance: string;
  Outstanding: string;
  DispatchDate: string;
  InvoiceAmount: string;
  PaymentLink: string;
  Subject: string;
  Tracking: string;
  Date: string;
}>;

export function money(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? Number(n) : n;
  if (v == null || Number.isNaN(v)) return "";
  return formatInr(v);
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(d);
  }
}

/** Render a template body with a Stone Tech context. Empty placeholders collapse cleanly. */
export function renderStoneTech(body: string, ctx: StoneTechContext): string {
  const flat: Record<string, string | number | null | undefined> = {};
  for (const [k, v] of Object.entries(ctx)) flat[k] = v as string | number | null | undefined;
  // Also add lowercase aliases (matches legacy templates like {{customer_name}}).
  flat.customer_name = ctx.CustomerName;
  flat.vendor_name = ctx.VendorName;
  flat.estimate_no = ctx.EstimateNo;
  flat.quotation_no = ctx.QuotationNo;
  flat.receipt_no = ctx.ReceiptNo;
  flat.invoice_no = ctx.InvoiceNo;
  flat.dispatch_no = ctx.DispatchNo;
  flat.total = ctx.InvoiceAmount;
  flat.amount = ctx.InvoiceAmount;
  flat.company_name = "Stone Tech";
  return interpolate(body, flat, { escape: false });
}

/** Extract every placeholder that resolves to an empty string, so the UI can warn. */
export function findMissingPlaceholders(body: string, ctx: StoneTechContext): string[] {
  const rendered = renderStoneTech(body, ctx);
  const remaining = new Set<string>();
  for (const m of rendered.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) remaining.add(m[1]);
  return Array.from(remaining);
}
