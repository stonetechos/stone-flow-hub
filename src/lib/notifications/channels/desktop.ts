/**
 * Desktop & Mobile browser notification channel.
 * Delivers in-app Sonner top-banner toasts, synthesized audio chimes,
 * phone vibrations, and native OS notification banners when permission is granted.
 */
import { notifyToast } from "../toast";
import { playNotificationSound, triggerNotificationVibration } from "../sound";
import type { NotificationChannel } from "./types";

export const desktopChannel: NotificationChannel = {
  id: "desktop",
  label: "Desktop & Mobile (in-app banner, sound, vibration & OS alert)",
  isAvailable: () => typeof window !== "undefined",
  deliver(payload) {
    // 1. Play synthesized audio chime (WhatsApp-style ping)
    playNotificationSound(payload.tier);

    // 2. Trigger mobile phone vibration
    triggerNotificationVibration(payload.tier);

    // 3. In-app banner toast (Sonner, rendered at top of viewport)
    notifyToast(payload.tier, payload.title, {
      description: payload.body ?? undefined,
    });

    // 4. OS-level browser notification banner if permission is granted
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      try {
        const formattedTitle = payload.title.startsWith("STOS")
          ? payload.title
          : `STOS · ${payload.title}`;
        const n = new Notification(formattedTitle, {
          body: payload.body ?? undefined,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: payload.entityId || `stos-${Date.now()}`,
        });
        n.onclick = () => {
          try {
            window.focus();
          } catch {
            // ignore window focus restriction
          }
          if (payload.linkPath) {
            if (window.location.pathname === payload.linkPath) {
              n.close();
              return;
            }
            window.location.assign(payload.linkPath);
          }
          n.close();
        };
      } catch {
        // Ignored if browser restricts notifications outside user gestures
      }
    }
  },
};
