/** Procurement dashboard KPIs — reads the `procurement_kpis` view. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export interface ProcurementKpis {
  rfqs_awaiting_response: number;
  vendor_quotations_received: number;
  quotations_pending_approval: number;
  purchase_orders_pending: number;
  purchase_orders_delayed: number;
  material_awaiting_dispatch: number;
  material_received: number;
  vendor_outstanding: number;
  vendor_advances: number;
  procurement_pipeline: number;
  vendors_awaiting_payment: number;
}

export async function getProcurementKpis(): Promise<ProcurementKpis> {
  const { data, error } = await supabase
    .from("procurement_kpis" as never)
    .select("*")
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  const r = (data ?? {}) as Partial<Record<keyof ProcurementKpis, number | string>>;
  const n = (k: keyof ProcurementKpis) => Number(r[k] ?? 0);
  return {
    rfqs_awaiting_response: n("rfqs_awaiting_response"),
    vendor_quotations_received: n("vendor_quotations_received"),
    quotations_pending_approval: n("quotations_pending_approval"),
    purchase_orders_pending: n("purchase_orders_pending"),
    purchase_orders_delayed: n("purchase_orders_delayed"),
    material_awaiting_dispatch: n("material_awaiting_dispatch"),
    material_received: n("material_received"),
    vendor_outstanding: n("vendor_outstanding"),
    vendor_advances: n("vendor_advances"),
    procurement_pipeline: n("procurement_pipeline"),
    vendors_awaiting_payment: n("vendors_awaiting_payment"),
  };
}
