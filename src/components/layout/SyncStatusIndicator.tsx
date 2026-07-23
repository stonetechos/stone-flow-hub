import { useEffect, useState } from "react";
import { WifiOff, Wifi, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toneSoftBg } from "@/lib/ui/tones";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { listPendingOperations } from "@/lib/pwa/sync-queue";
import { toast } from "sonner";

/**
 * Topbar connectivity pill + install affordance (Phase G.10A).
 * Mounted once in AppShell's header — stays silent while online with
 * nothing queued, so it doesn't add noise to an already busy topbar.
 */
export function SyncStatusIndicator() {
  const connectivity = useOnlineStatus();
  const { canInstall, promptInstall } = useInstallPrompt();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const refresh = (): void => {
      void listPendingOperations().then((ops) => {
        if (!cancelled) setPendingCount(ops.length);
      });
    };
    refresh();
    window.addEventListener("stos:pending-ops-flush", refresh);
    window.addEventListener("online", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("stos:pending-ops-flush", refresh);
      window.removeEventListener("online", refresh);
    };
  }, []);

  const handleInstall = async (): Promise<void> => {
    const outcome = await promptInstall();
    if (outcome === "accepted") toast.success("STOS installed");
  };

  const showPill = connectivity !== "online" || pendingCount > 0;

  return (
    <div className="flex items-center gap-1">
      {showPill && (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
            toneSoftBg(connectivity === "offline" ? "warning" : "success"),
          )}
          role="status"
          aria-live="polite"
        >
          {connectivity === "offline" ? (
            <>
              <WifiOff className="h-3 w-3" aria-hidden />
              Offline
            </>
          ) : (
            <>
              <Wifi className="h-3 w-3" aria-hidden />
              {connectivity === "reconnected" ? "Back online" : `Syncing ${pendingCount}…`}
            </>
          )}
        </span>
      )}

      {canInstall && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-text-secondary hover:text-intent-primary"
                aria-label="Install STOS"
                onClick={() => void handleInstall()}
              >
                <Download className="h-4 w-4" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Install app
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
