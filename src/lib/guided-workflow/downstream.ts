/**
 * Downstream-existence probes used by GuidedNextStep to auto-suppress the
 * banner once the recommended child artefact already exists.
 *
 * Each probe uses a HEAD count query (no rows transferred) and is cached for
 * 60 s via TanStack Query so navigating between siblings doesn't refetch.
 * Suppression is best-effort — for hops where the schema has no direct FK
 * we return `false` so the banner keeps showing (safer than false-hiding).
 */
import { supabase } from "@/integrations/supabase/client";
import type { GuidedContext, GuidedEntity } from "@/lib/guided-workflow/steps";

async function hasAny(table: string, column: string, value: string): Promise<boolean> {
  const { count, error } = await supabase
    // Table name is a build-time literal picked from a fixed allow-list below.
    // Untyped call is intentional to keep this helper generic.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from(table as any)
    .select("id", { count: "exact", head: true })
    .eq(column, value);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/**
 * Returns true iff the recommended child artefact for `entity` already
 * exists. Intelligently checks dispatches, delivery details, and payments.
 */
export async function probeDownstream(
  entity: GuidedEntity,
  entityId: string,
  ctx?: GuidedContext,
): Promise<boolean> {
  switch (entity) {
    case "customer":
      return hasAny("quotes", "customer_id", entityId);
    case "quote":
      return hasAny("invoices", "quote_id", entityId);
    case "invoice": {
      // 1. If context explicitly marks dispatch as existing
      if (ctx?.has_dispatch) return true;

      try {
        // 2. Check if invoice itself has delivery challan / vehicle / transporter details
        const { data: inv } = await supabase
          .from("invoices")
          .select(
            "customer_id, project_id, dispatch_date, vehicle_no, truck_no, lr_no, eway_bill_no, transporter, balance_due",
          )
          .eq("id", entityId)
          .maybeSingle();

        if (
          inv?.dispatch_date ||
          inv?.vehicle_no ||
          inv?.truck_no ||
          inv?.lr_no ||
          inv?.eway_bill_no ||
          inv?.transporter
        ) {
          return true;
        }

        // 3. Check if an active delivery challan / dispatch exists for this customer
        const customerId = ctx?.customer_id || inv?.customer_id;
        if (customerId) {
          const { count } = await supabase
            .from("dispatches")
            .select("id", { count: "exact", head: true })
            .eq("customer_id", customerId)
            .neq("status", "cancelled");
          if ((count ?? 0) > 0) return true;
        }

        // 4. Check if a dispatch exists for this project
        const projectId = ctx?.project_id || inv?.project_id;
        if (projectId) {
          const { count } = await supabase
            .from("dispatches")
            .select("id", { count: "exact", head: true })
            .eq("project_id", projectId)
            .neq("status", "cancelled");
          if ((count ?? 0) > 0) return true;
        }

        // 5. If balance is 0 and payment recorded, all done
        if (inv && Number(inv.balance_due) <= 0) {
          return true;
        }
      } catch {
        // Keep banner visible on network error
      }
      return false;
    }
    default:
      // sales_order / purchase_order / production_order / dispatch /
      // installation / receipt — no direct FK to probe cheaply. Keep the
      // banner visible; the user can dismiss with "Skip for now".
      return false;
  }
}

export const downstreamQueryKey = (
  entity: GuidedEntity,
  entityId: string,
  hasDispatch?: boolean | null,
) =>
  hasDispatch !== undefined
    ? (["guided-downstream", entity, entityId, hasDispatch] as const)
    : (["guided-downstream", entity, entityId] as const);
