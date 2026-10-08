/**
 * Shared document action toolbar: Preview / Print / Download PDF / Email.
 *
 * Every business document module renders this instead of ad-hoc
 * `window.print()` buttons. It reads branding from `BrandingConfig` and
 * routes every send through the Communication engine.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Download, Eye, Loader2, Mail, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildDocument,
  relatedTypeFor,
  renderDocWhatsAppText,
  type DocumentEntity,
} from "@/lib/documents/engine";
import { downloadPdf, previewPdf, printPdf } from "@/lib/pdf/generator";
import { openWhatsappToContact } from "@/lib/whatsapp";
import { enqueueMessage } from "@/lib/notifications/queue";
import { SendDocumentEmailDialog } from "./SendDocumentEmailDialog";

interface Props {
  entity: DocumentEntity;
  entityId: string;
  /** Hide Email action if the underlying doc is internal-only. */
  hideEmail?: boolean;
  /** Hide WhatsApp action if the underlying doc is internal-only. */
  hideWhatsapp?: boolean;
  /** Compact icon-only rendering. */
  compact?: boolean;
}

export function DocumentToolbar({ entity, entityId, hideEmail, hideWhatsapp, compact }: Props) {
  const [sendOpen, setSendOpen] = useState<"email" | "whatsapp" | null>(null);
  const [busy, setBusy] = useState<"preview" | "print" | "download" | "whatsapp" | null>(null);

  const run = async (
    kind: "preview" | "print" | "download",
    fn: (doc: Awaited<ReturnType<typeof buildDocument>>["doc"]) => Promise<void>,
  ) => {
    setBusy(kind);
    try {
      const { doc } = await buildDocument(entity, entityId);
      await fn(doc);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to render document");
    } finally {
      setBusy(null);
    }
  };

  const handleWhatsapp = async () => {
    setBusy("whatsapp");
    // Pre-open popup tab synchronously to bypass Safari's async popup blocker
    let popupWin: Window | null = null;
    try {
      popupWin = window.open("about:blank", "_blank");
    } catch {
      // Popup blocked or denied; will fall back to direct navigation inside openWhatsappToContact
    }

    try {
      const built = await buildDocument(entity, entityId);
      const phone = built.meta.toPhone?.trim();
      const text = renderDocWhatsAppText(built);

      if (!phone) {
        if (popupWin && !popupWin.closed) popupWin.close();
        toast.info(
          `No mobile number on file for ${built.meta.toName || "recipient"} — please enter WhatsApp number`,
        );
        setSendOpen("whatsapp");
        return;
      }

      openWhatsappToContact(phone, text, popupWin);
      toast.success(
        `Opening WhatsApp for ${built.meta.toName || "recipient"} — press Enter to send`,
      );

      // Record in queue/timeline as SENT so server dispatcher never attempts automated Meta API
      void enqueueMessage({
        channel: "whatsapp",
        to: phone,
        body: text,
        relatedType: relatedTypeFor(entity),
        relatedId: entityId,
        customerId: built.meta.customerId ?? undefined,
        templateCode: `${entity}_whatsapp`,
        status: "sent",
        variables: {
          entity,
          doc_number: built.meta.docNumber,
        },
      }).catch((e) => console.warn("Failed to log WhatsApp send:", e));
    } catch (err) {
      if (popupWin && !popupWin.closed) popupWin.close();
      toast.error(err instanceof Error ? err.message : "Failed to prepare WhatsApp message");
    } finally {
      setBusy(null);
    }
  };

  const size = compact ? "icon" : "sm";
  const label = (text: string) => (compact ? null : <span className="ml-2">{text}</span>);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          size={size}
          variant="outline"
          disabled={busy !== null}
          onClick={() => run("preview", previewPdf)}
          title="Preview"
        >
          <Eye className="h-4 w-4" />
          {label("Preview")}
        </Button>
        <Button
          size={size}
          variant="outline"
          disabled={busy !== null}
          onClick={() => run("print", printPdf)}
          title="Print"
        >
          <Printer className="h-4 w-4" />
          {label("Print")}
        </Button>
        <Button
          size={size}
          variant="outline"
          disabled={busy !== null}
          onClick={() => run("download", downloadPdf)}
          title="Download PDF"
        >
          <Download className="h-4 w-4" />
          {label("Download PDF")}
        </Button>
        {!hideEmail && (
          <Button size={size} onClick={() => setSendOpen("email")} title="Send Email">
            <Mail className="h-4 w-4" />
            {label("Email")}
          </Button>
        )}
        {!hideWhatsapp && (
          <Button
            size={size}
            variant="outline"
            disabled={busy !== null}
            onClick={handleWhatsapp}
            title="Send WhatsApp"
          >
            {busy === "whatsapp" ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            ) : (
              <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            )}
            {label(busy === "whatsapp" ? "Opening..." : "WhatsApp")}
          </Button>
        )}
      </div>
      {sendOpen && (
        <SendDocumentEmailDialog
          open={sendOpen !== null}
          onOpenChange={(v) => setSendOpen(v ? sendOpen : null)}
          entity={entity}
          entityId={entityId}
          initialChannel={sendOpen}
        />
      )}
    </>
  );
}
