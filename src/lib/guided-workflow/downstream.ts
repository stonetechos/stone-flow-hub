/**
 * Downstream-existence probes used by GuidedNextStep to auto-suppress the
 * banner once the recommended child artefact already exists.
 *
 * Each probe uses a HEAD count query (no rows transferred) and is cached for
 * 60 s via TanStack Query so navigating between siblings doesn't refetch.
 * Suppression is best-effort — if a probe errors we treat it as "unknown"
 * and let the banner render.
 */
import { supabase } from "@/integrations/supabase/client";
import type { GuidedEntity } from "@/lib/guided-workflow/steps";

async function countByEq(
  table:
    | "enquiries"
    | "projects"
    | "quotes"
    | "sales_orders"
    | "purchase_orders"
    | "production_orders"
    | "dispatches"
    | "installations"
    | "invoices"
    | "payments"
    | "followups",
  column: string,
  value: string,
): Promise<number> {
  const q = supabase
    .from(table as never)
    .select("id", { count: "exact", head: true })
    .eq(column as never, value as never);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

/** Runs the appropriate downstream count query for the given entity. */
export async function probeDownstream(
  entity: GuidedEntity,
  entityId: string,
): Promise<boolean> {
  switch (entity) {
    case "customer":
      return (await countByEq("enquiries", "customer_id", entityId)) > 0;
    case "enquiry":
      return (await countByEq("projects", "enquiry_id", entityId)) > 0;
    case "project":
      return (await countByEq("quotes", "project_id", entityId)) > 0;
    case "quote":
      return (await countByEq("sales_orders", "quote_id", entityId)) > 0;
    case "sales_order":
      return (await countByEq("purchase_orders", "sales_order_id", entityId)) > 0;
    case "purchase_order":
      // Production is typically linked to the sales order, not the PO. If the
      // PO row has a sales_order_id we can still probe by that; otherwise we
      // conservatively return false.
      return false;
    case "production_order":
      return (await countByEq("dispatches", "production_order_id", entityId)) > 0;
    case "dispatch":
      return (await countByEq("installations", "dispatch_id", entityId)) > 0;
    case "installation":
      return (await countByEq("invoices", "installation_id", entityId)) > 0;
    case "invoice":
      return (await countByEq("payments", "invoice_id", entityId)) > 0;
    case "receipt":
      return (await countByEq("followups", "customer_id", entityId)) > 0;
    default:
      return false;
  }
}

export const downstreamQueryKey = (entity: GuidedEntity, entityId: string) =>
  ["guided-downstream", entity, entityId] as const;
