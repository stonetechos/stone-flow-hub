import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export type ProcurementEventType =
  | "followup"
  | "vendor_commitment"
  | "customer_commitment"
  | "material_arrival"
  | "vendor_payment"
  | "customer_payment"
  | "dispatch";

export type ProcurementCalendarEvent = {
  id: string;
  event_date: string;
  event_type: ProcurementEventType;
  title: string;
  enquiry_id: string | null;
  project_id: string | null;
  vendor_id: string | null;
  purchase_order_id: string | null;
  status: string | null;
};

export const EVENT_LABELS: Record<ProcurementEventType, string> = {
  followup: "Follow-up",
  vendor_commitment: "Vendor commitment",
  customer_commitment: "Customer commitment",
  material_arrival: "Material arrival",
  vendor_payment: "Vendor payment",
  customer_payment: "Customer payment",
  dispatch: "Dispatch",
};

export const EVENT_COLORS: Record<ProcurementEventType, string> = {
  followup: "bg-status-warning-bg text-status-warning-fg border border-status-warning-border",
  vendor_commitment: "bg-status-info-bg text-status-info-fg border border-status-info-border",
  customer_commitment: "bg-muted text-foreground border border-border",
  material_arrival:
    "bg-status-success-bg text-status-success-fg border border-status-success-border",
  vendor_payment: "bg-status-danger-bg text-status-danger-fg border border-status-danger-border",
  customer_payment:
    "bg-status-success-bg text-status-success-fg border border-status-success-border",
  dispatch: "bg-status-info-bg text-status-info-fg border border-status-info-border",
};

export async function listProcurementCalendar(params: {
  from: string;
  to: string;
}): Promise<ProcurementCalendarEvent[]> {
  const { data, error } = await supabase
    .from("procurement_calendar" as never)
    .select("*")
    .gte("event_date", params.from)
    .lte("event_date", params.to)
    .order("event_date");
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as ProcurementCalendarEvent[];
}
