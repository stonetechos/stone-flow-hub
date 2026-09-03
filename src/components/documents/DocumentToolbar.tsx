/**
 * Shared document action toolbar: Preview / Print / Download PDF / Email.
 *
 * Every business document module renders this instead of ad-hoc
 * `window.print()` buttons. It reads branding from `BrandingConfig` and
 * routes every send through the Communication engine.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Download, Eye, Mail, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildDocument, type DocumentEntity } from "@/lib/documents/engine";
import { downloadPdf, previewPdf, printPdf } from "@/lib/pdf/generator";
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
  const [busy, setBusy] = useState<"preview" | "print" | "download" | null>(null);

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
            onClick={() => setSendOpen("whatsapp")}
            title="Send WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
            {label("WhatsApp")}
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
