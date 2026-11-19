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

    // 4. OS-level notification banner (Mobile status bar shade via Service Worker or Desktop Notification)
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      const formattedTitle = payload.title.startsWith("STOS")
        ? payload.title
        : `STOS · ${payload.title}`;

      const notifOptions: NotificationOptions = {
        body: payload.body ?? undefined,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: payload.entityId || `stos-${Date.now()}`,
        data: {
          url: payload.linkPath || "/dashboard",
        },
      };

      // In Android Chrome / Samsung Internet / PWA, new Notification() throws:
      // "Illegal constructor. Use ServiceWorkerRegistration.showNotification() instead."
      // We prioritize serviceWorker.ready so the native notification shade banner fires on mobile.
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready
          .then((reg) => {
            void reg.showNotification(formattedTitle, notifOptions);
          })
          .catch(() => {
            triggerDesktopNotificationFallback(formattedTitle, notifOptions, payload.linkPath);
          });
      } else {
        triggerDesktopNotificationFallback(formattedTitle, notifOptions, payload.linkPath);
      }
    }
  },
};

function triggerDesktopNotificationFallback(
  title: string,
  options: NotificationOptions,
  linkPath?: string | null,
) {
  try {
    const n = new Notification(title, options);
    n.onclick = () => {
      try {
        window.focus();
      } catch {
        // ignore window focus restriction
      }
      if (linkPath) {
        if (window.location.pathname === linkPath) {
          n.close();
          return;
        }
        window.location.assign(linkPath);
      }
      n.close();
    };
  } catch {
    // Ignored if browser restricts notifications
  }
}
