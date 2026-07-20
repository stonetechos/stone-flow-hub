/**
 * Smart Notifications — surfaces overdue follow-ups, quotation expiry,
 * delayed production/dispatch/installation, outstanding payments, lead
 * inactivity, vendor delays, margin/customer/repeat-business signals and
 * upcoming site visits + installations. Never executes actions
 * automatically.
 *
 * Phase G.8.8: the risk-derived notices used to come from
 * `getRiskSummary()` (a private, 7-rule engine only this file and 2
 * others ever saw). They now come from the same Insight Provider
 * registry every other Intelligence surface reads — Copilot,
 * EntityInsightPanel, DangerNotifications — via `useExecutiveInsights()`.
 * This is a genuine capability increase, not just a refactor: Smart
 * Notifications now sees all 24 registered providers (margin watch,
 * customer lifetime value, repeat business, etc.), not just the 7 rules
 * risk.ts used to compute. Filtered to danger/warning tones only, to
 * keep this page's original "alerts, not opportunities" scope — the same
 * filter DangerNotifications and daily-action apply for their own
 * purposes.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { toUserMessage } from "@/lib/errors";
import { useExecutiveInsights } from "@/hooks/useExecutiveInsights";
import { resolveTone } from "@/lib/ui/tones";
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

interface UpcomingRow {
  id: string;
  project_id: string | null;
  scheduled_at: string | null;
  status: string;
}
interface UpcomingInstallRow {
  id: string;
  installation_no: string | null;
  planned_start_date: string | null;
  status: string;
}

async function loadUpcomingNotices(): Promise<Notice[]> {
  const now = Date.now();
  const in7 = new Date(now + 7 * 86_400_000).toISOString();
  const nowIso = new Date(now).toISOString();

  const [visits, installs] = await Promise.all([
    supabase
      .from("site_visits")
      .select("id,project_id,scheduled_at,status")
      .gte("scheduled_at", nowIso)
      .lte("scheduled_at", in7)
      .limit(50),
    supabase
      .from("installations")
      .select("id,installation_no,planned_start_date,status")
      .gte("planned_start_date", nowIso)
      .lte("planned_start_date", in7)
      .limit(50),
  ]);
  const notices: Notice[] = [];
  for (const v of (visits.data ?? []) as UpcomingRow[]) {
    if (v.status === "completed" || v.status === "cancelled") continue;
    if (!v.scheduled_at) continue;
    notices.push({
      key: `sv-${v.id}`,
      category: "upcoming site visit",
      severity: "info",
      title: "Upcoming site visit",
      detail: `Scheduled ${new Date(v.scheduled_at).toLocaleString()}`,
      href: v.project_id ? `/projects/${v.project_id}` : "/enquiries",
      when: v.scheduled_at,
    });
  }
  for (const i of (installs.data ?? []) as UpcomingInstallRow[]) {
    if (i.status === "completed" || i.status === "cancelled") continue;
    notices.push({
      key: `ins-${i.id}`,
      category: "upcoming installation",
      severity: "info",
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
  const q = useQuery({
    queryKey: ["intel", "smart-notifications", "upcoming"],
    queryFn: loadUpcomingNotices,
    staleTime: 60_000,
  });
  const { processedInsights, loading: insightsLoading } = useExecutiveInsights();

  if (q.isLoading || insightsLoading)
    return (
      <>
        <PageHeader title="Smart Notifications" />
        <LoadingBlock />
      </>
    );
  if (q.error)
    return (
      <>
        <PageHeader title="Smart Notifications" />
        <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />
      </>
    );

  const riskNotices: Notice[] = processedInsights
    .filter((i) => {
      const tone = resolveTone(i.tone);
      return tone === "danger" || tone === "warning";
    })
    .map((i) => ({
      key: `insight-${i.source}-${i.id}`,
      category: i.module.toLowerCase(),
      severity: resolveTone(i.tone) === "danger" ? "danger" : "warn",
      title: i.title,
      detail: i.why,
      href: i.action.href,
    }));

  const notices = [...riskNotices, ...(q.data ?? [])];
  const groups = new Map<string, Notice[]>();
  for (const n of notices) {
    const key = n.category;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  }

  return (
    <div>
      <PageHeader
        title="Smart Notifications"
        subtitle="System-generated alerts. Nothing executes automatically — every action requires user confirmation."
      />
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from(groups.entries()).map(([cat, list]) => (
          <Card key={cat}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 capitalize">
                <Bell className="h-4 w-4" /> {cat}{" "}
                <span className="text-xs text-muted-foreground">({list.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {list.slice(0, 15).map((n) => (
                <Link
                  key={n.key}
                  to={n.href}
                  className="flex items-start justify-between gap-2 rounded-md p-2 text-xs hover:bg-muted/60"
                >
                  <div>
                    <div className="font-medium">{n.title}</div>
                    <div className="text-muted-foreground">{n.detail}</div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] uppercase",
                      n.severity === "danger"
                        ? "border-status-danger-border text-status-danger-fg"
                        : n.severity === "warn"
                          ? "border-status-warning-border text-status-warning-fg"
                          : "border-status-info-border text-status-info-fg",
                    )}
                  >
                    {n.severity}
                  </Badge>
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
