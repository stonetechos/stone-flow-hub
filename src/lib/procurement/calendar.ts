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
  followup: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  vendor_commitment: "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200",
  customer_commitment: "bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
  material_arrival: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  vendor_payment: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
  customer_payment: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  dispatch: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
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
