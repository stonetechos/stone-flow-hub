/**
 * AllocationTable — shared table for allocating a monetary amount across
 * open documents. Used by:
 *   - Customer receipts (allocate to open invoices)
 *   - Vendor payments (allocate to open purchase orders / bills)
 *
 * Presentation only — the caller owns the source list, the pool of money
 * being allocated, and the write path. Semantic columns:
 *   Document # | Date | Total | Balance | Allocate (input) | remove
 */
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { formatInr, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface AllocatableDoc {
  id: string;
  doc_no: string;
  date: string | null;
  total: number;
  balance_due: number;
}

export interface Allocation {
  doc_id: string;
  amount: number;
}

export function AllocationTable({
  docs,
  allocations,
  onToggle,
  onChangeAmount,
  loading,
  emptyLabel = "No open documents — will be saved as an unallocated advance.",
  documentLabel = "Invoice",
  className,
}: {
  docs: AllocatableDoc[];
  allocations: Allocation[];
  onToggle: (doc: AllocatableDoc) => void;
  onChangeAmount: (docId: string, amount: number) => void;
  loading?: boolean;
  emptyLabel?: ReactNode;
  documentLabel?: string;
  className?: string;
}) {
  if (loading) {
    return <p className="py-6 text-sm text-muted-foreground">Loading open documents…</p>;
  }
  if (docs.length === 0) {
    return <p className="py-6 text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className={cn("overflow-hidden rounded-md border border-border/60", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">{documentLabel} #</th>
            <th className="px-3 py-2 text-left font-medium">Date</th>
            <th className="px-3 py-2 text-right font-medium">Total</th>
            <th className="px-3 py-2 text-right font-medium">Balance</th>
            <th className="px-3 py-2 text-right font-medium">Allocate</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {docs.map((d) => {
            const row = allocations.find((a) => a.doc_id === d.id);
            return (
              <tr key={d.id} className="align-middle">
                <td className="px-3 py-2 font-mono text-xs">{d.doc_no}</td>
                <td className="px-3 py-2 text-sm">{d.date ? formatDate(d.date) : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatInr(d.total)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatInr(d.balance_due)}</td>
                <td className="px-3 py-2 text-right">
                  {row ? (
                    <Input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      className="ml-auto w-32 text-right tabular-nums"
                      value={row.amount}
                      onChange={(e) => onChangeAmount(d.id, Number(e.target.value))}
                    />
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => onToggle(d)}>
                      Allocate
                    </Button>
                  )}
                </td>
                <td className="px-1 py-2">
                  {row && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove allocation for ${d.doc_no}`}
                      onClick={() => onToggle(d)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
