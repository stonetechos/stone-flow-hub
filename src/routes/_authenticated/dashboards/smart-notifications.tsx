/**
 * Smart Notifications — surfaces overdue follow-ups, quotation expiry,
 * delayed production/dispatch/installation, outstanding payments, lead
 * inactivity, vendor delays and upcoming site visits + installations.
 * Never executes actions automatically.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { toUserMessage } from "@/lib/errors";
import { getRiskSummary } from "@/lib/intelligence/risk";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Notice {
  key: string;
  category: string;
  severity: "info" | "warn" | "danger";
  title: string;
  detail: string;
  href: string;
  when?: string;
}

async function loadNotices(): Promise<Notice[]> {
  const risk = await getRiskSummary();
  const notices: Notice[] = risk.items.map((r) => ({
    key: `risk-${r.key}-${r.entityId}`,
    category: r.key.replace(/_/g, " "),
    severity: r.severity === "high" ? "danger" : r.severity === "medium" ? "warn" : "info",
    title: r.label,
    detail: r.reason,
    href: r.href,
  }));

  const now = Date.now();
  const in7 = new Date(now + 7 * 86_400_000).toISOString();
  const nowIso = new Date(now).toISOString();

  const [visits, installs] = await Promise.all([
    supabase.from("site_visits").select("id,project_id,scheduled_at,status").gte("scheduled_at", nowIso).lte("scheduled_at", in7).limit(50),
    supabase.from("installations").select("id,installation_no,planned_start_date,status").gte("planned_start_date", nowIso).lte("planned_start_date", in7).limit(50),
  ]);
  for (const v of visits.data ?? []) {
    if (v.status === "completed" || v.status === "cancelled") continue;
    if (!v.scheduled_at) continue;
    notices.push({
      key: `sv-${v.id}`, category: "upcoming site visit", severity: "info",
      title: "Upcoming site visit", detail: `Scheduled ${new Date(v.scheduled_at).toLocaleString()}`,
      href: v.project_id ? `/projects/${v.project_id}` : "/enquiries",
      when: v.scheduled_at,
    });
  }
  for (const i of installs.data ?? []) {
    if (i.status === "completed" || i.status === "cancelled") continue;
    notices.push({
      key: `ins-${i.id}`, category: "upcoming installation", severity: "info",
      title: `Upcoming installation ${i.installation_no ?? ""}`.trim(),
      detail: `Starts ${new Date(i.planned_start_date!).toLocaleDateString()}`,
      href: `/installations/${i.id}`,
      when: i.planned_start_date ?? undefined,
    });
  }
  return notices;
}

export const Route = createFileRoute("/_authenticated/dashboards/smart-notifications")({
  ssr: false,
  component: SmartNotifications,
});

function SmartNotifications() {
  const q = useQuery({ queryKey: ["intel", "smart-notifications"], queryFn: loadNotices, staleTime: 60_000 });
  if (q.isLoading) return <><PageHeader title="Smart Notifications" /><LoadingBlock /></>;
  if (q.error) return <><PageHeader title="Smart Notifications" /><ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} /></>;

  const notices = q.data ?? [];
  const groups = new Map<string, Notice[]>();
  for (const n of notices) {
    const key = n.category;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  }

  return (
    <div>
      <PageHeader title="Smart Notifications" subtitle="System-generated alerts. Nothing executes automatically — every action requires user confirmation." />
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from(groups.entries()).map(([cat, list]) => (
          <Card key={cat}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 capitalize"><Bell className="h-4 w-4" /> {cat} <span className="text-xs text-muted-foreground">({list.length})</span></CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {list.slice(0, 15).map((n) => (
                <Link key={n.key} to={n.href} className="flex items-start justify-between gap-2 rounded-md p-2 text-xs hover:bg-muted/60">
                  <div>
                    <div className="font-medium">{n.title}</div>
                    <div className="text-muted-foreground">{n.detail}</div>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] uppercase",
                    n.severity === "danger" ? "border-red-500/40 text-red-600" :
                    n.severity === "warn" ? "border-amber-500/40 text-amber-600" : "border-sky-500/40 text-sky-600"
                  )}>{n.severity}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
        {notices.length === 0 && <div className="text-sm text-muted-foreground">All clear.</div>}
      </div>
    </div>
  );
}
