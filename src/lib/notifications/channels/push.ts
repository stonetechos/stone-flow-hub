/**
 * Future Push notification channel — foundation only.
 *
 * `isAvailable()` checks for the real browser Push API primitives
 * (`PushManager` + an active service worker — `register-service-worker.ts`
 * already registers one, `/sw.js`, so the second half of this check is
 * real today). `deliver()` is deliberately NOT implemented: a working push
 * channel needs a VAPID key pair, a server-side subscription store, and a
 * `push`/`pushsubscriptionchange` handler inside `public/sw.js` — none of
 * which this foundation sprint was asked to build. `notify.server.ts`'s
 * existing `deliverPush?: boolean` field on `NotifyInput` is exactly the
 * intended future hook: once this channel is real, that flag is what a
 * server-side dispatcher reads to decide whether to fan a notification out
 * here.
 */
import { NotificationChannelNotImplementedError, type NotificationChannel } from "./types";

export const pushChannel: NotificationChannel = {
  id: "push",
  label: "Push (future)",
  isAvailable: () =>
    typeof window !== "undefined" && "PushManager" in window && "serviceWorker" in navigator,
  deliver() {
    throw new NotificationChannelNotImplementedError("push");
  },
};
