import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Link2,
  Loader2,
  Save,
  Wand2,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getReceiptAllocations,
  listOpenInvoicesForCustomer,
  replaceAllocations,
  type ReceiptRow,
} from "@/lib/receipts/api";
import { invalidateReceipt } from "@/lib/query-invalidation";
import { toUserMessage } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import { formatInr, formatDate } from "@/lib/format";

interface AllocateReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ReceiptRow | null;
  customerName?: string | null;
  onSuccess?: () => void;
}

type InvoiceItem = {
  id: string;
  invoice_no: string;
  issue_date: string;
  total: number;
  balance_due: number;
  existingAllocFromThisReceipt: number;
  maxAvailable: number;
};

export function AllocateReceiptDialog({
  open,
  onOpenChange,
  receipt,
  customerName,
  onSuccess,
}: AllocateReceiptDialogProps) {
  const qc = useQueryClient();

  const customerId = receipt?.customer_id;
  const receiptId = receipt?.id;

  const netReceiptAmount = useMemo(() => {
    if (!receipt) return 0;
    const gross = Number(receipt.amount) || 0;
    const tds = Number(receipt.tds_amount) || 0;
    const charges = Number(receipt.bank_charges) || 0;
    const net = gross - tds - charges;
    return Math.max(0, net);
  }, [receipt]);

  // Fetch current allocations for this receipt
  const allocationsQuery = useQuery({
    queryKey: receiptId ? qk.receipts.allocations(receiptId) : ["receipts", "allocations", "none"],
    queryFn: () => getReceiptAllocations(receiptId!),
    enabled: !!receiptId && open,
  });

  // Fetch open invoices for this customer
  const openInvoicesQuery = useQuery({
    queryKey: customerId
      ? qk.receipts.openInvoices(customerId)
      : ["receipts", "openInvoices", "none"],
    queryFn: () => listOpenInvoicesForCustomer(customerId!),
    enabled: !!customerId && open,
  });

  // State: mapping of invoice_id -> user-entered allocated amount
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  // Merge open invoices with existing allocations for this receipt
  const invoiceList = useMemo<InvoiceItem[]>(() => {
    if (!open) return [];
    const openInvs = openInvoicesQuery.data ?? [];
    const currentAllocs = allocationsQuery.data ?? [];

    const existingMap = new Map<
      string,
      {
        amount: number;
        invoice?: { id: string; invoice_no: string; total: number; issue_date: string };
      }
    >();
    currentAllocs.forEach((a) => {
      const inv = (
        a as unknown as {
          invoice?: { id: string; invoice_no: string; total: number; issue_date: string };
        }
      ).invoice;
      existingMap.set(a.invoice_id, {
        amount: Number(a.amount) || 0,
        invoice: inv,
      });
    });

    const itemsMap = new Map<string, InvoiceItem>();

    // Add open invoices
    openInvs.forEach((inv) => {
      const existing = existingMap.get(inv.id)?.amount ?? 0;
      const bal = Number(inv.balance_due) || 0;
      itemsMap.set(inv.id, {
        id: inv.id,
        invoice_no: inv.invoice_no,
        issue_date: inv.issue_date,
        total: Number(inv.total) || 0,
        balance_due: bal,
        existingAllocFromThisReceipt: existing,
        maxAvailable: bal + existing,
      });
    });

    // Add any invoices that were already allocated to this receipt but now have 0 balance_due
    existingMap.forEach((entry, invId) => {
      if (!itemsMap.has(invId) && entry.invoice) {
        itemsMap.set(invId, {
          id: invId,
          invoice_no: entry.invoice.invoice_no,
          issue_date: entry.invoice.issue_date,
          total: Number(entry.invoice.total) || 0,
          balance_due: 0,
          existingAllocFromThisReceipt: entry.amount,
          maxAvailable: entry.amount,
        });
      }
    });

    // Sort by issue_date ascending
    return Array.from(itemsMap.values()).sort(
      (a, b) => new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime(),
    );
  }, [open, openInvoicesQuery.data, allocationsQuery.data]);

  // Sync initial allocation amounts from existing allocations
  useEffect(() => {
    if (open && allocationsQuery.data) {
      const initial: Record<string, number> = {};
      allocationsQuery.data.forEach((a) => {
        initial[a.invoice_id] = Number(a.amount) || 0;
      });
      setAllocations(initial);
    }
  }, [open, allocationsQuery.data]);

  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }, [allocations]);

  const remainingUnallocated = Math.max(0, netReceiptAmount - totalAllocated);
  const isOverAllocated = totalAllocated > netReceiptAmount + 0.01;

  const handleAmountChange = (invoiceId: string, val: string, maxAvailable: number) => {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      setAllocations((prev) => {
        const next = { ...prev };
        delete next[invoiceId];
        return next;
      });
      return;
    }
    const clamped = Math.min(num, maxAvailable);
    setAllocations((prev) => ({
      ...prev,
      [invoiceId]: clamped,
    }));
  };

  const handleSetMax = (invoiceId: string, maxAvailable: number) => {
    const currentVal = allocations[invoiceId] ?? 0;
    const canTake = Math.min(maxAvailable, remainingUnallocated + currentVal);
    setAllocations((prev) => ({
      ...prev,
      [invoiceId]: canTake,
    }));
  };

  const handleClearAll = () => {
    setAllocations({});
  };

  const handleAutoAllocate = () => {
    let remaining = netReceiptAmount;
    const next: Record<string, number> = {};

    for (const inv of invoiceList) {
      if (remaining <= 0) break;
      if (inv.maxAvailable <= 0) continue;
      const take = Math.min(inv.maxAvailable, remaining);
      if (take > 0) {
        next[inv.id] = take;
        remaining -= take;
      }
    }

    setAllocations(next);
    toast.info("Auto-allocated to invoices in FIFO order (oldest first)");
  };

  const mut = useMutation({
    mutationFn: async () => {
      if (!receiptId) throw new Error("Missing receipt ID");
      if (isOverAllocated) {
        throw new Error(
          `Total allocated (${formatInr(totalAllocated)}) exceeds net receipt amount (${formatInr(netReceiptAmount)})`,
        );
      }

      const nonZero = Object.entries(allocations)
        .filter(([, amt]) => amt > 0.009)
        .map(([invoice_id, amount]) => ({
          invoice_id,
          amount: Math.round(amount * 100) / 100,
        }));

      await replaceAllocations(receiptId, nonZero);
    },
    onSuccess: () => {
      toast.success("Receipt allocations updated successfully");
      invalidateReceipt(qc, receiptId, customerId);
      qc.invalidateQueries({ queryKey: qk.invoices.all });
      if (customerId) {
        qc.invalidateQueries({ queryKey: qk.customerLedger.byCustomer(customerId) });
        qc.invalidateQueries({ queryKey: qk.customerLedger.summary(customerId) });
      }
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const isLoading = openInvoicesQuery.isLoading || allocationsQuery.isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Link2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Allocate Receipt {receipt?.receipt_no}</DialogTitle>
              <DialogDescription className="text-xs">
                {customerName ? (
                  <span>
                    Customer: <strong className="text-foreground">{customerName}</strong> ·{" "}
                  </span>
                ) : null}
                Net available to allocate:{" "}
                <strong className="text-emerald-700 font-semibold dark:text-emerald-400">
                  {formatInr(netReceiptAmount)}
                </strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Allocation Summary Bar */}
        <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-muted/40 p-3 text-xs">
          <div>
            <span className="text-muted-foreground block">Net Receipt:</span>
            <span className="font-semibold text-sm">{formatInr(netReceiptAmount)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Allocated:</span>
            <span
              className={`font-semibold text-sm ${
                isOverAllocated ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {formatInr(totalAllocated)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Remaining Advance:</span>
            <span className="font-semibold text-sm text-foreground">
              {formatInr(remainingUnallocated)}
            </span>
          </div>
        </div>

        {isOverAllocated && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              Total allocated ({formatInr(totalAllocated)}) exceeds available net amount (
              {formatInr(netReceiptAmount)}). Please adjust amounts before saving.
            </span>
          </div>
        )}

        {/* Quick Tools */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Invoices ({invoiceList.length})
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutoAllocate}
              disabled={invoiceList.length === 0 || isLoading}
              className="h-7 text-xs"
            >
              <Wand2 className="mr-1 h-3.5 w-3.5 text-primary" /> Auto-Allocate (FIFO)
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={Object.keys(allocations).length === 0 || isLoading}
              className="h-7 text-xs text-muted-foreground"
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Clear All
            </Button>
          </div>
        </div>

        {/* Invoice Allocation Table */}
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : invoiceList.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium">No open invoices found for this customer</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              There are currently no unpaid or partially paid invoices with a balance due for{" "}
              {customerName || "this customer"}. This payment is safely stored as an unallocated
              advance on their ledger.
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Invoice #</TableHead>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead className="text-right w-[110px]">Invoice Total</TableHead>
                  <TableHead className="text-right w-[110px]">Available Due</TableHead>
                  <TableHead className="text-right w-[160px]">Apply Amount (₹)</TableHead>
                  <TableHead className="w-[70px] text-center">Quick</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceList.map((inv) => {
                  const val = allocations[inv.id] ?? 0;
                  const isPaidFull = val >= inv.maxAvailable && inv.maxAvailable > 0;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs font-medium">
                        {inv.invoice_no}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(inv.issue_date)}
                      </TableCell>
                      <TableCell className="text-right text-xs">{formatInr(inv.total)}</TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {formatInr(inv.maxAvailable)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={inv.maxAvailable}
                          value={val || ""}
                          placeholder="0.00"
                          onChange={(e) =>
                            handleAmountChange(inv.id, e.target.value, inv.maxAvailable)
                          }
                          className="h-8 text-right font-mono text-xs"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant={isPaidFull ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => handleSetMax(inv.id, inv.maxAvailable)}
                          className="h-7 px-2 text-[11px]"
                          title="Allocate maximum available for this invoice"
                        >
                          {isPaidFull ? "Full" : "Max"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between pt-2">
          <div className="text-xs text-muted-foreground">
            {remainingUnallocated > 0 ? (
              <span>
                <strong>{formatInr(remainingUnallocated)}</strong> will remain as unallocated
                advance.
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> 100% of net receipt allocated
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mut.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => mut.mutate()}
              disabled={mut.isPending || isOverAllocated || invoiceList.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {mut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Allocations
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
