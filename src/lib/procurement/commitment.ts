/** Vendor Commitment Engine — client wrapper for procurement RPCs. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export type PaymentScheduleRow = { label: string; pct: number; stage: string };

export interface LockCheck {
  ok: boolean;
  estimate_id: string | null;
  estimate_status: string | null;
  estimate_total: number;
  commercial_scenario: string | null;
  payment_schedule: PaymentScheduleRow[];
  advance_required: number;
  advance_received: number;
  advance_gap: number;
  customer_delivery_date: string | null;
  vendor_delivery_default: string | null;
  project_id: string | null;
  project_name: string | null;
  customer_id: string | null;
  vendor_id: string | null;
  rfq_id: string | null;
}

export async function checkProcurementLock(quoteId: string): Promise<LockCheck> {
  const { data, error } = await supabase.rpc(
    "procurement_lock_check" as never,
    { p_quote_id: quoteId } as never,
  );
  if (error) throw new AppError(mapDbError(error));
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    ok: Boolean(raw.ok),
    estimate_id: (raw.estimate_id as string | null) ?? null,
    estimate_status: (raw.estimate_status as string | null) ?? null,
    estimate_total: Number(raw.estimate_total ?? 0),
    commercial_scenario: (raw.commercial_scenario as string | null) ?? null,
    payment_schedule: (raw.payment_schedule as PaymentScheduleRow[] | null) ?? [],
    advance_required: Number(raw.advance_required ?? 0),
    advance_received: Number(raw.advance_received ?? 0),
    advance_gap: Number(raw.advance_gap ?? 0),
    customer_delivery_date: (raw.customer_delivery_date as string | null) ?? null,
    vendor_delivery_default: (raw.vendor_delivery_default as string | null) ?? null,
    project_id: (raw.project_id as string | null) ?? null,
    project_name: (raw.project_name as string | null) ?? null,
    customer_id: (raw.customer_id as string | null) ?? null,
    vendor_id: (raw.vendor_id as string | null) ?? null,
    rfq_id: (raw.rfq_id as string | null) ?? null,
  };
}

export interface CreatePoInput {
  quoteId: string;
  vendorDeliveryDate?: string | null;
  overrideReason?: string | null;
  paymentSchedule?: PaymentScheduleRow[] | null;
}

export async function createPoFromVendorQuote(input: CreatePoInput): Promise<string> {
  const { data, error } = await supabase.rpc("create_po_from_vendor_quote" as never, {
    p_quote_id: input.quoteId,
    p_vendor_delivery: input.vendorDeliveryDate ?? null,
    p_override_reason: input.overrideReason ?? null,
    p_payment_schedule: input.paymentSchedule ?? null,
  } as never);
  if (error) throw new AppError(mapDbError(error));
  return String(data);
}

export function riskFor(vendorDelivery: string | null, customerDelivery: string | null): "ok" | "warning" | "critical" {
  if (!vendorDelivery || !customerDelivery) return "ok";
  const v = new Date(vendorDelivery).getTime();
  const c = new Date(customerDelivery).getTime();
  if (v > c) return "critical";
  if (v > c - 2 * 86400_000) return "warning";
  return "ok";
}
