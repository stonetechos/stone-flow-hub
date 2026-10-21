/** Allowed status transitions for transactional documents. UI-side guards. */
import type { Database } from "@/integrations/supabase/types";

export type SalesOrderStatus = Database["public"]["Enums"]["sales_order_status"];
export type DispatchStatus = Database["public"]["Enums"]["dispatch_status"];
export type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];
export type PurchaseOrderStatus = Database["public"]["Enums"]["purchase_order_status"];

const SO: Record<SalesOrderStatus, SalesOrderStatus[]> = {
  draft: ["draft", "confirmed", "cancelled"],
  confirmed: ["confirmed", "in_production", "cancelled"],
  in_production: ["in_production", "ready", "cancelled"],
  ready: ["ready", "shipped", "cancelled"],
  shipped: ["shipped", "delivered"],
  delivered: ["delivered"],
  cancelled: ["cancelled"],
};

const DISP: Record<DispatchStatus, DispatchStatus[]> = {
  planned: ["planned", "in_transit", "delivered", "cancelled"],
  in_transit: ["planned", "in_transit", "delivered", "cancelled"],
  delivered: ["planned", "in_transit", "delivered", "cancelled"],
  cancelled: ["planned", "in_transit", "delivered", "cancelled"],
};

const INV: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ["draft", "issued", "sent", "cancelled", "void"],
  issued: ["issued", "sent", "partially_paid", "paid", "overdue", "cancelled", "void"],
  sent: ["sent", "partially_paid", "paid", "overdue", "cancelled", "void"],
  partially_paid: ["partially_paid", "paid", "overdue", "cancelled", "void"],
  overdue: ["overdue", "partially_paid", "paid", "cancelled", "void"],
  paid: ["paid"],
  cancelled: ["cancelled", "void"],
  void: ["void", "draft"],
};

const PO: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  draft: ["draft", "sent", "cancelled"],
  sent: ["sent", "acknowledged", "cancelled"],
  acknowledged: ["acknowledged", "partially_received", "received", "cancelled"],
  partially_received: ["partially_received", "received", "cancelled"],
  received: ["received"],
  cancelled: ["cancelled"],
};

export function allowedNextSalesOrderStatuses(current: SalesOrderStatus): SalesOrderStatus[] {
  return SO[current] ?? [current];
}
export function allowedNextDispatchStatuses(current: DispatchStatus): DispatchStatus[] {
  return DISP[current] ?? [current];
}
export function allowedNextInvoiceStatuses(current: InvoiceStatus): InvoiceStatus[] {
  return INV[current] ?? [current];
}
export function allowedNextPurchaseOrderStatuses(
  current: PurchaseOrderStatus,
): PurchaseOrderStatus[] {
  return PO[current] ?? [current];
}
