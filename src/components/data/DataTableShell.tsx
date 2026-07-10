import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Density } from "@/hooks/use-table-prefs";

/**
 * DataTableShell — the rounded container every list table sits inside.
 *
 * Wraps the `<Table>` with the calm hairline border, applies a
 * density-aware CSS variable so children (`TableCell`, `TableHead`) can
 * pick up the right vertical padding via utility classes, and provides an
 * optional `footer` slot for pagination.
 *
 * Usage:
 *   <DataTableShell density={density} footer={<TablePagination ... />}>
 *     <Table>...</Table>
 *   </DataTableShell>
 */
export function DataTableShell({
  density = "comfortable",
  children,
  footer,
  className,
}: {
  density?: Density;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border/70 bg-card",
        // Row / head padding driven by data-attribute so descendants can react.
        density === "dense" && "[&_tbody_td]:py-1.5 [&_thead_th]:h-8",
        density === "compact" && "[&_tbody_td]:py-2 [&_thead_th]:h-9",
        density === "comfortable" && "[&_tbody_td]:py-3 [&_thead_th]:h-10",
        className,
      )}
      data-density={density}
    >
      <div className="overflow-x-auto">{children}</div>
      {footer}
    </div>
  );
}
