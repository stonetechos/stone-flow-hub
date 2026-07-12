/**
 * Stone Tech OS — Executive Command Centre
 *
 * The operating cockpit for the owner. Answers five questions above the fold:
 *   1. What needs my attention?
 *   2. What is making money?
 *   3. What is at risk?
 *   4. What should I approve today?
 *   5. How healthy is the business?
 *
 * Presentation-only redesign of `/dashboard`. All numbers come from the
 * existing dashboard KPIs, tasks, activity and follow-ups APIs — no new
 * queries, no schema changes.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Building2,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  ClipboardCheck,
  Factory,
  FileText,
  Flame,
  LineChart,
  Package,
  Plus,
  Receipt,
  Sparkles,
  Timer,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Checkbox } from "@/components/ui/checkbox";
import { toUserMessage } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import { getDashboardKpis, type DashboardKpis } from "@/lib/dashboard/api";
import { listRecentActivity } from "@/lib/activity/api";
import { listTasks, updateTaskStatus, type TaskRow } from "@/lib/tasks/api";
import { listFollowups, type FollowupWithEnquiry } from "@/lib/followups/api";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: DashboardPage,
});

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

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
  const followupsQ = useQuery({
    queryKey: qk.followups.scope("today"),
    queryFn: () => listFollowups("today"),
  });

  const toggleTask = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      updateTaskStatus(id, done ? "completed" : "pending"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const name = displayName(user);
  const now = new Date();
  const greeting = greetingFor(now);
  const today = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (kpisQ.isLoading) return <ShellLoading greeting={greeting} name={name} today={today} />;
  if (kpisQ.error)
    return (
      <ErrorBlock message={toUserMessage(kpisQ.error)} onRetry={() => void kpisQ.refetch()} />
    );

  const kpis = kpisQ.data!;
  const tasks = tasksQ.data ?? [];
  const followups = followupsQ.data ?? [];
  const health = computeHealth(kpis);
  const brief = buildBrief(kpis, tasks);
  const headline = pickHeadline(kpis);

  return (
    <div className="relative pb-24">
      {/* Two-column shell: main + right Copilot rail on xl+ */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* MAIN COLUMN */}
        <div className="space-y-6">
          <ExecutiveHero
            greeting={greeting}
            name={name}
            today={today}
            health={health}
            headline={headline}
            brief={brief}
          />

          <BusinessHealthGrid kpis={kpis} />

          <OperationalRadar kpis={kpis} tasks={tasks} followups={followups} />

          <div className="grid gap-6 lg:grid-cols-2">
            <CashFlowSnapshot kpis={kpis} />
            <ProductionAndDispatch kpis={kpis} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <SalesCommandCentre kpis={kpis} />
            <InventoryIntelligence />
          </div>

          <TodayTimeline
            followups={followups}
            tasks={tasks}
            deliveriesToday={kpis.deliveriesToday}
            onToggleTask={(id, done) => toggleTask.mutate({ id, done })}
          />
        </div>

        {/* RIGHT RAIL */}
        <CopilotDock
          health={health}
          kpis={kpis}
          activity={activityQ.data ?? []}
          activityLoading={activityQ.isLoading}
        />
      </div>

      <QuickActionsDock />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 1 — Executive Hero                                                  */
/* -------------------------------------------------------------------------- */

