import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { mockNotifications } from "@/lib/notifications/mock";
import { formatRelative } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/notifications")({
  ssr: false,
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Notifications" subtitle="Realtime alerts across the ERP. Delivery channels are configured in Settings." />
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {mockNotifications.map((n) => (
              <li key={n.id} className="flex items-start gap-3 px-4 py-3">
                <Bell className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{n.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{n.body}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!n.read ? <Badge className="text-[10px]">New</Badge> : null}
                  <span className="text-xs text-muted-foreground">{formatRelative(n.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
