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
  ExternalLink,
  Clock,
  AlertTriangle,
  Truck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { openWhatsappToContact } from "@/lib/whatsapp";
import {
  generateOrderTrackingWhatsappMessage,
  senseOrderDeliveryStatus,
  buildOrderTrackingUrl,
} from "@/lib/orders/tracking";

export interface OrderTrackingWhatsappDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNo: string;
  customerName?: string | null;
  customerPhone?: string | null;
  orderDate?: string | null;
  deliveryDate?: string | null;
  status?: string | null;
  dispatches?: Array<{
    dispatch_no?: string | null;
    status?: string | null;
    dispatch_date?: string | null;
    carrier?: string | null;
    vehicle_no?: string | null;
  }>;
  itemsSummary?: Array<{
    itemDescription: string;
    quantity: number;
    unit: string;
  }>;
}

export function OrderTrackingWhatsappDialog({
  open,
  onOpenChange,
  orderNo,
  customerName,
  customerPhone,
  orderDate,
  deliveryDate,
  status,
  dispatches,
  itemsSummary,
}: OrderTrackingWhatsappDialogProps) {
  const [recipientPhone, setRecipientPhone] = useState(customerPhone ?? "");
  const [message, setMessage] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Re-generate AI message when dialog opens or parameters change
  useEffect(() => {
    if (open) {
      const initialPhone = customerPhone ?? "";
      setRecipientPhone(initialPhone);

      const generated = generateOrderTrackingWhatsappMessage({
        customerName,
        customerPhone: initialPhone,
        orderNo,
        orderDate,
        deliveryDate,
        status,
        dispatches,
        itemsSummary,
      });

      setMessage(generated.messageText);
      setCopiedLink(false);
      setCopiedMessage(false);
    }
  }, [
    open,
    orderNo,
    customerName,
    customerPhone,
    orderDate,
    deliveryDate,
    status,
    dispatches,
    itemsSummary,
  ]);

  const assessment = senseOrderDeliveryStatus({
    orderDate,
    deliveryDate,
    status,
    dispatches,
  });

  const trackingUrl = buildOrderTrackingUrl({
    orderNo,
    phone: recipientPhone,
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopiedLink(true);
      toast.success("Tracking link copied to clipboard");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedMessage(true);
      toast.success("WhatsApp message copied to clipboard");
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch {
      toast.error("Could not copy message");
    }
  };

  const handleRegenerate = () => {
    const generated = generateOrderTrackingWhatsappMessage({
      customerName,
      customerPhone: recipientPhone,
      orderNo,
      orderDate,
      deliveryDate,
      status,
      dispatches,
      itemsSummary,
    });
    setMessage(generated.messageText);
    toast.info("Regenerated AI message with current parameters");
  };

  const handleSendWhatsapp = () => {
    const cleanDigits = recipientPhone.replace(/\D+/g, "");
    if (!cleanDigits || cleanDigits.length < 10) {
      toast.error("Please provide a valid 10-digit mobile number for WhatsApp");
      return;
    }

    const opened = openWhatsappToContact(recipientPhone, message);
    if (opened) {
      toast.success(`WhatsApp chat opened for ${customerName || orderNo}`);
      onOpenChange(false);
    } else {
      toast.error("Could not launch WhatsApp. Please check popup permissions.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              Customer Order Tracking & WhatsApp Update
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {orderNo}
            </Badge>
          </div>
          <DialogDescription>
            Sense delivery delay status, share visual tracking link, and send the AI-crafted status
            update directly to the customer's WhatsApp in one click.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Delay Sensing & Stage Banner */}
          <div
            className={`rounded-lg border p-3 flex items-start gap-3 text-sm ${
              assessment.summaryBadge === "completed"
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200"
                : assessment.summaryBadge === "delayed"
                  ? "bg-amber-50/80 border-amber-300 text-amber-950 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200"
                  : "bg-blue-50/70 border-blue-200 text-blue-950 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200"
            }`}
          >
            {assessment.summaryBadge === "completed" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : assessment.summaryBadge === "delayed" ? (
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            ) : assessment.stage === "dispatched" ? (
              <Truck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            ) : (
              <Clock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{assessment.stageLabel}</span>
                <Badge
                  variant={
                    assessment.summaryBadge === "delayed"
                      ? "destructive"
                      : assessment.summaryBadge === "completed"
                        ? "default"
                        : "secondary"
                  }
                  className="text-[11px]"
                >
                  {assessment.summaryBadge === "delayed"
                    ? `Delay Sensed · ${assessment.delayDays}d Overdue`
                    : assessment.summaryBadge === "completed"
                      ? "Completed"
                      : "On Schedule"}
                </Badge>
              </div>
              <p className="mt-1 text-xs opacity-90">{assessment.whatsBeenDone}</p>
              <div className="mt-1 text-xs font-mono font-medium">
                {assessment.expectedDateText}
              </div>
            </div>
          </div>

          {/* Recipient Phone & Tracking URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Customer Mobile (WhatsApp)
              </label>
              <Input
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="font-mono text-sm"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Public Tracking Link
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center ml-2"
                    title="Preview tracking page"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <Input
                readOnly
                value={trackingUrl}
                className="font-mono text-xs bg-muted/50 text-muted-foreground truncate select-all"
              />
            </div>
          </div>

          {/* AI-Crafted WhatsApp Message Text */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                AI-Crafted WhatsApp Response (Editable)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="text-[11px] text-primary hover:underline"
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                >
                  {copiedMessage ? (
                    <Check className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  Copy text
                </button>
              </div>
            </div>
            <Textarea
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="font-mono text-xs leading-relaxed"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Clicking below launches WhatsApp directly into {customerName || "customer"}'s chat
              with this message pre-filled. Just hit enter to send!
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleSendWhatsapp}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            <MessageSquare className="mr-2 h-4 w-4 fill-current" />
            Open in WhatsApp & Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
