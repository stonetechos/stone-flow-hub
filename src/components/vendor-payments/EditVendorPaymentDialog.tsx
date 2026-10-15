import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Banknote, Building2, Calendar, CreditCard, FileText, Loader2, Save } from "lucide-react";
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
import { Field } from "@/components/forms/Field";
import { EntityPicker } from "@/components/forms/EntityPicker";
import {
  updateVendorPayment,
  type VendorPaymentListItem,
  type VendorPaymentRow,
} from "@/lib/vendor-payments/api";
import {
  VENDOR_PAYMENT_METHODS,
  VENDOR_PAYMENT_TYPES,
  type VendorPaymentMethod,
  type VendorPaymentType,
} from "@/lib/vendor-payments/schema";
import { invalidateVendorPayment } from "@/lib/query-invalidation";
import { toUserMessage } from "@/lib/errors";

interface EditVendorPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: VendorPaymentListItem | VendorPaymentRow | null;
  onSuccess?: () => void;
}

export function EditVendorPaymentDialog({
  open,
  onOpenChange,
  payment,
  onSuccess,
}: EditVendorPaymentDialogProps) {
  const qc = useQueryClient();

  const [vendorId, setVendorId] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<VendorPaymentType>("part");
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<VendorPaymentMethod>("bank_transfer");
  const [referenceNo, setReferenceNo] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (payment && open) {
      setVendorId(payment.vendor_id || "");
      setPurchaseOrderId(payment.purchase_order_id ?? null);
      setPaymentType(payment.payment_type || "part");
      setAmount(Number(payment.amount) || 0);
      setMethod((payment.method as VendorPaymentMethod) || "bank_transfer");
      setReferenceNo(payment.reference_no || "");
      setPaidAt(payment.paid_at ? payment.paid_at.slice(0, 10) : "");
      setNotes(payment.notes || "");
      setErrors({});
    }
  }, [payment, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!payment) return;
      return updateVendorPayment(payment.id, {
        vendor_id: vendorId,
        purchase_order_id: purchaseOrderId,
        payment_type: paymentType,
        amount,
        method,
        reference_no: referenceNo.trim() || null,
        paid_at: paidAt,
        notes: notes.trim() || null,
      });
    },
    onSuccess: (updatedRow) => {
      toast.success(
        `Payment ${updatedRow?.payment_no || payment?.payment_no || ""} updated successfully`,
      );
      if (payment) {
        invalidateVendorPayment(qc, payment.vendor_id, payment.id);
        if (vendorId !== payment.vendor_id) {
          invalidateVendorPayment(qc, vendorId, payment.id);
        }
      }
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(toUserMessage(err));
    },
  });

  const handleSave = () => {
    const errs: Record<string, string> = {};
    if (!vendorId) {
      errs.vendor_id = "Please select a vendor";
    }
    if (!amount || amount <= 0) {
      errs.amount = "Amount must be greater than 0";
    }
    if (!paidAt) {
      errs.paid_at = "Payment date is required";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error(Object.values(errs)[0]);
      return;
    }

    setErrors({});
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 rounded-lg">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Edit Vendor Payment</DialogTitle>
              <DialogDescription className="text-xs">
                Update payment details for {payment?.payment_no}. Ledger entries will update
                automatically.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Vendor */}
          <Field label="Vendor" required error={errors.vendor_id}>
            <EntityPicker
              type="vendor"
              value={vendorId || null}
              onChange={(v) => {
                setVendorId(v ?? "");
                if (v && errors.vendor_id) {
                  setErrors((prev) => ({ ...prev, vendor_id: "" }));
                }
              }}
            />
          </Field>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Amount (₹)" required error={errors.amount}>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">
                  ₹
                </span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="pl-7 font-mono font-medium"
                  value={amount || ""}
                  onChange={(e) => {
                    setAmount(Number(e.target.value));
                    if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" }));
                  }}
                  placeholder="0.00"
                />
              </div>
            </Field>

            <Field label="Payment Date" required error={errors.paid_at}>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  className="pl-9"
                  value={paidAt}
                  onChange={(e) => {
                    setPaidAt(e.target.value);
                    if (errors.paid_at) setErrors((prev) => ({ ...prev, paid_at: "" }));
                  }}
                />
              </div>
            </Field>
          </div>

          {/* Type & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Payment Type" required>
              <Select
                value={paymentType}
                onValueChange={(v) => setPaymentType(v as VendorPaymentType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VENDOR_PAYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Payment Method">
              <Select value={method} onValueChange={(v) => setMethod(v as VendorPaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VENDOR_PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m} className="capitalize">
                      {m.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Reference / UTR */}
          <Field label="Reference / UTR / Cheque #">
            <Input
              placeholder="e.g. UTR12345678, IMPS Ref, Cheque No"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
            />
          </Field>

          {/* Notes */}
          <Field label="Notes / Remarks">
            <Textarea
              placeholder="Add any additional payment details, bank account used, or instructions..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSave}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
