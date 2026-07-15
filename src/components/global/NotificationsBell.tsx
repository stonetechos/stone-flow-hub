/**
 * Stone Tech OS — Notification centre.
 *
 * Presentation only. Groups notifications into Unread / Today / Yesterday
 * / Earlier tabs and follows STDL surface and text tokens. Realtime-ready:
 * the same setState surface can be swapped for a Supabase channel later.
 */
import { useMemo, useState } from "react";
import { Bell, Check, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MOCK_NOTIFICATIONS, type NotificationItem } from "@/lib/notifications/mock";
import { formatRelative } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type BucketKey = "all" | "unread" | "today" | "yesterday";

function startOfDay(d: Date): number {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}

function bucketFor(n: NotificationItem, now: Date): "today" | "yesterday" | "earlier" {
  const t = new Date(n.at).getTime();
  const today = startOfDay(now);
  const yest = today - 86_400_000;
  if (t >= today) return "today";
  if (t >= yest) return "yesterday";
  return "earlier";
}

export function NotificationsBell() {
  const [items, setItems] = useState<NotificationItem[]>([...MOCK_NOTIFICATIONS]);
  const [tab, setTab] = useState<BucketKey>("all");
  const unread = items.filter((i) => !i.read).length;

  const now = useMemo(() => new Date(), [items]);

  const filtered = useMemo(() => {
    switch (tab) {
      case "unread":
        return items.filter((i) => !i.read);
      case "today":
        return items.filter((i) => bucketFor(i, now) === "today");
      case "yesterday":
        return items.filter((i) => bucketFor(i, now) === "yesterday");
      default:
        return items;
    }
  }, [items, tab, now]);

  const markAll = (): void => setItems((xs) => xs.map((x) => ({ ...x, read: true })));
  const markOne = (id: string): void =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, read: true } : x)));

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
                    to={n.href ?? "/dashboard"}
                    className="block border-b border-border-subtle px-3.5 py-3 transition-colors hover:bg-surface-card-hover"
                    onClick={() => markOne(n.id)}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        aria-hidden
                        className={cn(
                          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                          !n.read ? "bg-intent-primary" : "bg-transparent",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-[13px] font-medium text-text-primary">
                            {n.title}
                          </div>
                          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-text-muted">
                            {formatRelative(n.at)}
                          </span>
                        </div>
                        <div className="line-clamp-2 text-[12px] text-text-secondary">
                          {n.body}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between border-t border-border-subtle bg-surface-panel px-3 py-2 text-[11px] text-text-muted">
          <span className="font-mono uppercase tracking-wider">Realtime · preview</span>
          <Link to="/activity" className="text-text-link hover:underline">
            Activity feed
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
