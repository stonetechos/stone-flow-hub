/**
 * Shared tier vocabulary for the in-app notification centre (Goal 3).
 *
 * Three tiers only, per spec — Information / Important / Critical. Mapped
 * onto the existing STDL `Tone` system (`src/lib/ui/tones.ts`) rather than
 * inventing new colors, so a critical notification renders with the exact
 * same "danger" tokens as every other critical signal in the app (insight
 * cards, status pills, DangerNotifications toasts).
 */
import type { Tone } from "@/lib/ui/tones";

export type NotificationTier = "info" | "important" | "critical";

export const NOTIFICATION_TIERS: readonly NotificationTier[] = [
  "info",
  "important",
  "critical",
] as const;

export const TIER_TONE: Record<NotificationTier, Tone> = {
  info: "info",
  important: "warning",
  critical: "danger",
};

export const TIER_LABEL: Record<NotificationTier, string> = {
  info: "Info",
  important: "Important",
  critical: "Critical",
};

/**
 * Toast auto-dismiss duration by tier, in ms. All three auto-dismiss —
 * "no persistent blocking banners" per spec applies to every tier, not just
 * info/important. Critical gets more reading time and (via `__root.tsx`'s
 * global `closeButton`) an explicit close affordance, but it is never
 * `Infinity` — losing the toast is fine precisely because critical items
 * are also durably written to the notification centre (see notify.server.ts),
 * so nothing is actually lost when the toast times out.
 */
export const TIER_TOAST_DURATION_MS: Record<NotificationTier, number> = {
  info: 4_000,
  important: 6_000,
  critical: 8_000,
};

/** sonner's `richColors` variant closest to each tier, for toast() calls. */
export const TIER_TOAST_VARIANT: Record<NotificationTier, "message" | "warning" | "error"> = {
  info: "message",
  important: "warning",
  critical: "error",
};
