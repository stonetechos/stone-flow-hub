/**
 * Tiered toast helper (Goal 3) — thin wrapper over the existing `sonner`
 * `toast()` (already used throughout the app; this does not replace it,
 * every plain `toast.success(...)`/`toast.error(...)` call site keeps
 * working unchanged). Use `notifyToast()` specifically for anything that
 * should carry one of the three notification tiers and be visually
 * consistent with the notification centre's tier styling.
 *
 * All three tiers auto-dismiss (`TIER_TOAST_DURATION_MS`) — there is no
 * `Infinity` duration anywhere in this module, matching the "no persistent
 * blocking banners" requirement. Critical differs only in duration and
 * color (`richColors`' `error` variant, red), never in blocking behavior.
 */
import { toast as sonnerToast } from "sonner";
import { TIER_TOAST_DURATION_MS, TIER_TOAST_VARIANT, type NotificationTier } from "./tiers";

export interface TieredToastOptions {
  description?: string;
  /** Overrides the tier's default duration if a caller has a specific reason to. */
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export function notifyToast(
  tier: NotificationTier,
  title: string,
  options: TieredToastOptions = {},
): void {
  const duration = options.duration ?? TIER_TOAST_DURATION_MS[tier];
  const variant = TIER_TOAST_VARIANT[tier];
  const opts = { description: options.description, duration, action: options.action };

  switch (variant) {
    case "error":
      sonnerToast.error(title, opts);
      return;
    case "warning":
      sonnerToast.warning(title, opts);
      return;
    default:
      sonnerToast(title, opts);
  }
}
