/** Notification bell with placeholder feed. UI only — no backend logic. */
import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { MOCK_NOTIFICATIONS, type NotificationItem } from "@/lib/notifications/mock";
import { formatRelative } from "@/lib/format";
import { Link } from "@tanstack/react-router";

export function NotificationsBell() {
  const [items, setItems] = useState<NotificationItem[]>([...MOCK_NOTIFICATIONS]);
  const unread = items.filter((i) => !i.read).length;

  const markAll = (): void => setItems((xs) => xs.map((x) => ({ ...x, read: true })));

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
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">Notifications</div>
            {unread > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-medium text-primary">
                {unread} new
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={markAll}
          >
            Mark all read
          </Button>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              You're all caught up.
            </div>
          ) : (
            items.map((n) => (
              <Link
                key={n.id}
                to={n.href ?? "/dashboard"}
                className="block border-b border-border/50 px-3 py-2.5 transition-colors hover:bg-muted/60"
                onClick={() =>
                  setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
                }
              >
                <div className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className={
                      !n.read
                        ? "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                        : "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-transparent"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-[13px] font-medium">{n.title}</div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatRelative(n.at)}
                      </span>
                    </div>
                    <div className="line-clamp-2 text-[12px] text-muted-foreground">{n.body}</div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <Badge variant="secondary" className="text-[10px]">
            Preview
          </Badge>
          <span className="text-[11px] text-muted-foreground">Automation coming soon</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
