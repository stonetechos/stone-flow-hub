/**
 * Notification channel registry — Map-based lookup, same pattern as
 * `src/lib/vie/actions/registry.ts`. No delivery logic lives here; this
 * file only tracks which channels exist and hands them back by id.
 */
import { desktopChannel } from "./desktop";
import { androidChannel } from "./android";
import { pushChannel } from "./push";
import type { NotificationChannel, NotificationChannelId } from "./types";

const registry = new Map<NotificationChannelId, NotificationChannel>();

export function registerNotificationChannel(channel: NotificationChannel): void {
  registry.set(channel.id, channel);
}

export function getNotificationChannel(id: NotificationChannelId): NotificationChannel | undefined {
  return registry.get(id);
}

export function listNotificationChannels(): NotificationChannel[] {
  return [...registry.values()];
}

// Default registrations — one real (desktop), two prepared stubs
// (android, push). A future channel (e.g. "email digest") registers
// itself here the same way, no other file needs to change.
registerNotificationChannel(desktopChannel);
registerNotificationChannel(androidChannel);
registerNotificationChannel(pushChannel);
