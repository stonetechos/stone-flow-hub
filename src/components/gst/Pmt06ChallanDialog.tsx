import { useState } from "react";
import {
  Landmark,
  CheckCircle2,
  Copy,
  ExternalLink,
  Printer,
  FileDown,
  ShieldCheck,
  Building,
  CreditCard,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatInr } from "@/lib/format";
import { toast } from "sonner";
import type { Pmt06Challan } from "@/lib/gst/gst-engine";

interface Pmt06ChallanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challan: Pmt06Challan;
  onMarkPaid?: () => void;
}

export function Pmt06ChallanDialog({
  open,
  onOpenChange,
  challan,
  onMarkPaid,
}: Pmt06ChallanDialogProps) {
  const [copied, setCopied] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  const handleCopyCpin = () => {
    navigator.clipboard.writeText(challan.cpin);
    setCopied(true);
    toast.success("CPIN copied to clipboard: " + challan.cpin);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenGstPortal = () => {
    navigator.clipboard.writeText(challan.cpin);
    toast.info("CPIN copied! Redirecting to GST Payment Gateway...");
    window.open(challan.portalUrl, "_blank", "noopener,noreferrer");
  };

  const handlePrintChallan = () => {
    window.print();
  };

  const handleConfirmPaid = () => {
    setIsMarking(true);
    setTimeout(() => {
      setIsMarking(false);
      toast.success(
        "GST Payment of " +
          formatInr(challan.breakup.totalChallanAmount) +
          " recorded successfully!",
      );
      if (onMarkPaid) onMarkPaid();
      onOpenChange(false);
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Form GST PMT-06</DialogTitle>
                <DialogDescription className="text-xs">
                  Challan for Payment of Goods and Services Tax (Rule 87)
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-xs bg-primary/10 text-primary border-primary/20"
            >
              CPIN Generated
            </Badge>
          </div>
        </DialogHeader>

        {/* Challan Certificate Body */}
        <div className="space-y-4 pt-2 print:p-0">
          {/* Header Card */}
          <div className="rounded-lg border bg-muted/30 p-3.5 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">CPIN</span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                  {challan.cpin}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={handleCopyCpin}
                    title="Copy CPIN"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Challan Date</span>
                <span className="font-medium text-foreground">{challan.createdDate}</span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Valid Till</span>
                <span className="font-medium text-amber-600">{challan.expiryDate}</span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Return Period</span>
                <span className="font-medium text-foreground">
                  {challan.period} ({challan.periodCode})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
              <div>
                <span className="text-muted-foreground block text-[11px]">Taxpayer Name</span>
                <span className="font-semibold text-foreground">{challan.taxpayerName}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">GSTIN</span>
                <span className="font-mono font-semibold text-foreground">{challan.gstin}</span>
              </div>
            </div>
          </div>

          {/* Tax Breakdown Table */}
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-2.5">Major Head</th>
                  <th className="p-2.5 text-right">Tax (₹)</th>
                  <th className="p-2.5 text-right">Interest</th>
                  <th className="p-2.5 text-right">Penalty</th>
                  <th className="p-2.5 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono">
                <tr>
                  <td className="p-2.5 font-sans font-medium">CGST (Central Tax)</td>
                  <td className="p-2.5 text-right">{formatInr(challan.breakup.cgst.tax)}</td>
                  <td className="p-2.5 text-right">₹0</td>
                  <td className="p-2.5 text-right">₹0</td>
                  <td className="p-2.5 text-right font-bold">
                    {formatInr(challan.breakup.cgst.total)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans font-medium">SGST (State Tax)</td>
                  <td className="p-2.5 text-right">{formatInr(challan.breakup.sgst.tax)}</td>
                  <td className="p-2.5 text-right">₹0</td>
                  <td className="p-2.5 text-right">₹0</td>
                  <td className="p-2.5 text-right font-bold">
                    {formatInr(challan.breakup.sgst.total)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans font-medium">IGST (Integrated Tax)</td>
                  <td className="p-2.5 text-right">{formatInr(challan.breakup.igst.tax)}</td>
                  <td className="p-2.5 text-right">₹0</td>
                  <td className="p-2.5 text-right">₹0</td>
                  <td className="p-2.5 text-right font-bold">
                    {formatInr(challan.breakup.igst.total)}
                  </td>
                </tr>
                <tr className="bg-muted/40 font-bold text-sm">
                  <td className="p-2.5 font-sans text-foreground">Total Challan Amount</td>
                  <td className="p-2.5 text-right text-emerald-600" colSpan={4}>
                    {formatInr(challan.breakup.totalChallanAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Instructions Card */}
          <div className="rounded-lg border border-dashed border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              1-Click GST Portal Integration Instructions:
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-muted-foreground text-[11px] leading-relaxed">
              <li>
                Click <b>"Pay on GST Portal"</b> below. We automatically copy your CPIN to your
                clipboard.
              </li>
              <li>
                On the GST payment screen, select <b>E-Payment (Net Banking / NEFT / RTGS)</b>.
              </li>
              <li>
                Authorize through Stone Tech’s linked corporate banking account (SBI / HDFC /
                ICICI).
              </li>
              <li>
                Once completed, the electronic cash ledger will be credited instantly for GSTR-3B
                offset.
              </li>
            </ol>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t pt-3">
          <Button variant="outline" size="sm" onClick={handlePrintChallan} className="gap-1.5">
            <Printer className="h-4 w-4" />
            Print Challan
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleConfirmPaid}
            disabled={isMarking}
            className="gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Mark as Paid
          </Button>

          <Button
            size="sm"
            onClick={handleOpenGstPortal}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <ExternalLink className="h-4 w-4" />
            Pay on GST Portal ({formatInr(challan.breakup.totalChallanAmount)})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
