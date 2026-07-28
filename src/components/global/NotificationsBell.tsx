/**
 * STOS — Notification centre.
 *
 * Was presentation-only against `MOCK_NOTIFICATIONS` (see git history for
 * that version). Now backed by `public.notifications` via
 * `src/lib/notifications/centre.ts`, with realtime INSERT updates and
 * durable read-state. Groups notifications into Unread / Today / Yesterday
 * / All tabs, same UX as before. Renders each row with tier styling
 * (`TIER_TONE`) so Critical is visually distinct from Info/Important,
 * matching Goal 3's "urgent notifications use different styling"
 * requirement — the centre is also where a Critical toast's content
 * survives after it auto-dismisses (see `src/lib/notifications/toast.ts`).
 *
 * Degrades to a normal empty state (not an error) if
 * `supabase/migrations/20260728120000_in_app_notifications_centre.sql`
 * hasn't been applied yet — see centre.ts's `isMissingTableError` handling.
 *
 * VIE foundation sprint (2026-07-28): a new row landing here now also fires
 * a live toast via the Desktop notification channel
 * (`lib/notifications/channels/`), not just a silent list refresh — closing
 * a gap the prior sprint left (a realtime INSERT only ever refreshed the
 * bell's popover; a user not looking at the bell had no way to notice a
 * new notification as it happened). Uses `dispatchToChannels()` rather
 * than calling `notifyToast()` directly so Android/Push automatically join
 * in the moment those channels go from stub to real — no change needed
 * here when that happens.
 */
import { useEffect, useMemo, useState } from "react";
import { Bell, Check, Inbox } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
  type CentreNotification,
} from "@/lib/notifications/centre";
import { dispatchToChannels } from "@/lib/notifications/channels/dispatch";
import { TIER_TONE } from "@/lib/notifications/tiers";
import { toneDot } from "@/lib/ui/tones";
import { qk } from "@/lib/query-keys";
import { formatRelative } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type BucketKey = "all" | "unread" | "today" | "yesterday";

function startOfDay(d: Date): number {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}

function bucketFor(n: CentreNotification, now: Date): "today" | "yesterday" | "earlier" {
  const t = new Date(n.createdAt).getTime();
  const today = startOfDay(now);
  const yest = today - 86_400_000;
  if (t >= today) return "today";
  if (t >= yest) return "yesterday";
  return "earlier";
}

export function NotificationsBell() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: qk.notifications.all,
    queryFn: () => listNotifications(),
    // Realtime pushes new rows in via invalidation below; this keeps the
    // popover reasonably fresh even if a realtime event is missed (e.g.
    // the tab was backgrounded when it fired).
    refetchInterval: 60_000,
  });

  useEffect(() => {
    return subscribeToNotifications((n) => {
      void qc.invalidateQueries({ queryKey: qk.notifications.all });
      void dispatchToChannels({
        tier: n.tier,
        title: n.title,
        body: n.body,
        linkPath: n.linkPath,
        entityType: n.entityType,
        entityId: n.entityId,
      });
    });
  }, [qc]);

  const [tab, setTab] = useState<BucketKey>("all");

  // Cheap enough to compute per render — a memo keyed on `items` just to
  // "refresh now() when data refreshes" isn't buying anything real here
  // and was tripping the exhaustive-deps lint (nothing in the callback
  // actually reads `items`).
  const now = new Date();
  const unreadItems = useMemo(() => items.filter((i) => !i.readAt), [items]);
  const unread = unreadItems.length;

  const filtered = useMemo(() => {
    switch (tab) {
      case "unread":
        return unreadItems;
      case "today":
        return items.filter((i) => bucketFor(i, now) === "today");
      case "yesterday":
        return items.filter((i) => bucketFor(i, now) === "yesterday");
      default:
        return items;
    }
  }, [items, now, unreadItems, tab]);

  const markAll = (): void => {
    const ids = unreadItems.map((i) => i.id);
    // Optimistic: flip local cache immediately, reconcile on the next
    // fetch/realtime event rather than waiting on a round trip.
    qc.setQueryData<CentreNotification[]>(qk.notifications.all, (prev) =>
      (prev ?? []).map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })),
    );
    void markAllNotificationsRead(ids);
  };

  const markOne = (id: string): void => {
    qc.setQueryData<CentreNotification[]>(qk.notifications.all, (prev) =>
      (prev ?? []).map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    void markNotificationRead(id);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-card"
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[380px] overflow-hidden p-0 border-border-default shadow-e3"
      >
        {/* Basalt header */}
        <div className="material-basalt stone-grain relative">
          <div className="relative z-10 flex items-center justify-between px-3.5 py-3">
            <div className="flex items-center gap-2">
              <Inbox className="h-3.5 w-3.5 text-text-on-material-muted" aria-hidden />
              <span className="font-display text-[13px] font-medium tracking-tight text-text-on-material">
                Notifications
              </span>
              {unread > 0 && (
                <span className="rounded-full bg-primary/25 px-1.5 py-px font-mono text-[10px] font-medium text-text-on-material">
                  {unread}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={markAll}
              disabled={unread === 0}
              className={cn(
                "flex items-center gap-1 rounded-sm px-1.5 py-1 text-[11px]",
                "text-text-on-material-muted transition-colors",
                "hover:bg-white/5 hover:text-text-on-material",
                "disabled:opacity-40 disabled:hover:bg-transparent",
              )}
            >
              <Check className="h-3 w-3" aria-hidden />
              Mark all read
            </button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as BucketKey)}>
          <TabsList className="h-9 w-full justify-start gap-0 rounded-none border-b border-border-subtle bg-surface-panel px-1">
            {(
              [
                { id: "all", label: "All" },
                { id: "unread", label: "Unread" },
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
              ] as const
            ).map((t) => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="h-8 rounded-sm px-2.5 text-[11px] data-[state=active]:bg-transparent data-[state=active]:text-text-primary data-[state=active]:shadow-none"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={tab} className="m-0">
            <div className="max-h-[420px] overflow-y-auto bg-surface-card">
              {filtered.length === 0 ? (
                <div className="px-3 py-12 text-center text-[13px] text-text-muted">
                  You&rsquo;re all caught up.
                </div>
              ) : (
                filtered.map((n) => (
                  <Link
                    key={n.id}
                    to={n.linkPath ?? "/dashboard"}
                    className="block border-b border-border-subtle px-3.5 py-3 transition-colors hover:bg-surface-card-hover"
                    onClick={() => markOne(n.id)}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        aria-hidden
                        className={cn(
                          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                          !n.readAt ? toneDot(TIER_TONE[n.tier]) : "bg-transparent",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            {n.tier === "critical" && (
                              <span
                                className={cn(
                                  "shrink-0 rounded-sm px-1 py-px font-mono text-[9px] font-semibold uppercase tracking-wider",
                                  "bg-status-danger-bg text-status-danger-fg",
                                )}
                              >
                                Critical
                              </span>
                            )}
                            <div className="truncate text-[13px] font-medium text-text-primary">
                              {n.title}
                            </div>
                          </div>
                          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-text-muted">
                            {formatRelative(n.createdAt)}
                          </span>
                        </div>
                        {n.body && (
                          <div className="line-clamp-2 text-[12px] text-text-secondary">
                            {n.body}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between border-t border-border-subtle bg-surface-panel px-3 py-2 text-[11px] text-text-muted">
          <span className="font-mono uppercase tracking-wider">Realtime</span>
          <Link to="/activity" className="text-text-link hover:underline">
            Activity feed
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
