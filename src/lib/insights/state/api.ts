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

export type InsightLifecycleStatus = "new" | "seen" | "acknowledged" | "resolved" | "dismissed";

export interface InsightStateRow {
  id: string;
  user_id: string;
  insight_source: string;
  insight_id: string;
  status: InsightLifecycleStatus;
  created_at: string;
  updated_at: string;
}

/** Statuses that mean "a user has already handled this — stop resurfacing
 *  it as something new to act on" across every consuming surface. */
export const INSIGHT_SETTLED_STATUSES: ReadonlySet<InsightLifecycleStatus> = new Set([
  "acknowledged",
  "resolved",
  "dismissed",
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
): Promise<void> {
  const uid = await requireUserId();
  const { error } = await supabase.from("insight_states" as never).upsert(
    {
      user_id: uid,
      insight_source: source,
      insight_id: insightId,
      status,
    } as never,
    { onConflict: "user_id,insight_source,insight_id" },
  );
  if (error) throw new AppError(mapDbError(error));
}
