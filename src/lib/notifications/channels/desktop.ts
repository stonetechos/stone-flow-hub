/**
 * Desktop (browser) notification channel — the one real, working channel
 * this foundation sprint ships. Thin adapter over the existing
 * `notifyToast()` (toast.ts) — same tier styling, same finite durations,
 * no new toast logic invented here.
 */
import { notifyToast } from "../toast";
import type { NotificationChannel } from "./types";

export const desktopChannel: NotificationChannel = {
  id: "desktop",
  label: "Desktop (in-app toast)",
  isAvailable: () => typeof window !== "undefined",
  deliver(payload) {
    notifyToast(payload.tier, payload.title, {
      description: payload.body ?? undefined,
    });
  },
};
