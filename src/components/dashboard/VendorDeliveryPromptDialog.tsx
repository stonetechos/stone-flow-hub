import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Copy,
  Check,
  Truck,
  Sparkles,
  ShieldAlert,
  Building2,
  Calendar,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { openWhatsappToContact } from "@/lib/whatsapp";
import {
  buildVendorDeliveryPromptWhatsappMessage,
  type VendorDeliveryPromptItem,
} from "@/lib/vendors/delivery-prompts";

export interface VendorDeliveryPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: VendorDeliveryPromptItem | null;
}

export function VendorDeliveryPromptDialog({
  open,
  onOpenChange,
  item,
}: VendorDeliveryPromptDialogProps) {
  const [vendorPhone, setVendorPhone] = useState("");
  const [message, setMessage] = useState("");
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Sync state when dialog opens with selected item
  useEffect(() => {
    if (open && item) {
      setVendorPhone(item.vendorPhone || "");
      const generated = buildVendorDeliveryPromptWhatsappMessage({
        vendorName: item.vendorName,
        orderNo: item.orderNo,
        productName: item.productName,
        vendorDaysText: item.vendorDaysText,
        formattedDueDate: item.formattedDueDate,
        projectName: item.projectName,
        customerName: item.customerName,
      });
      setMessage(generated);
    }
  }, [open, item]);

  if (!item) return null;

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedMessage(true);
      toast.success("WhatsApp message copied to clipboard");
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch {
      toast.error("Failed to copy message");
    }
  };

  const handleSendWhatsapp = () => {
    if (!vendorPhone.trim()) {
      toast.error("Please enter a valid vendor phone number");
      return;
    }

    try {
      const opened = openWhatsappToContact(vendorPhone, message);
      if (opened) {
        toast.success(`Opening WhatsApp chat with ${item.vendorName}...`);
        onOpenChange(false);
      } else {
        toast.info("WhatsApp opened. Please send the message in chat.");
      }
    } catch {
      toast.error("Could not trigger WhatsApp automatically. You can copy the message.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                Nudge Vendor for Delivery Status
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-xs font-semibold"
                >
                  {item.actualDaysRemaining === 0
                    ? "Due Today"
                    : `${item.actualDaysRemaining}d to Delivery`}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Order #{item.orderNo} · Due on {item.formattedDueDate}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Order & Product Summary Box */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Package className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-sm">{item.productName}</span>
              </div>
              <Badge variant="secondary" className="uppercase text-[10px] tracking-wider shrink-0">
                {item.orderType}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
              <div className="flex items-center gap-1.5 truncate">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                <span className="truncate">
                  Vendor: <strong className="text-foreground">{item.vendorName}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                <span>
                  Due: <strong className="text-foreground">{item.formattedDueDate}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* 1-Day Safety Buffer Explanation Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 text-xs leading-relaxed">
            <ShieldAlert className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div>
              <strong>1-Day Safety Buffer Applied:</strong> The generated message tells the vendor
              we have got <strong>{item.vendorDaysText}</strong> to deliver (1 day less than the
              actual due date of {item.actualDaysRemaining} days), keeping fabrication and dispatch
              on schedule without emergency delays.
            </div>
          </div>

          {/* Recipient Vendor Phone Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center justify-between">
              <span>Vendor WhatsApp Phone Number</span>
              {!item.vendorPhone && (
                <span className="text-[11px] text-amber-600 font-normal">
                  Phone not in file — please enter to send
                </span>
              )}
            </label>
            <Input
              value={vendorPhone}
              onChange={(e) => setVendorPhone(e.target.value)}
              placeholder="e.g. 9820012345 or +91 98200 12345"
              className="text-sm font-mono"
            />
          </div>

          {/* WhatsApp Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>WhatsApp Message Content</span>
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyMessage}
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              >
                {copiedMessage ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy Text
                  </>
                )}
              </Button>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="text-xs font-mono bg-background resize-none leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            size="sm"
            onClick={handleSendWhatsapp}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
          >
            <MessageSquare className="h-4 w-4" />
            Send on WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
