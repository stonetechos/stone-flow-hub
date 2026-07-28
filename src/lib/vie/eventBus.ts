/**
 * VIE Event Bus — foundation sprint (2026-07-28).
 *
 * A central, in-process, typed publish/subscribe dispatcher any ERP module
 * can use to announce "something happened" without importing whoever might
 * care. This is deliberately the smallest possible piece of infrastructure:
 *
 * - **No business logic lives here.** The bus does not know what a
 *   "customer" or an "enquiry" is, does not validate a payload's shape
 *   beyond the generic envelope below, does not decide what should happen
 *   in response to an event, and never calls into any `api.ts` function
 *   itself. It is a dispatcher, not a workflow engine — VIE's own
 *   Workflow Engine (`workflowEngine.ts`) already owns "what happens as a
 *   result of an action," and this file does not duplicate that.
 * - **Publishing never throws, and one bad subscriber can never break
 *   another, or the publisher.** A listener that throws is caught and
 *   logged; every other listener still runs, and the code that called
 *   `publish()` never sees the failure. This matters because the intended
 *   callers — `workflowEngine.ts`, `notify.server.ts` — sit on paths that
 *   must not be made less reliable by a plumbing addition. Events are a
 *   side channel, never a dependency the primary write path relies on.
 * - **This is a single-process, in-memory bus.** Subscribers registered in
 *   one request/session only receive events published within that same
 *   process's lifetime. On the server this app runs on Cloudflare Workers
 *   (per-request, not a long-lived process — see
 *   `docs/VIE-Phase2-Architecture-Review.md`'s "no non-interactive
 *   execution context" finding, which this bus does not change), so a
 *   server-side `publish()` only reaches subscribers registered earlier in
 *   that SAME request. Cross-request or cross-device event delivery (e.g.
 *   "notify every open browser tab when a colleague creates an enquiry")
 *   is explicitly NOT provided by this bus and would need a durable queue
 *   or Realtime channel (the codebase already has a precedent for that:
 *   `lib/notifications/centre.ts`'s Supabase Realtime subscription) — not
 *   a reason to avoid building this piece now, but a documented limit
 *   rather than an implied promise.
 * - **No default subscribers.** Per the sprint's "prepare for future
 *   subscribers" instruction, this file wires the bus up so a subscriber
 *   CAN attach (see `publishActionExecuted`/`publishActionFailed` call
 *   sites in `workflowEngine.ts`, and the `notification.created` publish
 *   in `notify.server.ts`), but registers none by default — a genuinely
 *   empty foundation, not a feature wearing a foundation's name.
 *
 * ## Event naming
 *
 * Event `type` is a plain string, not a closed enum — new ERP modules
 * should be able to publish a new event type without a change to this
 * file, the same "additive, not a core-file edit" principle
 * `VIE_INTENTS`/the Action Registry already use for intents. `VIE_EVENTS`
 * below is a *documentation* aid (autocomplete + a single place listing
 * every event type actually in use), not a validated whitelist — `on()`
 * and `publish()` both accept any string.
 */

export interface VieEvent<TPayload = unknown> {
  /** Dot-namespaced event name, e.g. "vie.action.executed", "notification.created". */
  type: string;
  /** Structured payload. Shape is owned entirely by the publisher — the bus never inspects it. */
  payload: TPayload;
  /**
   * ISO timestamp the event occurred at. Always supplied by the publisher
   * (never generated inside this file) so the bus stays pure and doesn't
   * need a system clock dependency — publishers already have a real
   * timestamp on hand (a DB row's `created_at`, a completed action's
   * `updated_at`) more often than not, and where they don't, `new Date()`
   * at the call site is one line.
   */
  occurredAt: string;
  /** Which module/function published this — for logging/tracing, e.g. "workflowEngine.executeAction". */
  source: string;
  /** Optional correlation id (e.g. a `vie_actions.id`) so a future subscriber can trace one action's ripple effects. */
  correlationId?: string;
}

export type VieEventListener<TPayload = unknown> = (
  event: VieEvent<TPayload>,
) => void | Promise<void>;

/**
 * Documentation-only registry of event types currently published anywhere
 * in the codebase. Add a new constant here when a module starts publishing
 * a genuinely new event type, so a reader can find every event name in one
 * place — this array is never read by `publish()`/`on()` at runtime.
 */
export const VIE_EVENTS = {
  ACTION_EXECUTED: "vie.action.executed",
  ACTION_FAILED: "vie.action.failed",
  NOTIFICATION_CREATED: "notification.created",
} as const;

class VieEventBus {
  private readonly listeners = new Map<string, Set<VieEventListener>>();
  private readonly wildcardListeners = new Set<VieEventListener>();

  /** Subscribe to one event type. Returns an unsubscribe function. */
  on<TPayload = unknown>(type: string, listener: VieEventListener<TPayload>): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener as VieEventListener);
    return () => {
      set!.delete(listener as VieEventListener);
      if (set!.size === 0) this.listeners.delete(type);
    };
  }

  /** Subscribe to every event, regardless of type — for logging/observability subscribers. Returns an unsubscribe function. */
  onAny(listener: VieEventListener): () => void {
    this.wildcardListeners.add(listener);
    return () => {
      this.wildcardListeners.delete(listener);
    };
  }

  /**
   * Publish an event. Fire-and-forget: listeners run, but `publish()`
   * itself never awaits them and never throws on their behalf — a
   * misbehaving subscriber must never take down the code that published
   * the event. Synchronous listeners run inline; listeners returning a
   * Promise have that promise's rejection caught and logged, not
   * propagated.
   */
  publish<TPayload = unknown>(event: VieEvent<TPayload>): void {
    const specific = this.listeners.get(event.type);
    const targets: VieEventListener[] = [
      ...(specific ? [...specific] : []),
      ...this.wildcardListeners,
    ];
    for (const listener of targets) {
      try {
        const result = listener(event);
        if (result && typeof (result as Promise<void>).catch === "function") {
          (result as Promise<void>).catch((err) => {
            // foundation-level dispatcher; no logging infra exists yet to
            // route this through instead (see
            // docs/vie-foundation-sprint-2026-07-28.md's Observability gap note).
            console.error(`[vieEventBus] listener for "${event.type}" rejected:`, err);
          });
        }
      } catch (err) {
        // see above.
        console.error(`[vieEventBus] listener for "${event.type}" threw:`, err);
      }
    }
  }

  /**
   * Publish and wait for every listener to settle — for tests, and for any
   * future caller that genuinely needs to know side effects have finished
   * before proceeding. Still never throws: rejections are swallowed the
   * same way `publish()` swallows them, since a subscriber failing is
   * never the publisher's problem to handle.
   */
  async publishAndWait<TPayload = unknown>(event: VieEvent<TPayload>): Promise<void> {
    const specific = this.listeners.get(event.type);
    const targets: VieEventListener[] = [
      ...(specific ? [...specific] : []),
      ...this.wildcardListeners,
    ];
    await Promise.allSettled(targets.map((listener) => listener(event)));
  }

  /** Test-only: drop every subscriber. Never called from application code. */
  __resetForTests(): void {
    this.listeners.clear();
    this.wildcardListeners.clear();
  }
}

/** The one bus instance every module publishes to / subscribes on. */
export const vieEventBus = new VieEventBus();
