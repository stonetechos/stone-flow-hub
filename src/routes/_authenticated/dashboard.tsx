import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Wallet,
  Receipt,
  FileCheck2,
  Truck,
  TrendingUp,
  Users,
  Building2,
  FileText,
  ShoppingCart,
  ClipboardCheck,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Plus,
  ListChecks,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Stat, StatRow } from "@/components/layout/Stat";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toUserMessage } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import { getDashboardKpis } from "@/lib/dashboard/api";
import { listRecentActivity } from "@/lib/activity/api";
import { listTasks, updateTaskStatus, type TaskRow } from "@/lib/tasks/api";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuthReady();
  const qc = useQueryClient();

  const kpisQ = useQuery({ queryKey: qk.dashboard, queryFn: getDashboardKpis });
  const activityQ = useQuery({
    queryKey: qk.activity.recent,
    queryFn: () => listRecentActivity(8),
  });
  const tasksQ = useQuery({
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
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const insight = useMemo(() => buildInsight(kpisQ.data, tasksQ.data ?? []), [
    kpisQ.data,
    tasksQ.data,
  ]);

  if (kpisQ.isLoading) {
    return (
      <div>
        <PageHeader title={`${greeting}, ${name}.`} subtitle={today} />
        <LoadingBlock />
      </div>
    );
  }
  if (kpisQ.error) {
    return (
      <div>
        <PageHeader title={`${greeting}, ${name}.`} subtitle={today} />
        <ErrorBlock message={toUserMessage(kpisQ.error)} onRetry={() => kpisQ.refetch()} />
      </div>
    );
  }

  const data = kpisQ.data!;
  const tasks = tasksQ.data ?? [];
  const tasksDue = tasks.length;

  return (
    <div className="space-y-10">
      {/* 1. Greeting */}
      <header>
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {today}
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {greeting}, {name}.
        </h1>
        {insight && (
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            {insight}
          </p>
        )}
      </header>

      {/* 2. Today's Overview */}
      <section>
        <SectionHeader title="Today's overview" />
        <StatRow>
          <Stat
            label="Sales today"
            value={"₹" + formatMoney(data.salesTodayInr)}
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            to="/invoices"
          />
          <Stat
            label="Collections"
            value={"₹" + formatMoney(data.collectionsTodayInr)}
            icon={<Receipt className="h-3.5 w-3.5" />}
            to="/payments"
          />
          <Stat
            label="Pending quotes"
            value={data.pendingQuotes}
            icon={<FileCheck2 className="h-3.5 w-3.5" />}
            to="/quotes"
            search={{ status: "sent" }}
            tone={data.pendingQuotes ? "warning" : "default"}
          />
          <Stat
            label="Pending sales orders"
            value={data.ordersToStart}
            icon={<ShoppingCart className="h-3.5 w-3.5" />}
            to="/sales-orders"
            tone={data.ordersToStart ? "primary" : "default"}
          />
          <Stat
            label="Outstanding"
            value={"₹" + formatMoney(data.outstandingInr)}
            icon={<Wallet className="h-3.5 w-3.5" />}
            to="/invoices"
            tone={data.outstandingInr > 0 ? "warning" : "default"}
          />
          <Stat
            label="Tasks due"
            value={tasksDue}
            icon={<CheckSquare className="h-3.5 w-3.5" />}
            to="/tasks"
            tone={tasksDue ? "primary" : "default"}
          />
        </StatRow>
      </section>

      {/* 3 + 4. My Work Today | Recent Activity */}
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div>
          <SectionHeader
            title="My work today"
            actions={
              <Link
                to="/tasks"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                View all
              </Link>
            }
          />
          <TaskChecklist
            tasks={tasks}
            loading={tasksQ.isLoading}
            onToggle={(id, done) => toggle.mutate({ id, done })}
          />
        </div>

        <div>
          <SectionHeader
            title="Recent activity"
            actions={
              <Link
                to="/activity"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                View all
              </Link>
            }
          />
          <ActivityTimeline
            items={activityQ.data ?? []}
            loading={activityQ.isLoading}
          />
        </div>
      </section>

      {/* 5. Quick Actions */}
      <section>
        <SectionHeader title="Quick actions" />
        <div className="flex flex-wrap gap-1.5">
          <QuickAction to="/customers" label="New customer" />
          <QuickAction to="/quotes/new" label="New quote" />
          <QuickAction to="/sales-orders/new" label="New sales order" />
          <QuickAction to="/invoices/new" label="New invoice" />
          <QuickAction to="/payments/new" label="Receive payment" />
          <QuickAction to="/purchase-orders/new" label="Purchase order" />
        </div>
      </section>

      {/* 6. Business insights */}
      <section>
        <SectionHeader
          title="Business insights"
          description="Deeper metrics, tucked away until you need them."
        />
        <div className="divide-y divide-border rounded-md border border-border/70 bg-card/40">
          <InsightGroup title="Pipeline & receivables" defaultOpen={false}>
            <StatRow className="p-4">
              <Stat
                label="Today's follow-ups"
                value={data.todayFollowups}
                icon={<CalendarClock className="h-3.5 w-3.5" />}
                to="/followups"
                search={{ scope: "today" }}
                tone={data.todayFollowups ? "primary" : "default"}
              />
              <Stat
                label="Overdue follow-ups"
                value={data.overdueFollowups}
                icon={<CalendarClock className="h-3.5 w-3.5" />}
                to="/followups"
                tone={data.overdueFollowups ? "danger" : "default"}
              />
              <Stat
                label="Revenue pipeline"
                value={"₹" + formatMoney(data.revenuePipelineInr)}
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                to="/quotes"
              />
              <Stat
                label="Payments (MTD)"
                value={"₹" + formatMoney(data.paymentsThisMonthInr)}
                icon={<Wallet className="h-3.5 w-3.5" />}
                to="/payments"
              />
              <Stat
                label="Deliveries today"
                value={data.deliveriesToday}
                icon={<Truck className="h-3.5 w-3.5" />}
                to="/dispatch"
              />
              <Stat
                label="Active customers"
                value={data.customers}
                icon={<Building2 className="h-3.5 w-3.5" />}
                to="/customers"
              />
            </StatRow>
          </InsightGroup>
          <InsightGroup title="Sales analytics" defaultOpen={false}>
            <EmptyInsight
              icon={<TrendingUp className="h-4 w-4" />}
              label="Detailed sales analytics arrive with the Business Foundation release."
            />
          </InsightGroup>
          <InsightGroup title="Inventory" defaultOpen={false}>
            <EmptyInsight
              icon={<ClipboardCheck className="h-4 w-4" />}
              label="Inventory intelligence will appear here."
            />
          </InsightGroup>
          <InsightGroup title="Finance" defaultOpen={false}>
            <EmptyInsight
              icon={<Wallet className="h-4 w-4" />}
              label="GST, receivables ageing and cashflow join here in v0.9."
            />
          </InsightGroup>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------ subcomponents ----------------------------- */

function TaskChecklist({
  tasks,
  loading,
  onToggle,
}: {
  tasks: TaskRow[];
  loading: boolean;
  onToggle: (id: string, done: boolean) => void;
}) {
  if (loading) {
    return (
      <ul className="space-y-2" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="h-9 animate-pulse rounded-sm bg-muted/50" />
        ))}
      </ul>
    );
  }
  if (tasks.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
        <ListChecks className="h-4 w-4 opacity-60" />
        You're all caught up. Nothing pending for today.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border/70">
      {tasks.slice(0, 8).map((t) => (
        <li
          key={t.id}
          className="group flex items-start gap-3 py-2.5"
        >
          <Checkbox
            className="mt-0.5"
            checked={t.status === "completed"}
            onCheckedChange={(v) => onToggle(t.id, v === true)}
            aria-label={`Mark task ${t.title} complete`}
          />
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "truncate text-sm",
                t.status === "completed"
                  ? "text-muted-foreground line-through"
                  : "text-foreground",
              )}
            >
              {t.title}
            </div>
            {t.due_at && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                Due {new Date(t.due_at).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
            )}
          </div>
          {t.priority && t.priority !== "medium" && (
            <PriorityDot priority={t.priority} />
          )}
          <Link
            to="/tasks"
            className="opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="Open in tasks"
          >
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const cls =
    priority === "urgent"
      ? "bg-destructive"
      : priority === "high"
      ? "bg-warning"
      : "bg-muted-foreground/40";
  return (
    <span className="mt-1.5 flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
      <span className={cn("h-1.5 w-1.5 rounded-full", cls)} aria-hidden />
      {priority}
    </span>
  );
}

function ActivityTimeline({
  items,
  loading,
}: {
  items: Array<{
    id: string | number;
    action: string;
    summary: string | null;
    entity_type: string | null;
    actor_name?: string | null;
    created_at: string;
  }>;
  loading: boolean;
}) {
  if (loading) {
    return (
      <ul className="space-y-3" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="h-8 animate-pulse rounded-sm bg-muted/50" />
        ))}
      </ul>
    );
  }
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
        No activity yet.
      </div>
    );
  }
  return (
    <ol className="relative border-l border-border/70 pl-4">
      {items.map((a) => (
        <li key={a.id} className="relative py-2 first:pt-0 last:pb-0">
          <span
            aria-hidden
            className="absolute -left-[19px] top-3 h-1.5 w-1.5 rounded-full bg-primary/60 ring-4 ring-background"
          />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 text-sm">
              <span className="text-foreground">
                {a.actor_name ?? "Someone"}
              </span>{" "}
              <span className="text-muted-foreground">
                {humanizeAction(a.action)}
              </span>{" "}
              {a.summary && (
                <span className="text-foreground">{a.summary}</span>
              )}
              {!a.summary && a.entity_type && (
                <span className="text-muted-foreground">
                  a {a.entity_type.replace(/_/g, " ")}
                </span>
              )}
            </div>
            <time className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {formatRelative(a.created_at)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}

function humanizeAction(a: string): string {
  return a.replace(/_/g, " ");
}

function QuickAction({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-primary/40 hover:text-foreground"
    >
      <Plus className="h-3 w-3 text-muted-foreground" />
      {label}
    </Link>
  );
}

function InsightGroup({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-foreground/90 hover:bg-muted/40">
        <span className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {title}
        </span>
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
          {open ? "Hide" : "Show"}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}

function EmptyInsight({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-6 text-sm text-muted-foreground">
      <span className="opacity-60">{icon}</span>
      {label}
    </div>
  );
}

/* --------------------------------- helpers -------------------------------- */

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function displayName(
  user: { user_metadata?: Record<string, unknown>; email?: string | null } | null,
): string {
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

function buildInsight(
  k: Awaited<ReturnType<typeof getDashboardKpis>> | undefined,
  tasks: TaskRow[],
): string | null {
  if (!k) return null;
  const parts: string[] = [];
  if (k.pendingQuotes)
    parts.push(
      `${k.pendingQuotes} pending quotation${k.pendingQuotes === 1 ? "" : "s"}`,
    );
  if (k.outstandingInr > 0)
    parts.push(`₹${formatMoney(k.outstandingInr)} awaiting collection`);
  if (k.overdueFollowups)
    parts.push(
      `${k.overdueFollowups} overdue follow-up${
        k.overdueFollowups === 1 ? "" : "s"
      }`,
    );
  if (tasks.length && parts.length < 2)
    parts.push(`${tasks.length} task${tasks.length === 1 ? "" : "s"} on your list`);
  if (parts.length === 0)
    return "You're clear for now. A calm morning is a great time to plan ahead.";
  if (parts.length === 1) return `You have ${parts[0]}.`;
  const last = parts.pop();
  return `You have ${parts.join(", ")} and ${last}.`;
}
