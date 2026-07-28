/**
 * Shared "Send" dialog for every business document — Email or WhatsApp
 * (WhatsApp Foundation, Goal 6).
 *
 * - Builds the document via `buildDocument()` (the shared engine).
 * - Email: renders a fully-branded HTML body using `renderDocHtmlAsync()`.
 * - WhatsApp: renders a plain-text, WhatsApp-markdown body using
 *   `renderDocWhatsAppText()` — WhatsApp has no "attach a PDF inline"
 *   concept, so the message text itself carries the summary and is fully
 *   user-editable before send, same as `customer-payments/request.ts`'s
 *   `renderPaymentRequestWhatsApp` flow.
 * - Both channels enqueue via the existing `enqueueMessage()` — the message
 *   shows in the Communication Timeline with the correct
 *   `related_type/related_id`. No second send system is created for either
 *   channel; this is still the one place that turns an ERP document into an
 *   outbound message.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, MessageCircle, Send } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { enqueueMessage } from "@/lib/notifications/queue";
import { renderDocHtmlAsync } from "@/lib/pdf/generator";
import {
  buildDocument,
  DOC_ENTITY_LABEL,
  relatedTypeFor,
  renderDocWhatsAppText,
  type DocumentEntity,
} from "@/lib/documents/engine";
import { useQueryClient } from "@tanstack/react-query";

type SendChannel = "email" | "whatsapp";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entity: DocumentEntity;
  entityId: string;
  /** Which channel the dialog opens on. Defaults to "email"; the user can still switch tabs. */
  initialChannel?: SendChannel;
}

export function SendDocumentEmailDialog({
  open,
  onOpenChange,
  entity,
  entityId,
  initialChannel = "email",
}: Props) {
  const qc = useQueryClient();
  const [channel, setChannel] = useState<SendChannel>(initialChannel);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [docNo, setDocNo] = useState("");
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    setChannel(initialChannel);
  }, [open, initialChannel]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void buildDocument(entity, entityId)
      .then((built) => {
        if (cancelled) return;
        const label = DOC_ENTITY_LABEL[entity];
        setDocNo(built.meta.docNumber);
        setCustomerId(built.meta.customerId ?? undefined);
        if (channel === "whatsapp") {
          setTo(built.meta.toPhone ?? "");
          setSubject("");
          setMessage(renderDocWhatsAppText(built));
        } else {
          setTo(built.meta.toEmail ?? "");
          setSubject(`${label} ${built.meta.docNumber}`);
          setMessage(
            `Dear ${built.meta.toName},\n\nPlease find your ${label.toLowerCase()} ${built.meta.docNumber} attached below.\n\nRegards,`,
          );
        }
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to load document");
        onOpenChange(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, entity, entityId, onOpenChange, channel]);

  const handleSend = async () => {
    if (!to.trim()) {
      toast.error(
        channel === "whatsapp"
          ? "Recipient phone number is required"
          : "Recipient email is required",
      );
      return;
    }
    setSending(true);
    try {
      if (channel === "whatsapp") {
        await enqueueMessage({
          channel: "whatsapp",
          to: to.trim(),
          body: message,
          relatedType: relatedTypeFor(entity),
          relatedId: entityId,
          customerId,
          templateCode: `${entity}_whatsapp`,
          variables: {
            entity,
            doc_number: docNo,
          },
        });
      } else {
        const built = await buildDocument(entity, entityId);
        const html = await renderDocHtmlAsync(built.doc);
        const introHtml = message
          .split("\n")
          .map((l) => `<p style="margin:0 0 8px 0">${escape(l)}</p>`)
          .join("");
        const body = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;padding:20px">
             ${introHtml}
             <hr style="margin:24px 0;border:0;border-top:1px solid #e2e8f0" />
           </div>${html}`;

        await enqueueMessage({
          channel: "email",
          to: to.trim(),
          subject: subject.trim() || `${DOC_ENTITY_LABEL[entity]} ${docNo}`,
          body,
          relatedType: relatedTypeFor(entity),
          relatedId: entityId,
          customerId,
          variables: {
            entity,
            doc_number: docNo,
          },
        });
      }
      toast.success("Queued — dispatcher will send it shortly");
      qc.invalidateQueries({ queryKey: ["messages"] });
      qc.invalidateQueries({ queryKey: ["customer-timeline"] });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to queue message");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Send {DOC_ENTITY_LABEL[entity]} — {channel === "whatsapp" ? "WhatsApp" : "Email"}
          </DialogTitle>
          <DialogDescription>
            {channel === "whatsapp"
              ? "A plain-text summary is generated from live ERP data. The send is logged in the Communication Timeline."
              : "The branded PDF is generated from live ERP data and attached inline in the email body. The send is logged in the Communication Timeline."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <Button
            type="button"
            size="sm"
            variant={channel === "email" ? "default" : "ghost"}
            className="flex-1"
            disabled={sending}
            onClick={() => setChannel("email")}
          >
            <Send className="mr-2 h-4 w-4" />
            Email
          </Button>
          <Button
            type="button"
            size="sm"
            variant={channel === "whatsapp" ? "default" : "ghost"}
            className="flex-1"
            disabled={sending}
            onClick={() => setChannel("whatsapp")}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            WhatsApp
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="doc-to">{channel === "whatsapp" ? "To (phone)" : "To"}</Label>
              <Input
                id="doc-to"
                type={channel === "whatsapp" ? "tel" : "email"}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder={channel === "whatsapp" ? "+91 98765 43210" : "customer@example.com"}
              />
            </div>
            {channel === "email" && (
              <div className="space-y-1.5">
                <Label htmlFor="doc-subject">Subject</Label>
                <Input
                  id="doc-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="doc-message">Message</Label>
              <Textarea
                id="doc-message"
                rows={channel === "whatsapp" ? 12 : 5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || loading}>
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : channel === "whatsapp" ? (
              <MessageCircle className="mr-2 h-4 w-4" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
