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
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="text-sm font-medium">Notifications</div>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={markAll}>
            Mark all read
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              You're all caught up.
            </div>
          ) : (
            items.map((n) => (
              <Link
                key={n.id}
                to={n.href ?? "/dashboard"}
                className="block border-b border-border/60 px-3 py-2 hover:bg-muted"
                onClick={() =>
                  setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
                }
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-medium">{n.title}</div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatRelative(n.at)}
                      </span>
                    </div>
                    <div className="line-clamp-2 text-xs text-muted-foreground">{n.body}</div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
        <div className="border-t border-border px-3 py-2 text-right">
          <Badge variant="secondary" className="text-[10px]">
            Preview — no backend yet
          </Badge>
        </div>
      </PopoverContent>
    </Popover>
  );
}
