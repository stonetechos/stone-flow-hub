import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calendar,
  Save,
  Loader2,
  CreditCard,
  Building2,
  FileText,
  CheckCircle2,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateReceipt, type ReceiptRow } from "@/lib/receipts/api";
import { RECEIPT_METHODS, RECEIPT_METHOD_LABELS, type ReceiptMethod } from "@/lib/receipts/schema";
import { invalidateReceipt } from "@/lib/query-invalidation";
import { toUserMessage } from "@/lib/errors";
import { qk } from "@/lib/query-keys";

interface EditReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ReceiptRow | null;
  customerName?: string | null;
  onSuccess?: () => void;
}

export function EditReceiptDialog({
  open,
  onOpenChange,
  receipt,
  customerName,
  onSuccess,
}: EditReceiptDialogProps) {
  const qc = useQueryClient();

  const [receivedAt, setReceivedAt] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<ReceiptMethod>("bank_transfer");
  const [bankName, setBankName] = useState("");
  const [accountUsed, setAccountUsed] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [tds, setTds] = useState<number>(0);
  const [charges, setCharges] = useState<number>(0);
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (receipt && open) {
      setReceivedAt(receipt.received_at ? receipt.received_at.slice(0, 10) : "");
      setAmount(Number(receipt.amount) || 0);
      setMethod((receipt.method as ReceiptMethod) || "bank_transfer");
      setBankName(receipt.bank_name || "");
      setAccountUsed(receipt.account_used || "");
      setReferenceNo(receipt.reference_no || "");
      setChequeNo(receipt.cheque_no || "");
      setChequeDate(receipt.cheque_date ? receipt.cheque_date.slice(0, 10) : "");
      setTds(Number(receipt.tds_amount) || 0);
      setCharges(Number(receipt.bank_charges) || 0);
      setRemarks(receipt.remarks || "");
    }
  }, [receipt, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!receipt) return;
      return updateReceipt(receipt.id, {
        received_at: receivedAt,
        amount,
        method,
        bank_name: bankName.trim() || null,
        account_used: accountUsed.trim() || null,
        reference_no: referenceNo.trim() || null,
        cheque_no: chequeNo.trim() || null,
        cheque_date: chequeDate || null,
        tds_amount: tds,
        bank_charges: charges,
        remarks: remarks.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success(
        receipt?.receipt_no
          ? `Receipt ${receipt.receipt_no} updated successfully`
          : "Receipt updated successfully",
      );
      if (receipt) {
        invalidateReceipt(qc, receipt.id, receipt.customer_id);
      }
      void qc.invalidateQueries({ queryKey: qk.paymentRegister.all });
      void qc.invalidateQueries({ queryKey: ["customer-ledger-summaries"] });
      void qc.invalidateQueries({ queryKey: qk.customers.all });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(toUserMessage(err));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivedAt) {
      toast.error("Please enter a valid receipt date.");
      return;
    }
    if (amount <= 0) {
      toast.error("Receipt amount must be greater than zero.");
      return;
    }
    mutation.mutate();
  };

  if (!receipt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <CreditCard className="h-4 w-4 text-primary" />
            <span>Edit Receipt {receipt.receipt_no}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update receipt date, payment method, bank references, or amounts for{" "}
            <span className="font-medium text-slate-800">{customerName || "this customer"}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Received Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Receipt Date *</span>
              </label>
              <Input
                type="date"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
                required
                className="h-9 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Date money was received in bank or cash.
              </p>
            </div>

            {/* Gross Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span>Gross Amount (₹) *</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                required
                className="h-9 text-xs font-mono font-medium"
              />
              <p className="text-[10px] text-muted-foreground">
                Total money deposited before deductions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Payment Method *</label>
              <Select value={method} onValueChange={(v) => setMethod(v as ReceiptMethod)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {RECEIPT_METHODS.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {RECEIPT_METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account Used */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Account Used</label>
              <Input
                value={accountUsed}
                onChange={(e) => setAccountUsed(e.target.value)}
                placeholder="e.g. Current BOB, Personal UPI - Raman"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Bank Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Bank Name</span>
              </label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Bank of Baroda, HDFC"
                className="h-9 text-xs"
              />
            </div>

            {/* UTR / Ref No */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">UTR / Reference #</label>
              <Input
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. 523412984712"
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          {/* Cheque Details (if applicable) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Cheque #</label>
              <Input
                value={chequeNo}
                onChange={(e) => setChequeNo(e.target.value)}
                placeholder="Cheque number if paid by cheque"
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Cheque Date</label>
              <Input
                type="date"
                value={chequeDate}
                onChange={(e) => setChequeDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Deductions (TDS & Bank Charges) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">TDS Deducted (₹)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={tds || ""}
                onChange={(e) => setTds(Number(e.target.value) || 0)}
                placeholder="0"
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Bank Charges (₹)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={charges || ""}
                onChange={(e) => setCharges(Number(e.target.value) || 0)}
                placeholder="0"
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Remarks / Notes</span>
            </label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Internal accounting or payment notes…"
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving Changes…
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
