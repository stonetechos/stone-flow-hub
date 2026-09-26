import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Factory, AlertTriangle, CheckCircle2, Phone, Save } from "lucide-react";
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
import { listVendorsForPicker, type VendorRow } from "@/lib/vendors/api";
import { updateSalesOrderItem, type SalesOrderItemRow } from "@/lib/sales-orders/api";
import {
  type ItemVendorAssignment,
  parseItemVendorAssignment,
  serializeItemVendorAssignment,
} from "@/lib/sales-orders/vendor-assignment";
import { qk } from "@/lib/query-keys";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SalesOrderItemRow | null;
  salesOrderId: string;
}

export function AssignVendorModal({ open, onOpenChange, item, salesOrderId }: Props) {
  const qc = useQueryClient();
  const existing = parseItemVendorAssignment(item?.fulfilment);

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
    if (existing) {
      setSelectedVendorId(existing.vendor_id);
      setAdvanceRequired(
        existing.advance_required_inr ? String(existing.advance_required_inr) : "",
      );
      setAdvancePaid(existing.advance_paid_inr ? String(existing.advance_paid_inr) : "");
      setAdvanceStatus(existing.advance_status);
      setProdStatus(existing.production_status);
      setNotes(existing.manufacturer_notes || "");
    } else {
      setSelectedVendorId("");
      setAdvanceRequired("");
      setAdvancePaid("");
      setAdvanceStatus("unpaid");
      setProdStatus("assigned");
      setNotes("");
    }
  }, [existing, item?.id, item?.fulfilment, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!item) return;
      if (!selectedVendorId) {
        // Clear assignment
        await updateSalesOrderItem(item.id, { fulfilment: null });
        return;
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
        assigned_at: existing?.assigned_at || new Date().toISOString(),
      };
      await updateSalesOrderItem(item.id, {
        fulfilment: serializeItemVendorAssignment(assignment),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.salesOrders.items(salesOrderId) });
      qc.invalidateQueries({ queryKey: qk.salesOrders.byId(salesOrderId) });
      toast.success("Manufacturer assignment saved");
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save assignment");
    },
  });

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex rounded-xl border border-cyan-200 bg-cyan-50 p-2 text-cyan-700 shadow-xs dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300">
              <Factory className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-black font-display text-engraved-title">
                Attach Vendor / Manufacturer to Item
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Assign this product order to a fabrication partner, record advance requirements, and
                monitor fabrication status.
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

        <div className="space-y-4 py-2 text-xs">
          {/* Vendor Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Select Manufacturer / Vendor</Label>
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
            {selectedVendor && (selectedVendor.mobile_number || selectedVendor.whatsapp_number) && (
              <div className="flex items-center gap-1.5 text-[11px] text-cyan-700 font-medium">
                <Phone className="h-3 w-3" />
                <span>
                  Vendor Contact: {selectedVendor.mobile_number || selectedVendor.whatsapp_number}
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
                  v as "assigned" | "advance_pending" | "in_fabrication" | "ready" | "dispatched",
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

          {/* Fabrication Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Factory / Processing Specifications</Label>
            <Textarea
              rows={2}
              placeholder="e.g. 20mm thickness, mirror polish, factory location: Makrana Unit 2, contact person: Suresh Ji"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
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
            className="text-xs gap-1.5 bg-cyan-700 text-white hover:bg-cyan-800"
          >
            <Save className="h-3.5 w-3.5" />
            {saveMutation.isPending ? "Saving…" : "Save Manufacturer Assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
