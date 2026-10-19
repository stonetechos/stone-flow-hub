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
import { downloadPdf, previewPdf, printPdf, generatePdfBlob } from "@/lib/pdf/generator";
import {
  buildWhatsappUrl,
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
      if (popupWin && !popupWin.closed) {
        try {
          popupWin.document.title = "Opening WhatsApp...";
          popupWin.document.body.innerHTML = `
            <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; color: #1e293b; text-align: center; padding: 20px;">
              <div style="font-size: 36px; margin-bottom: 12px;">💬</div>
              <div style="font-size: 18px; font-weight: 600; margin-bottom: 6px;">Opening WhatsApp...</div>
              <div style="font-size: 13px; color: #64748b;">Preparing your official document to attach.</div>
            </div>
          `;
        } catch {
          /* ignore cross-origin */
        }
      }
    } catch {
      // Popup blocked or denied; will fall back to direct navigation inside openWhatsappToContact
    }

    try {
      const built = await buildDocument(entity, entityId);
      const phone = built.meta.toPhone?.trim();
      const docTitle = built.doc.title || "Document";
      const docNo = built.doc.number || "";
      const recipientName = built.meta.toName || "Customer";

      if (!phone) {
        if (popupWin && !popupWin.closed) popupWin.close();
        toast.info(`No mobile number on file for ${recipientName} — please enter WhatsApp number`);
        setSendOpen("whatsapp");
        return;
      }

      // 1. Generate real binary PDF Blob
      let pdfBlob: Blob | null = null;
      try {
        pdfBlob = await generatePdfBlob(built.doc);
      } catch (pdfErr) {
        console.warn("Could not generate PDF blob:", pdfErr);
      }

      // 2. Direct PDF send via Web Share API ONLY on actual mobile devices (iOS / Android)
      const isMobileDevice =
        typeof navigator !== "undefined" &&
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");

      if (isMobileDevice && pdfBlob && typeof navigator.canShare === "function") {
        const fileName = `${docNo || docTitle}.pdf`;
        const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });
        if (navigator.canShare({ files: [pdfFile] })) {
          try {
            await navigator.share({
              title: `${docTitle} — ${docNo}`,
              text: `Dear ${recipientName}, please find your official ${docTitle} (${docNo}) from Stone Tech attached.`,
              files: [pdfFile],
            });
            if (popupWin && !popupWin.closed) popupWin.close();
            toast.success(`Shared ${docTitle} PDF directly via WhatsApp!`);
            void enqueueMessage({
              channel: "whatsapp",
              to: phone,
              body: `[PDF Shared directly: ${fileName}]`,
              relatedType: relatedTypeFor(entity),
              relatedId: entityId,
              customerId: built.meta.customerId ?? undefined,
              templateCode: `${entity}_whatsapp_pdf`,
              status: "sent",
              variables: { entity, doc_number: built.meta.docNumber },
            }).catch(() => {});
            return;
          } catch (shareErr) {
            console.log("Mobile native share dismissed or unsupported:", shareErr);
          }
        }
      }

      // 3. Desktop / Browser: Automatically download the PDF file to user's device
      if (pdfBlob) {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${docNo || docTitle}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
      }

      // Create a clean, professional cover message directing to the attached PDF
      const totalMeta = built.doc.totals?.find(
        (t) =>
          t.label.toLowerCase().includes("grand") ||
          t.label.toLowerCase().includes("total") ||
          t.label.toLowerCase().includes("received"),
      );
      const totalStr = totalMeta?.value ? String(totalMeta.value) : "";

      const cleanPdfMessage = [
        `*Official ${docTitle} — ${docNo}*`,
        `Dear ${recipientName},`,
        ``,
        `Please find attached your official ${docTitle} PDF from Stone Tech.`,
        totalStr ? `💰 *Amount:* ${totalStr}` : null,
        ``,
        `_Note: The official PDF (${docNo || "document"}.pdf) is attached to this chat._`,
        ``,
        `Warm regards,`,
        `Stone Tech`,
      ]
        .filter((x) => x !== null)
        .join("\n");

      const effectiveWaMode = mode === "app" ? "wa.me" : mode;
      const waUrl = buildWhatsappUrl(phone, cleanPdfMessage, effectiveWaMode);

      if (mode === "app") {
        try {
          if (typeof navigator !== "undefined" && navigator.clipboard) {
            await navigator.clipboard.writeText(cleanPdfMessage);
          }
        } catch {
          /* ignore */
        }
        openWhatsappToContact(phone, cleanPdfMessage, popupWin, { mode: "wa.me" });
        toast.success(
          `Opening WhatsApp! Attach the downloaded ${docNo || "document"}.pdf to send.`,
          {
            action: {
              label: "Open WhatsApp",
              onClick: () => {
                window.open(waUrl, "_blank");
              },
            },
            duration: 10000,
          },
        );
      } else if (mode === "web") {
        openWhatsappToContact(phone, cleanPdfMessage, popupWin, { mode: "web" });
        toast.success(
          `Opening WhatsApp Web! Attach the downloaded ${docNo || "document"}.pdf to send.`,
          {
            action: {
              label: "Open WhatsApp Web",
              onClick: () => {
                window.open(waUrl, "_blank");
              },
            },
            duration: 10000,
          },
        );
      } else {
        openWhatsappToContact(phone, cleanPdfMessage, popupWin, { mode: "wa.me" });
        toast.success(
          `PDF (${docNo || "document"}.pdf) downloaded! Drag & drop it into the WhatsApp chat to send directly.`,
          {
            action: {
              label: "Open WhatsApp",
              onClick: () => {
                window.open(waUrl, "_blank");
              },
            },
            duration: 10000,
          },
        );
      }

      // Record in queue/timeline as SENT
      void enqueueMessage({
        channel: "whatsapp",
        to: phone,
        body: cleanPdfMessage,
        relatedType: relatedTypeFor(entity),
        relatedId: entityId,
        customerId: built.meta.customerId ?? undefined,
        templateCode: `${entity}_whatsapp_pdf`,
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
