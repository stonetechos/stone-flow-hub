import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MessageCircle,
  Phone,
  User,
  Copy,
  Check,
  Send,
  Building2,
  FileText,
  RotateCcw,
  Sparkles,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { openWhatsappToContact, normalizeWhatsappPhone } from "@/lib/whatsapp";
import {
  buildQuoteUpdateWhatsappMessage,
  extractCandidatePhones,
  type CandidateContact,
} from "@/lib/quotes/ask-update";
import { getCustomerContacts } from "@/lib/customers/api";
import type { QuoteListItem } from "@/lib/quotes/api";

export interface AskQuoteUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: QuoteListItem | null;
  onSuccess?: () => void;
}

export function AskQuoteUpdateDialog({
  open,
  onOpenChange,
  quote,
  onSuccess,
}: AskQuoteUpdateDialogProps) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Fetch secondary customer contacts if customer_id exists
  const contactsQuery = useQuery({
    queryKey: ["customer-contacts", quote?.customer_id],
    queryFn: () => (quote?.customer_id ? getCustomerContacts(quote.customer_id) : []),
    enabled: open && !!quote?.customer_id,
  });

  // Extract all available phone options (WhatsApp, primary phone, secondary contacts)
  const candidatePhones = useMemo<CandidateContact[]>(() => {
    if (!quote) return [];
    return extractCandidatePhones({
      customer: quote.customer,
      contacts: contactsQuery.data,
    });
  }, [quote, contactsQuery.data]);

  // When quote changes or dialog opens, compute initial state
  useEffect(() => {
    if (!open || !quote) return;

    const defaultMsg = buildQuoteUpdateWhatsappMessage({
      quoteNo: quote.quote_no,
      total: quote.total,
      customerName: quote.customer?.name,
      projectName: quote.project?.name,
      validUntil: quote.valid_until,
    });
    setMessage(defaultMsg);

    // Default phone to first candidate or direct customer fields
    const defaultPhone =
      candidatePhones[0]?.phone ||
      normalizeWhatsappPhone(quote.customer?.whatsapp || quote.customer?.primary_phone) ||
      "";
    setPhone(defaultPhone);
    setCopied(false);
    setIsSending(false);
  }, [open, quote, candidatePhones]);

  const handleResetMessage = () => {
    if (!quote) return;
    const defaultMsg = buildQuoteUpdateWhatsappMessage({
      quoteNo: quote.quote_no,
      total: quote.total,
      customerName: quote.customer?.name,
      projectName: quote.project?.name,
      validUntil: quote.valid_until,
    });
    setMessage(defaultMsg);
    toast.info("Message reset to standard follow-up template");
  };

  const handleCopy = async () => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Message copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy message to clipboard");
    }
  };

  const handleSendWhatsapp = async () => {
    if (!quote) return;
    const normalized = normalizeWhatsappPhone(phone);
    if (!normalized) {
      toast.error("Please enter a valid phone number (10+ digits)");
      return;
    }
    if (!message.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    setIsSending(true);
    try {
      // 1. Open WhatsApp to contact
      const opened = openWhatsappToContact(normalized, message, null, { mode: "web" });
      if (opened) {
        toast.success(`Opening WhatsApp follow-up for ${quote.quote_no}...`);
      } else {
        toast.info("WhatsApp link generated");
      }

      // 2. Best-effort log to activity_log for full team audit trail
      try {
        await supabase.from("activity_log").insert({
          entity_type: "quote",
          entity_id: quote.id,
          action: "note_added",
          summary: `Follow-up reminder sent via WhatsApp to ${normalized} for quotation ${quote.quote_no}`,
          new_value: {
            quote_id: quote.id,
            quote_no: quote.quote_no,
            phone: normalized,
            customer_id: quote.customer_id,
            customer_name: quote.customer?.name,
            total: quote.total,
            channel: "whatsapp",
          },
        });
      } catch (logErr) {
        console.warn("[AskQuoteUpdateDialog] activity log insert failed:", logErr);
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error("[AskQuoteUpdateDialog] Failed to open WhatsApp:", err);
      toast.error("Could not trigger WhatsApp. Copied message to clipboard instead.");
      void navigator.clipboard.writeText(message);
    } finally {
      setIsSending(false);
    }
  };

  if (!quote) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden sm:rounded-2xl border-slate-200 dark:border-slate-800 shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/40 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/30 border-b border-emerald-100 dark:border-emerald-900/40">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-600 text-white shadow-sm">
              <MessageCircle className="h-3.5 w-3.5 fill-current" />
              WhatsApp Follow-Up
            </span>
            <Badge
              variant="outline"
              className="font-mono text-xs border-emerald-300 dark:border-emerald-800"
            >
              {quote.quote_no}
            </Badge>
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Ask for Quotation Update
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
            Follow up with the customer directly on WhatsApp. Checks status, confirms interest, and
            invites negotiation or product re-structuring.
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Quote info strip */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 text-xs grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <span className="text-muted-foreground block text-[11px]">Customer</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block">
                {quote.customer?.name || "Not specified"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Project</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate flex items-center gap-1">
                <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                {quote.project?.name || "Standard Project"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Quote Total</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                ₹{Math.round(quote.total || 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Contact & Phone Selection */}
          <div className="space-y-1.5">
            <Label
              htmlFor="whatsapp-phone"
              className="text-xs font-semibold flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                Recipient WhatsApp Number
              </span>
              {candidatePhones.length > 0 && (
                <span className="text-[11px] text-muted-foreground font-normal">
                  {candidatePhones.length} contact{candidatePhones.length > 1 ? "s" : ""} detected
                </span>
              )}
            </Label>

            {/* Quick candidate pills */}
            {candidatePhones.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pb-1">
                {candidatePhones.map((c, i) => {
                  const isSelected = normalizeWhatsappPhone(phone) === c.phone;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPhone(c.phone)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700 font-semibold shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <User className="h-3 w-3 opacity-70" />
                      <span>{c.label}</span>
                      <span className="font-mono text-[10px] opacity-75">
                        ({c.phone.replace(/^91/, "+91 ")})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <Input
              id="whatsapp-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98791 23456"
              className="font-mono text-sm h-9"
            />
          </div>

          {/* Message Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="whatsapp-msg"
                className="text-xs font-semibold flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5 text-emerald-600" />
                Message Content
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetMessage}
                  className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Text
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Textarea
              id="whatsapp-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="text-xs font-sans leading-relaxed resize-y border-slate-200 dark:border-slate-800"
              placeholder="Type your WhatsApp message..."
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <Sparkles className="h-3 w-3" />
                Negotiation & re-structuring clause included
              </span>
              <span>{message.length} characters</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-xs"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5 mr-1" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSending || !phone.trim() || !message.trim()}
              onClick={handleSendWhatsapp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Send via WhatsApp
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