function ExecutiveHero({
  greeting,
  name,
  today,
  health,
  headline,
  brief,
}: {
  greeting: string;
  name: string;
  today: string;
  health: HealthScore;
  headline: HeadlineMetric;
  brief: string[];
}) {
  return (
    <section
      className="material-granite stone-grain overflow-hidden rounded-lg border border-border-inverse shadow-e3"
      aria-label="Executive briefing"
    >
      <div className="relative z-10 p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-inverse-muted">
              {today}
            </div>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-text-inverse sm:text-[28px]">
              {greeting}, {name}.
            </h1>
          </div>
          <HealthGauge score={health.score} band={health.band} />
        </div>

        {/* Headline metric */}
        <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-inverse-muted">
            {headline.label}
          </span>
          <Link
            to={headline.to}
            className="font-display text-3xl font-semibold tabular-nums text-text-inverse hover:underline sm:text-[36px]"
          >
            {headline.value}
          </Link>
          <span className="text-[13px] text-text-inverse-muted">{headline.context}</span>
        </div>

        {/* AI Executive Brief */}
        <div className="mt-6 border-t border-white/8 pt-5">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-text-inverse-muted">
            <Sparkles className="h-3 w-3" aria-hidden />
            Executive brief
          </div>
          <ul className="space-y-1.5">
            {brief.map((line, i) => (
              <li
                key={i}
                className="flex gap-2.5 text-[14px] leading-relaxed text-text-inverse/90"
              >
                <span
                  aria-hidden
                  className="mt-2 h-1 w-1 shrink-0 rounded-full bg-mint-300/80"
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function HealthGauge({ score, band }: { score: number; band: HealthBand }) {
  const size = 88;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;
  const ringColor =
    band === "strong"
      ? "text-mint-300"
      : band === "steady"
      ? "text-status-warning-fg"
      : "text-status-danger-fg";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          className="text-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={cn("transition-[stroke-dashoffset] duration-500 ease-out", ringColor)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-semibold tabular-nums text-text-inverse">
          {score}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-text-inverse-muted">
          Health
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 2 — Business Health (4 cards)                                       */
/* -------------------------------------------------------------------------- */

type Tone = "strong" | "steady" | "watch" | "risk";
const TONE_ACCENT: Record<Tone, string> = {
  strong: "bg-status-success-bg text-status-success-fg",
  steady: "bg-surface-panel text-text-secondary",
  watch: "bg-status-warning-bg text-status-warning-fg",
  risk: "bg-status-danger-bg text-status-danger-fg",
};
const TONE_LABEL: Record<Tone, string> = {
  strong: "Strong",
  steady: "Steady",
  watch: "Watch",
  risk: "At risk",
};

function BusinessHealthGrid({ kpis }: { kpis: DashboardKpis }) {
  const salesTone: Tone = kpis.salesTodayInr > 0 ? "strong" : "steady";
  const opsTone: Tone = kpis.ordersToStart > 5 ? "watch" : "steady";
  const financeTone: Tone =
    kpis.outstandingInr > 5_000_000 ? "risk" : kpis.outstandingInr > 1_000_000 ? "watch" : "strong";
  const peopleTone: Tone = kpis.overdueFollowups > 3 ? "watch" : "steady";

  return (
    <section aria-labelledby="health-heading">
      <SectionTitle id="health-heading" kicker="Business health" title="Four pillars, one heartbeat" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <HealthCard
          to="/dashboards/sales"
          icon={<TrendingUp className="h-4 w-4" />}
          label="Sales"
          value={"₹" + formatMoney(kpis.salesTodayInr)}
          trend="today"
          target={"pipeline ₹" + formatMoney(kpis.revenuePipelineInr)}
          tone={salesTone}
          insight={
            kpis.pendingQuotes
              ? `${kpis.pendingQuotes} quote${kpis.pendingQuotes === 1 ? "" : "s"} awaiting approval`
              : "Pipeline is flowing"
          }
        />
        <HealthCard
          to="/dashboards/production"
          icon={<Factory className="h-4 w-4" />}
          label="Operations"
          value={String(kpis.ordersToStart)}
          trend="orders to start"
          target={`${kpis.deliveriesToday} dispatches today`}
          tone={opsTone}
          insight={
            kpis.ordersToStart > 0
              ? "Kick off confirmed orders to keep production fed"
              : "Floor is clear to plan next batch"
          }
        />
        <HealthCard
          to="/invoices"
          icon={<Wallet className="h-4 w-4" />}
          label="Finance"
          value={"₹" + formatMoney(kpis.outstandingInr)}
          trend="outstanding"
          target={"collected MTD ₹" + formatMoney(kpis.paymentsThisMonthInr)}
          tone={financeTone}
          insight={
            kpis.collectionsTodayInr > 0
              ? `₹${formatMoney(kpis.collectionsTodayInr)} collected today`
              : "No collections logged yet today"
          }
        />
        <HealthCard
          to="/followups"
          icon={<Users className="h-4 w-4" />}
          label="People"
          value={String(kpis.todayFollowups + kpis.overdueFollowups)}
          trend="follow-ups on deck"
          target={`${kpis.customers} active customers`}
          tone={peopleTone}
          insight={
            kpis.overdueFollowups
              ? `${kpis.overdueFollowups} overdue — call them today`
              : "Team is on schedule"
          }
        />
      </div>
    </section>
  );
}

function HealthCard({
  to,
  icon,
  label,
  value,
  trend,
  target,
  tone,
  insight,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: string;
  target: string;
  tone: Tone;
  insight: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-md border border-border-subtle bg-surface-card p-4",
        "shadow-e1 transition-all duration-150 hover:-translate-y-px hover:border-border-default hover:shadow-e2",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-intent-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
          <span className="text-text-secondary">{icon}</span>
          {label}
        </div>
        <span
          className={cn(
            "rounded-sm px-1.5 py-px font-mono text-[10px] uppercase tracking-wider",
            TONE_ACCENT[tone],
          )}
        >
          {TONE_LABEL[tone]}
        </span>
      </div>
      <div className="mt-3 font-display text-[26px] font-semibold tabular-nums text-text-primary">
        {value}
      </div>
      <div className="mt-0.5 text-[12px] text-text-secondary">{trend}</div>
      <div className="mt-3 border-t border-border-subtle pt-2 text-[11px] text-text-muted">
        {target}
      </div>
      <div className="mt-1 flex items-start gap-1.5 text-[12px] leading-snug text-text-secondary">
        <span>{insight}</span>
      </div>
      <ArrowUpRight
        aria-hidden
        className="absolute right-3 top-3 h-3.5 w-3.5 text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
      />
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 3 — Operational Radar (ATC board)                                   */
/* -------------------------------------------------------------------------- */

type RadarItem = { label: string; to: string; sub?: string };

function OperationalRadar({
  kpis,
  tasks,
  followups,
}: {
  kpis: DashboardKpis;
  tasks: TaskRow[];
  followups: FollowupWithEnquiry[];
}) {
  const critical: RadarItem[] = [];
  if (kpis.overdueFollowups)
    critical.push({
      label: `${kpis.overdueFollowups} overdue follow-up${kpis.overdueFollowups === 1 ? "" : "s"}`,
      to: "/followups",
      sub: "Aged past due date",
    });
  if (kpis.outstandingInr > 5_000_000)
    critical.push({
      label: `₹${formatMoney(kpis.outstandingInr)} receivables at risk`,
      to: "/invoices",
      sub: "Exceeds ₹50L threshold",
    });
  const urgentTasks = tasks.filter((t) => t.priority === "urgent").slice(0, 3);
  for (const t of urgentTasks)
    critical.push({ label: t.title, to: "/tasks", sub: "Urgent task" });

  const attention: RadarItem[] = [];
  if (kpis.pendingQuotes)
    attention.push({
      label: `${kpis.pendingQuotes} quote${kpis.pendingQuotes === 1 ? "" : "s"} awaiting response`,
      to: "/quotes",
      sub: "In draft or sent",
    });
  if (kpis.ordersToStart)
    attention.push({
      label: `${kpis.ordersToStart} sales order${kpis.ordersToStart === 1 ? "" : "s"} to start`,
      to: "/sales-orders",
      sub: "Confirmed but not begun",
    });
  if (kpis.pendingRfqs)
    attention.push({
      label: `${kpis.pendingRfqs} RFQ${kpis.pendingRfqs === 1 ? "" : "s"} pending vendor reply`,
      to: "/rfqs",
      sub: "Sent, awaiting quotes",
    });

  const scheduled: RadarItem[] = [];
  if (kpis.todayFollowups)
    scheduled.push({
      label: `${kpis.todayFollowups} follow-up${kpis.todayFollowups === 1 ? "" : "s"} today`,
      to: "/followups",
      sub: "Scheduled",
    });
  if (kpis.deliveriesToday)
    scheduled.push({
      label: `${kpis.deliveriesToday} dispatch${kpis.deliveriesToday === 1 ? "" : "es"} today`,
      to: "/dispatch",
      sub: "Leaving the yard",
    });
  const nextFollowup = followups[0];
  if (nextFollowup && scheduled.length < 4)
    scheduled.push({
      label: nextFollowup.notes?.slice(0, 60) ?? "Scheduled follow-up",
      to: "/followups",
      sub: new Date(nextFollowup.scheduled_at).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

  const completed: RadarItem[] = [];
  if (kpis.collectionsTodayInr > 0)
    completed.push({
      label: `₹${formatMoney(kpis.collectionsTodayInr)} collected`,
      to: "/payments",
      sub: "Today",
    });
  if (kpis.salesTodayInr > 0)
    completed.push({
      label: `₹${formatMoney(kpis.salesTodayInr)} invoiced`,
      to: "/invoices",
      sub: "Today",
    });
  const doneTasks = tasks.filter((t) => t.status === "completed").length;
  if (doneTasks)
    completed.push({ label: `${doneTasks} task${doneTasks === 1 ? "" : "s"} closed`, to: "/tasks" });

  return (
    <section aria-labelledby="radar-heading">
      <SectionTitle
        id="radar-heading"
        kicker="Operational radar"
        title="Where the day stands right now"
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <RadarColumn
          icon={<Flame className="h-3.5 w-3.5" />}
          title="Critical"
          accent="text-status-danger-fg border-t-status-danger-fg"
          items={critical}
          empty="Nothing critical."
        />
        <RadarColumn
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          title="Needs attention"
          accent="text-status-warning-fg border-t-status-warning-fg"
          items={attention}
          empty="Inbox is clear."
        />
        <RadarColumn
          icon={<CalendarClock className="h-3.5 w-3.5" />}
          title="Scheduled"
          accent="text-status-info-fg border-t-status-info-fg"
          items={scheduled}
          empty="No commitments today."
        />
        <RadarColumn
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          title="Completed today"
          accent="text-status-success-fg border-t-status-success-fg"
          items={completed}
          empty="First win of the day awaits."
        />
      </div>
    </section>
  );
}

function RadarColumn({
  icon,
  title,
  accent,
  items,
  empty,
}: {
  icon: React.ReactNode;
  title: string;
  accent: string;
  items: RadarItem[];
  empty: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[160px] flex-col rounded-md border border-border-subtle border-t-2 bg-surface-card p-3 shadow-e1",
        accent,
      )}
    >
      <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]">
        {icon}
        <span>{title}</span>
        <span className="ml-auto text-text-muted">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-1 items-center text-[12px] text-text-muted">{empty}</div>
      ) : (
        <ul className="space-y-1.5">
          {items.slice(0, 5).map((item, i) => (
            <li key={i}>
              <Link
                to={item.to}
                className="group flex items-start justify-between gap-2 rounded-sm px-1.5 py-1 -mx-1.5 text-text-primary transition-colors hover:bg-surface-card-hover"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{item.label}</div>
                  {item.sub && (
                    <div className="truncate text-[11px] text-text-muted">{item.sub}</div>
                  )}
                </div>
                <ArrowRight className="mt-1 h-3 w-3 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 4 — Cash Flow Snapshot                                              */
/* -------------------------------------------------------------------------- */

function CashFlowSnapshot({ kpis }: { kpis: DashboardKpis }) {
  const rows: Array<{ label: string; value: string; to: string; tone?: "in" | "out" }> = [
    {
      label: "Receivables",
      value: "₹" + formatMoney(kpis.outstandingInr),
      to: "/invoices",
      tone: "in",
    },
    {
      label: "Collected this month",
      value: "₹" + formatMoney(kpis.paymentsThisMonthInr),
      to: "/payments",
      tone: "in",
    },
    {
      label: "Collected today",
      value: "₹" + formatMoney(kpis.collectionsTodayInr),
      to: "/payments",
      tone: "in",
    },
    {
      label: "Sales invoiced today",
      value: "₹" + formatMoney(kpis.salesTodayInr),
      to: "/invoices",
      tone: "in",
    },
    {
      label: "Revenue in pipeline",
      value: "₹" + formatMoney(kpis.revenuePipelineInr),
      to: "/quotes",
    },
  ];
  return (
    <SurfaceCard
      icon={<Wallet className="h-3.5 w-3.5" />}
      kicker="Cash flow"
      title="Snapshot"
      to="/dashboards/collections"
    >
      <ul className="divide-y divide-border-subtle">
        {rows.map((r) => (
          <li key={r.label}>
            <Link
              to={r.to}
              className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-intent-primary"
            >
              <span className="flex items-center gap-2 text-[13px] text-text-secondary">
                {r.tone === "in" && (
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full bg-status-success-fg"
                  />
                )}
                {r.tone === "out" && (
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full bg-status-danger-fg"
                  />
                )}
                {r.label}
              </span>
              <span className="font-display text-[15px] font-medium tabular-nums text-text-primary">
                {r.value}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </SurfaceCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 5 — Production & Dispatch                                           */
/* -------------------------------------------------------------------------- */

function ProductionAndDispatch({ kpis }: { kpis: DashboardKpis }) {
  const rows = [
    { icon: <Factory className="h-3.5 w-3.5" />, label: "Sales orders to start", value: kpis.ordersToStart, to: "/sales-orders" },
    { icon: <Timer className="h-3.5 w-3.5" />, label: "Production queue", value: "—", to: "/manufacturing" },
    { icon: <Truck className="h-3.5 w-3.5" />, label: "Dispatches today", value: kpis.deliveriesToday, to: "/dispatch" },
    { icon: <Building2 className="h-3.5 w-3.5" />, label: "Active installations", value: "—", to: "/installations" },
  ];
  return (
    <SurfaceCard
      icon={<Factory className="h-3.5 w-3.5" />}
      kicker="Production & dispatch"
      title="Floor status"
      to="/dashboards/production"
    >
      <ul className="divide-y divide-border-subtle">
        {rows.map((r) => (
          <li key={r.label}>
            <Link
              to={r.to}
              className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-intent-primary"
            >
              <span className="flex items-center gap-2 text-[13px] text-text-secondary">
                <span className="text-text-muted">{r.icon}</span>
                {r.label}
              </span>
              <span className="font-display text-[15px] font-medium tabular-nums text-text-primary">
                {r.value}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-sm bg-surface-panel px-2.5 py-1.5 text-[11px] text-text-muted">
        Capacity signals arrive with the manufacturing telemetry release.
      </div>
    </SurfaceCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 6 — Sales Command Centre                                            */
/* -------------------------------------------------------------------------- */

function SalesCommandCentre({ kpis }: { kpis: DashboardKpis }) {
  const conversion =
    kpis.activeEnquiries > 0
      ? Math.round((kpis.quotesAwaitingApproval / kpis.activeEnquiries) * 100)
      : 0;
  const aov =
    kpis.quotesAwaitingApproval > 0
      ? kpis.revenuePipelineInr / kpis.quotesAwaitingApproval
      : 0;
  const cells = [
    { label: "Active enquiries", value: kpis.activeEnquiries, to: "/enquiries" },
    { label: "Quotes to approve", value: kpis.pendingQuotes, to: "/quotes", tone: "warn" as const },
    { label: "Orders to start", value: kpis.ordersToStart, to: "/sales-orders" },
    { label: "Enquiry → quote", value: `${conversion}%`, to: "/dashboards/sales-funnel" },
    { label: "Avg. quote value", value: "₹" + formatMoney(aov), to: "/quotes" },
    { label: "Pipeline value", value: "₹" + formatMoney(kpis.revenuePipelineInr), to: "/quotes" },
  ];
  return (
    <SurfaceCard
      icon={<LineChart className="h-3.5 w-3.5" />}
      kicker="Sales command"
      title="Pipeline pulse"
      to="/dashboards/sales"
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {cells.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className={cn(
              "flex flex-col rounded-sm border border-border-subtle bg-surface-panel px-2.5 py-2 transition-colors",
              "hover:border-border-default hover:bg-surface-card-hover",
              c.tone === "warn" && "border-status-warning-fg/40",
            )}
          >
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
              {c.label}
            </span>
            <span className="mt-1 font-display text-[18px] font-semibold tabular-nums text-text-primary">
              {c.value}
            </span>
          </Link>
        ))}
      </div>
    </SurfaceCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 7 — Inventory Intelligence (placeholder)                            */
/* -------------------------------------------------------------------------- */

function InventoryIntelligence() {
  const groups = [
    { icon: <Zap className="h-3.5 w-3.5" />, label: "Fast movers", hint: "Top 5 by 30-day movement" },
    { icon: <Timer className="h-3.5 w-3.5" />, label: "Slow movers", hint: "Aged over 90 days" },
    { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: "Critical stock", hint: "Below reorder point" },
    { icon: <ClipboardCheck className="h-3.5 w-3.5" />, label: "Purchase recommendations", hint: "Suggested RFQs" },
  ];
  return (
    <SurfaceCard
      icon={<Boxes className="h-3.5 w-3.5" />}
      kicker="Inventory intelligence"
      title="Yard signals"
      to="/inventory"
    >
      <ul className="space-y-1.5">
        {groups.map((g) => (
          <li
            key={g.label}
            className="flex items-center justify-between gap-3 rounded-sm border border-border-subtle bg-surface-panel px-2.5 py-2 text-text-secondary"
          >
            <span className="flex items-center gap-2 text-[13px]">
              <span className="text-text-muted">{g.icon}</span>
              {g.label}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
              {g.hint}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-sm bg-surface-panel px-2.5 py-1.5 text-[11px] text-text-muted">
        Movement analytics land with the Inventory intelligence release.
      </div>
    </SurfaceCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 8 — AI Copilot Dock (persistent right rail)                         */
/* -------------------------------------------------------------------------- */

function CopilotDock({
  health,
  kpis,
  activity,
  activityLoading,
}: {
  health: HealthScore;
  kpis: DashboardKpis;
  activity: Array<{
    id: string | number;
    action: string;
    summary: string | null;
    entity_type: string | null;
    actor_name?: string | null;
    created_at: string;
  }>;
  activityLoading: boolean;
}) {
  const suggestions = buildSuggestions(kpis);
  return (
    <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
      {/* Contextual summary */}
      <div className="material-basalt stone-grain overflow-hidden rounded-md border border-border-inverse shadow-e2">
        <div className="relative z-10 p-4">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-text-inverse-muted">
            <Sparkles className="h-3 w-3" aria-hidden />
            AI copilot
          </div>
          <div className="font-display text-[15px] font-medium leading-snug text-text-inverse">
            {health.band === "strong"
              ? "The business is running well. Focus on growth."
              : health.band === "steady"
              ? "Steady day. A few items want attention."
              : "Several risks are open. Address them first."}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/8 pt-3">
            <MiniStat label="Cash today" value={"₹" + formatMoney(kpis.collectionsTodayInr)} />
            <MiniStat label="To approve" value={String(kpis.pendingQuotes)} />
            <MiniStat label="Overdue" value={String(kpis.overdueFollowups)} />
          </div>
        </div>
      </div>

      {/* Suggested actions */}
      <SurfaceCard
        icon={<CheckSquare className="h-3.5 w-3.5" />}
        kicker="Suggested"
        title="What to do next"
      >
        {suggestions.length === 0 ? (
          <div className="rounded-sm border border-dashed border-border-subtle px-3 py-6 text-center text-[12px] text-text-muted">
            Nothing pressing. A good moment to plan next week.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {suggestions.map((s) => (
              <li key={s.label}>
                <Link
                  to={s.to}
                  className="flex items-center justify-between gap-2 rounded-sm border border-border-subtle bg-surface-panel px-2.5 py-2 text-[13px] text-text-primary transition-colors hover:border-border-default hover:bg-surface-card-hover"
                >
                  <span className="min-w-0 truncate">{s.label}</span>
                  <ArrowRight className="h-3 w-3 shrink-0 text-text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SurfaceCard>

      {/* Reminders — recent activity feed */}
      <SurfaceCard
        icon={<Receipt className="h-3.5 w-3.5" />}
        kicker="Reminders"
        title="Recent activity"
        to="/activity"
      >
        {activityLoading ? (
          <ul className="space-y-2" aria-hidden>
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="h-8 animate-pulse rounded-sm bg-surface-panel" />
            ))}
          </ul>
        ) : activity.length === 0 ? (
          <div className="rounded-sm px-2 py-4 text-center text-[12px] text-text-muted">
            Quiet so far.
          </div>
        ) : (
          <ol className="space-y-2">
            {activity.slice(0, 5).map((a) => (
              <li key={a.id} className="text-[12px] leading-snug">
                <span className="text-text-primary">{a.actor_name ?? "Someone"}</span>{" "}
                <span className="text-text-muted">{a.action.replace(/_/g, " ")}</span>
                {a.summary && <span className="text-text-secondary"> {a.summary}</span>}
              </li>
            ))}
          </ol>
        )}
      </SurfaceCard>
    </aside>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-text-inverse-muted">
        {label}
      </div>
      <div className="mt-0.5 font-display text-[14px] font-semibold tabular-nums text-text-inverse">
        {value}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 9 — Today's Timeline                                                */
/* -------------------------------------------------------------------------- */

type TimelineEvent = {
  key: string;
  time: string;
  label: string;
  kind: "meeting" | "follow-up" | "task" | "dispatch" | "payment";
  to: string;
  done?: boolean;
};

function TodayTimeline({
  followups,
  tasks,
  deliveriesToday,
  onToggleTask,
}: {
  followups: FollowupWithEnquiry[];
  tasks: TaskRow[];
  deliveriesToday: number;
  onToggleTask: (id: string, done: boolean) => void;
}) {
  const events = useMemo<TimelineEvent[]>(() => {
    const list: TimelineEvent[] = [];
    for (const f of followups.slice(0, 8)) {
      list.push({
        key: `f-${f.id}`,
        time: new Date(f.scheduled_at).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }),
        label:
          f.notes?.slice(0, 80) ??
          `Follow up with ${f.enquiry?.customer?.name ?? "customer"}`,
        kind: "follow-up",
        to: "/followups",
      });
    }
    for (const t of tasks.slice(0, 6)) {
      if (!t.due_at) continue;
      list.push({
        key: `t-${t.id}`,
        time: new Date(t.due_at).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }),
        label: t.title,
        kind: "task",
        to: "/tasks",
        done: t.status === "completed",
      });
    }
    if (deliveriesToday > 0) {
      list.push({
        key: "d-today",
        time: "All day",
        label: `${deliveriesToday} dispatch${deliveriesToday === 1 ? "" : "es"} scheduled`,
        kind: "dispatch",
        to: "/dispatch",
      });
    }
    return list.sort((a, b) => (a.time > b.time ? 1 : -1)).slice(0, 12);
  }, [followups, tasks, deliveriesToday]);

  const iconFor = (k: TimelineEvent["kind"]) => {
    switch (k) {
      case "dispatch":
        return <Truck className="h-3.5 w-3.5" />;
      case "follow-up":
        return <Users className="h-3.5 w-3.5" />;
      case "task":
        return <CheckSquare className="h-3.5 w-3.5" />;
      case "payment":
        return <Wallet className="h-3.5 w-3.5" />;
      default:
        return <CalendarClock className="h-3.5 w-3.5" />;
    }
  };

  return (
    <section aria-labelledby="timeline-heading">
      <SectionTitle
        id="timeline-heading"
        kicker="Today"
        title="Timeline"
        action={{ label: "Open calendar", to: "/calendar" }}
      />
      {events.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-subtle bg-surface-card px-4 py-8 text-center text-[13px] text-text-muted">
          Nothing scheduled. A rare quiet day.
        </div>
      ) : (
        <ol className="relative rounded-md border border-border-subtle bg-surface-card shadow-e1">
          {events.map((e, i) => (
            <li
              key={e.key}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5",
                i > 0 && "border-t border-border-subtle",
              )}
            >
              <span className="w-16 shrink-0 font-mono text-[11px] uppercase tracking-wider text-text-muted tabular-nums">
                {e.time}
              </span>
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-sm bg-surface-panel text-text-secondary">
                {iconFor(e.kind)}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  to={e.to}
                  className={cn(
                    "block truncate text-[13px] text-text-primary hover:text-intent-primary",
                    e.done && "text-text-muted line-through",
                  )}
                >
                  {e.label}
                </Link>
              </div>
              {e.kind === "task" && (
                <Checkbox
                  checked={!!e.done}
                  onCheckedChange={(v) =>
                    onToggleTask(e.key.replace(/^t-/, ""), v === true)
                  }
                  aria-label={`Mark ${e.label} complete`}
                />
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 10 — Quick Actions floating dock                                    */
/* -------------------------------------------------------------------------- */

function QuickActionsDock() {
  const actions: Array<{ to: string; label: string; icon: React.ReactNode }> = [
    { to: "/customers", label: "Customer", icon: <Users className="h-3.5 w-3.5" /> },
    { to: "/enquiries", label: "Enquiry", icon: <FileText className="h-3.5 w-3.5" /> },
    { to: "/quotes/new", label: "Quote", icon: <FileText className="h-3.5 w-3.5" /> },
    { to: "/sales-orders/new", label: "Sales order", icon: <Package className="h-3.5 w-3.5" /> },
    { to: "/purchase-orders/new", label: "Purchase order", icon: <ClipboardCheck className="h-3.5 w-3.5" /> },
    { to: "/payments/new", label: "Payment", icon: <Wallet className="h-3.5 w-3.5" /> },
    { to: "/dispatch/new", label: "Dispatch", icon: <Truck className="h-3.5 w-3.5" /> },
  ];
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-3"
      aria-label="Quick create actions"
    >
      <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-border-inverse bg-surface-nav/95 px-1.5 py-1 shadow-e3 backdrop-blur">
        <span className="pl-2 pr-1 font-mono text-[10px] uppercase tracking-[0.18em] text-text-inverse-muted">
          <Plus className="inline h-3 w-3" aria-hidden /> New
        </span>
        {actions.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] text-text-inverse-muted transition-colors hover:bg-white/8 hover:text-text-inverse"
          >
            {a.icon}
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared building blocks                                                      */
/* -------------------------------------------------------------------------- */

function SectionTitle({
  id,
  kicker,
  title,
  action,
}: {
  id?: string;
  kicker: string;
  title: string;
  action?: { label: string; to: string };
}) {
  return (
    <header className="mb-3 flex items-end justify-between gap-4">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted">
          {kicker}
        </div>
        <h2 id={id} className="mt-0.5 font-display text-[18px] font-semibold text-text-primary">
          {title}
        </h2>
      </div>
      {action && (
        <Link
          to={action.to}
          className="flex items-center gap-1 text-[12px] text-text-secondary hover:text-intent-primary"
        >
          {action.label}
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      )}
    </header>
  );
}

function SurfaceCard({
  icon,
  kicker,
  title,
  to,
  children,
}: {
  icon: React.ReactNode;
  kicker: string;
  title: string;
  to?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border-subtle bg-surface-card p-4 shadow-e1">
      <header className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
            {icon}
            {kicker}
          </div>
          <h3 className="mt-0.5 font-display text-[15px] font-semibold text-text-primary">
            {title}
          </h3>
        </div>
        {to && (
          <Link
            to={to}
            className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-intent-primary"
          >
            Open
            <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}

function ShellLoading({
  greeting,
  name,
  today,
}: {
  greeting: string;
  name: string;
  today: string;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border-subtle bg-surface-card p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted">
          {today}
        </div>
        <h1 className="mt-2 font-display text-2xl font-semibold text-text-primary">
          {greeting}, {name}.
        </h1>
      </div>
      <LoadingBlock />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

type HealthBand = "strong" | "steady" | "risk";
type HealthScore = { score: number; band: HealthBand };

function computeHealth(k: DashboardKpis): HealthScore {
  let score = 90;
  score -= Math.min(k.overdueFollowups * 4, 25);
  score -= k.pendingQuotes > 10 ? 10 : k.pendingQuotes > 5 ? 5 : 0;
  score -=
    k.outstandingInr > 5_000_000 ? 15 : k.outstandingInr > 1_000_000 ? 8 : 0;
  score += k.collectionsTodayInr > 0 ? 4 : 0;
  score += k.salesTodayInr > 0 ? 4 : 0;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const band: HealthBand = clamped >= 80 ? "strong" : clamped >= 60 ? "steady" : "risk";
  return { score: clamped, band };
}

type HeadlineMetric = { label: string; value: string; context: string; to: string };

function pickHeadline(k: DashboardKpis): HeadlineMetric {
  // Cash first when receivables are heavy; then production; then sales.
  if (k.outstandingInr > 1_000_000)
    return {
      label: "Outstanding receivables",
      value: "₹" + formatMoney(k.outstandingInr),
      context: `₹${formatMoney(k.paymentsThisMonthInr)} collected this month`,
      to: "/invoices",
    };
  if (k.ordersToStart > 3)
    return {
      label: "Orders queued for production",
      value: String(k.ordersToStart),
      context: `${k.deliveriesToday} dispatch${k.deliveriesToday === 1 ? "" : "es"} today`,
      to: "/sales-orders",
    };
  return {
    label: "Revenue pipeline",
    value: "₹" + formatMoney(k.revenuePipelineInr),
    context: `${k.pendingQuotes} quote${k.pendingQuotes === 1 ? "" : "s"} in play`,
    to: "/quotes",
  };
}

function buildBrief(k: DashboardKpis, tasks: TaskRow[]): string[] {
  const lines: string[] = [];
  if (k.pendingQuotes)
    lines.push(
      `${k.pendingQuotes} quotation${k.pendingQuotes === 1 ? "" : "s"} require approval.`,
    );
  if (k.overdueFollowups)
    lines.push(
      `${k.overdueFollowups} follow-up${k.overdueFollowups === 1 ? " is" : "s are"} overdue.`,
    );
  if (k.outstandingInr > 1_000_000)
    lines.push(`₹${formatMoney(k.outstandingInr)} sits in receivables — chase collections.`);
  if (k.collectionsTodayInr > 0)
    lines.push(`₹${formatMoney(k.collectionsTodayInr)} collected so far today.`);
  if (k.deliveriesToday)
    lines.push(
      `${k.deliveriesToday} dispatch${k.deliveriesToday === 1 ? "" : "es"} scheduled to leave.`,
    );
  const urgent = tasks.filter((t) => t.priority === "urgent").length;
  if (urgent) lines.push(`${urgent} urgent task${urgent === 1 ? "" : "s"} on your list.`);
  if (lines.length === 0)
    lines.push("Everything is quiet. Production is operating normally.");
  return lines.slice(0, 5);
}

function buildSuggestions(k: DashboardKpis): Array<{ label: string; to: string }> {
  const out: Array<{ label: string; to: string }> = [];
  if (k.pendingQuotes)
    out.push({ label: "Review pending quotations", to: "/quotes" });
  if (k.overdueFollowups)
    out.push({ label: "Clear overdue follow-ups", to: "/followups" });
  if (k.ordersToStart)
    out.push({ label: "Release orders to production", to: "/sales-orders" });
  if (k.outstandingInr > 1_000_000)
    out.push({ label: "Chase top receivables", to: "/invoices" });
  if (k.deliveriesToday)
    out.push({ label: "Confirm today's dispatches", to: "/dispatch" });
  return out.slice(0, 5);
}

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
  if (!n || n === 0) return "0";
  if (n >= 1_00_00_000) return (n / 1_00_00_000).toFixed(1) + " Cr";
  if (n >= 1_00_000) return (n / 1_00_000).toFixed(1) + " L";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString(undefined);
}
