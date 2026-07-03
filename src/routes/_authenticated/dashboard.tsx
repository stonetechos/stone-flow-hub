import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  Send,
  CalendarClock,
  Users,
  ArrowRight,
  Wallet,
  Receipt,
  Activity,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toUserMessage } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import { getDashboardKpis } from "@/lib/dashboard/api";
import { listRecentActivity } from "@/lib/activity/api";
import { listFollowups } from "@/lib/followups/api";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.dashboard,
    queryFn: getDashboardKpis,
  });
  const activity = useQuery({
    queryKey: qk.activity.recent,
    queryFn: () => listRecentActivity(10),
  });
  const todayFu = useQuery({
    queryKey: qk.followups.scope("today"),
    queryFn: () => listFollowups("today"),
  });

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Today's action items across your pipeline." />

      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={toUserMessage(error)} onRetry={() => refetch()} />
      ) : (
        <>
          {/* Operational panels first — what needs attention today. */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="shadow-1">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CalendarClock className="h-4 w-4 text-primary" /> Today's follow-ups
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayFu.isLoading ? (
                  <ul className="space-y-2" aria-hidden>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <li
                        key={i}
                        className="h-9 animate-pulse rounded-sm bg-muted/60"
                      />
                    ))}
                  </ul>
                ) : (todayFu.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nothing due today. Enjoy the calm.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {todayFu.data!.slice(0, 6).map((f) => (
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

            <Card className="shadow-1">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-primary" /> Recent activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activity.isLoading ? (
                  <ul className="space-y-2" aria-hidden>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <li
                        key={i}
                        className="h-8 animate-pulse rounded-sm bg-muted/60"
                      />
                    ))}
                  </ul>
                ) : (activity.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {activity.data!.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between rounded-sm px-2 py-1.5 text-sm"
                      >
                        <span className="truncate">
                          <Badge variant="outline" className="mr-2 capitalize">
                            {a.action.replace("_", " ")}
                          </Badge>
                          <span className="text-muted-foreground">
                            {a.summary ?? a.entity_type}
                          </span>
                        </span>
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
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
            </Card>
          </div>

          {/* Pipeline stats — supporting context, ranked below actionable panels. */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi
              title="Active Enquiries"
              value={data?.activeEnquiries ?? 0}
              icon={<ClipboardList className="h-5 w-5" />}
              to="/enquiries"
            />
            <Kpi
              title="Pending RFQs"
              value={data?.pendingRfqs ?? 0}
              icon={<Send className="h-5 w-5" />}
              to="/enquiries"
            />
            <Kpi
              title="Today's Follow-ups"
              value={data?.todayFollowups ?? 0}
              icon={<CalendarClock className="h-5 w-5" />}
              to="/followups"
            />
            <Kpi
              title="Outstanding (₹)"
              value={formatMoney(data?.outstandingInr ?? 0)}
              icon={<Wallet className="h-5 w-5" />}
              to="/invoices"
            />
            <Kpi
              title="Collected This Month (₹)"
              value={formatMoney(data?.paymentsThisMonthInr ?? 0)}
              icon={<Receipt className="h-5 w-5" />}
              to="/invoices"
            />
            <Kpi
              title="Active Customers"
              value={data?.customers ?? 0}
              icon={<Users className="h-5 w-5" />}
              to="/customers"
            />
          </div>
        </>
      )}
    </div>
  );
}


function formatMoney(n: number): string {
  if (n >= 1_00_00_000) return (n / 1_00_00_000).toFixed(1) + " Cr";
  if (n >= 1_00_000) return (n / 1_00_000).toFixed(1) + " L";
  return n.toLocaleString("en-IN");
}

function Kpi({
  title,
  value,
  icon,
  to,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  to: string;
}) {
  return (
    <Link to={to} className="block">
      <Card className="shadow-1 transition-shadow hover:shadow-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </CardTitle>
          <div className="text-primary">{icon}</div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div className="font-display text-3xl font-bold text-foreground">{value}</div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
