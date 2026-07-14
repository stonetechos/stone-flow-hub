/**
 * Shared "Send Email" dialog for every business document.
 *
 * - Builds the document via `buildDocument()` (the shared engine).
 * - Renders a fully-branded HTML body using `renderDocHtmlAsync()`.
 * - Enqueues via the existing `enqueueMessage()` — the message shows in
 *   the Communication Timeline with the correct `related_type/related_id`.
 * - No second email system is created. WhatsApp path is intentionally
 *   deferred (see requirement).
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
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
  type DocumentEntity,
} from "@/lib/documents/engine";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entity: DocumentEntity;
  entityId: string;
}

export function SendDocumentEmailDialog({ open, onOpenChange, entity, entityId }: Props) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [docNo, setDocNo] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void buildDocument(entity, entityId)
      .then((built) => {
        if (cancelled) return;
        const label = DOC_ENTITY_LABEL[entity];
        setDocNo(built.meta.docNumber);
        setTo(built.meta.toEmail ?? "");
        setSubject(`${label} ${built.meta.docNumber}`);
        setMessage(
          `Dear ${built.meta.toName},\n\nPlease find your ${label.toLowerCase()} ${built.meta.docNumber} attached below.\n\nRegards,`,
        );
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
  }, [open, entity, entityId, onOpenChange]);

  const handleSend = async () => {
    if (!to.trim()) {
      toast.error("Recipient email is required");
      return;
    }
    setSending(true);
    try {
      const built = await buildDocument(entity, entityId);
      const html = await renderDocHtmlAsync(built.doc);
      const introHtml = message
        .split("\n")
        .map((l) => `<p style="margin:0 0 8px 0">${escape(l)}</p>`)
        .join("");
      const body =
        `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;padding:20px">
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
        customerId: built.meta.customerId ?? undefined,
        variables: {
          entity,
          doc_number: docNo,
        },
      });
      toast.success("Queued — dispatcher will send it shortly");
      qc.invalidateQueries({ queryKey: ["messages"] });
      qc.invalidateQueries({ queryKey: ["customer-timeline"] });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to queue email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send {DOC_ENTITY_LABEL[entity]}</DialogTitle>
          <DialogDescription>
            The branded PDF is generated from live ERP data and attached inline
            in the email body. The send is logged in the Communication Timeline.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="doc-to">To</Label>
              <Input
                id="doc-to"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-subject">Subject</Label>
              <Input
                id="doc-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-message">Message</Label>
              <Textarea
                id="doc-message"
                rows={5}
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
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
