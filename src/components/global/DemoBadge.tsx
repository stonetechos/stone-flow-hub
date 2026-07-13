import { useState } from "react";
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
  const { isDemo, setMode, resetDemo } = useDemoMode();
  const [confirmReset, setConfirmReset] = useState(false);

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
              ? "bg-status-info-bg text-status-info-fg hover:bg-status-info-bg/80 border border-status-info-border"
              : "bg-status-success-bg text-status-success-fg hover:bg-status-success-bg/80 border border-status-success-border",
            )}
            aria-label={`Current mode: ${isDemo ? "Demo" : "Live"}. Change mode`}
          >
            {isDemo ? <FlaskConical className="h-3.5 w-3.5" /> : <Radio className="h-3.5 w-3.5" />}
            {isDemo ? "Demo" : "Live"}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Workspace Mode</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void setMode(false)} disabled={!isDemo}>
            <Radio className="mr-2 h-4 w-4 text-status-success-fg" />
            Live Mode
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void setMode(true)} disabled={isDemo}>
            <FlaskConical className="mr-2 h-4 w-4 text-status-info-fg" />
            Demo Mode
          </DropdownMenuItem>
          {isDemo && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setConfirmReset(true)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset Demo Data
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all demo data?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes every record created in Demo Mode and restores the original seeded
              dataset. Live data is untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void resetDemo()}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function DemoBanner() {
  const { isDemo } = useDemoMode();
  if (!isDemo) return null;
  return (
    <div className="border-b border-blue-200 bg-blue-50 px-4 py-1.5 text-center text-xs font-medium text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-100">
      You are currently using Stone Tech OS Demo Mode — all changes are isolated from Live data.
    </div>
  );
}

export default DemoBadge;
