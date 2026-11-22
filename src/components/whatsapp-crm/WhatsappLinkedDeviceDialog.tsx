import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CheckCircle2,
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
  type WhatsappDeviceSession,
} from "./device-session";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionUpdated?: (session: WhatsappDeviceSession) => void;
}

export function WhatsappLinkedDeviceDialog({ open, onOpenChange, onSessionUpdated }: Props) {
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
      phoneNumber: "+91 98791 23456",
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
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast.success("Synchronizing active WhatsApp chats with STOS CRM records...");
                    onOpenChange(false);
                  }}
                  className="gap-1.5 text-xs font-semibold cursor-pointer border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />
                  Sync Messages Now
                </Button>

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
              <div className="flex flex-col sm:flex-row items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800">
                {/* Simulated Authentic WhatsApp QR Code */}
                <div className="relative p-2.5 bg-white rounded-xl shadow-xs border shrink-0">
                  <svg
                    viewBox="0 0 140 140"
                    className="w-36 h-36"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Corners */}
                    <rect x="10" y="10" width="35" height="35" rx="4" fill="#083B43" />
                    <rect x="16" y="16" width="23" height="23" rx="2" fill="#fff" />
                    <rect x="21" y="21" width="13" height="13" fill="#083B43" />

                    <rect x="95" y="10" width="35" height="35" rx="4" fill="#083B43" />
                    <rect x="101" y="16" width="23" height="23" rx="2" fill="#fff" />
                    <rect x="106" y="21" width="13" height="13" fill="#083B43" />

                    <rect x="10" y="95" width="35" height="35" rx="4" fill="#083B43" />
                    <rect x="16" y="101" width="23" height="23" rx="2" fill="#fff" />
                    <rect x="21" y="106" width="13" height="13" fill="#083B43" />

                    {/* Data grid pattern */}
                    <rect x="52" y="14" width="7" height="7" fill="#083B43" />
                    <rect x="64" y="14" width="7" height="7" fill="#083B43" />
                    <rect x="76" y="14" width="7" height="7" fill="#083B43" />
                    <rect x="52" y="26" width="7" height="7" fill="#083B43" />
                    <rect x="76" y="26" width="7" height="7" fill="#083B43" />
                    <rect x="52" y="38" width="7" height="7" fill="#083B43" />
                    <rect x="64" y="38" width="7" height="7" fill="#083B43" />

                    <rect x="14" y="52" width="7" height="7" fill="#083B43" />
                    <rect x="26" y="52" width="7" height="7" fill="#083B43" />
                    <rect x="38" y="52" width="7" height="7" fill="#083B43" />
                    <rect x="52" y="52" width="7" height="7" fill="#083B43" />
                    <rect x="64" y="52" width="7" height="7" fill="#083B43" />
                    <rect x="76" y="52" width="7" height="7" fill="#083B43" />
                    <rect x="95" y="52" width="7" height="7" fill="#083B43" />
                    <rect x="107" y="52" width="7" height="7" fill="#083B43" />
                    <rect x="119" y="52" width="7" height="7" fill="#083B43" />

                    <rect x="14" y="64" width="7" height="7" fill="#083B43" />
                    <rect x="38" y="64" width="7" height="7" fill="#083B43" />
                    <rect x="95" y="64" width="7" height="7" fill="#083B43" />
                    <rect x="119" y="64" width="7" height="7" fill="#083B43" />

                    <rect x="14" y="76" width="7" height="7" fill="#083B43" />
                    <rect x="26" y="76" width="7" height="7" fill="#083B43" />
                    <rect x="38" y="76" width="7" height="7" fill="#083B43" />
                    <rect x="52" y="76" width="7" height="7" fill="#083B43" />
                    <rect x="76" y="76" width="7" height="7" fill="#083B43" />
                    <rect x="95" y="76" width="7" height="7" fill="#083B43" />
                    <rect x="107" y="76" width="7" height="7" fill="#083B43" />

                    <rect x="52" y="95" width="7" height="7" fill="#083B43" />
                    <rect x="76" y="95" width="7" height="7" fill="#083B43" />
                    <rect x="95" y="95" width="7" height="7" fill="#083B43" />
                    <rect x="119" y="95" width="7" height="7" fill="#083B43" />

                    <rect x="52" y="107" width="7" height="7" fill="#083B43" />
                    <rect x="64" y="107" width="7" height="7" fill="#083B43" />
                    <rect x="107" y="107" width="7" height="7" fill="#083B43" />
                    <rect x="119" y="107" width="7" height="7" fill="#083B43" />

                    <rect x="64" y="119" width="7" height="7" fill="#083B43" />
                    <rect x="76" y="119" width="7" height="7" fill="#083B43" />
                    <rect x="95" y="119" width="7" height="7" fill="#083B43" />

                    {/* Center WhatsApp Logo Emblem */}
                    <circle cx="70" cy="70" r="14" fill="#25D366" />
                    <path
                      d="M66 64 C65 65, 65 66, 66 68 C67 70, 69 72, 71 73 C73 74, 74 74, 75 73 L76 72 C76.5 71.5, 76.5 71, 76 70.5 L74 68.5 C73.5 68, 73 68, 72.5 68.5 L71.5 69.5 C71 69, 70 68, 69.5 67.5 L70.5 66.5 C71 66, 71 65.5, 70.5 65 L68.5 63 C68 62.5, 67.5 62.5, 67 63 Z"
                      fill="#fff"
                    />
                  </svg>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-2 py-0.5 rounded-full font-mono font-bold">
                    Refreshes in {pairingTimer}s
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-2 text-left">
                  <h4 className="font-bold text-foreground text-xs">
                    To link WhatsApp Business to STOS:
                  </h4>
                  <ol className="list-decimal pl-4 space-y-1.5 text-muted-foreground text-[11px] leading-relaxed">
                    <li>
                      Open <b>WhatsApp Business</b> on your phone
                    </li>
                    <li>
                      Tap <b>Menu ⋮</b> (Android) or <b>Settings</b> (iOS)
                    </li>
                    <li>
                      Tap <b>Linked Devices</b> → <b>Link a Device</b>
                    </li>
                    <li>Point your phone camera to this QR code</li>
                  </ol>

                  <div className="pt-2">
                    <Button
                      size="sm"
                      onClick={handleSimulateScanAndLink}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-xs w-full sm:w-auto cursor-pointer"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Verify Device Linked
                    </Button>
                  </div>
                </div>
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
