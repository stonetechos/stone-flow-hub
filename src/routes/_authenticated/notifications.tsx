import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import {
  listNotifications,
  markNotificationRead,
  subscribeToNotifications,
  type CentreNotification,
} from "@/lib/notifications/centre";
import { TIER_LABEL, TIER_TONE } from "@/lib/notifications/tiers";
import { toneSurface } from "@/lib/ui/tones";
import { qk } from "@/lib/query-keys";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  ssr: false,
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: qk.notifications.all,
    queryFn: () => listNotifications(200),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    return subscribeToNotifications(() => {
      void qc.invalidateQueries({ queryKey: qk.notifications.all });
    });
  }, [qc]);

  const markOne = (n: CentreNotification): void => {
    if (n.readAt) return;
    qc.setQueryData<CentreNotification[]>(qk.notifications.all, (prev) =>
      (prev ?? []).map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)),
    );
    void markNotificationRead(n.id);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        subtitle="Realtime alerts across the ERP — Information, Important, and Critical. Delivery channels are configured in Settings."
      />
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              You&rsquo;re all caught up.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li
                  key={n.id}
                  onClick={() => markOne(n)}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 px-4 py-3",
                    !n.readAt && "bg-muted/30",
                  )}
                >
                  <Bell className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-wider",
                          toneSurface(TIER_TONE[n.tier]),
                        )}
                      >
                        {TIER_LABEL[n.tier]}
                      </span>
                      <div className="truncate text-sm font-medium">{n.title}</div>
                    </div>
                    {n.body && (
                      <div className="truncate text-xs text-muted-foreground">{n.body}</div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!n.readAt ? <Badge className="text-[10px]">New</Badge> : null}
                    <span className="text-xs text-muted-foreground">
                      {formatRelative(n.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
