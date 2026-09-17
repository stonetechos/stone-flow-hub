/**
 * STOS — Executive Command Centre
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
 *
 * Phase G.8.8: the "Executive brief" bullet list and "Suggested actions"
 * panel used to be generated locally by `buildBrief`/`buildSuggestions` —
 * hand-rolled threshold judgments over DashboardKpis ("if outstanding >
 * 1,000,000, mention it"), independent of and less rigorous than the real
 * Insight Providers already computing the same category of judgment
 * (CollectionPriorityProvider, ColdEnquiryProvider, etc.). Both sections
 * now render the top processed insights from the same registry every
 * other Intelligence surface reads — Copilot, EntityInsightPanel,
 * DangerNotifications, Business Priorities — via `useExecutiveInsights()`.
 * `computeHealth`/`pickHeadline` (the health gauge and headline KPI) are
 * a different concern — a single composite score / KPI pick, not a list
 * of discrete business-rule judgments — and were out of this phase's
 * named scope (risk.ts, OwnerInsight, and specifically buildBrief/
 * buildSuggestions); left untouched.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useExecutiveInsights } from "@/hooks/useExecutiveInsights";
import type { ProcessedInsight } from "@/lib/insights/quality/pipeline";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
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
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { HealthCard, type HealthCardTone } from "@/components/dashboard/HealthCard";
import { Checkbox } from "@/components/ui/checkbox";
import { toUserMessage } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import { getDashboardKpis, type DashboardKpis } from "@/lib/dashboard/api";
import { listRecentActivity } from "@/lib/activity/api";
import { listTasks, updateTaskStatus, type TaskRow } from "@/lib/tasks/api";
import { listFollowups, type FollowupWithEnquiry } from "@/lib/followups/api";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  ZohoDashboardHeader,
  type DashboardViewTab,
} from "@/components/dashboard/zoho/ZohoDashboardHeader";
import { ZohoDashboardView } from "@/components/dashboard/zoho/ZohoDashboardView";
import { AnnouncementsView, HelpView } from "@/components/dashboard/zoho/ZohoAuxiliaryViews";
import { WebsiteLeadsDashboardCard } from "@/components/dashboard/WebsiteLeadsDashboardCard";

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
  const roles = useRoles();
  const canViewFinancial = roles.isSuperAdmin;
  const { processedInsights } = useExecutiveInsights();

  const [activeTab, setActiveTab] = useState<DashboardViewTab>(() =>
    canViewFinancial ? "financial" : "operations",
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await qc.invalidateQueries();
    setIsRefreshing(false);
  };

  const kpisQ = useQuery({
    queryKey: qk.dashboard,
    queryFn: getDashboardKpis,
    enabled: activeTab === "operations",
  });
  const activityQ = useQuery({
    queryKey: qk.activity.recent,
    queryFn: () => listRecentActivity(8),
    enabled: activeTab === "operations",
  });
  const tasksQ = useQuery({
    queryKey: ["tasks", "dashboard", "pending"],
    queryFn: () => listTasks({ status: "pending" }),
    enabled: activeTab === "operations",
  });
  const followupsQ = useQuery({
    queryKey: qk.followups.scope("today"),
    queryFn: () => listFollowups("today"),
    enabled: activeTab === "operations",
  });
  const profileQ = useQuery({
    queryKey: ["me", "profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });

  const toggleTask = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      updateTaskStatus(id, done ? "completed" : "pending"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const profileName = profileQ.data?.full_name?.trim();
  const name = profileName ? profileName.split(" ")[0] : displayName(user);
  const now = new Date();
  const greeting = greetingFor(now);
  const today = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const kpis = kpisQ.data;
  const tasks = tasksQ.data ?? [];
  const followups = followupsQ.data ?? [];
  const health = kpis ? computeHealth(kpis) : { score: 100, band: "strong" as HealthBand };
  const topInsights = [...processedInsights]
    .sort((a, b) => b.normalizedPriority - a.normalizedPriority)
    .slice(0, 5);
  const brief = buildBrief(topInsights, tasks);
  const headline = kpis
    ? pickHeadline(kpis)
    : { label: "Revenue", value: "₹0", context: "tracking", to: "/invoices" };

  return (
    <div className="relative pb-24 -mt-2">
      {/* Zoho Books Top Header & Navigation Sub-tabs */}
      <ZohoDashboardHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        canViewFinancial={canViewFinancial}
      />

      {/* Main Tab Views */}
      {canViewFinancial && activeTab === "financial" && (
        <div className="px-2 sm:px-4">
          <ZohoDashboardView />
        </div>
      )}

      {activeTab === "operations" && (
        <div className="px-2 sm:px-4">
          {kpisQ.isLoading || !kpisQ.data ? (
            <ShellLoading greeting={greeting} name={name} today={today} />
          ) : kpisQ.error ? (
            <ErrorBlock message={toUserMessage(kpisQ.error)} onRetry={() => void kpisQ.refetch()} />
          ) : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              {/* MAIN COLUMN */}
              <div className="space-y-6">
                <ExecutiveHero
                  greeting={greeting}
                  name={name}
                  today={today}
                  health={computeHealth(kpisQ.data)}
                  headline={pickHeadline(kpisQ.data)}
                  brief={brief}
                />

                {/* Visitor Inquiries & CRM Leads */}
                <WebsiteLeadsDashboardCard />

                <BusinessHealthGrid kpis={kpisQ.data} />

                <OperationalRadar kpis={kpisQ.data} tasks={tasks} followups={followups} />

                <div className="grid gap-6 lg:grid-cols-2">
                  <CashFlowSnapshot kpis={kpisQ.data} />
                  <DispatchAndInstallation kpis={kpisQ.data} />
                </div>

                <SalesCommandCentre kpis={kpisQ.data} />

                <TodayTimeline
                  followups={followups}
                  tasks={tasks}
                  deliveriesToday={kpisQ.data.deliveriesToday}
                  onToggleTask={(id, done) => toggleTask.mutate({ id, done })}
                />
              </div>

              {/* RIGHT RAIL */}
              <CopilotDock
                health={computeHealth(kpisQ.data)}
                kpis={kpisQ.data}
                topInsights={topInsights}
                activity={activityQ.data ?? []}
                activityLoading={activityQ.isLoading}
              />
            </div>
          )}
          <QuickActionsDock />
        </div>
      )}

      {activeTab === "announcements" && (
        <div className="px-2 sm:px-4">
          <AnnouncementsView />
        </div>
      )}

      {activeTab === "help" && (
        <div className="px-2 sm:px-4">
          <HelpView />
        </div>
      )}
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
    <section className="card-3d-milky relative overflow-hidden" aria-label="Executive briefing">
      <div className="relative z-10 p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-engraved-kicker">
              {today}
            </div>
            <h1 className="mt-2 font-display text-2xl font-black tracking-tight text-engraved-title sm:text-[28px]">
              {greeting}, {name}.
            </h1>
          </div>
          <HealthGauge score={health.score} band={health.band} />
        </div>

        {/* Headline metric in 3D Engraved Well */}
        <div className="engraved-well-glow mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2 rounded-2xl p-4">
          <span className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-engraved-kicker">
            {headline.label}
          </span>
          <Link
            to={headline.to}
            className="font-display text-3xl font-black tabular-nums text-engraved-blue-lg transition-transform hover:scale-105 sm:text-[36px]"
          >
            {headline.value}
          </Link>
          <span className="font-mono text-[12px] font-bold text-slate-500">{headline.context}</span>
        </div>

        {/* AI Executive Brief */}
        <div className="mt-6 border-t border-blue-50 pt-5">
          <div className="mb-2.5 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-engraved-kicker">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" aria-hidden />
            Executive brief
          </div>
          <ul className="space-y-2">
            {brief.map((line, i) => (
              <li
                key={i}
                className="flex gap-2.5 text-[14px] font-semibold leading-relaxed text-slate-700"
              >
                <span
                  aria-hidden
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-700 shadow-sm shadow-cyan-700/50"
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
    band === "strong" ? "text-blue-600" : band === "steady" ? "text-sky-500" : "text-amber-500";
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
          className="text-slate-100"
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
        <span className="font-display text-2xl font-black tabular-nums text-engraved-blue-lg">
          {score}
        </span>
        <span className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-engraved-kicker">
          Health
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 2 — Business Health (4 cards)                                       */
/* -------------------------------------------------------------------------- */

function BusinessHealthGrid({ kpis }: { kpis: DashboardKpis }) {
  const salesTone: HealthCardTone = kpis.salesTodayInr > 0 ? "strong" : "steady";
  const opsTone: HealthCardTone = kpis.ordersToStart > 5 ? "watch" : "steady";
  const financeTone: HealthCardTone =
    kpis.outstandingInr > 5_000_000 ? "risk" : kpis.outstandingInr > 1_000_000 ? "watch" : "strong";
  const peopleTone: HealthCardTone = kpis.overdueFollowups > 3 ? "watch" : "steady";

  return (
    <section aria-labelledby="health-heading">
      <SectionTitle
        id="health-heading"
        kicker="Business health"
        title="Four pillars, one heartbeat"
      />
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
  for (const t of urgentTasks) critical.push({ label: t.title, to: "/tasks", sub: "Urgent task" });

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
    completed.push({
      label: `${doneTasks} task${doneTasks === 1 ? "" : "s"} closed`,
      to: "/tasks",
    });

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
    <div className={cn("card-3d-milky flex min-h-[160px] flex-col p-4", accent)}>
      <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em]">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-xs">
          {icon}
        </span>
        <span className="font-bold text-engraved-title">{title}</span>
        <span className="engraved-well-glow ml-auto rounded-full px-2.5 py-0.5 font-mono text-[10px] font-black text-engraved-blue">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-1 items-center text-[12px] font-medium text-slate-400">
          {empty}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 5).map((item, i) => (
            <li key={i}>
              <Link
                to={item.to}
                className="engraved-well group flex items-start justify-between gap-2 rounded-xl p-2.5 text-slate-900 transition-all hover:scale-[1.02]"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold text-slate-800 transition-colors group-hover:text-engraved-blue">
                    {item.label}
                  </div>
                  {item.sub && (
                    <div className="truncate font-mono text-[11px] font-semibold text-slate-400">
                      {item.sub}
                    </div>
                  )}
                </div>
                <ArrowRight className="mt-1 h-3 w-3 shrink-0 text-blue-500 opacity-0 transition-opacity group-hover:opacity-100" />
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
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.label}>
            <Link
              to={r.to}
              className="engraved-well flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition-all hover:scale-[1.01]"
            >
              <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-700">
                {r.tone === "in" && (
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full bg-cyan-700 shadow-xs shadow-cyan-700/50"
                  />
                )}
                {r.tone === "out" && (
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full bg-indigo-500 shadow-xs shadow-indigo-500/50"
                  />
                )}
                {r.label}
              </span>
              <span className="font-display text-[15px] font-black tabular-nums text-engraved-blue">
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
/* Section 5 — Dispatch & Installation                                         */
/* -------------------------------------------------------------------------- */

// Was "Production & Dispatch" — the Production row/link was removed along
// with the Manufacturing feature (2026-09-04 Purchase module restructure);
// see engineering/purchase-module-and-sidebar-restructure-plan-2026-09-04.md.
function DispatchAndInstallation({ kpis }: { kpis: DashboardKpis }) {
  const rows = [
    {
      icon: <Factory className="h-3.5 w-3.5" />,
      label: "Sales orders to start",
      value: kpis.ordersToStart,
      to: "/sales-orders",
    },
    {
      icon: <Truck className="h-3.5 w-3.5" />,
      label: "Dispatches today",
      value: kpis.deliveriesToday,
      to: "/dispatch",
    },
    {
      icon: <Building2 className="h-3.5 w-3.5" />,
      label: "Active installations",
      value: kpis.activeInstallations,
      to: "/installations",
    },
  ];
  return (
    <SurfaceCard
      icon={<Truck className="h-3.5 w-3.5" />}
      kicker="Dispatch & installation"
      title="Floor status"
      to="/dispatch"
    >
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.label}>
            <Link
              to={r.to}
              className="engraved-well flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition-all hover:scale-[1.01]"
            >
              <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-700">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 shadow-xs">
                  {r.icon}
                </span>
                {r.label}
              </span>
              <span className="font-display text-[16px] font-black tabular-nums text-engraved-blue-lg">
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
/* Section 6 — Sales Command Centre                                            */
/* -------------------------------------------------------------------------- */

function SalesCommandCentre({ kpis }: { kpis: DashboardKpis }) {
  const conversion =
    kpis.activeEnquiries > 0
      ? Math.round((kpis.quotesAwaitingApproval / kpis.activeEnquiries) * 100)
      : 0;
  const aov =
    kpis.quotesAwaitingApproval > 0 ? kpis.revenuePipelineInr / kpis.quotesAwaitingApproval : 0;
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
      <div className="grid gap-2.5 sm:grid-cols-3">
        {cells.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className={cn(
              "engraved-well-glow flex flex-col rounded-xl px-3.5 py-3 transition-all hover:scale-[1.02]",
              c.tone === "warn" && "border-amber-300 bg-amber-50/60 shadow-amber-500/10",
            )}
          >
            <span className="font-mono text-[10px] font-black uppercase tracking-wider text-engraved-kicker">
              {c.label}
            </span>
            <span className="mt-1 font-display text-[22px] font-black tabular-nums text-engraved-blue-lg">
              {c.value}
            </span>
          </Link>
        ))}
      </div>
    </SurfaceCard>
  );
}

// Section 7 (Inventory Intelligence) was removed 2026-09-06 per the
// stabilization-sprint audit (Part 4: no placeholder/empty cards) — it
// rendered four static, hardcoded rows with no query behind any of them
// ("Movement analytics land with the Inventory intelligence release").
// Building real queries for it would be adding a new KPI, which that same
// sprint's brief explicitly ruled out — so removal, not fabrication, is
// the in-scope fix. Re-add for real once fast/slow-mover and reorder-point
// queries actually exist.

/* -------------------------------------------------------------------------- */
/* Section 8 — AI Copilot Dock (persistent right rail)                         */
/* -------------------------------------------------------------------------- */

function CopilotDock({
  health,
  kpis,
  topInsights,
  activity,
  activityLoading,
}: {
  health: HealthScore;
  kpis: DashboardKpis;
  topInsights: ProcessedInsight[];
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
  const suggestions = buildSuggestions(topInsights);
  return (
    <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
      {/* Contextual summary in 3D Milky White Box */}
      <div className="card-3d-milky p-5">
        <div className="mb-2.5 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-engraved-kicker">
          <Sparkles className="h-3.5 w-3.5 text-blue-600" aria-hidden />
          AI copilot
        </div>
        <div className="font-display text-[15px] font-black leading-snug text-engraved-title">
          {health.band === "strong"
            ? "The business is running strong. Focus on growth."
            : health.band === "steady"
              ? "Steady day. A few items want attention."
              : "Several risks are open. Address them first."}
        </div>
        <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-blue-50 pt-3">
          <MiniStat label="Cash today" value={"₹" + formatMoney(kpis.collectionsTodayInr)} />
          <MiniStat label="To approve" value={String(kpis.pendingQuotes)} />
          <MiniStat label="Overdue" value={String(kpis.overdueFollowups)} />
        </div>
      </div>

      {/* Suggested actions */}
      <SurfaceCard
        icon={<CheckSquare className="h-3.5 w-3.5" />}
        kicker="Suggested"
        title="What to do next"
      >
        {suggestions.length === 0 ? (
          <div className="engraved-well rounded-xl px-3 py-6 text-center text-[12px] font-medium text-slate-400">
            Nothing pressing. A good moment to plan next week.
          </div>
        ) : (
          <ul className="space-y-2">
            {suggestions.map((s) => (
              <li key={s.label}>
                <Link
                  to={s.to}
                  className="engraved-well flex items-center justify-between gap-2 rounded-xl p-2.5 text-[13px] font-bold text-slate-800 transition-all hover:scale-[1.02]"
                >
                  <span className="min-w-0 truncate">{s.label}</span>
                  <ArrowRight className="h-3 w-3 shrink-0 text-blue-500" aria-hidden />
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
              <li key={i} className="h-8 animate-pulse rounded-lg bg-cyan-50/40" />
            ))}
          </ul>
        ) : activity.length === 0 ? (
          <div className="engraved-well rounded-xl px-2 py-4 text-center text-[12px] font-medium text-slate-400">
            Quiet so far.
          </div>
        ) : (
          <ol className="space-y-2">
            {activity.slice(0, 5).map((a) => (
              <li key={a.id} className="engraved-well rounded-xl p-2 text-[12px] leading-snug">
                <span className="font-black text-engraved-title">{a.actor_name ?? "Someone"}</span>{" "}
                <span className="font-medium text-slate-600">{a.action.replace(/_/g, " ")}</span>
                {a.summary && <span className="font-bold text-engraved-blue"> — {a.summary}</span>}
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
    <div className="engraved-well-glow rounded-xl p-2 text-center">
      <div className="font-mono text-[9px] font-black uppercase tracking-wider text-engraved-kicker">
        {label}
      </div>
      <div className="mt-0.5 font-display text-[14px] font-black tabular-nums text-engraved-blue-lg">
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
        label: f.notes?.slice(0, 80) ?? `Follow up with ${f.enquiry?.customer?.name ?? "customer"}`,
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
        <div className="engraved-well rounded-2xl px-4 py-8 text-center text-[13px] font-medium text-slate-400">
          Nothing scheduled. A rare quiet day.
        </div>
      ) : (
        <ol className="card-3d-milky relative overflow-hidden">
          {events.map((e, i) => (
            <li
              key={e.key}
              className={cn(
                "flex items-center gap-3 px-5 py-3 transition-colors hover:bg-cyan-50/40",
                i > 0 && "border-t border-slate-200/60",
                i === 0 && "rounded-t-2xl",
                i === events.length - 1 && "rounded-b-2xl",
              )}
            >
              <span className="w-16 shrink-0 font-mono text-[11px] font-black uppercase tracking-wider text-engraved-kicker tabular-nums">
                {e.time}
              </span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 shadow-xs">
                {iconFor(e.kind)}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  to={e.to}
                  className={cn(
                    "block truncate text-[13px] font-bold text-slate-800 transition-colors hover:text-engraved-blue",
                    e.done && "text-slate-400 line-through",
                  )}
                >
                  {e.label}
                </Link>
              </div>
              {e.kind === "task" && (
                <Checkbox
                  checked={!!e.done}
                  onCheckedChange={(v) => onToggleTask(e.key.replace(/^t-/, ""), v === true)}
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
    {
      to: "/purchase-orders/new",
      label: "Purchase order",
      icon: <ClipboardCheck className="h-3.5 w-3.5" />,
    },
    { to: "/receipts/new", label: "Receipt", icon: <Wallet className="h-3.5 w-3.5" /> },
    { to: "/dispatch/new", label: "Dispatch", icon: <Truck className="h-3.5 w-3.5" /> },
  ];
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-3"
      aria-label="Quick create actions"
    >
      <div className="card-3d-milky pointer-events-auto flex max-w-full items-center gap-1.5 overflow-x-auto rounded-full px-3.5 py-1.5 shadow-2xl backdrop-blur-md">
        <span className="flex items-center gap-1 pl-1 pr-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-engraved-kicker">
          <Plus className="inline h-3.5 w-3.5 text-blue-600" aria-hidden /> New
        </span>
        {actions.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="engraved-well flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold text-slate-700 transition-all hover:scale-105 hover:text-engraved-blue"
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
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-engraved-kicker">
          {kicker}
        </div>
        <h2 id={id} className="mt-0.5 font-display text-[18px] font-black text-engraved-title">
          {title}
        </h2>
      </div>
      {action && (
        <Link
          to={action.to}
          className="flex items-center gap-1 text-[12px] font-bold text-engraved-blue transition-colors hover:scale-105"
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
    <section className="card-3d-milky p-5">
      <header className="mb-3.5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-engraved-kicker">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-xs">
              {icon}
            </span>
            {kicker}
          </div>
          <h3 className="mt-1 font-display text-[16px] font-black text-engraved-title">{title}</h3>
        </div>
        {to && (
          <Link
            to={to}
            className="flex items-center gap-1 text-[12px] font-bold text-engraved-blue transition-colors hover:scale-105"
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
  score -= k.outstandingInr > 5_000_000 ? 15 : k.outstandingInr > 1_000_000 ? 8 : 0;
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

/**
 * Phase G.8.8: the headline lines now come directly from the top
 * processed insights (already complete, readable sentences by provider
 * convention — every provider writes `title` as a full sentence, e.g.
 * "ENQ-000001 has no salesperson assigned") instead of re-deciding
 * locally which KPI thresholds are "worth mentioning." Urgent-task count
 * is kept as a direct, judgment-free count — Tasks aren't part of the
 * Insight registry and nothing else in the app computes this, so it
 * isn't duplicate logic, just a plain tally appended to the same list. */
function buildBrief(topInsights: ProcessedInsight[], tasks: TaskRow[]): string[] {
  const lines = topInsights.map((i) => i.title);
  const urgent = tasks.filter((t) => t.priority === "urgent").length;
  if (urgent) lines.push(`${urgent} urgent task${urgent === 1 ? "" : "s"} on your list.`);
  if (lines.length === 0) lines.push("Everything is quiet. Production is operating normally.");
  return lines.slice(0, 5);
}

/**
 * Phase G.8.8: suggestions now come directly from the top processed
 * insights' own `action` field — every Insight already carries exactly
 * this {label, href} shape for its single primary call-to-action, so
 * this is a straight map, not a second judgment about what to suggest. */
function buildSuggestions(topInsights: ProcessedInsight[]): Array<{ label: string; to: string }> {
  return topInsights.slice(0, 5).map((i) => ({ label: i.action.label, to: i.action.href }));
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
  if (full && typeof full === "string" && full.trim()) return full.trim().split(" ")[0];
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
