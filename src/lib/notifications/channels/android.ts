/**
 * Android (native) notification channel — foundation only.
 *
 * `isAvailable()` is a real, working signal: true only when this bundle is
 * actually running inside the packaged Capacitor Android app (the same
 * `Capacitor.isNativePlatform()` check `src/lib/capacitor/status-bar.ts`
 * already uses to gate native-only plugin calls). `deliver()` is
 * deliberately NOT implemented — a real Android channel needs a native
 * local-notifications plugin (e.g. `@capacitor/local-notifications`,
 * runtime permission prompts, a notification-channel/importance setup on
 * the OS side) that this sprint was not asked to build ("Prepare
 * notification channels" — plumbing, not the plugin integration itself).
 * Registered now so the registry/dispatch plumbing has a real slot to grow
 * into, per `NotificationChannel`'s own contract for a foundation-phase
 * channel.
 */
import { Capacitor } from "@capacitor/core";
import { NotificationChannelNotImplementedError, type NotificationChannel } from "./types";

export const androidChannel: NotificationChannel = {
  id: "android",
  label: "Android (native)",
  isAvailable: () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android",
  deliver() {
    throw new NotificationChannelNotImplementedError("android");
  },
};
