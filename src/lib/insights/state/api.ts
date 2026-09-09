/**
 * Insight lifecycle state — Phase G.8.6 Task 3.
 *
 * Small, user-scoped table (`insight_states`) that lets every consumer of
 * the Insight Provider registry (Copilot's Insights panel,
 * DangerNotifications, EntityInsightPanel, and any future dashboard) share
 * one New -> Seen -> Acknowledged -> Resolved / Dismissed lifecycle per
 * insight, keyed by the same `source`+`id` compound identity every
 * `Insight` already carries (see lib/insights/types.ts).
 *
 * Modeled directly on lib/favorites/api.ts — same shape (requireUserId +
 * a handful of small functions), reused rather than reinvented.
 *
 * `insight_states` isn't in the generated Supabase types yet (no live DB
 * connection in this sandbox to regenerate them against — same situation
 * as `payment_register` in lib/payments/crud.ts), so table access goes
 * through `as never` casts here, exactly like that precedent.
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export type InsightLifecycleStatus =
  "new" | "seen" | "acknowledged" | "resolved" | "dismissed" | "expired" | "snoozed";

export interface InsightStateRow {
  id: string;
  user_id: string;
  insight_source: string;
  insight_id: string;
  status: InsightLifecycleStatus;
  /** Only meaningful when status === "snoozed" — see the G.8.7 Task 4
   *  migration's column comment. Null for every other status. */
  snoozed_until: string | null;
  created_at: string;
  updated_at: string;
}

/** Statuses that mean "a user has already handled this — stop resurfacing
 *  it as something new to act on" across every consuming surface. */
/** Every status that means "stop showing this as something new to act on"
 *  — independent of the time-aware `snoozed` case, which useInsightLifecycle
 *  handles separately since it un-settles itself once snoozed_until passes. */
export const INSIGHT_SETTLED_STATUSES: ReadonlySet<InsightLifecycleStatus> = new Set([
  "acknowledged",
  "resolved",
  "dismissed",
  "expired",
  "snoozed",
]);

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new AppError("Not signed in", "AUTH", 401);
  return data.user.id;
}

/** Every lifecycle row for the signed-in user. The table is small (one row
 *  per insight a user has ever interacted with) so, like Favorites, it's
 *  fetched whole and merged client-side against the live Insight list
 *  rather than filtered per-insight. */
export async function listMyInsightStates(): Promise<InsightStateRow[]> {
  const uid = await requireUserId();
  const { data, error } = await supabase
    .from("insight_states" as never)
    .select("*")
    .eq("user_id", uid);
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as InsightStateRow[];
}

/** Upsert one insight's lifecycle status for the signed-in user. */
export async function setInsightState(
  source: string,
  insightId: string,
  status: InsightLifecycleStatus,
  /** Required (and only meaningful) when status === "snoozed" — an ISO
   *  timestamp for when the insight should reappear. Also how a "remind me
   *  later" action is modeled: same status, user-chosen date. */
  snoozedUntil?: string,
): Promise<void> {
  const uid = await requireUserId();
  const { error } = await supabase.from("insight_states" as never).upsert(
    {
      user_id: uid,
      insight_source: source,
      insight_id: insightId,
      status,
      snoozed_until: status === "snoozed" ? (snoozedUntil ?? null) : null,
    } as never,
    { onConflict: "user_id,insight_source,insight_id" },
  );
  if (error) throw new AppError(mapDbError(error));
}
