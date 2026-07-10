import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Wallet,
  Receipt,
  Activity,
  FileCheck2,
  Truck,
  TrendingUp,
  Users,
  Building2,
  FileText,
  ShoppingCart,
  ClipboardCheck,
  Plus,
  CheckSquare,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toUserMessage } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import { getDashboardKpis } from "@/lib/dashboard/api";
import { listRecentActivity } from "@/lib/activity/api";
import { listTasks, updateTaskStatus } from "@/lib/tasks/api";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuthReady();
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.dashboard,
    queryFn: getDashboardKpis,
  });
  const activity = useQuery({
    queryKey: qk.activity.recent,
    queryFn: () => listRecentActivity(8),
  });
  const tasks = useQuery({
    queryKey: ["tasks", "dashboard", "pending"],
    queryFn: () => listTasks({ status: "pending" }),
  });

  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      updateTaskStatus(id, done ? "completed" : "pending"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const greeting = greetingFor(new Date());
  const name = displayName(user);

  if (isLoading) {
    return (
      <div>
        <PageHeader title={`${greeting}, ${name}`} subtitle="Here's what's happening today." />
        <LoadingBlock />
      </div>
    );
  }
  if (error) {
    return (
      <div>
        <PageHeader title={`${greeting}, ${name}`} subtitle="Here's what's happening today." />
        <ErrorBlock message={toUserMessage(error)} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={`${greeting}, ${name}`} subtitle="Here's what's happening today." />

      {/* Today's Overview */}
      <section className="mb-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Today's overview
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi
            title="Sales Today"
            value={"₹" + formatMoney(data?.salesTodayInr ?? 0)}
            icon={<TrendingUp className="h-4 w-4" />}
            to="/invoices"
            tone="ok"
          />
          <Kpi
            title="Collections"
            value={"₹" + formatMoney(data?.collectionsTodayInr ?? 0)}
            icon={<Receipt className="h-4 w-4" />}
            to="/payments"
            tone="primary"
          />
          <Kpi
            title="Pending Quotes"
            value={data?.pendingQuotes ?? 0}
            icon={<FileCheck2 className="h-4 w-4" />}
            to="/quotes"
            search={{ status: "sent" }}
            tone={data?.pendingQuotes ? "warn" : "muted"}
          />
          <Kpi
            title="Deliveries Today"
            value={data?.deliveriesToday ?? 0}
            icon={<Truck className="h-4 w-4" />}
            to="/dispatch"
            tone={data?.deliveriesToday ? "info" : "muted"}
          />
        </div>
      </section>

      {/* Tasks + Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckSquare className="h-4 w-4 text-primary" /> Today's tasks
            </CardTitle>
            <Link to="/tasks" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {tasks.isLoading ? (
              <ul className="space-y-1.5" aria-hidden>
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="h-8 animate-pulse rounded-sm bg-muted/60" />
                ))}
              </ul>
            ) : (tasks.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No open tasks. Nicely done.</p>
            ) : (
              <ul className="max-h-[280px] space-y-1 overflow-y-auto pr-1">
                {tasks.data!.slice(0, 8).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-start gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={t.status === "completed"}
                      onCheckedChange={(v) =>
                        toggle.mutate({ id: t.id, done: v === true })
                      }
                      aria-label={`Mark task ${t.title} complete`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{t.title}</div>
                      {t.due_at && (
                        <div className="text-xs text-muted-foreground">
                          Due{" "}
                          {new Date(t.due_at).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </div>
                      )}
                    </div>
                    {t.priority && t.priority !== "medium" && (
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] capitalize">
                        {t.priority}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-primary" /> Recent activity
            </CardTitle>
            <Link to="/activity" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
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
                {activity.data!.map((a) => (
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
        </Card>
      </div>

      {/* Quick Actions */}
      <section className="mt-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <QuickAction to="/customers" label="New Customer" icon={<Users className="h-4 w-4" />} />
          <QuickAction to="/quotes/new" label="New Quote" icon={<FileText className="h-4 w-4" />} />
          <QuickAction
            to="/sales-orders/new"
            label="New Sales Order"
            icon={<ShoppingCart className="h-4 w-4" />}
          />
          <QuickAction to="/invoices/new" label="New Invoice" icon={<Receipt className="h-4 w-4" />} />
          <QuickAction to="/payments/new" label="Receive Payment" icon={<Wallet className="h-4 w-4" />} />
          <QuickAction
            to="/purchase-orders/new"
            label="Purchase Order"
            icon={<ClipboardCheck className="h-4 w-4" />}
          />
        </div>
      </section>

      {/* Secondary KPIs */}
      <section className="mt-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pipeline & receivables
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi
            title="Today's Follow-ups"
            value={data?.todayFollowups ?? 0}
            icon={<CalendarClock className="h-4 w-4" />}
            to="/followups"
            search={{ scope: "today" }}
            tone={data?.todayFollowups ? "primary" : "muted"}
            compact
          />
          <Kpi
            title="Revenue Pipeline"
            value={"₹" + formatMoney(data?.revenuePipelineInr ?? 0)}
            icon={<TrendingUp className="h-4 w-4" />}
            to="/quotes"
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
            title="Active Customers"
            value={data?.customers ?? 0}
            icon={<Building2 className="h-4 w-4" />}
            to="/customers"
            tone="muted"
            compact
          />
        </div>
      </section>
    </div>
  );
}

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function displayName(user: { user_metadata?: Record<string, unknown>; email?: string | null } | null): string {
  if (!user) return "there";
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const full = (meta.full_name ?? meta.name) as string | undefined;
  if (full && typeof full === "string") return full.split(" ")[0];
  if (user.email) return user.email.split("@")[0];
  return "there";
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
  search,
  tone = "muted",
  compact = false,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  to: string;
  search?: Record<string, string>;
  tone?: Tone;
  compact?: boolean;
}) {
  return (
    <Link to={to} search={search as never} className="block">
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

function QuickAction({
  to,
  label,
  icon,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium transition-shadow hover:border-primary/40 hover:shadow-2"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Plus className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-muted-foreground group-hover:text-primary">{icon}</span>
    </Link>
  );
}
