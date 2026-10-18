import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  Calendar,
  FileText,
  Loader2,
  CheckCircle2,
  Boxes,
  Warehouse,
  PackageCheck,
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
import { EntityPicker } from "@/components/forms/EntityPicker";
import { assignVendorToQuote, unassignQuoteVendor } from "@/lib/quotes/vendor-assignment";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";

interface AssignQuoteVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  quoteNo: string;
  currentFulfilmentType?: "in_stock" | "stock_lifted" | "vendor" | "unassigned";
  currentVendorId?: string | null;
  currentVendorName?: string | null;
  currentStockLocation?: string | null;
  currentPromisedDate?: string | null;
  onSuccess?: () => void;
}

export function AssignQuoteVendorDialog({
  open,
  onOpenChange,
  quoteId,
  quoteNo,
  currentFulfilmentType,
  currentVendorId,
  currentVendorName,
  currentStockLocation,
  currentPromisedDate,
  onSuccess,
}: AssignQuoteVendorDialogProps) {
  const qc = useQueryClient();
  const computeInitialMode = (): "stock_lifted" | "in_stock" | "vendor" => {
    if (currentFulfilmentType === "stock_lifted" || currentVendorId === "stock_lifted") {
      return "stock_lifted";
    }
    if (currentFulfilmentType === "in_stock" || currentVendorId === "in_house_stock") {
      return "in_stock";
    }
    if (currentVendorId && currentVendorId !== "Unassigned Yet") {
      return "vendor";
    }
    return "stock_lifted";
  };

  const [mode, setMode] = useState<"stock_lifted" | "in_stock" | "vendor">(computeInitialMode);
  const [stockLocation, setStockLocation] = useState<string>(
    currentStockLocation || "Main Warehouse / Yard Stock",
  );
  const [vendorId, setVendorId] = useState<string>(
    currentVendorId && currentVendorId !== "in_house_stock" && currentVendorId !== "stock_lifted"
      ? currentVendorId
      : "",
  );
  const [vendorName, setVendorName] = useState<string>(
    currentVendorName &&
      currentVendorName !== "In-House Stock" &&
      currentVendorName !== "Material Lifted from Stock"
      ? currentVendorName
      : "",
  );
  const [deliveryDate, setDeliveryDate] = useState<string>(
    currentPromisedDate ? currentPromisedDate.slice(0, 10) : "",
  );
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      if (currentFulfilmentType === "stock_lifted" || currentVendorId === "stock_lifted") {
        setMode("stock_lifted");
        setStockLocation(currentStockLocation || "Lifted from Stock / Yard");
      } else if (currentFulfilmentType === "in_stock" || currentVendorId === "in_house_stock") {
        setMode("in_stock");
        setStockLocation(currentStockLocation || "Main Warehouse / Yard Stock");
      } else if (currentVendorId && currentVendorId !== "Unassigned Yet") {
        setMode("vendor");
      } else {
        setMode("stock_lifted");
        setStockLocation(currentStockLocation || "Lifted from Stock / Yard");
      }
      setVendorId(
        currentVendorId &&
          currentVendorId !== "in_house_stock" &&
          currentVendorId !== "stock_lifted"
          ? currentVendorId
          : "",
      );
      setVendorName(
        currentVendorName &&
          currentVendorName !== "In-House Stock" &&
          currentVendorName !== "Material Lifted from Stock"
          ? currentVendorName
          : "",
      );
      setDeliveryDate(currentPromisedDate ? currentPromisedDate.slice(0, 10) : "");
      setNotes("");
    }
  }, [
    open,
    currentFulfilmentType,
    currentVendorId,
    currentVendorName,
    currentStockLocation,
    currentPromisedDate,
  ]);

  const mutation = useMutation({
    mutationFn: () =>
      assignVendorToQuote({
        quoteId,
        fulfilmentType: mode,
        vendorId:
          mode === "stock_lifted"
            ? "stock_lifted"
            : mode === "in_stock"
              ? "in_house_stock"
              : vendorId,
        vendorName:
          mode === "stock_lifted"
            ? "Material Lifted from Stock"
            : mode === "in_stock"
              ? "In-House Stock"
              : vendorName || "Selected Vendor",
        stockLocation:
          mode === "stock_lifted"
            ? stockLocation || "Lifted from Stock / Yard"
            : mode === "in_stock"
              ? stockLocation || "Main Warehouse / Yard Stock"
              : null,
        promisedDeliveryDate: deliveryDate || null,
        notes: notes || null,
      }),
    onSuccess: () => {
      if (mode === "stock_lifted") {
        toast.success(`Quote ${quoteNo} marked: Material lifted from stock (RFQ not required)`);
      } else if (mode === "in_stock") {
        toast.success(`Quote ${quoteNo} fulfilled from In-House Stock`);
      } else {
        toast.success(`Quote ${quoteNo} assigned to ${vendorName || "vendor"}`);
      }
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
    if (mode === "vendor" && !vendorId) {
      toast.error("Please pick a vendor to assign to this order.");
      return;
    }
    mutation.mutate();
  };

  const isAssigned = Boolean(
    currentVendorId &&
    currentVendorId !== "Unassigned Yet" &&
    currentVendorName !== "Unassigned Yet",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "stock_lifted" ? (
              <PackageCheck className="h-5 w-5 text-emerald-600" />
            ) : mode === "in_stock" ? (
              <Boxes className="h-5 w-5 text-blue-600" />
            ) : (
              <Building2 className="h-5 w-5 text-primary" />
            )}
            <span>Order Fulfilment &amp; Source</span>
          </DialogTitle>
          <DialogDescription>
            Choose how to fulfill quote{" "}
            <span className="font-mono font-semibold text-foreground">{quoteNo}</span>. Vendor RFQ
            is purely optional.
          </DialogDescription>
        </DialogHeader>

        {/* Mode Selector - 3 Clean Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode("in_stock");
              if (!stockLocation || stockLocation === "Lifted from Stock / Yard") {
                setStockLocation("Main Warehouse / Yard Stock");
              }
            }}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-md transition-all cursor-pointer text-center ${
              mode === "in_stock"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs font-bold border border-emerald-300"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Boxes className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="leading-tight text-[11px]">Live Stock (Yard)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("stock_lifted");
              if (!stockLocation || stockLocation === "Main Warehouse / Yard Stock") {
                setStockLocation("Lifted from Stock / Yard");
              }
            }}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-md transition-all cursor-pointer text-center ${
              mode === "stock_lifted"
                ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs font-bold border border-blue-300"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <PackageCheck className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="leading-tight text-[11px]">Lifted from Stock</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("vendor")}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-md transition-all cursor-pointer text-center ${
              mode === "vendor"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold border border-slate-300"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Building2 className="h-4 w-4 text-slate-600 dark:text-slate-300 shrink-0" />
            <span className="leading-tight text-[11px]">Outsource Vendor</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {mode === "stock_lifted" ? (
            /* Material Lifted from Stock Option */
            <div className="space-y-3">
              <div className="rounded-md bg-emerald-50/90 border border-emerald-200/90 dark:bg-emerald-950/20 dark:border-emerald-900/50 p-3 text-xs text-emerald-950 dark:text-emerald-200 flex items-start gap-2.5">
                <PackageCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-emerald-950 dark:text-emerald-100">
                    Material Lifted from Stock · No RFQ Needed
                  </p>
                  <p className="text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed">
                    The material was already taken from inventory or yard stock. This order does not
                    require vendor RFQ or purchase order.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Stock Location / Godown</span>
                </label>
                <Input
                  type="text"
                  value={stockLocation}
                  onChange={(e) => setStockLocation(e.target.value)}
                  placeholder="e.g. Lifted from Stock / Yard, Godown 2"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          ) : mode === "in_stock" ? (
            /* In-House Stock Option */
            <div className="space-y-3">
              <div className="rounded-md bg-blue-50/80 border border-blue-200/80 dark:bg-blue-950/20 dark:border-blue-900/50 p-3 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                <Warehouse className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-blue-950 dark:text-blue-100">
                    Fulfill from Existing Stock
                  </p>
                  <p className="text-blue-800 dark:text-blue-300 text-[11px] leading-relaxed">
                    Material will be cut and dispatched from in-house stock without issuing an
                    external vendor PO.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Stock Location / Godown</span>
                </label>
                <Input
                  type="text"
                  value={stockLocation}
                  onChange={(e) => setStockLocation(e.target.value)}
                  placeholder="e.g. Main Factory / Yard Stock, Lot 14"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          ) : (
            /* Third-Party Vendor Option */
            <div className="space-y-3">
              <div className="rounded-md bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-2.5 text-xs text-slate-700 dark:text-slate-300">
                <p className="text-[11px]">
                  Assign an outside stone supplier / fabricator. You can optionally send an RFQ via
                  WhatsApp.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
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
                  placeholder="Search &amp; choose vendor…"
                />
              </div>
            </div>
          )}

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
              The date promised to the customer for delivery or dispatch from stock.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Fulfilment & Order Notes</span>
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                mode === "in_stock"
                  ? "e.g. Ready for dispatch from stock lot, customer informed..."
                  : "e.g. 20 days slab cutting lead time, delivery to site directly..."
              }
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 pt-2">
            {isAssigned ? (
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
                disabled={mutation.isPending || (mode === "vendor" && !vendorId)}
                className={`gap-1.5 ${
                  mode === "in_stock"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {mutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                {mode === "in_stock" ? "Save Stock Fulfilment" : "Save Vendor Assignment"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
