/**
 * Shared document action toolbar: Preview / Print / Download PDF / Email / WhatsApp.
 *
 * Every business document module renders this instead of ad-hoc
 * `window.print()` buttons. It reads branding from `BrandingConfig` and
 * routes every send through the Communication engine.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ChevronDown,
  Download,
  ExternalLink,
  Eye,
  Globe,
  Laptop,
  Loader2,
  Mail,
  MessageCircle,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  buildDocument,
  relatedTypeFor,
  renderDocWhatsAppText,
  type DocumentEntity,
} from "@/lib/documents/engine";
import { downloadPdf, previewPdf, printPdf } from "@/lib/pdf/generator";
import {
  getWhatsappModePreference,
  openWhatsappToContact,
  setWhatsappModePreference,
  type WhatsappMode,
} from "@/lib/whatsapp";
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
  const { t } = useTranslation();
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

  const handleWhatsapp = async (overrideMode?: WhatsappMode) => {
    setBusy("whatsapp");
    const mode = overrideMode ?? getWhatsappModePreference();
    if (overrideMode) {
      setWhatsappModePreference(overrideMode);
    }

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

      // If mode is "app" (default WhatsApp Desktop/Business), use popupWin to show/print the PDF document
      // and launch the desktop WhatsApp / WhatsApp Business app via custom protocol
      if (mode === "app") {
        if (popupWin && !popupWin.closed) {
          await printPdf(built.doc, popupWin);
        } else {
          await printPdf(built.doc);
        }

        // Copy formatted message text to clipboard as convenience
        try {
          if (typeof navigator !== "undefined" && navigator.clipboard) {
            await navigator.clipboard.writeText(text);
          }
        } catch {
          /* ignore */
        }

        openWhatsappToContact(phone, text, null, { mode: "app" });

        toast.success(
          `Opening WhatsApp for Business for ${built.meta.toName || "recipient"}! PDF opened in adjacent tab to attach.`,
          { duration: 7000 },
        );
      } else if (mode === "web") {
        // Mode "web": navigate popupWin to web.whatsapp.com directly
        openWhatsappToContact(phone, text, popupWin, { mode: "web" });

        // Also trigger PDF print/save
        try {
          await downloadPdf(built.doc);
        } catch {
          /* best effort */
        }

        toast.success(
          `Opening WhatsApp Web for ${built.meta.toName || "recipient"}! PDF prepared for attachment.`,
          { duration: 7000 },
        );
      } else {
        // Mode "wa.me"
        openWhatsappToContact(phone, text, popupWin, { mode: "wa.me" });
        toast.success(
          `Opening WhatsApp link for ${built.meta.toName || "recipient"} — press Enter to send`,
        );
      }

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
          title={t("common.preview", "Preview")}
        >
          <Eye className="h-4 w-4" />
          {label(t("common.preview", "Preview"))}
        </Button>
        <Button
          size={size}
          variant="outline"
          disabled={busy !== null}
          onClick={() => run("print", printPdf)}
          title={t("common.print", "Print")}
        >
          <Printer className="h-4 w-4" />
          {label(t("common.print", "Print"))}
        </Button>
        <Button
          size={size}
          variant="outline"
          disabled={busy !== null}
          onClick={() => run("download", downloadPdf)}
          title={t("common.downloadPdf", "Download PDF")}
        >
          <Download className="h-4 w-4" />
          {label(t("common.downloadPdf", "Download PDF"))}
        </Button>
        {!hideEmail && (
          <Button
            size={size}
            onClick={() => setSendOpen("email")}
            title={t("common.sendEmail", "Send Email")}
          >
            <Mail className="h-4 w-4" />
            {label(t("common.email", "Email"))}
          </Button>
        )}
        {!hideWhatsapp && (
          <div className="inline-flex rounded-md shadow-xs">
            <Button
              size={size}
              variant="outline"
              disabled={busy !== null}
              onClick={() => handleWhatsapp()}
              className={compact ? "" : "rounded-r-none border-r-0"}
              title={t("documents.shareWhatsapp", "Share on WhatsApp for Business (with PDF)")}
            >
              {busy === "whatsapp" ? (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              ) : (
                <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              )}
              {label(
                busy === "whatsapp"
                  ? t("common.opening", "Opening...")
                  : t("common.whatsapp", "WhatsApp"),
              )}
            </Button>
            {!compact && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size={size}
                    variant="outline"
                    disabled={busy !== null}
                    className="rounded-l-none px-2"
                    title={t("documents.whatsappOptions", "WhatsApp Destination Options")}
                  >
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    {t("documents.sendViaWhatsapp", "Send Document via WhatsApp")}
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleWhatsapp("app")}>
                    <Laptop className="mr-2 h-4 w-4 text-emerald-600" />
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {t("documents.whatsappApp", "WhatsApp for Business (App)")}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {t("documents.whatsappAppDesc", "Opens desktop app + prepares PDF")}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleWhatsapp("web")}>
                    <Globe className="mr-2 h-4 w-4 text-emerald-600" />
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {t("documents.whatsappWeb", "WhatsApp Web")}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {t("documents.whatsappWebDesc", "Opens web.whatsapp.com directly")}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleWhatsapp("wa.me")}>
                    <ExternalLink className="mr-2 h-4 w-4 text-emerald-600" />
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {t("documents.whatsappStandard", "Standard Link (wa.me)")}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {t("documents.whatsappStandardDesc", "Browser click-to-chat redirect")}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSendOpen("whatsapp")}>
                    <MessageCircle className="mr-2 h-4 w-4 text-emerald-600" />
                    <span>
                      {t("documents.customizeMessagePhone", "Customize Message & Phone...")}
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
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
