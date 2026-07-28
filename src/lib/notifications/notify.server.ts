/**
 * Server-side writer for the in-app notification centre (Goal 3).
 *
 * Deliberately NOT a `createServerFn` RPC endpoint — this is a plain
 * server-only helper other server-side code calls directly (server
 * functions, the audit-log helper, a future cron job), the same relationship
 * `client.server.ts` has to its callers. Never import this from a route
 * component or any file that ships to the client bundle; the dynamic
 * `import("@/integrations/supabase/client.server")` below is what keeps the
 * service-role key out of the client bundle, matching every other
 * `supabaseAdmin` call site in this repo (see
 * `docs/sprint-2.0-production-recovery.md` Hypothesis 5).
 *
 * Writes are service-role only (bypasses RLS) by design — see the
 * migration's comment on why there is no client-side INSERT policy on
 * `public.notifications`.
 */
// Not sourced from `Database["public"]["Enums"]` — `types.ts` is
// auto-generated from the live schema (never hand-edited, per this repo's
// standing rule) and won't know about `public.notification_tier` until the
// pending migration below is applied and types are regenerated. Duplicated
// here as a plain literal union so this file typechecks today; must match
// `CREATE TYPE public.notification_tier` in
// supabase/migrations/20260728120000_in_app_notifications_centre.sql.
type NotificationTier = "info" | "important" | "critical";

export interface NotifyInput {
  /** Omit (or pass null) for a broadcast notification to every staff member. */
  userId?: string | null;
  tier: NotificationTier;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  linkPath?: string;
  createdBy?: string | null;
  /** Request a future push-notification fan-out once that lands (Goal 6/7). */
  deliverPush?: boolean;
}

/**
 * Writes one row to `public.notifications`. Never throws on a missing table
 * (error 42P01) — this migration
 * (`supabase/migrations/20260728120000_in_app_notifications_centre.sql`) is
 * PENDING until applied via the Lovable Cloud SQL editor, and callers of
 * `notify()` (e.g. a future wiring of DangerNotifications.tsx, an overdue
 * invoice check) must not fail their own primary action just because the
 * notification centre isn't provisioned yet — same "never let a
 * secondary/audit write break the primary action" principle already used by
 * `users.functions.ts`'s `logAuditEvent`.
 */
export async function notify(input: NotifyInput): Promise<{ id: string } | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // `.from("notifications")` isn't in the generated `Database` type yet
    // (same reason as the `NotificationTier` duplication above — pending
    // migration, types.ts not regenerated). Cast through `any` at this one
    // call site rather than hand-editing the generated file; safe to
    // narrow back to a typed `.from<...>()` call once Lovable regenerates
    // types.ts after the migration is applied — the runtime behavior is
    // identical either way, this only affects compile-time checking.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic .from<Database>() has no entry for "notifications" until the migration lands and types regenerate.
    const { data, error } = await (supabaseAdmin as any)
      .from("notifications")
      .insert({
        user_id: input.userId ?? null,
        tier: input.tier,
        title: input.title,
        body: input.body ?? null,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        link_path: input.linkPath ?? null,
        created_by: input.createdBy ?? null,
        deliver_push: input.deliverPush ?? false,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "42P01") {
        console.warn(
          "[notifications] public.notifications does not exist yet — migration 20260728120000 is pending. Skipping write.",
        );
        return null;
      }
      console.error("[notifications] failed to write notification", error);
      return null;
    }
    return data;
  } catch (err) {
    console.error("[notifications] notify() threw", err);
    return null;
  }
}

/** Convenience wrapper — broadcasts to every staff member (user_id NULL). */
export function notifyBroadcast(
  input: Omit<NotifyInput, "userId">,
): Promise<{ id: string } | null> {
  return notify({ ...input, userId: null });
}
