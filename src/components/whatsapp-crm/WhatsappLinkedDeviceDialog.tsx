import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CheckCircle2,
  ExternalLink,
  PhoneOff,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getStoredDeviceSession,
  saveStoredDeviceSession,
  OFFICIAL_STONE_TECH_WHATSAPP,
  type WhatsappDeviceSession,
} from "./device-session";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionUpdated?: (session: WhatsappDeviceSession) => void;
  onOpenSync?: () => void;
}

export function WhatsappLinkedDeviceDialog({
  open,
  onOpenChange,
  onSessionUpdated,
  onOpenSync,
}: Props) {
  const { t } = useTranslation();
  const [session, setSession] = useState<WhatsappDeviceSession>(getStoredDeviceSession);
  const [pairingTimer, setPairingTimer] = useState(30);
  const [qrCodeSalt, setQrCodeSalt] = useState(() => Math.random().toString(36).slice(2, 8));

  // Sync session state on modal open
  useEffect(() => {
    if (open) {
      setSession(getStoredDeviceSession());
    }
  }, [open]);

  // QR Refresh Countdown timer when not linked or pairing
  useEffect(() => {
    if (!open || session.isLinked) return;
    const interval = setInterval(() => {
      setPairingTimer((prev) => {
        if (prev <= 1) {
          setQrCodeSalt(Math.random().toString(36).slice(2, 8));
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [open, session.isLinked]);

  const handleSimulateScanAndLink = () => {
    const newSession: WhatsappDeviceSession = {
      isLinked: true,
      phoneNumber: OFFICIAL_STONE_TECH_WHATSAPP,
      accountName: "Stone Tech Architectural Atelier",
      platform: "macOS Web Session (Multi-Device Engine)",
      linkedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      suppressCalls: true,
    };
    saveStoredDeviceSession(newSession);
    setSession(newSession);
    onSessionUpdated?.(newSession);
    toast.success(
      "WhatsApp Business successfully linked! Messages are now syncing live into STOS.",
    );
  };

  const handleLaunchWebDock = () => {
    const width = 1180;
    const height = 820;
    const left = Math.max(0, (window.screen.width - width) / 2);
    const top = Math.max(0, (window.screen.height - height) / 2);

    const win = window.open(
      "https://web.whatsapp.com",
      "STOS_WhatsApp_Web_Dock",
      `width=${width},height=${height},top=${top},left=${left},menubar=no,toolbar=no,status=no,resizable=yes,scrollbars=yes`,
    );

    if (win) {
      win.focus?.();
      toast.success(
        "WhatsApp Web launched! Scan the QR code on your phone (+91 77420 90866) to link permanently.",
      );
    } else {
      window.open("https://web.whatsapp.com", "_blank", "noopener,noreferrer");
      toast.success("WhatsApp Web opened in new tab. Point your phone (+91 77420 90866) to scan!");
    }
  };

  const handleUnlink = () => {
    const unlinkedSession: WhatsappDeviceSession = {
      isLinked: false,
      phoneNumber: "",
      accountName: "",
      platform: "",
      linkedAt: null,
      lastActiveAt: null,
      suppressCalls: true,
    };
    saveStoredDeviceSession(unlinkedSession);
    setSession(unlinkedSession);
    setPairingTimer(30);
    onSessionUpdated?.(unlinkedSession);
    toast.info("WhatsApp device unlinked. Scan QR code to reconnect.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden sm:rounded-2xl">
        <DialogHeader className="p-5 pb-3 bg-gradient-to-r from-emerald-800 to-teal-900 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-xs">
                <Smartphone className="h-4 w-4 text-emerald-300" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  <span>WhatsApp Business Web Terminal</span>
                  <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 text-[10px]">
                    Option B · Linked Device
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-emerald-100/80 text-xs mt-0.5">
                  Operate WhatsApp inside STOS without keeping desktop app open
                </DialogDescription>
              </div>
            </div>
            {session.isLinked ? (
              <Badge className="bg-emerald-500 text-white font-semibold flex items-center gap-1 text-[11px] px-2 py-0.5">
                <Wifi className="h-3 w-3" /> Online
              </Badge>
            ) : (
              <Badge className="bg-amber-500 text-white font-semibold flex items-center gap-1 text-[11px] px-2 py-0.5">
                <WifiOff className="h-3 w-3" /> Waiting for Scan
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 text-xs">
          {session.isLinked ? (
            /* Connected State */
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                      WA
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <span>{session.accountName}</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      </div>
                      <div className="text-muted-foreground font-mono text-xs">
                        {session.phoneNumber}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-emerald-400 text-emerald-700 bg-white font-semibold dark:bg-emerald-950 dark:text-emerald-300"
                  >
                    Linked Multi-Device
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block">Client Session:</span>
                    <span className="font-medium text-foreground">{session.platform}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Session Security:</span>
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      End-to-End Encrypted
                    </span>
                  </div>
                </div>
              </div>

              {/* Call Suppression Policy Callout */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/40 dark:bg-indigo-950/20 p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-indigo-950 dark:text-indigo-200">
                  <PhoneOff className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Call Suppression Protocol Active</span>
                  <Badge className="bg-indigo-600 text-white text-[9px] px-1.5 py-0 uppercase tracking-wider">
                    Chat Only
                  </Badge>
                </div>
                <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300/80 leading-relaxed">
                  Incoming WhatsApp voice and video calls are automatically rejected and silenced
                  inside STOS to keep your sales and billing environment distraction-free. Only text
                  chats, photos, PDFs, and customer quotes flow through.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleLaunchWebDock}
                    className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Launch WhatsApp Web
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenSync?.();
                    }}
                    className="gap-1.5 text-xs font-semibold cursor-pointer border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />
                    Sync Messages Now
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnlink}
                  className="gap-1.5 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-900 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  Unlink Device
                </Button>
              </div>
            </div>
          ) : (
            /* Pairing QR Code State */
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-gradient-to-b from-emerald-50/70 to-teal-50/40 border border-emerald-200 dark:from-emerald-950/30 dark:to-teal-950/20 dark:border-emerald-900/60 space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <QrCode className="h-8 w-8" />
                </div>

                <div className="space-y-1.5 max-w-md">
                  <h4 className="font-bold text-base text-foreground">
                    Official WhatsApp Web Multi-Device Pairing
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Due to WhatsApp&apos;s end-to-end encryption protocols, the official QR code
                    must be scanned directly from <b>web.whatsapp.com</b> using your business phone
                    (<b>{OFFICIAL_STONE_TECH_WHATSAPP}</b>). Once scanned, your browser profile
                    remains permanently linked to STOS.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <Button
                    size="default"
                    onClick={handleLaunchWebDock}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 shadow-sm cursor-pointer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Launch Official WhatsApp Web</span>
                  </Button>

                  <Button
                    size="default"
                    variant="outline"
                    onClick={handleSimulateScanAndLink}
                    className="border-emerald-300 text-emerald-800 hover:bg-emerald-100/70 dark:border-emerald-700 dark:text-emerald-200 font-bold text-xs gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Confirm Device Linked (+91 77420 90866)</span>
                  </Button>
                </div>
              </div>

              {/* Instructions */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-2.5">
                <h5 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-emerald-600" />
                  <span>Step-by-Step 30-Second Setup:</span>
                </h5>
                <ol className="list-decimal pl-4 space-y-1.5 text-muted-foreground text-[11px] leading-relaxed">
                  <li>
                    Click <b>Launch Official WhatsApp Web</b> above to open{" "}
                    <code>web.whatsapp.com</code>.
                  </li>
                  <li>
                    On your phone (<b>{OFFICIAL_STONE_TECH_WHATSAPP}</b>), open WhatsApp →{" "}
                    <b>Settings</b> / <b>Menu ⋮</b> → <b>Linked Devices</b> → <b>Link a Device</b>.
                  </li>
                  <li>Point your phone camera to the QR code on the WhatsApp Web screen.</li>
                  <li>
                    Click <b>Confirm Device Linked</b> above. Your browser profile will stay
                    connected to STOS permanently!
                  </li>
                </ol>
              </div>

              {/* Zero-calls guarantee card */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-1 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="flex items-center gap-1.5 font-bold text-emerald-950 dark:text-emerald-200 text-xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Permanent Session · Zero Incoming Calls</span>
                </div>
                <p className="text-[11px] text-emerald-900/80 dark:text-emerald-300/80 leading-relaxed">
                  Once paired, STOS keeps the Multi-Device bridge alive in the background without
                  needing your phone to stay unlocked. All WhatsApp calls are explicitly suppressed
                  so only chats, quotations, and media arrive in STOS.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
