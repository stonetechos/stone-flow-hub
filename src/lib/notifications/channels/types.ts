/**
 * Notification channel contracts — VIE foundation sprint (2026-07-28).
 *
 * "Prepare notification channels for: Desktop, Android, Future Push."
 * Foundation only: a `NotificationChannel` is a plain, typed interface any
 * delivery surface implements; `registry.ts` is where concrete channels
 * register themselves. This is deliberately the same shape as
 * `src/lib/vie/actions/registry.ts` (a Map-based lookup, no business logic
 * in the registry itself) — one more instance of this repo's standing
 * "registry, not a growing switch statement" pattern.
 *
 * This is NOT the same thing as `src/lib/notifications/providers/` (email/
 * WhatsApp) or `dispatch.server.ts` (`Channel = "email"|"whatsapp"|"sms"`)
 * — those dispatch OUTBOUND messages to customers/vendors over external
 * services. This is the in-app notification centre (`notify.server.ts` /
 * `centre.ts`, tiers `info`/`important`/`critical`) reaching the STAFF
 * USER who is signed in, on whatever surface they're currently using —
 * a completely different concern that happens to reuse the word "channel".
 */
import type { NotificationTier } from "../tiers";

export type NotificationChannelId = "desktop" | "android" | "push";

/** What a channel is asked to deliver. Deliberately a subset of
 *  `CentreNotification` (centre.ts) / `NotifyInput` (notify.server.ts) —
 *  just the fields a delivery surface actually renders, not read-state or
 *  ids a channel has no use for. */
export interface ChannelNotificationPayload {
  tier: NotificationTier;
  title: string;
  body?: string | null;
  linkPath?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}

export interface NotificationChannel {
  id: NotificationChannelId;
  /** Human-readable label for a future settings/preferences UI. */
  label: string;
  /** Whether this channel can actually deliver right now, in this runtime
   *  (e.g. desktop needs a browser `window`; android needs a native
   *  Capacitor shell). Checked before every `deliver()` call — a channel
   *  that returns `false` here is silently skipped, never an error. */
  isAvailable(): boolean;
  /** Deliver one notification. Foundation-phase channels that have no real
   *  transport yet (android, push) throw `NotificationChannelNotImplementedError`
   *  — callers must not let that break other channels; see `dispatch.ts`'s
   *  per-channel isolation, the same discipline
   *  `universalEntityResolver.ts` and `businessIntent.ts`'s stub adapters
   *  already follow in this sprint. */
  deliver(payload: ChannelNotificationPayload): void | Promise<void>;
}

/** Thrown by a registered-but-not-yet-implemented channel's `deliver()`.
 *  Mirrors `BusinessIntentSourceNotImplementedError` (businessIntent.ts) —
 *  same "foundation only, real work throws a distinctive, catchable error
 *  rather than silently no-op'ing or faking success" contract. */
export class NotificationChannelNotImplementedError extends Error {
  constructor(public readonly channelId: NotificationChannelId) {
    super(
      `Notification channel "${channelId}" is registered but not yet implemented (foundation-only sprint 2026-07-28).`,
    );
    this.name = "NotificationChannelNotImplementedError";
  }
}
