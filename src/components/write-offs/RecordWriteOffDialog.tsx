import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, FileText, AlertTriangle, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/forms/Field";
import { EntityPicker } from "@/components/forms/EntityPicker";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import {
  createWriteOff,
  WRITE_OFF_REASONS,
  type WriteOffReason,
  type WriteOffRow,
} from "@/lib/write-offs/api";
import { getCustomerLedgerSummary } from "@/lib/customer-ledger/api";
import { listOpenInvoicesForCustomer } from "@/lib/receipts/api";

export interface RecordWriteOffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string | null;
  customerName?: string;
  invoiceId?: string | null;
  invoiceNo?: string;
  defaultAmount?: number;
  onSuccess?: (row: WriteOffRow) => void;
}

export function RecordWriteOffDialog({
  open,
  onOpenChange,
  customerId: initialCustomerId,
  customerName: initialCustomerName,
  invoiceId: initialInvoiceId,
  invoiceNo: initialInvoiceNo,
  defaultAmount,
  onSuccess,
}: RecordWriteOffDialogProps) {
  const qc = useQueryClient();

  const [customerId, setCustomerId] = useState<string | null>(initialCustomerId ?? null);
  const [invoiceId, setInvoiceId] = useState<string | null>(initialInvoiceId ?? null);
  const [amount, setAmount] = useState<string>(
    defaultAmount && defaultAmount > 0 ? String(defaultAmount) : "",
  );
  const [reason, setReason] = useState<WriteOffReason>("quality_issue");
  const [remarks, setRemarks] = useState<string>("");
  const [issuedAt, setIssuedAt] = useState<string>(new Date().toISOString().slice(0, 10));

  // Sync state when dialog opens or initial props change
  useEffect(() => {
    if (open) {
      setCustomerId(initialCustomerId ?? null);
      setInvoiceId(initialInvoiceId ?? null);
      if (defaultAmount && defaultAmount > 0) {
        setAmount(String(defaultAmount));
      }
      setIssuedAt(new Date().toISOString().slice(0, 10));
    }
  }, [open, initialCustomerId, initialInvoiceId, defaultAmount]);

  // Fetch customer ledger summary if customerId is present
  const ledgerSummaryQ = useQuery({
    queryKey: customerId
      ? qk.customerLedger.summary(customerId)
      : ["customer_ledger", "summary", "none"],
    queryFn: () => getCustomerLedgerSummary(customerId!),
    enabled: open && !!customerId,
  });

  // Fetch open invoices for this customer
  const openInvoicesQ = useQuery({
    queryKey: customerId
      ? qk.receipts.openInvoices(customerId)
      : ["receipts", "openInvoices", "none"],
    queryFn: () => listOpenInvoicesForCustomer(customerId!),
    enabled: open && !!customerId,
  });

  const balanceDue = ledgerSummaryQ.data?.balance ?? 0;

  const mut = useMutation({
    mutationFn: () =>
      createWriteOff({
        customer_id: customerId!,
        invoice_id: invoiceId || null,
        amount: Number(amount),
        reason,
        remarks: remarks.trim() || null,
        issued_at: issuedAt,
      }),
    onSuccess: (res) => {
      toast.success(
        `Write-off of ${formatInr(res.amount)} recorded (${WRITE_OFF_REASONS[reason].label})`,
      );
      // Invalidate relevant queries
      if (customerId) {
        qc.invalidateQueries({ queryKey: qk.customerLedger.byCustomer(customerId) });
        qc.invalidateQueries({ queryKey: qk.customerLedger.summary(customerId) });
        qc.invalidateQueries({ queryKey: qk.receipts.openInvoices(customerId) });
      }
      qc.invalidateQueries({ queryKey: ["customerLedger", "allSummaries"] });
      qc.invalidateQueries({ queryKey: ["write-offs"] });
      qc.invalidateQueries({ queryKey: qk.dashboard });
      qc.invalidateQueries({ queryKey: qk.paymentRegister.all });

      onSuccess?.(res);
      onOpenChange(false);
      // Reset form
      setAmount("");
      setRemarks("");
    },
    onError: (err) => {
      toast.error(toUserMessage(err));
    },
  });

  const numAmount = Number(amount);
  const isValid = !!customerId && numAmount > 0 && !Number.isNaN(numAmount) && !!reason;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Record Write-Off / Concession
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Adjust customer balance due to quality, delayed delivery, or commercial settlement.
              </p>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-4 py-2">
          {/* Customer Selection */}
          <Field label="Customer" required>
            {initialCustomerId ? (
              <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
                <span>{initialCustomerName || "Selected Customer"}</span>
                {balanceDue > 0 && (
                  <span className="font-mono text-xs text-amber-600 font-bold">
                    Balance: {formatInr(balanceDue)}
                  </span>
                )}
              </div>
            ) : (
              <EntityPicker
                type="customer"
                value={customerId}
                onChange={(id) => {
                  setCustomerId(id);
                  setInvoiceId(null);
                }}
              />
            )}
          </Field>

          {/* Linked Invoice Selection (Optional) */}
          {customerId && openInvoicesQ.data && openInvoicesQ.data.length > 0 && (
            <Field label="Link to Specific Invoice (Optional)">
              <Select
                value={invoiceId ?? "none"}
                onValueChange={(val) => setInvoiceId(val === "none" ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select invoice (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    General Customer Balance (No specific invoice)
                  </SelectItem>
                  {openInvoicesQ.data.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoice_no} — Bal: {formatInr(inv.balance_due)} (Total:{" "}
                      {formatInr(inv.total)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Amount */}
            <Field label="Write-Off Amount" required>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-muted-foreground font-semibold">
                  ₹
                </span>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="pl-7 font-mono font-medium text-base text-red-600 dark:text-red-400"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              {balanceDue > 0 && Number(amount) !== balanceDue && (
                <button
                  type="button"
                  onClick={() => setAmount(String(balanceDue))}
                  className="mt-1 text-xs text-primary hover:underline font-medium text-left"
                >
                  Fill full balance ({formatInr(balanceDue)})
                </button>
              )}
            </Field>

            {/* Date */}
            <Field label="Effective Date" required>
              <Input
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                required
              />
            </Field>
          </div>

          {/* Reason */}
          <Field label="Commercial Reason" required>
            <Select value={reason} onValueChange={(v) => setReason(v as WriteOffReason)}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(WRITE_OFF_REASONS).map(([key, meta]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span>{meta.icon}</span>
                      <span className="font-medium">{meta.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              {WRITE_OFF_REASONS[reason].description}
            </p>
          </Field>

          {/* Remarks / Justification */}
          <Field label="Audit Remarks & Justification" required>
            <Textarea
              placeholder="Explain the specific issue (e.g., agreed 5% discount on broken slab corner; delivered 4 days late, negotiated closure)..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              required
            />
          </Field>

          {/* Superadmin Accounting Note */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong className="font-semibold">SuperAdmin Financial Audit Trail:</strong>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  This transaction will be recorded as an authorized Credit Note / Write-off in the
                  customer ledger and immediately reported on the SuperAdmin Dashboard.
                </p>
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={mut.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => mut.mutate()}
            disabled={!isValid || mut.isPending}
            className="shadow-sm font-semibold"
          >
            {mut.isPending ? "Recording..." : `Authorize Write-Off (${formatInr(numAmount || 0)})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
