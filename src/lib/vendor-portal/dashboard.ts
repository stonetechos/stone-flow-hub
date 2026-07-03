/** Vendor dashboard KPIs — actionable counts only. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export interface VendorKpis {
  newRfqs: number;
  awaitingSubmission: number;
  submitted: number;
  approved: number;
  orders: number;
  dispatchDue: number;
}

async function count(table: "vendor_requests" | "vendor_quotes" | "purchase_orders",
  build: (q: ReturnType<typeof supabase.from>) => ReturnType<typeof supabase.from>): Promise<number> {
  // Simple exact count.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base: any = supabase.from(table).select("*", { count: "exact", head: true });
  const { count: c, error } = await build(base);
  if (error) throw new AppError(mapDbError(error));
  return c ?? 0;
}

export async function getVendorKpis(): Promise<VendorKpis> {
  const today = new Date().toISOString().slice(0, 10);

  // Requests where the vendor never opened the RFQ.
  const [newRfqs, awaiting, submitted, approved, orders] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count("vendor_requests", (q: any) => q.is("first_viewed_at", null)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count("vendor_requests", (q: any) => q.eq("response_status", "pending")),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count("vendor_quotes", (q: any) => q.not("submitted_at", "is", null)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count("vendor_quotes", (q: any) => q.eq("is_approved", true)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count("purchase_orders", (q: any) => q.not("status", "is", null)),
  ]);

  // Dispatch due: POs with expected_date <= today and status not completed. Best-effort.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dispatchDue = await count("purchase_orders", (q: any) =>
    q.lte("expected_date", today).neq("status", "completed"),
  );

  return {
    newRfqs,
    awaitingSubmission: awaiting,
    submitted,
    approved,
    orders,
    dispatchDue,
  };
}
