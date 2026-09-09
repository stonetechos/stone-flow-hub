/**
 * Desktop & Mobile browser notification channel.
 * Delivers in-app Sonner top-banner toasts and native OS notification banners
 * when browser notification permission is granted.
 */
import { notifyToast } from "../toast";
import type { NotificationChannel } from "./types";

export const desktopChannel: NotificationChannel = {
  id: "desktop",
  label: "Desktop & Mobile (in-app banner & OS alert)",
  isAvailable: () => typeof window !== "undefined",
  deliver(payload) {
    // 1. In-app banner toast (Sonner, rendered at top of viewport)
    notifyToast(payload.tier, payload.title, {
      description: payload.body ?? undefined,
    });

    // 2. OS-level browser notification banner if permission is granted
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      try {
        new Notification(payload.title, {
          body: payload.body ?? undefined,
          icon: "/favicon.ico",
        });
      } catch {
        // Ignored if browser restricts notifications outside user gestures
      }
    }
  },
};
