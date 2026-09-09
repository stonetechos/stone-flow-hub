import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { ChannelNotificationPayload, NotificationChannel } from "./types";

let channelCreated = false;

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
      await ensureAndroidChannel();
      const notifId = Math.floor(Math.random() * 2000000000) + 1;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: payload.title,
            body: payload.body ?? "",
            channelId: "stos_operations",
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
