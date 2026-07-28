/**
 * Client-side reads/updates for the in-app notification centre (Goal 3).
 *
 * Pairs with `notify.server.ts` (writes) and the migration at
 * `supabase/migrations/20260728120000_in_app_notifications_centre.sql`
 * (PENDING — not yet applied to any database, see that file's header).
 * Every function here degrades to an empty/no-op result on a 42P01 "table
 * does not exist" error instead of throwing, so `NotificationsBell.tsx`
 * renders a normal empty state rather than an error boundary until that
 * migration is applied — the same graceful-degradation contract
 * `notify.server.ts` follows on the write side.
 */
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { NotificationTier } from "./tiers";

export interface CentreNotification {
  id: string;
  tier: NotificationTier;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  linkPath: string | null;
  readAt: string | null;
  createdAt: string;
}

function isMissingTableError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
}

interface NotificationRow {
  id: string;
  tier: NotificationTier;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  link_path: string | null;
  read_at: string | null;
  created_at: string;
}

// See notify.server.ts's header comment for why this is `any`-cast rather
// than typed against the generated `Database` — the table isn't in
// types.ts until the pending migration is applied and types regenerate.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic .from<Database>() has no entry for "notifications" until then; this is the one seam that absorbs it.
const notificationsTable = () => (supabase as any).from("notifications");

/**
 * Lists notifications visible to the current user (their own targeted rows
 * plus every broadcast row — see the migration's RLS policy), newest first.
 */
export async function listNotifications(limit = 100): Promise<CentreNotification[]> {
  const { data, error } = await notificationsTable()
    .select("id, tier, title, body, entity_type, entity_id, link_path, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }

  return ((data ?? []) as NotificationRow[]).map((row): CentreNotification => ({
    id: row.id,
    tier: row.tier,
    title: row.title,
    body: row.body,
    entityType: row.entity_type,
    entityId: row.entity_id,
    linkPath: row.link_path,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await notificationsTable()
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error && !isMissingTableError(error)) throw error;
}

export async function markAllNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await notificationsTable()
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .is("read_at", null);
  if (error && !isMissingTableError(error)) throw error;
}

/**
 * Subscribes to new notification INSERTs and invokes `onInsert` for each.
 * Follows the exact pattern already used by
 * `src/routes/_authenticated/activity.tsx` for `activity_log`. Returns an
 * unsubscribe function; safe to call even before the migration is applied
 * (the channel simply never fires if the table doesn't exist — Supabase
 * Realtime subscribing to a nonexistent table is not itself an error).
 */
export function subscribeToNotifications(onInsert: () => void): () => void {
  const channel: RealtimeChannel = supabase
    .channel("notifications_feed")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
      onInsert();
    })
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
