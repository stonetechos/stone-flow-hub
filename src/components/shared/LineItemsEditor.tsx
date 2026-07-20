/**
 * LineItemsEditor — shared editor for the "list of line items" pattern used
 * on estimates, quotes, sales orders, purchase orders, invoices and GRNs.
 *
 * The component is *presentation only*: it renders columns, rows, an "Add
 * line" affordance and per-row remove; the caller owns:
 *   - the shape of a line (varies per document type)
 *   - computed totals (varies with tax/discount rules)
 *   - drag-reorder (opt-in via `onReorder`)
 *
 * A row is rendered by the caller-supplied `renderRow` — this keeps the
 * editor from having to know about product pickers, GST slabs, discount
 * ladders or unit conversions.
 */
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LineItemColumn {
  key: string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  /** Tailwind width class, e.g. "w-32" or "min-w-[10rem]". */
  width?: string;
  hideOnMobile?: boolean;
}

export interface LineItemsEditorProps<T> {
  columns: LineItemColumn[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  renderRow: (row: T, index: number) => ReactNode;
  onAddRow?: () => void;
  onRemoveRow?: (index: number) => void;
  addLabel?: string;
  emptyLabel?: string;
  /** Optional footer row (totals, notes, etc.) */
  footer?: ReactNode;
  className?: string;
  /** Show the trailing remove-cell column. Defaults to true when onRemoveRow given. */
  showRemove?: boolean;
}

export function LineItemsEditor<T>({
  columns,
  rows,
  rowKey,
  renderRow,
  onAddRow,
  onRemoveRow,
  addLabel = "Add line",
  emptyLabel = "No lines yet. Add the first line to begin.",
  footer,
  className,
  showRemove,
}: LineItemsEditorProps<T>) {
  const withRemove = (showRemove ?? !!onRemoveRow) && !!onRemoveRow;
  return (
    <div className={cn("space-y-3", className)}>
      <div className="overflow-x-auto rounded-md border border-border/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "px-3 py-2 text-left font-medium",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    c.hideOnMobile && "hidden md:table-cell",
                    c.width,
                  )}
                >
                  {c.header}
                </th>
              ))}
              {withRemove && <th className="w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (withRemove ? 1 : 0)}
                  className="px-3 py-6 text-center text-sm text-muted-foreground"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <LineRow
                  key={rowKey(row, i)}
                  columns={columns}
                  withRemove={withRemove}
                  onRemove={onRemoveRow ? () => onRemoveRow(i) : undefined}
                >
                  {renderRow(row, i)}
                </LineRow>
              ))
            )}
          </tbody>
          {footer && <tfoot className="border-t border-border/60 bg-muted/20">{footer}</tfoot>}
        </table>
      </div>
      {onAddRow && (
        <div>
          <Button type="button" variant="outline" size="sm" onClick={onAddRow}>
            <Plus className="mr-2 h-4 w-4" /> {addLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

function LineRow({
  columns,
  children,
  withRemove,
  onRemove,
}: {
  columns: LineItemColumn[];
  children: ReactNode;
  withRemove?: boolean;
  onRemove?: () => void;
}) {
  // The caller returns the row cells directly; we clone into <tr> so the
  // caller can build cells with `<LineCell>` and get consistent alignment.
  return (
    <tr className="align-top">
      {children}
      {withRemove && (
        <td className="px-1 py-2 text-right">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove line"
            onClick={onRemove}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </td>
      )}
    </tr>
  );
}

/** Convenience cell — matches header alignment / density. */
export function LineCell({
  align,
  className,
  hideOnMobile,
  children,
  colSpan,
}: {
  align?: "left" | "right" | "center";
  className?: string;
  hideOnMobile?: boolean;
  children: ReactNode;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "px-3 py-2 align-top",
        align === "right" && "text-right tabular-nums",
        align === "center" && "text-center",
        hideOnMobile && "hidden md:table-cell",
        className,
      )}
    >
      {children}
    </td>
  );
}
