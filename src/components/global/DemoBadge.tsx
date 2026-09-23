import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDemoMode } from "@/lib/demo/context";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { RefreshCw, FlaskConical, Radio } from "lucide-react";

export function DemoBadge() {
  const { t } = useTranslation();
  const { isDemo, setMode, resetDemo } = useDemoMode();
  const [confirmReset, setConfirmReset] = useState(false);

  const modeLabel = isDemo ? t("common.demo", "Demo") : t("common.live", "Live");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold uppercase tracking-wide transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isDemo
                ? "bg-amber-50 text-amber-800 hover:bg-amber-100/80 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100/80 border border-blue-200/80 shadow-2xs dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
            )}
            aria-label={t("common.currentMode", {
              mode: modeLabel,
              defaultValue: `Current mode: ${modeLabel}. Change mode`,
            })}
          >
            {isDemo ? (
              <FlaskConical className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
            ) : (
              <Radio className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            )}
            {modeLabel}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{t("common.workspaceMode", "Workspace Mode")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void setMode(false)} disabled={!isDemo}>
            <Radio className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
            {t("common.liveMode", "Live Mode")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void setMode(true)} disabled={isDemo}>
            <FlaskConical className="mr-2 h-4 w-4 text-status-info-fg" />
            {t("common.demoMode", "Demo Mode")}
          </DropdownMenuItem>
          {isDemo && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setConfirmReset(true)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("common.resetDemoData", "Reset Demo Data")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("common.resetDemoTitle", "Reset all demo data?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "common.resetDemoDesc",
                "This deletes every record created in Demo Mode and restores the original seeded dataset. Live data is untouched.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void resetDemo()}>
              {t("common.reset", "Reset")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function DemoBanner() {
  const { t } = useTranslation();
  const { isDemo } = useDemoMode();
  if (!isDemo) return null;
  return (
    <div className="border-b border-status-info-border bg-status-info-bg px-4 py-1.5 text-center text-xs font-medium text-status-info-fg">
      {t(
        "common.demoBanner",
        "You are currently using STOS Demo Mode — all changes are isolated from Live data.",
      )}
    </div>
  );
}

export default DemoBadge;
