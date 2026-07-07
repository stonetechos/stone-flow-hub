/**
 * Master Data dependency scanner.
 *
 * Wraps the `dependency_summary(entity_type, entity_id)` Postgres RPC that
 * returns per-module reference counts for any core business record. This is
 * the reusable delete-validation service used by SafeDeleteDialog and by the
 * admin-only `purge_entity` RPC. Each new entity kind added on the SQL side
 * is picked up automatically here by widening `MdmEntityType`.
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export type MdmEntityType =
  | "customer"
  | "vendor"
  | "project"
  | "product"
  | "estimate"
  | "quote"
  | "sales_order"
  | "purchase_order";

export interface DependencyRow {
  /** Human-readable module name, e.g. "Projects", "Invoices". */
  module: string;
  /** Reference count in that module. */
  count: number;
  /** Preview route to open the module list; empty when there is no listing surface. */
  route: string;
}

export interface DependencyReport {
  rows: DependencyRow[];
  totalBlocking: number;
  totalReferences: number;
  canDelete: boolean;
}

/** Modules whose presence blocks a hard delete (financial + transactional). */
const BLOCKING_MODULES = new Set([
  "Projects",
  "Enquiries",
  "Estimates",
  "Quotations",
  "Sales Orders",
  "Purchase Orders",
  "Invoices",
  "Receipts",
  "Credit Notes",
  "Debit Notes",
  "Refunds",
  "Production Orders",
  "RFQ Requests",
  "Vendor Quotes",
  "Quote Items",
  "Invoice Items",
  "RFQ Items",
  "Estimate Items",
  "Inventory Items",
  "Dispatches",
  "Ledger Entries",
]);

export async function scanDependencies(
  entityType: MdmEntityType,
  entityId: string,
): Promise<DependencyReport> {
  const { data, error } = await supabase.rpc("dependency_summary", {
    _entity_type: entityType,
    _entity_id: entityId,
  });
  if (error) throw new AppError(mapDbError(error));

  const rows: DependencyRow[] = ((data ?? []) as DependencyRow[])
    .map((r) => ({ module: r.module, count: Number(r.count) || 0, route: r.route ?? "" }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  const totalBlocking = rows
    .filter((r) => BLOCKING_MODULES.has(r.module))
    .reduce((acc, r) => acc + r.count, 0);
  const totalReferences = rows.reduce((acc, r) => acc + r.count, 0);

  return {
    rows,
    totalBlocking,
    totalReferences,
    canDelete: totalBlocking === 0,
  };
}
