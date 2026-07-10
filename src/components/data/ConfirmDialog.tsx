/**
 * Shared confirmation foundation for Stone Tech OS.
 *
 * ConfirmDialog is the single primitive used for every "are you sure" moment
 * in the app. It supports:
 *   - three visual tones (default / danger / warning) with matching leading icon
 *   - custom body content (dependency scans, cascade previews, etc.)
 *   - a footer that can be disabled while an async scan is running
 *
 * Higher-level dialogs (SafeDeleteDialog, bulk-action confirms, publish
 * confirms) compose on top of this primitive rather than re-implementing
 * AlertDialog markup. That keeps footer alignment, focus behaviour, keyboard
 * handling and copy consistent across the product.
 */
import { useState, type ReactNode } from "react";
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
import { Loader2, ShieldAlert, AlertTriangle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfirmTone = "default" | "danger" | "warning";

const TONE_ICON = {
  default: HelpCircle,
  danger: ShieldAlert,
  warning: AlertTriangle,
} as const;

const TONE_ICON_CLASS = {
  default: "text-muted-foreground",
  danger: "text-destructive",
  warning: "text-amber-600",
} as const;

const TONE_ACTION_CLASS = {
  default: "",
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  warning: "bg-amber-600 text-white hover:bg-amber-600/90",
} as const;

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: ReactNode;
  /** Rendered between the description and the footer — use for lists, scans, previews. */
  body?: ReactNode;
  tone?: ConfirmTone;
  /** Hide the leading icon (SafeDelete swaps in its own contextual icon). */
  hideIcon?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /** Disable the confirm action (e.g. dependency scan reports blockers). */
  confirmDisabled?: boolean;
  busy?: boolean;
  /** Widen the dialog for content-heavy confirmations (e.g. dependency scans). */
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS = {
  sm: "max-w-sm",
  md: "",
  lg: "max-w-lg",
} as const;

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  body,
  tone = "danger",
  hideIcon,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  confirmDisabled,
  busy,
  size = "md",
}: ConfirmDialogProps) {
  const Icon = TONE_ICON[tone];
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={SIZE_CLASS[size]}>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {!hideIcon && <Icon className={cn("h-5 w-5", TONE_ICON_CLASS[tone])} />}
            {title}
          </AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {body && <div className="space-y-3 text-sm">{body}</div>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (!confirmDisabled) onConfirm();
            }}
            disabled={busy || confirmDisabled}
            className={TONE_ACTION_CLASS[tone]}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function useConfirm() {
  const [open, setOpen] = useState(false);
  return { open, setOpen, ask: () => setOpen(true), close: () => setOpen(false) };
}
