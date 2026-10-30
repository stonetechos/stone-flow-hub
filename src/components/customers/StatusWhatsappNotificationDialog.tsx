import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Label } from "@/components/ui/label";
import {
  MessageCircle,
  Copy,
  Check,
  Send,
  Sparkles,
  Phone,
  User,
  AlertTriangle,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { openWhatsappToContact } from "@/lib/whatsapp";
import {
  CUSTOMER_RESPONSE_STATUS_CONFIG,
  buildCustomerStatusWhatsappMessage,
  type CustomerResponseStatus,
} from "@/lib/customers/crm-status";
import { updateCustomerCrmStatus } from "@/lib/customers/api";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

export interface StatusWhatsappNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  status: CustomerResponseStatus;
  salesperson?: string | null;
  companyName?: string | null;
  onSuccess?: () => void;
}

export function StatusWhatsappNotificationDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  contactPerson,
  phone,
  whatsapp,
  status,
  salesperson,
  companyName,
  onSuccess,
}: StatusWhatsappNotificationDialogProps) {
  const qc = useQueryClient();
  const [recipientPhone, setRecipientPhone] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const statusConfig = CUSTOMER_RESPONSE_STATUS_CONFIG[status];

  useEffect(() => {
    if (open) {
      const initialPhone = whatsapp || phone || "";
      setRecipientPhone(initialPhone);
      const generated = buildCustomerStatusWhatsappMessage({
        customerName,
        contactPerson,
        status,
        salesperson,
        companyName,
      });
      setMessage(generated);
    }
  }, [
    open,
    customerId,
    customerName,
    contactPerson,
    phone,
    whatsapp,
    status,
    salesperson,
    companyName,
  ]);

  const markSentMutation = useMutation({
    mutationFn: async ({ shouldOpenWhatsapp }: { shouldOpenWhatsapp: boolean }) => {
      if (shouldOpenWhatsapp) {
        if (!recipientPhone.trim()) {
          throw new Error("Please enter or verify the customer's phone / WhatsApp number.");
        }
        const opened = openWhatsappToContact(recipientPhone, message);
        if (!opened && typeof window !== "undefined") {
          // If popup blocked or protocol unhandled, wa.me fallback
          window.open(
            `https://wa.me/${recipientPhone.replace(/\\D/g, "")}?text=${encodeURIComponent(message)}`,
            "_blank",
          );
        }
      }

      return updateCustomerCrmStatus({
        customerId,
        response_status: status,
        status_whatsapp_sent: true,
        status_whatsapp_status_key: status,
        status_whatsapp_sent_at: new Date().toISOString(),
      });
    },
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: qk.customers.byId(customerId) });
      void qc.invalidateQueries({ queryKey: qk.customers.all });
      void qc.invalidateQueries({ queryKey: ["hub", "customer", customerId] });
      void qc.invalidateQueries({ queryKey: ["customer-pending-followups", customerId] });
      void qc.invalidateQueries({ queryKey: ["customer-followups-history", customerId] });

      toast.success(
        variables.shouldOpenWhatsapp
          ? "WhatsApp opened & status marked as notified to customer!"
          : "Status marked as notified to customer.",
      );
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(toUserMessage(err));
    },
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Message copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy message");
    }
  };

  const handleSkip = () => {
    toast.info(
      "Status updated. The customer is currently marked as not updated with the current status.",
      {
        duration: 4000,
      },
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden sm:rounded-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-800 p-5 text-white">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-xs">
              <MessageCircle className="h-5 w-5 text-white" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-white tracking-wide">
                Send WhatsApp Status Update
              </DialogTitle>
              <DialogDescription className="text-xs text-white/80 mt-0.5">
                Keep the customer informed with real-time progress on their stone order.
              </DialogDescription>
            </div>
          </div>

          {/* Recipient & Current Status Pill */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-1 font-medium text-white">
              <User className="h-3 w-3" />
              {customerName || "Customer"}
              {contactPerson && ` (${contactPerson})`}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-white/20 px-2.5 py-1 font-bold text-white shadow-2xs">
              <span className={cn("h-2 w-2 rounded-full bg-emerald-300 ring-2 ring-white/50")} />
              New Status: {statusConfig?.label || status}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Status Explanation Card */}
          <div className="rounded-lg border border-teal-100 bg-teal-50/70 p-3 text-xs text-teal-950 flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-teal-900">{statusConfig?.label}</p>
              <p className="text-[11px] text-teal-800/90 mt-0.5 leading-snug">
                {statusConfig?.description}
              </p>
            </div>
          </div>

          {/* Customer Phone / WhatsApp */}
          <div className="space-y-1.5">
            <Label
              htmlFor="wa-phone"
              className="text-xs font-semibold flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-500" />
                Customer Phone / WhatsApp Number
              </span>
              {!recipientPhone && (
                <span className="text-[11px] text-amber-600 font-normal">
                  (Please enter recipient number)
                </span>
              )}
            </Label>
            <Input
              id="wa-phone"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              placeholder="e.g. 9829012345 or +91 98290 12345"
              className="text-xs h-9 font-mono"
            />
          </div>

          {/* Message Preview (Editable) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="wa-message" className="text-xs font-semibold">
                WhatsApp Notification Message
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground gap-1"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                <span>{copied ? "Copied" : "Copy"}</span>
              </Button>
            </div>
            <Textarea
              id="wa-message"
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="text-xs font-mono leading-relaxed resize-y bg-slate-50/60 focus:bg-white"
            />
            <p className="text-[10.5px] text-muted-foreground">
              You can edit this message prior to sending. When sent, Stone Tech OS records that the
              customer has been notified for this status.
            </p>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="bg-slate-50 border-t p-3.5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            disabled={markSentMutation.isPending}
            className="text-slate-600 hover:text-slate-900 text-xs w-full sm:w-auto"
            title="Leave customer as not updated with current status"
          >
            Skip for now
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => markSentMutation.mutate({ shouldOpenWhatsapp: false })}
              disabled={markSentMutation.isPending}
              className="text-xs h-8 gap-1.5"
              title="Record status as notified without opening WhatsApp"
            >
              <CheckCheck className="h-3.5 w-3.5 text-slate-500" />
              <span>Mark as Sent</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => markSentMutation.mutate({ shouldOpenWhatsapp: true })}
              disabled={markSentMutation.isPending || !recipientPhone.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 gap-1.5 shadow-2xs"
            >
              {markSentMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>Send on WhatsApp</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
