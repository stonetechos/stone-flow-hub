/**
 * MiniTable — compact borderless table for detail pages and side panels.
 * Contrast with DataTableShell (the toolbar-backed workspace table): MiniTable
 * is a read-oriented sub-table for related lists (invoices under a customer,
 * allocations under a receipt, line-items summary, etc.).
 *
 * Consumers pass column defs and rows — MiniTable owns the visual rhythm.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MiniTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  /** Only renders on md+ screens when true. */
  hideOnMobile?: boolean;
}

export function MiniTable<T>({
  columns,
  rows,
  empty = "No rows.",
  rowKey,
  onRowClick,
  className,
}: {
  columns: MiniTableColumn<T>[];
  rows: T[];
  empty?: ReactNode;
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  className?: string;
}) {
  if (rows.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "px-2 py-2 text-left font-medium",
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
                  c.hideOnMobile && "hidden md:table-cell",
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              className={cn(
                "transition-colors",
                onRowClick && "cursor-pointer hover:bg-muted/40",
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "px-2 py-2 align-middle",
                    c.align === "right" && "text-right tabular-nums",
                    c.align === "center" && "text-center",
                    c.hideOnMobile && "hidden md:table-cell",
                    c.className,
                  )}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
