import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Factory,
  AlertTriangle,
  Phone,
  Save,
  Boxes,
  PackageCheck,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listVendorsForPicker } from "@/lib/vendors/api";
import {
  updateSalesOrderItem,
  listSalesOrderItems,
  type SalesOrderItemRow,
} from "@/lib/sales-orders/api";
import {
  type ItemVendorAssignment,
  type ItemFulfilmentMode,
  parseItemFulfilment,
  parseItemVendorAssignment,
  serializeItemVendorAssignment,
  serializeLiveStockAssignment,
  serializeStockLiftedAssignment,
} from "@/lib/sales-orders/vendor-assignment";
import { qk } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SalesOrderItemRow | null;
  salesOrderId: string;
}

export function AssignVendorModal({ open, onOpenChange, item, salesOrderId }: Props) {
  const qc = useQueryClient();
  const fulfilmentState = parseItemFulfilment(item?.fulfilment);
  const existingVendor = parseItemVendorAssignment(item?.fulfilment);

  const [mode, setMode] = useState<ItemFulfilmentMode>("live_stock");
  const [stockLocation, setStockLocation] = useState("Main Yard / Slab Storage");
  const [applyToAll, setApplyToAll] = useState(false);

  // Vendor fields
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [advanceRequired, setAdvanceRequired] = useState("");
  const [advancePaid, setAdvancePaid] = useState("");
  const [advanceStatus, setAdvanceStatus] = useState<"unpaid" | "partial" | "paid">("unpaid");
  const [prodStatus, setProdStatus] = useState<
    "assigned" | "advance_pending" | "in_fabrication" | "ready" | "dispatched"
  >("assigned");
  const [notes, setNotes] = useState("");

  const vendorsQuery = useQuery({
    queryKey: ["vendors", "picker"],
    queryFn: () => listVendorsForPicker(""),
  });

  const vendors = vendorsQuery.data || [];

  useEffect(() => {
    if (open) {
      const parsedFulfilment = parseItemFulfilment(item?.fulfilment);
      const parsedVendor = parseItemVendorAssignment(item?.fulfilment);

      if (parsedFulfilment.mode === "live_stock") {
        setMode("live_stock");
        setStockLocation(parsedFulfilment.location || "Main Yard / Slab Storage");
      } else if (parsedFulfilment.mode === "stock_lifted") {
        setMode("stock_lifted");
        setStockLocation(parsedFulfilment.location || "Lifted from Stock / Yard");
      } else if (parsedFulfilment.mode === "vendor" && parsedVendor) {
        setMode("vendor");
        setSelectedVendorId(parsedVendor.vendor_id);
        setAdvanceRequired(
          parsedVendor.advance_required_inr ? String(parsedVendor.advance_required_inr) : "",
        );
        setAdvancePaid(parsedVendor.advance_paid_inr ? String(parsedVendor.advance_paid_inr) : "");
        setAdvanceStatus(parsedVendor.advance_status);
        setProdStatus(parsedVendor.production_status);
        setNotes(parsedVendor.manufacturer_notes || "");
      } else {
        // Default to Live Stock - most stone orders are fulfilled from live stock
        setMode("live_stock");
        setStockLocation("Main Yard / Slab Storage");
        setSelectedVendorId("");
        setAdvanceRequired("");
        setAdvancePaid("");
        setAdvanceStatus("unpaid");
        setProdStatus("assigned");
        setNotes("");
      }
      setApplyToAll(false);
    }
  }, [open, item?.id, item?.fulfilment]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!item) return;

      let serializedFulfilment: string | null = null;
      if (mode === "live_stock") {
        serializedFulfilment = serializeLiveStockAssignment({
          location: stockLocation || "Main Yard / Slab Storage",
          notes,
        });
      } else if (mode === "stock_lifted") {
        serializedFulfilment = serializeStockLiftedAssignment({
          location: stockLocation || "Lifted from Stock / Yard",
          notes,
        });
      } else if (mode === "vendor") {
        if (!selectedVendorId) {
          throw new Error("Please select a vendor or fabricator");
        }
        const vendorObj = vendors.find((v) => v.id === selectedVendorId);
        const assignment: ItemVendorAssignment = {
          vendor_id: selectedVendorId,
          vendor_name: vendorObj?.company_name || "Unknown Manufacturer",
          vendor_phone:
            vendorObj?.mobile_number ||
            vendorObj?.whatsapp_number ||
            vendorObj?.contact_person ||
            undefined,
          advance_required_inr: advanceRequired ? parseFloat(advanceRequired) : 0,
          advance_paid_inr: advancePaid ? parseFloat(advancePaid) : 0,
          advance_status: advanceStatus,
          production_status: prodStatus,
          manufacturer_notes: notes,
          assigned_at: existingVendor?.assigned_at || new Date().toISOString(),
        };
        serializedFulfilment = serializeItemVendorAssignment(assignment);
      }

      if (applyToAll) {
        // Update all line items of this sales order
        const allItems = await listSalesOrderItems(salesOrderId);
        for (const it of allItems) {
          await updateSalesOrderItem(it.id, { fulfilment: serializedFulfilment });
        }
      } else {
        await updateSalesOrderItem(item.id, { fulfilment: serializedFulfilment });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.salesOrders.items(salesOrderId) });
      qc.invalidateQueries({ queryKey: qk.salesOrders.byId(salesOrderId) });
      qc.invalidateQueries({ queryKey: ["operations.order-vendor-assignment"] });
      qc.invalidateQueries({ queryKey: ["insights"] });
      if (mode === "live_stock") {
        toast.success(
          applyToAll
            ? "All items marked as fulfilled from Live Stock (In-House Yard)"
            : "Item marked as fulfilled from Live Stock (In-House Yard)",
        );
      } else if (mode === "stock_lifted") {
        toast.success(
          applyToAll
            ? "All items marked as Material Lifted from Live Stock"
            : "Item marked as Material Lifted from Live Stock",
        );
      } else {
        toast.success(
          applyToAll ? "All items assigned to vendor" : "Manufacturer assignment saved",
        );
      }
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save fulfilment assignment");
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!item) return;
      if (applyToAll) {
        const allItems = await listSalesOrderItems(salesOrderId);
        for (const it of allItems) {
          await updateSalesOrderItem(it.id, { fulfilment: null });
        }
      } else {
        await updateSalesOrderItem(item.id, { fulfilment: null });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.salesOrders.items(salesOrderId) });
      qc.invalidateQueries({ queryKey: qk.salesOrders.byId(salesOrderId) });
      qc.invalidateQueries({ queryKey: ["operations.order-vendor-assignment"] });
      qc.invalidateQueries({ queryKey: ["insights"] });
      toast.success("Fulfilment assignment cleared");
      onOpenChange(false);
    },
  });

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "inline-flex rounded-xl border p-2 shadow-xs",
                mode === "live_stock"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : mode === "stock_lifted"
                    ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                    : "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300",
              )}
            >
              {mode === "live_stock" ? (
                <Boxes className="h-5 w-5" />
              ) : mode === "stock_lifted" ? (
                <PackageCheck className="h-5 w-5" />
              ) : (
                <Factory className="h-5 w-5" />
              )}
            </span>
            <div>
              <DialogTitle className="text-base font-black font-display text-engraved-title">
                Assign Fulfilment: Live Stock vs Vendor
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Designate whether this material comes from Live Stock on-hand in the stone yard or
                is outsourced to an external vendor.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {item && (
          <div className="engraved-well rounded-xl p-3 text-xs space-y-1">
            <div className="font-mono text-[10px] uppercase font-bold text-slate-500">
              Product Item
            </div>
            <div className="font-bold text-slate-800 dark:text-slate-100">
              {item.product_name ?? item.description}
            </div>
            <div className="text-slate-500 font-mono">
              Qty: {Number(item.quantity)} {item.unit || "units"} · Total: ₹
              {Number(item.line_total).toLocaleString("en-IN")}
            </div>
          </div>
        )}

        {/* 3 Fulfilment Mode Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("live_stock")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-md transition-all cursor-pointer text-center",
              mode === "live_stock"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs font-bold border border-emerald-300"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900",
            )}
          >
            <Boxes className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-[11px] leading-tight">Live Stock (Yard)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("stock_lifted")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-md transition-all cursor-pointer text-center",
              mode === "stock_lifted"
                ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs font-bold border border-blue-300"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900",
            )}
          >
            <PackageCheck className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="text-[11px] leading-tight">Lifted from Stock</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("vendor")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-md transition-all cursor-pointer text-center",
              mode === "vendor"
                ? "bg-white dark:bg-slate-900 text-cyan-700 dark:text-cyan-300 shadow-xs font-bold border border-cyan-300"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900",
            )}
          >
            <Factory className="h-4 w-4 text-cyan-600 shrink-0" />
            <span className="text-[11px] leading-tight">Outsource Vendor</span>
          </button>
        </div>

        <div className="space-y-4 py-1 text-xs">
          {mode === "live_stock" && (
            <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-950 dark:text-emerald-200 text-xs">
                    In-House Live Stock Fulfilment
                  </p>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                    This material is supplied directly from current on-hand live stock in our yard
                    or warehouse. No outside purchase order or vendor assignment is required.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-semibold text-emerald-950 dark:text-emerald-200">
                  Yard / Warehouse Godown Location
                </Label>
                <Input
                  value={stockLocation}
                  onChange={(e) => setStockLocation(e.target.value)}
                  placeholder="e.g. Main Yard / Slab Storage, Shed A, Factory Floor"
                  className="h-8 text-xs bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          )}

          {mode === "stock_lifted" && (
            <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/50 dark:bg-blue-950/20">
              <div className="flex items-start gap-2">
                <PackageCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-950 dark:text-blue-200 text-xs">
                    Material Lifted from Live Stock
                  </p>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300 mt-0.5">
                    Customer or carting agency has already picked up / lifted this material directly
                    from our live stock inventory.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-semibold text-blue-950 dark:text-blue-200">
                  Pickup / Yard Location
                </Label>
                <Input
                  value={stockLocation}
                  onChange={(e) => setStockLocation(e.target.value)}
                  placeholder="e.g. Lifted from Stock / Yard Gate 1"
                  className="h-8 text-xs bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          )}

          {mode === "vendor" && (
            <div className="space-y-3">
              {/* Vendor Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Manufacturer / Vendor *</Label>
                <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Choose stone manufacturer or quarry vendor..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 text-xs">
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id} className="text-xs">
                        <span className="font-semibold">{v.company_name}</span>
                        {v.city && <span className="text-muted-foreground ml-1.5">({v.city})</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedVendor &&
                  (selectedVendor.mobile_number || selectedVendor.whatsapp_number) && (
                    <div className="flex items-center gap-1.5 text-[11px] text-cyan-700 font-medium">
                      <Phone className="h-3 w-3" />
                      <span>
                        Vendor Contact:{" "}
                        {selectedVendor.mobile_number || selectedVendor.whatsapp_number}
                      </span>
                    </div>
                  )}
              </div>

              {/* Advance Requirements & Delay Risk */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Advance Required (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 25000"
                    value={advanceRequired}
                    onChange={(e) => setAdvanceRequired(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Advance Payment Status</Label>
                  <Select
                    value={advanceStatus}
                    onValueChange={(v) => setAdvanceStatus(v as "unpaid" | "partial" | "paid")}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      <SelectItem value="unpaid">⚠️ Unpaid (Risk of Delay)</SelectItem>
                      <SelectItem value="partial">⏳ Partially Paid</SelectItem>
                      <SelectItem value="paid">✓ Fully Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {advanceStatus === "unpaid" && advanceRequired && parseFloat(advanceRequired) > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <strong>Delivery Delay Warning:</strong> Vendor has not been paid the required
                    advance of ₹{Number(advanceRequired).toLocaleString("en-IN")}. Stone fabrication
                    cannot start until advance is transferred.
                  </div>
                </div>
              )}

              {/* Production Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Manufacturer Processing Status</Label>
                <Select
                  value={prodStatus}
                  onValueChange={(v) =>
                    setProdStatus(
                      v as
                        "assigned" | "advance_pending" | "in_fabrication" | "ready" | "dispatched",
                    )
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="assigned">Assigned to Factory</SelectItem>
                    <SelectItem value="advance_pending">Awaiting Advance Payment</SelectItem>
                    <SelectItem value="in_fabrication">Cutting / In Fabrication</SelectItem>
                    <SelectItem value="ready">Fabricated & Ready for Inspection</SelectItem>
                    <SelectItem value="dispatched">Dispatched from Factory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Fulfilment & Delivery Notes</Label>
            <Textarea
              rows={2}
              placeholder={
                mode === "live_stock"
                  ? "e.g. Slabs inspected, lot #42, ready for loading"
                  : mode === "stock_lifted"
                    ? "e.g. Lifted by customer vehicle directly from yard"
                    : "e.g. 20mm thickness, mirror polish, factory location: Makrana Unit 2"
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs resize-none"
            />
          </div>

          {/* Apply to All Items Checkbox */}
          <div className="flex items-center gap-2 pt-1 border-t">
            <input
              type="checkbox"
              id="apply-to-all-items"
              checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
            <label
              htmlFor="apply-to-all-items"
              className="text-xs text-foreground font-medium cursor-pointer"
            >
              Apply this fulfilment source (
              {mode === "live_stock"
                ? "Live Stock"
                : mode === "stock_lifted"
                  ? "Lifted from Stock"
                  : "Selected Vendor"}
              ) to all items in this sales order
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {fulfilmentState.mode !== "unassigned" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending || saveMutation.isPending}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 mr-auto"
            >
              Reset to Unassigned
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className={cn(
              "text-xs gap-1.5 font-semibold text-white",
              mode === "live_stock"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : mode === "stock_lifted"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-cyan-700 hover:bg-cyan-800",
            )}
          >
            <Save className="h-3.5 w-3.5" />
            {saveMutation.isPending
              ? "Saving…"
              : mode === "live_stock"
                ? "Save as Live Stock"
                : mode === "stock_lifted"
                  ? "Save as Lifted from Stock"
                  : "Save Vendor Assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
