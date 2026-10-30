import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Truck,
  FileText,
  Printer,
  Download,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  AlertTriangle,
  QrCode,
  XCircle,
  Building2,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { InvoiceListItem, InvoiceItemRow } from "@/lib/invoices/api";
import {
  type EWayBillDetails,
  type EWayBillInput,
  type EWayBillTransportMode,
  type EWayBillVehicleType,
  TRANSPORT_MODE_LABELS,
  VEHICLE_TYPE_LABELS,
} from "@/lib/eway-bill/types";
import {
  calculateEWayBillValidity,
  estimateDistanceKm,
  generateNicEwayBillJson,
  generateStosEWayBillNo,
  isValidEWayBillNo,
  normalizeVehicleNo,
  STONE_TECH_DISPATCH_ORIGIN,
} from "@/lib/eway-bill/engine";
import {
  saveInvoiceEWayBill,
  clearInvoiceEWayBill,
  getInvoiceEWayBillDetails,
} from "@/lib/eway-bill/api";
import { formatInr } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

interface EWayBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceListItem;
  items?: InvoiceItemRow[];
  onSuccess?: () => void;
}

export function EWayBillDialog({
  open,
  onOpenChange,
  invoice,
  items = [],
  onSuccess,
}: EWayBillDialogProps) {
  const qc = useQueryClient();
  const existingEwb = useMemo(() => getInvoiceEWayBillDetails(invoice), [invoice]);

  const [activeTab, setActiveTab] = useState<"create" | "slip">(existingEwb ? "slip" : "create");
  const [copied, setCopied] = useState(false);

  // Form State
  const [ewayBillNoInput, setEwayBillNoInput] = useState(invoice.eway_bill_no || "");
  const [vehicleNo, setVehicleNo] = useState(
    existingEwb?.partB.vehicleNo || invoice.vehicle_no || "",
  );
  const [transporterName, setTransporterName] = useState(
    existingEwb?.partB.transporterName || invoice.transporter || "",
  );
  const [transporterId, setTransporterId] = useState(existingEwb?.partB.transporterId || "");
  const [lrNo, setLrNo] = useState(existingEwb?.partB.transportDocNo || invoice.lr_no || "");
  const [lrDate, setLrDate] = useState(
    existingEwb?.partB.transportDocDate || new Date().toISOString().slice(0, 10),
  );
  const [distanceKm, setDistanceKm] = useState<number>(() => {
    if (existingEwb?.partB.approxDistanceKm) return existingEwb.partB.approxDistanceKm;
    return estimateDistanceKm("313001", "08");
  });
  const [transportMode, setTransportMode] = useState<EWayBillTransportMode>(
    existingEwb?.partB.transportMode || "1",
  );
  const [vehicleType, setVehicleType] = useState<EWayBillVehicleType>(
    existingEwb?.partB.vehicleType || "R",
  );
  const [notes, setNotes] = useState(existingEwb?.notes || "");

  // Computed validity
  const validity = useMemo(
    () => calculateEWayBillValidity(distanceKm, vehicleType),
    [distanceKm, vehicleType],
  );

  const totalValue = Number(invoice.total || 0);
  const isMandatory = totalValue > 50000;

  // Mutation to Save E-Way Bill
  const saveMutation = useMutation({
    mutationFn: async (customEwbNo?: string) => {
      const payload: EWayBillInput = {
        invoiceId: invoice.id,
        ewayBillNo: customEwbNo || ewayBillNoInput.trim() || undefined,
        vehicleNo: vehicleNo.trim(),
        transporterName: transporterName.trim() || null,
        transporterId: transporterId.trim() || null,
        lrNo: lrNo.trim() || null,
        lrDate: lrDate || null,
        distanceKm,
        transportMode,
        vehicleType,
        notes: notes.trim() || null,
      };
      return saveInvoiceEWayBill(payload);
    },
    onSuccess: (saved) => {
      toast.success(`E-Way Bill ${saved.ewayBillNo} attached to Invoice ${invoice.invoice_no}`);
      qc.invalidateQueries({ queryKey: qk.invoices.byId(invoice.id) });
      qc.invalidateQueries({ queryKey: qk.invoices.all });
      qc.invalidateQueries({ queryKey: qk.dispatch.all });
      setActiveTab("slip");
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save E-Way Bill");
    },
  });

  // Mutation to Clear E-Way Bill
  const clearMutation = useMutation({
    mutationFn: () => clearInvoiceEWayBill(invoice.id),
    onSuccess: () => {
      toast.success("E-Way Bill detached from invoice");
      qc.invalidateQueries({ queryKey: qk.invoices.byId(invoice.id) });
      qc.invalidateQueries({ queryKey: qk.invoices.all });
      setEwayBillNoInput("");
      setActiveTab("create");
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to detach E-Way Bill");
    },
  });

  // 1-Click JSON Download for official portal
  const handleDownloadNicJson = () => {
    if (!existingEwb) return;
    const json = generateNicEwayBillJson(existingEwb);
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `EWayBill_${invoice.invoice_no}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("NIC E-Way Bill JSON downloaded. Ready for upload to ewaybillgst.gov.in");
  };

  const handleCopyJson = async () => {
    if (!existingEwb) return;
    const json = generateNicEwayBillJson(existingEwb);
    await navigator.clipboard.writeText(JSON.stringify(json, null, 2));
    setCopied(true);
    toast.success("NIC E-Way Bill JSON copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-4 sm:p-5 border-b bg-muted/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>GST E-Way Bill</span>
                  <Badge variant="outline" className="text-[10px] font-mono uppercase">
                    {invoice.invoice_no}
                  </Badge>
                  {existingEwb && (
                    <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                      <ShieldCheck className="h-3 w-3" /> ACTIVE
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Consignment value:{" "}
                  <span className="font-semibold text-foreground">{formatInr(totalValue)}</span>
                  {isMandatory ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium ml-1.5">
                      (Mandatory as consignment &gt; ₹50,000)
                    </span>
                  ) : (
                    <span className="text-muted-foreground ml-1.5">(Consignment &lt; ₹50,000)</span>
                  )}
                </DialogDescription>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "create" | "slip")}>
              <TabsList className="h-8">
                <TabsTrigger value="create" className="text-xs px-2.5">
                  Generate / Attach
                </TabsTrigger>
                <TabsTrigger value="slip" className="text-xs px-2.5" disabled={!existingEwb}>
                  Printable Slip
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>

        {activeTab === "create" ? (
          <div className="p-4 sm:p-6 space-y-5">
            {/* Part A: Invoice & Consignment Overview */}
            <div className="rounded-xl border bg-muted/10 p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" /> Part A: Consignment Details
                  (Auto-filled)
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Outward Supply • Tax Invoice
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-[10px] text-muted-foreground font-medium">
                    Consignor (From)
                  </div>
                  <div className="font-semibold text-foreground truncate">
                    {STONE_TECH_DISPATCH_ORIGIN.legalName}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    {STONE_TECH_DISPATCH_ORIGIN.gstin}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {STONE_TECH_DISPATCH_ORIGIN.place} ({STONE_TECH_DISPATCH_ORIGIN.pincode})
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground font-medium">
                    Consignee (To)
                  </div>
                  <div className="font-semibold text-foreground truncate">
                    {invoice.customer?.name || "Client"}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    URP / Customer GST
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {invoice.project?.name || "Site Delivery"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground font-medium">Invoice Value</div>
                  <div className="font-bold text-foreground">{formatInr(totalValue)}</div>
                  <div className="text-[10px] text-muted-foreground">
                    Tax: {formatInr(Number(invoice.tax_amount || 0))}
                  </div>
                  <div className="text-[10px] text-muted-foreground">HSN: 6802 (Natural Stone)</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground font-medium">
                    Computed Validity
                  </div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">
                    {validity.daysValid} Day{validity.daysValid === 1 ? "" : "s"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Valid till 11:59 PM</div>
                </div>
              </div>
            </div>

            {/* Part B: Movement & Vehicle Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-primary" /> Part B: Vehicle & Transporter
                  Movement
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Required for valid movement
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Vehicle Number *</Label>
                  <Input
                    placeholder="e.g. RJ27-GA-1234"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                    className="font-mono uppercase text-xs h-9"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Transport Mode</Label>
                  <Select
                    value={transportMode}
                    onValueChange={(v) => setTransportMode(v as EWayBillTransportMode)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRANSPORT_MODE_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k} className="text-xs">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Distance (km) *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Math.max(1, Number(e.target.value)))}
                    className="font-mono text-xs h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Transporter / Carting Agency</Label>
                  <Input
                    placeholder="e.g. Maruti Freight Carriers"
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Transporter GSTIN / ID (Optional)</Label>
                  <Input
                    placeholder="15-digit Transporter ID"
                    value={transporterId}
                    onChange={(e) => setTransporterId(e.target.value.toUpperCase())}
                    className="font-mono uppercase text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">LR / Bilty Number (Doc No)</Label>
                  <Input
                    placeholder="e.g. LR-8921"
                    value={lrNo}
                    onChange={(e) => setLrNo(e.target.value)}
                    className="font-mono text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Delivery / Transport Notes</Label>
                <Textarea
                  rows={2}
                  placeholder="e.g. Direct site delivery, driver to call 1 hour before arrival for crane unloading."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            {/* Generation & Linking Options */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-bold text-foreground">Attach or Generate E-Way Bill</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Government E-Way Bill Number (12 digits)
                  </Label>
                  <Input
                    placeholder="Enter 12 digits (if already created on portal)"
                    value={ewayBillNoInput}
                    onChange={(e) => setEwayBillNoInput(e.target.value.replace(/[^0-9\s-]/g, ""))}
                    className="font-mono text-xs h-9 bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Leave blank to auto-generate a valid STOS system E-Way Bill sequence.
                  </p>
                </div>

                <div className="flex flex-col justify-end gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => saveMutation.mutate(ewayBillNoInput.trim() || undefined)}
                      disabled={saveMutation.isPending || !vehicleNo.trim()}
                      className="h-9 flex-1 font-semibold text-xs gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {saveMutation.isPending
                        ? "Saving…"
                        : ewayBillNoInput.trim()
                          ? "Attach Portal E-Way Bill"
                          : "Generate E-Way Bill"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const randomNo = generateStosEWayBillNo();
                        setEwayBillNoInput(randomNo);
                        saveMutation.mutate(randomNo);
                      }}
                      disabled={saveMutation.isPending || !vehicleNo.trim()}
                      className="h-9 px-3 text-xs gap-1"
                      title="Generate new 12-digit number"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Auto-number
                    </Button>
                  </div>
                </div>
              </div>

              {/* Portal Integration Assistant */}
              <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span>Portal:</span>
                  <a
                    href="https://ewaybillgst.gov.in"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    ewaybillgst.gov.in <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="text-[11px]">
                  Valid for transport across Rajasthan, Gujarat, Maharashtra & all India.
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Official E-Way Bill Printable Slip (Part A & B) */
          <div className="p-4 sm:p-6 space-y-4">
            {existingEwb ? (
              <div className="border rounded-xl bg-background p-5 space-y-4 text-xs font-sans print:p-0 print:border-none">
                {/* Official EWB Header */}
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                      Government of India • GST E-Way Bill System
                    </div>
                    <h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2 mt-0.5">
                      <span>E-WAY BILL:</span>
                      <span className="font-mono text-primary">{existingEwb.ewayBillNo}</span>
                    </h2>
                  </div>
                  <div className="text-right">
                    <div className="h-12 w-12 rounded border border-dashed flex items-center justify-center text-muted-foreground ml-auto">
                      <QrCode className="h-8 w-8 text-foreground" />
                    </div>
                    <div className="text-[9px] font-mono text-muted-foreground mt-0.5">
                      VERIFIED • NIC COMPLIANT
                    </div>
                  </div>
                </div>

                {/* Dates & Validity Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-muted/30 border">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Generated Date:</span>
                    <div className="font-semibold text-foreground">
                      {new Date(existingEwb.ewayBillDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Valid Until:</span>
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {new Date(existingEwb.validUntil).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Doc Type & No:</span>
                    <div className="font-semibold text-foreground font-mono">
                      Tax Invoice • {existingEwb.partA.docNo}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Distance:</span>
                    <div className="font-semibold text-foreground">
                      {existingEwb.partB.approxDistanceKm} km (
                      {TRANSPORT_MODE_LABELS[existingEwb.partB.transportMode]})
                    </div>
                  </div>
                </div>

                {/* Part A Table */}
                <div className="space-y-1.5">
                  <div className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    PART-A (Consignment Information)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">
                        1. Consignor (From)
                      </div>
                      <div className="font-semibold text-foreground">
                        {existingEwb.partA.fromLegalName}
                      </div>
                      <div className="font-mono text-xs">GSTIN: {existingEwb.partA.fromGstin}</div>
                      <div className="text-muted-foreground text-[11px]">
                        {existingEwb.partA.fromAddress1}
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        Place: {existingEwb.partA.fromPlace} ({existingEwb.partA.fromPincode}),
                        State: {existingEwb.partA.fromStateCode}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">
                        2. Consignee (To)
                      </div>
                      <div className="font-semibold text-foreground">
                        {existingEwb.partA.toLegalName}
                      </div>
                      <div className="font-mono text-xs">GSTIN: {existingEwb.partA.toGstin}</div>
                      <div className="text-muted-foreground text-[11px]">
                        {existingEwb.partA.toAddress1}
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        Place: {existingEwb.partA.toPlace} ({existingEwb.partA.toPincode}), State:{" "}
                        {existingEwb.partA.toStateCode}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-lg border bg-muted/10 text-center">
                    <div>
                      <div className="text-[10px] text-muted-foreground">Taxable Value</div>
                      <div className="font-semibold">
                        {formatInr(existingEwb.partA.totalTaxableAmount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">CGST + SGST</div>
                      <div className="font-semibold">
                        {formatInr(existingEwb.partA.cgstAmount + existingEwb.partA.sgstAmount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">IGST</div>
                      <div className="font-semibold">{formatInr(existingEwb.partA.igstAmount)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">
                        Total Consignment Value
                      </div>
                      <div className="font-bold text-foreground">
                        {formatInr(existingEwb.partA.totalInvoiceValue)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Part B Table */}
                <div className="space-y-1.5">
                  <div className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    PART-B (Vehicle / Movement Details)
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="p-2 font-medium">Mode</th>
                          <th className="p-2 font-medium">Vehicle No</th>
                          <th className="p-2 font-medium">From</th>
                          <th className="p-2 font-medium">Doc No & Date</th>
                          <th className="p-2 font-medium">Transporter</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-2">
                            {TRANSPORT_MODE_LABELS[existingEwb.partB.transportMode]}
                          </td>
                          <td className="p-2 font-mono font-bold text-foreground">
                            {existingEwb.partB.vehicleNo}
                          </td>
                          <td className="p-2">{existingEwb.partA.fromPlace}</td>
                          <td className="p-2 font-mono">
                            {existingEwb.partB.transportDocNo || "—"}
                          </td>
                          <td className="p-2">
                            {existingEwb.partB.transporterName || "Direct Carting"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handlePrintSlip}
                      className="gap-1.5 h-8 text-xs font-semibold"
                    >
                      <Printer className="h-3.5 w-3.5" /> Print E-Way Bill Slip
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadNicJson}
                      className="gap-1.5 h-8 text-xs"
                    >
                      <Download className="h-3.5 w-3.5" /> Download NIC JSON
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCopyJson}
                      className="gap-1.5 h-8 text-xs"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Copy JSON
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (
                        confirm(
                          "Are you sure you want to detach/void this E-Way Bill from the invoice?",
                        )
                      ) {
                        clearMutation.mutate();
                      }
                    }}
                    disabled={clearMutation.isPending}
                    className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Detach E-Way Bill
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-2">
                <Truck className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-semibold">No E-Way Bill generated yet</p>
                <Button size="sm" onClick={() => setActiveTab("create")} className="h-8 text-xs">
                  Generate E-Way Bill
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="p-3 sm:p-4 border-t bg-muted/20">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
