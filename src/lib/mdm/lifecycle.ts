/**
 * MDM lifecycle helpers.
 *
 * `lifecycle_status` (active | inactive | archived | deleted) is present on
 * customers, vendors, projects and products. Toggling the status on the row
 * is enough — a BEFORE trigger keeps the legacy `is_active` flag in sync so
 * all existing pickers and list filters continue to work unchanged.
 *
 * Hard purge is admin-only and calls the `purge_entity` RPC, which itself
 * re-runs the dependency scan server-side and refuses when anything is
 * blocking.
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { MdmEntityType } from "./dependencies";

export type LifecycleStatus = "active" | "inactive" | "archived" | "deleted";

export const LIFECYCLE_STATUSES: LifecycleStatus[] = [
  "active",
  "inactive",
  "archived",
  "deleted",
];

/** Maps our MDM entity kinds to their base table names. */
const TABLE_FOR: Record<MdmEntityType, string | null> = {
  customer: "customers",
  vendor: "vendors",
  project: "projects",
  product: "products",
  // transaction docs don't participate in the lifecycle flow (yet)
  estimate: null,
  quote: null,
  sales_order: null,
  purchase_order: null,
  enquiry: null,
  invoice: null,
};

export async function setLifecycleStatus(
  entityType: MdmEntityType,
  entityId: string,
  status: LifecycleStatus,
): Promise<void> {
  const table = TABLE_FOR[entityType];
  if (!table) {
    throw new AppError(`Lifecycle is not tracked for ${entityType}.`);
  }
  // Cast avoids widening the Database Update types for every base table.
  const { error } = await supabase
    .from(table as never)
    .update({ lifecycle_status: status } as never)
    .eq("id" as never, entityId as never);
  if (error) throw new AppError(mapDbError(error));
}

/** Admin-only permanent purge. Server enforces role + dependency guard. */
export async function purgeEntity(
  entityType: MdmEntityType,
  entityId: string,
): Promise<void> {
  const { error } = await supabase.rpc("purge_entity" as never, {
    _entity_type: entityType,
    _entity_id: entityId,
  } as never);
  if (error) throw new AppError(mapDbError(error));
}

export function lifecycleLabel(s: LifecycleStatus): string {
  switch (s) {
    case "active":
      return "Active";
    case "inactive":
      return "Inactive";
    case "archived":
      return "Archived";
    case "deleted":
      return "Deleted";
  }
}
