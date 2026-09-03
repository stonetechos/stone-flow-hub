/**
 * Fan a notification out across every available, registered channel.
 *
 * Per-channel isolation follows the exact discipline
 * `universalEntityResolver.ts`'s `resolveUniversalEntitiesByType()` and
 * `notify.server.ts`'s own try/catch already use in this codebase: one
 * channel throwing (a not-yet-implemented stub, a transient runtime issue)
 * never stops another channel's delivery, and never propagates to the
 * caller — a UI toast firing is not something the app's primary action
 * (saving a record, executing a VIE action) should ever fail over.
 */
import { listNotificationChannels } from "./registry";
import type { ChannelNotificationPayload, NotificationChannelId } from "./types";

export async function dispatchToChannels(
  payload: ChannelNotificationPayload,
  channelIds?: NotificationChannelId[],
): Promise<void> {
  const channels = listNotificationChannels().filter(
    (c) => !channelIds || channelIds.includes(c.id),
  );

  await Promise.all(
    channels.map(async (channel) => {
      if (!channel.isAvailable()) return;
      try {
        await channel.deliver(payload);
      } catch (err) {
        // Stub channels (android/push) throw NotificationChannelNotImplementedError
        // by design in this foundation sprint — that is an expected, silent
        // no-op here, not a bug to surface as a console error every time.
        if (err instanceof Error && err.name === "NotificationChannelNotImplementedError") {
          return;
        }
        console.error(`[notifications] channel "${channel.id}" failed to deliver`, err);
      }
    }),
  );
}
