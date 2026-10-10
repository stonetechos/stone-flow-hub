import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Calendar, FileText, Loader2, CheckCircle2 } from "lucide-react";
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
import { EntityPicker } from "@/components/forms/EntityPicker";
import { assignVendorToQuote, unassignQuoteVendor } from "@/lib/quotes/vendor-assignment";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";

interface AssignQuoteVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  quoteNo: string;
  currentVendorId?: string | null;
  currentVendorName?: string | null;
  currentPromisedDate?: string | null;
  onSuccess?: () => void;
}

export function AssignQuoteVendorDialog({
  open,
  onOpenChange,
  quoteId,
  quoteNo,
  currentVendorId,
  currentVendorName,
  currentPromisedDate,
  onSuccess,
}: AssignQuoteVendorDialogProps) {
  const qc = useQueryClient();
  const [vendorId, setVendorId] = useState<string>(currentVendorId || "");
  const [vendorName, setVendorName] = useState<string>(currentVendorName || "");
  const [deliveryDate, setDeliveryDate] = useState<string>(
    currentPromisedDate ? currentPromisedDate.slice(0, 10) : "",
  );
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setVendorId(currentVendorId || "");
      setVendorName(currentVendorName || "");
      setDeliveryDate(currentPromisedDate ? currentPromisedDate.slice(0, 10) : "");
      setNotes("");
    }
  }, [open, currentVendorId, currentVendorName, currentPromisedDate]);

  const mutation = useMutation({
    mutationFn: () =>
      assignVendorToQuote({
        quoteId,
        vendorId,
        vendorName: vendorName || "Selected Vendor",
        promisedDeliveryDate: deliveryDate || null,
        notes: notes || null,
      }),
    onSuccess: () => {
      toast.success(`Quote ${quoteNo} assigned to ${vendorName || "vendor"}`);
      void qc.invalidateQueries({ queryKey: qk.quotes.all });
      void qc.invalidateQueries({ queryKey: ["customer-order-pipeline"] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(toUserMessage(err));
    },
  });

  const unassignMutation = useMutation({
    mutationFn: () => unassignQuoteVendor(quoteId),
    onSuccess: () => {
      toast.success(`Quote ${quoteNo} marked as unassigned`);
      void qc.invalidateQueries({ queryKey: qk.quotes.all });
      void qc.invalidateQueries({ queryKey: ["customer-order-pipeline"] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(toUserMessage(err));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) {
      toast.error("Please pick a vendor to assign to this order.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span>Assign Vendor & Delivery Date</span>
          </DialogTitle>
          <DialogDescription>
            Attach a stone fabricator / vendor and committed delivery deadline to accepted quote{" "}
            <span className="font-mono font-semibold text-foreground">{quoteNo}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Vendor Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Assigned Vendor / Fabricator *</span>
            </label>
            <EntityPicker
              type="vendor"
              value={vendorId || null}
              onChange={(val, row) => {
                setVendorId(val || "");
                if (row?.label) {
                  setVendorName(row.label);
                }
              }}
              placeholder="Search & choose vendor…"
            />
          </div>

          {/* Promised Delivery Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Promised Delivery Date (Client Commitment)</span>
            </label>
            <Input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="h-9 text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              The date promised to the customer for delivery or installation.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Fabrication / Order Notes</span>
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 20 days slab cutting lead time, delivery to site directly..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 pt-2">
            {currentVendorId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => unassignMutation.mutate()}
                disabled={unassignMutation.isPending || mutation.isPending}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs"
              >
                Mark Unassigned
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={mutation.isPending || !vendorId}
                className="gap-1.5"
              >
                {mutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Save Assignment
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
