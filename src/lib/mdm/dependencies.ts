/**
 * Master Data dependency scanner.
 *
 * Wraps `dependency_summary(entity_type, entity_id)`, which enumerates every
 * table that references the given master row via a foreign key and returns
 * per-module counts plus a `blocking` flag. `blocking` mirrors the actual
 * Postgres FK ON DELETE action, so the confirmation dialog and the eventual
 * DELETE always agree.
 *
 * Blocking → FK is RESTRICT / NO ACTION. Delete is refused.
 * Non-blocking → FK is CASCADE / SET NULL / SET DEFAULT. Delete succeeds and
 * the child rows will be removed or detached.
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
  | "purchase_order"
  | "enquiry"
  | "invoice";

export interface DependencyRow {
  /** Human-readable module name, e.g. "Projects", "Invoices". */
  module: string;
  /** Row count in that module. */
  count: number;
  /** Preview route to open the module list; empty when there is no listing surface. */
  route: string;
  /** True when this reference will block the delete (FK RESTRICT / NO ACTION). */
  blocking: boolean;
}

export interface DependencyReport {
  rows: DependencyRow[];
  blockingRows: DependencyRow[];
  cascadingRows: DependencyRow[];
  totalBlocking: number;
  totalReferences: number;
  canDelete: boolean;
}

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
    .map((r) => ({
      module: r.module,
      count: Number(r.count) || 0,
      route: r.route ?? "",
      blocking: !!r.blocking,
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => Number(b.blocking) - Number(a.blocking) || b.count - a.count);

  const blockingRows = rows.filter((r) => r.blocking);
  const cascadingRows = rows.filter((r) => !r.blocking);
  const totalBlocking = blockingRows.reduce((acc, r) => acc + r.count, 0);
  const totalReferences = rows.reduce((acc, r) => acc + r.count, 0);

  return {
    rows,
    blockingRows,
    cascadingRows,
    totalBlocking,
    totalReferences,
    canDelete: totalBlocking === 0,
  };
}
