import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { triggerNotificationVibration } from "../sound";
import type { ChannelNotificationPayload, NotificationChannel } from "./types";

let channelCreated = false;
let actionListenerRegistered = false;

function resolveSafeAndroidLink(rawPath?: string | null): string {
  if (!rawPath || typeof rawPath !== "string") return "/dashboard";
  let clean = rawPath.trim();
  if (clean === "/money-flow/customer-payments") clean = "/payments";
  return clean.startsWith("/") ? clean : `/${clean}`;
}

export function initAndroidNotifications(): void {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return;
  }
  ensureActionListener();
  void ensureAndroidChannel();
}

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
      const safePath = resolveSafeAndroidLink(linkPath);
      if (typeof window !== "undefined") {
        try {
          window.history.pushState(null, "", safePath);
          window.dispatchEvent(new PopStateEvent("popstate"));
        } catch {
          window.location.hash = safePath;
        }
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
    const alreadyPrompted =
      typeof localStorage !== "undefined" &&
      localStorage.getItem("stos_android_notif_requested") === "true";
    if (
      !alreadyPrompted &&
      (perm.display === "prompt" || perm.display === "prompt-with-rationale")
    ) {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("stos_android_notif_requested", "true");
      }
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
            smallIcon: "ic_stat_stos",
            iconColor: "#0f766e",
            ongoing: false,
            autoCancel: true,
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
