import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { triggerNotificationVibration } from "../sound";
import type { ChannelNotificationPayload, NotificationChannel } from "./types";

let channelCreated = false;
let actionListenerRegistered = false;

function ensureActionListener(): void {
  if (
    actionListenerRegistered ||
    !Capacitor.isNativePlatform() ||
    Capacitor.getPlatform() !== "android"
  ) {
    return;
  }
  try {
    void LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
      const linkPath = action.notification?.extra?.linkPath;
      if (linkPath && typeof window !== "undefined") {
        window.location.href = linkPath;
      }
    });
    actionListenerRegistered = true;
  } catch {
    // ignore
  }
}

async function ensureAndroidChannel(): Promise<void> {
  if (channelCreated || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return;
  }
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display === "prompt" || perm.display === "prompt-with-rationale") {
      await LocalNotifications.requestPermissions();
    }
    await LocalNotifications.createChannel({
      id: "stos_operations",
      name: "STOS Operations",
      description: "Realtime alerts for orders, dispatches, quotes, and customers",
      importance: 5, // High / Heads-up
      visibility: 1, // Public
      vibration: true,
      sound: "default",
      lights: true,
      lightColor: "#0f766e",
    });
    channelCreated = true;
  } catch (err) {
    console.warn("[notifications] Failed to ensure Android channel", err);
  }
}

export const androidChannel: NotificationChannel = {
  id: "android",
  label: "Android (native)",
  isAvailable: () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android",
  async deliver(payload: ChannelNotificationPayload): Promise<void> {
    try {
      triggerNotificationVibration(payload.tier);
      await ensureAndroidChannel();
      ensureActionListener();

      const notifId = Math.floor(Math.random() * 2000000000) + 1;
      const formattedTitle = payload.title.startsWith("STOS")
        ? payload.title
        : `STOS · ${payload.title}`;

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: formattedTitle,
            body: payload.body ?? "",
            channelId: "stos_operations",
            sound: "default",
            smallIcon: "ic_launcher",
            iconColor: "#0f766e",
            extra: {
              linkPath: payload.linkPath,
              entityType: payload.entityType,
              entityId: payload.entityId,
            },
          },
        ],
      });
    } catch (err) {
      console.error("[notifications] Failed to schedule Android local notification", err);
    }
  },
};
