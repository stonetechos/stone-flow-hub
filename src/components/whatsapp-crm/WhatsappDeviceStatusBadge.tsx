import { useState } from "react";
import { PhoneOff, Smartphone, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WhatsappLinkedDeviceDialog } from "./WhatsappLinkedDeviceDialog";
import { getStoredDeviceSession, type WhatsappDeviceSession } from "./device-session";

interface Props {
  onOpenSync?: () => void;
}

export function WhatsappDeviceStatusBadge({ onOpenSync }: Props) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<WhatsappDeviceSession>(getStoredDeviceSession);

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-7 text-xs font-medium gap-1.5 border-[#c9d1d4] bg-[#e0f1f5] hover:bg-[#d0eaf1] text-[#015474] dark:border-[#00597b] dark:bg-[#015474]/30 dark:text-[#67e8f9] cursor-pointer shadow-2xs"
          title="Manage WhatsApp Linked Device & Web Bridge"
        >
          {session.isLinked ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006788] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#006788]"></span>
              </span>
              <Smartphone className="h-3 w-3 text-[#006788] dark:text-[#38bdf8]" />
              <span className="font-semibold hidden sm:inline">
                {session.phoneNumber || "WA Linked"}
              </span>
              <Badge className="bg-[#006788]/20 text-[#015474] dark:text-[#67e8f9] border-none text-[9px] px-1 py-0 font-bold">
                Online
              </Badge>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-amber-500" />
              <span className="font-semibold text-amber-800 dark:text-amber-300">
                Link Device (QR)
              </span>
            </>
          )}
        </Button>

        <span
          className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
          title="All WhatsApp voice & video calls are intercepted and suppressed to maintain a focus CRM environment."
        >
          <PhoneOff className="h-2.5 w-2.5 text-slate-400" />
          <span>Chat Only (Calls Blocked)</span>
        </span>
      </div>

      <WhatsappLinkedDeviceDialog
        open={open}
        onOpenChange={setOpen}
        onSessionUpdated={(updated) => setSession(updated)}
        onOpenSync={onOpenSync}
      />
    </>
  );
}
