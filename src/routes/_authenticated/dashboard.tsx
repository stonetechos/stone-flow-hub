import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ClipboardList,
  Send,
  CalendarClock,
  Users,
  Wallet,
  Receipt,
  Activity,
  AlertTriangle,
  FileCheck2,
  Factory,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toUserMessage } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import { getDashboardKpis } from "@/lib/dashboard/api";
import { listRecentActivity } from "@/lib/activity/api";
import { listFollowups } from "@/lib/followups/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: DashboardPage,
});

const ACTIVITY_COLLAPSED_KEY = "st.dashboard.activity.collapsed";

function DashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.dashboard,
    queryFn: getDashboardKpis,
  });
  const activity = useQuery({
    queryKey: qk.activity.recent,
    queryFn: () => listRecentActivity(20),
  });
  const todayFu = useQuery({
    queryKey: qk.followups.scope("today"),
    queryFn: () => listFollowups("today"),
  });

  const [activityCollapsed, setActivityCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(ACTIVITY_COLLAPSED_KEY) === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACTIVITY_COLLAPSED_KEY, activityCollapsed ? "1" : "0");
  }, [activityCollapsed]);

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="What requires your attention today." />
        <LoadingBlock />
      </div>
    );
  }
  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="What requires your attention today." />
        <ErrorBlock message={toUserMessage(error)} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="What requires your attention today." />

      {/* Priority KPI grid — fits above the fold on 1440×900+. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi
          title="Today's Follow-ups"
          value={data?.todayFollowups ?? 0}
          icon={<CalendarClock className="h-4 w-4" />}
          to="/followups"
          search={{ scope: "today" }}
          tone={data?.todayFollowups ? "primary" : "muted"}
        />
        <Kpi
          title="Overdue Follow-ups"
          value={data?.overdueFollowups ?? 0}
          icon={<AlertTriangle className="h-4 w-4" />}
          to="/followups"
          search={{ scope: "pending" }}
          tone={data?.overdueFollowups ? "danger" : "muted"}
        />
        <Kpi
          title="Pending RFQs"
          value={data?.pendingRfqs ?? 0}
          icon={<Send className="h-4 w-4" />}
          to="/enquiries"
          tone="info"
        />
        <Kpi
          title="Quotes Awaiting"
          value={data?.quotesAwaitingApproval ?? 0}
          icon={<FileCheck2 className="h-4 w-4" />}
          to="/quotes"
          search={{ status: "sent" }}
          tone="warn"
        />
        <Kpi
          title="Orders To Start"
          value={data?.ordersToStart ?? 0}
          icon={<Factory className="h-4 w-4" />}
          to="/sales-orders"
          search={{ status: "confirmed" }}
          tone="info"
        />
        <Kpi
          title="Revenue Pipeline"
          value={"₹" + formatMoney(data?.revenuePipelineInr ?? 0)}
          icon={<TrendingUp className="h-4 w-4" />}
          to="/quotes"
          search={{ status: "sent" }}
          tone="ok"
        />

      </div>

      {/* Secondary KPIs — money & pipeline health. */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi
          title="Active Enquiries"
          value={data?.activeEnquiries ?? 0}
          icon={<ClipboardList className="h-4 w-4" />}
          to="/enquiries"
          tone="muted"
          compact
        />
        <Kpi
          title="Outstanding"
          value={"₹" + formatMoney(data?.outstandingInr ?? 0)}
          icon={<Wallet className="h-4 w-4" />}
          to="/invoices"
          tone="muted"
          compact
        />
        <Kpi
          title="Collected (Month)"
          value={"₹" + formatMoney(data?.paymentsThisMonthInr ?? 0)}
          icon={<Receipt className="h-4 w-4" />}
          to="/payments"
          tone="muted"
          compact
        />
        <Kpi
          title="Active Customers"
          value={data?.customers ?? 0}
          icon={<Users className="h-4 w-4" />}
          to="/customers"
          tone="muted"
          compact
        />
      </div>

      {/* Today's follow-ups — actionable panel. */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-1">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4 text-primary" /> Today's follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {todayFu.isLoading ? (
              <ul className="space-y-1.5" aria-hidden>
                {Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="h-8 animate-pulse rounded-sm bg-muted/60" />
                ))}
              </ul>
            ) : (todayFu.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing due today. Enjoy the calm.</p>
            ) : (
              <ul className="max-h-[280px] space-y-1 overflow-y-auto pr-1">
                {todayFu.data!.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {f.enquiry?.customer?.name ?? "—"} ·{" "}
                        <span className="font-mono text-xs text-muted-foreground">
                          {f.enquiry?.enquiry_no ?? "—"}
                        </span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {new Date(f.scheduled_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {f.channel.replace("_", " ")}
                      </div>
                    </div>
                    <Link to="/followups" className="text-xs text-primary hover:underline">
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent activity — collapsible with capped height. */}
        <Card className="shadow-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-primary" /> Recent activity
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setActivityCollapsed((c) => !c)}
              aria-expanded={!activityCollapsed}
            >
              {activityCollapsed ? (
                <>
                  Show <ChevronDown className="ml-1 h-3 w-3" />
                </>
              ) : (
                <>
                  Hide <ChevronUp className="ml-1 h-3 w-3" />
                </>
              )}
            </Button>
          </CardHeader>
          {!activityCollapsed && (
            <CardContent className="pt-0">
              {activity.isLoading ? (
                <ul className="space-y-1.5" aria-hidden>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <li key={i} className="h-7 animate-pulse rounded-sm bg-muted/60" />
                  ))}
                </ul>
              ) : (activity.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="max-h-[280px] space-y-1 overflow-y-auto pr-1">
                  {activity.data!.slice(0, 20).map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-2 rounded-sm px-2 py-1 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        <Badge variant="outline" className="mr-2 h-4 px-1 text-[10px] capitalize">
                          {a.action.replace("_", " ")}
                        </Badge>
                        <span className="text-muted-foreground">
                          {a.summary ?? a.entity_type}
                        </span>
                      </span>
                      <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                        {new Date(a.created_at).toLocaleString("en-IN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

function formatMoney(n: number): string {
  if (n >= 1_00_00_000) return (n / 1_00_00_000).toFixed(1) + " Cr";
  if (n >= 1_00_000) return (n / 1_00_000).toFixed(1) + " L";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("en-IN");
}

type Tone = "primary" | "danger" | "warn" | "info" | "ok" | "muted";
function toneClass(tone: Tone): string {
  switch (tone) {
    case "primary":
      return "border-primary/40 bg-primary/5";
    case "danger":
      return "border-destructive/40 bg-destructive/5";
    case "warn":
      return "border-warning/40 bg-warning/5";
    case "ok":
      return "border-success/40 bg-success/5";
    case "info":
      return "border-primary/20 bg-card";
    default:
      return "border-border bg-card";
  }
}

function Kpi({
  title,
  value,
  icon,
  to,
  tone = "muted",
  compact = false,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  to: string;
  tone?: Tone;
  compact?: boolean;
}) {
  return (
    <Link to={to} className="block">
      <div
        className={cn(
          "rounded-lg border px-3 py-2.5 transition-shadow hover:shadow-2",
          toneClass(tone),
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </div>
          <div className="shrink-0 text-primary">{icon}</div>
        </div>
        <div
          className={cn(
            "mt-0.5 truncate font-display font-bold text-foreground",
            compact ? "text-lg" : "text-2xl",
          )}
        >
          {value}
        </div>
      </div>
    </Link>
  );
}
