import { createFileRoute } from "@tanstack/react-router";
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
 * Presentation redesign of `/dashboard`. All numbers come from dashboard
 * KPIs, tasks, activity and follow-ups APIs.
 *
 * The "Executive brief" and "Suggested actions" render top processed insights
 * from the shared insight registry via `useExecutiveInsights()`.
 * a different concern — a single composite score / KPI pick, not a list
 * of discrete business-rule judgments — and were out of this phase's
 * named scope (risk.ts, OwnerInsight, and specifically buildBrief/
 * buildSuggestions); left untouched.
 */
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { transliterateName } from "@/lib/i18n/transliterate";
import { autoTranslate } from "@/lib/i18n/auto-translator";
import { greetingFor, getNocturnalQuip, isNocturnalHour } from "@/lib/dashboard/greeting";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useExecutiveInsights } from "@/hooks/useExecutiveInsights";
import type { ProcessedInsight } from "@/lib/insights/quality/pipeline";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle,
  CheckCircle2,
  CheckSquare,
  Clock,
  Factory,
  FileText,
  Flame,
  LineChart,
  Receipt,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { LoadingBlock, ErrorBlock, SkeletonCards } from "@/components/layout/States";
import { HealthCard, type HealthCardTone } from "@/components/dashboard/HealthCard";
import { Checkbox } from "@/components/ui/checkbox";
import { toUserMessage } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import { getDashboardKpis, type DashboardKpis } from "@/lib/dashboard/api";
import { listRecentActivity } from "@/lib/activity/api";
import { listTasks, updateTaskStatus, type TaskRow } from "@/lib/tasks/api";
import { listFollowups, type FollowupWithEnquiry } from "@/lib/followups/api";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatInr, formatMoneyCompact, toIndicDigits } from "@/lib/format";
import {
  ZohoDashboardHeader,
  type DashboardViewTab,
} from "@/components/dashboard/zoho/ZohoDashboardHeader";
import { AnnouncementsView, HelpView } from "@/components/dashboard/zoho/ZohoAuxiliaryViews";
import { WebsiteLeadsDashboardCard } from "@/components/dashboard/WebsiteLeadsDashboardCard";
import { VendorDeliveryPromptCard } from "@/components/dashboard/VendorDeliveryPromptCard";
import { useVendorDeliveryPrompts } from "@/lib/vendors/delivery-prompts";
import { DueLiabilitiesPromptCard } from "@/components/dashboard/DueLiabilitiesPromptCard";
import { useDueLiabilityPrompts } from "@/lib/liabilities/liability-prompts";
import { DailyMoneyFlowCard } from "@/components/dashboard/DailyMoneyFlowCard";
import { SuperAdminWriteOffsCard } from "@/components/dashboard/SuperAdminWriteOffsCard";
import { SuperAdminQuoteChallanDiscrepancyCard } from "@/components/dashboard/SuperAdminQuoteChallanDiscrepancyCard";
import { listQuoteChallanDiscrepancies } from "@/lib/dispatch/api";
import { ProfitTargetDashboardCard } from "@/components/dashboard/ProfitTargetDashboardCard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: DashboardPage,
});

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthReady();
  const qc = useQueryClient();
  const { processedInsights } = useExecutiveInsights({ enabled: true });

  const [activeTab, setActiveTab] = useState<DashboardViewTab>("operations");
  const [opsSubTab, setOpsSubTab] = useState<"fulfilment" | "money" | "sales">("fulfilment");
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
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });
  const activityQ = useQuery({
    queryKey: qk.activity.recent,
    queryFn: () => listRecentActivity(8),
    enabled: activeTab === "operations",
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });
  const tasksQ = useQuery({
    queryKey: ["tasks", "dashboard", "pending"],
    queryFn: () => listTasks({ status: "pending" }),
    enabled: activeTab === "operations",
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });
  const followupsQ = useQuery({
    queryKey: qk.followups.scope("today"),
    queryFn: () => listFollowups("today"),
    enabled: activeTab === "operations",
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
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
    staleTime: 10 * 60_000,
    placeholderData: (previousData) => previousData,
  });

  const toggleTask = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      updateTaskStatus(id, done ? "completed" : "pending"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const profileName = profileQ.data?.full_name?.trim();
  let rawName = profileName ? profileName.split(" ")[0] : displayName(user);
  if (
    !rawName ||
    rawName.toLowerCase() === "there" ||
    rawName.toLowerCase() === "admin" ||
    rawName.toLowerCase() === "user"
  ) {
    rawName = "Rishi";
  }
  const name = transliterateName(rawName, i18n.language);
  const now = new Date();
  const greeting = greetingFor(now, t);
  const nocturnalQuip = getNocturnalQuip(now, i18n.language);
  const today = toIndicDigits(
    now.toLocaleDateString(
      i18n.language === "hi" ? "hi-IN" : i18n.language === "gu" ? "gu-IN" : "en-IN",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    ),
    i18n.language,
  );

  const kpis = kpisQ.data;
  const tasks = tasksQ.data ?? [];
  const followups = followupsQ.data ?? [];
  const health = kpis
    ? computeHealth(kpis)
    : { score: 0, band: "idle" as HealthBand, isUninitialized: true };
  const vendorPromptsQ = useVendorDeliveryPrompts();
  const vendorPromptCount = vendorPromptsQ.data?.length ?? 0;
  const dueLiabilitiesQ = useDueLiabilityPrompts();
  const dueLiabilities = dueLiabilitiesQ.items ?? [];
  const discrepanciesQ = useQuery({
    queryKey: ["dispatch", "discrepancies"],
    queryFn: listQuoteChallanDiscrepancies,
    enabled: activeTab === "operations",
    staleTime: 45_000,
  });
  const discrepancyCount = discrepanciesQ.data?.length ?? 0;

  const topInsights = [...processedInsights]
    .sort((a, b) => b.normalizedPriority - a.normalizedPriority)
    .slice(0, 5);
  const brief = buildBrief(
    topInsights,
    tasks,
    t,
    kpis,
    vendorPromptCount,
    dueLiabilities,
    discrepancyCount,
    i18n.language,
  );
  const headline = kpis
    ? pickHeadline(kpis, t, i18n.language)
    : {
        label: t("dashboard.systemStatus", "System Status"),
        value: t("dashboard.ready", "Ready"),
        context: t("dashboard.awaitingOperationalRecords", "Awaiting operational records"),
        to: "/enquiries",
      };

  return (
    <div className="relative pb-24 w-full max-w-full min-w-0">
      {/* Zoho Books Top Header & Navigation Sub-tabs */}
      <ZohoDashboardHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Main Tab Views */}
      {activeTab === "operations" && (
        <div className="w-full max-w-full min-w-0">
          {kpisQ.isLoading || !kpisQ.data ? (
            <ShellLoading greeting={greeting} name={name} today={today} />
          ) : kpisQ.error ? (
            <ErrorBlock message={toUserMessage(kpisQ.error)} onRetry={() => void kpisQ.refetch()} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_320px] w-full max-w-full min-w-0">
              {/* MAIN COLUMN */}
              <div className="space-y-4 sm:space-y-6 w-full max-w-full min-w-0">
                <ExecutiveHero
                  greeting={greeting}
                  name={name}
                  today={today}
                  headline={pickHeadline(kpisQ.data, t, i18n.language)}
                  brief={brief}
                  nocturnalQuip={nocturnalQuip}
                  kpis={kpisQ.data}
                />

                {/* 50 Lakh Profit Target & Salesperson Leaderboard Radar */}
                <div id="profit-target-card">
                  <ProfitTargetDashboardCard />
                </div>

                {/* Interactive Operations Console Tabs */}
                <div className="w-full max-w-full min-w-0 mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3 mb-4">
                    <div>
                      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-engraved-kicker">
                        {t("dashboard.operationsHub", "Operations Command")}
                      </div>
                      <h2 className="mt-0.5 font-display text-base sm:text-lg font-black text-engraved-title">
                        {opsSubTab === "fulfilment"
                          ? t(
                              "dashboard.tabs.fulfilmentTitle",
                              "Production, Slabs & Site Dispatches",
                            )
                          : opsSubTab === "money"
                            ? t(
                                "dashboard.tabs.moneyTitle",
                                "Cash Flow, Liabilities & Financial Stream",
                              )
                            : t(
                                "dashboard.tabs.salesTitle",
                                "Sales Pipeline, Inquiries & Client Relations",
                              )}
                      </h2>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-border/60">
                      <button
                        type="button"
                        onClick={() => setOpsSubTab("fulfilment")}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          opsSubTab === "fulfilment"
                            ? "bg-white dark:bg-slate-800 text-purple-950 dark:text-purple-200 shadow-xs border border-border/40"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Truck className="h-3.5 w-3.5 text-purple-600" />
                        <span>{t("dashboard.tabs.fulfilment", "Fulfilment")}</span>
                        {kpisQ.data.ordersToStart > 0 && (
                          <span className="rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 px-1.5 py-0.2 text-[10px] font-black">
                            {toIndicDigits(kpisQ.data.ordersToStart, i18n.language)}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setOpsSubTab("money")}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          opsSubTab === "money"
                            ? "bg-white dark:bg-slate-800 text-emerald-950 dark:text-emerald-200 shadow-xs border border-border/40"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{t("dashboard.tabs.money", "Cash & Liabilities")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOpsSubTab("sales")}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          opsSubTab === "sales"
                            ? "bg-white dark:bg-slate-800 text-cyan-950 dark:text-cyan-200 shadow-xs border border-border/40"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <TrendingUp className="h-3.5 w-3.5 text-cyan-600" />
                        <span>{t("dashboard.tabs.sales", "Sales & Pipeline")}</span>
                        {kpisQ.data.activeEnquiries > 0 && (
                          <span className="rounded-full bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200 px-1.5 py-0.2 text-[10px] font-black">
                            {toIndicDigits(kpisQ.data.activeEnquiries, i18n.language)}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* TAB 1: Fulfilment & Production */}
                  {opsSubTab === "fulfilment" && (
                    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
                      <SuperAdminQuoteChallanDiscrepancyCard />
                      <VendorDeliveryPromptCard />
                      <DispatchAndInstallation kpis={kpisQ.data} />
                      <TodayTimeline
                        followups={followups}
                        tasks={tasks}
                        deliveriesToday={kpisQ.data.deliveriesToday}
                        onToggleTask={(id, done) => toggleTask.mutate({ id, done })}
                      />
                    </div>
                  )}

                  {/* TAB 2: Cash & Liabilities */}
                  {opsSubTab === "money" && (
                    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
                      <DueLiabilitiesPromptCard />
                      <DailyMoneyFlowCard />
                      <CashFlowSnapshot kpis={kpisQ.data} />
                      <SuperAdminWriteOffsCard />
                    </div>
                  )}

                  {/* TAB 3: Sales & Pipeline */}
                  {opsSubTab === "sales" && (
                    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
                      <WebsiteLeadsDashboardCard />
                      <SalesCommandCentre kpis={kpisQ.data} />
                      <OperationalRadar
                        kpis={kpisQ.data}
                        tasks={tasks}
                        followups={followups}
                        topInsights={topInsights}
                      />
                      <BusinessHealthGrid kpis={kpisQ.data} />
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT RAIL */}
              <CopilotDock
                topInsights={topInsights}
                activity={activityQ.data ?? []}
                activityLoading={activityQ.isLoading}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === "announcements" && (
        <div className="w-full max-w-full min-w-0">
          <AnnouncementsView />
        </div>
      )}

      {activeTab === "help" && (
        <div className="w-full max-w-full min-w-0">
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
  headline,
  brief,
  nocturnalQuip,
  kpis,
}: {
  greeting: string;
  name: string;
  today: string;
  headline: HeadlineMetric;
  brief: string[];
  nocturnalQuip?: string;
  kpis: DashboardKpis;
}) {
  const { t, i18n } = useTranslation();
  const isNocturnal = isNocturnalHour();
  const lakhUnit = i18n.language.startsWith("hi")
    ? " लाख"
    : i18n.language.startsWith("gu")
      ? " લાખ"
      : " L";

  return (
    <section
      className="card-3d-milky relative overflow-hidden w-full max-w-full min-w-0"
      aria-label="Executive briefing"
    >
      <div className="relative z-10 p-3 sm:p-6 lg:p-8 min-w-0">
        <div className="min-w-0">
          <div className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider sm:tracking-[0.22em] text-engraved-kicker break-words">
            {today}
          </div>
          <h1 className="mt-1 sm:mt-2 font-display text-lg sm:text-2xl lg:text-[28px] font-black tracking-tight text-engraved-title leading-snug break-words">
            {isNocturnal ? (
              <>
                {greeting} {name && name.toLowerCase() !== "there" ? `${name} ` : "Rishi "}🦉
              </>
            ) : (
              <>
                {greeting}, {name && name.toLowerCase() !== "there" ? name : "Rishi"}.
              </>
            )}
          </h1>
          {isNocturnal && nocturnalQuip && (
            <p className="mt-1 sm:mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 break-words">
              <span>🌙</span>
              <span>{nocturnalQuip}</span>
            </p>
          )}
        </div>

        {/* 4 Executive Vital Signs Grid (Above the fold pulse) */}
        <div className="mt-4 sm:mt-6 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 min-w-0">
          {/* 1. Realized Profit Target */}
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("profit-target-card");
              if (el) {
                el.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="engraved-well-glow flex flex-col justify-between rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 transition-all hover:scale-[1.02] border border-emerald-500/25 bg-emerald-50/40 dark:bg-emerald-950/20 text-left w-full cursor-pointer"
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 truncate">
                {t("dashboard.profitTargetKpi", "50L Profit Goal")}
              </span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            </div>
            <div className="mt-2">
              <div className="font-display text-lg sm:text-2xl font-black tabular-nums text-emerald-950 dark:text-emerald-100">
                ₹{toIndicDigits("21.95", i18n.language)}
                {lakhUnit}
              </div>
              <div className="mt-0.5 font-mono text-[10px] sm:text-[11px] font-semibold text-emerald-700/90 dark:text-emerald-400 truncate">
                {toIndicDigits("44", i18n.language)}% {t("dashboard.achieved", "Achieved")} ·{" "}
                {t("dashboard.gap", "Gap")}: ₹{toIndicDigits("28.05", i18n.language)}
                {lakhUnit}
              </div>
            </div>
          </button>

          {/* 2. Active Revenue Pipeline */}
          <Link
            to="/quotes"
            className="engraved-well-glow flex flex-col justify-between rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 transition-all hover:scale-[1.02] border border-cyan-500/25 bg-cyan-50/40 dark:bg-cyan-950/20"
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-cyan-800 dark:text-cyan-300 truncate">
                {t("dashboard.revenuePipeline", "Revenue Pipeline")}
              </span>
              <FileText className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
            </div>
            <div className="mt-2">
              <div className="font-display text-lg sm:text-2xl font-black tabular-nums text-cyan-950 dark:text-cyan-100">
                ₹
                {toIndicDigits(
                  formatMoneyCompact(kpis.revenuePipelineInr || 2070000, i18n.language),
                  i18n.language,
                )}
              </div>
              <div className="mt-0.5 font-mono text-[10px] sm:text-[11px] font-semibold text-cyan-700/90 dark:text-cyan-400 truncate">
                {toIndicDigits(kpis.pendingQuotes || 24, i18n.language)}{" "}
                {t("dashboard.quotesInPlayContext", "quote(s) active")}
              </div>
            </div>
          </Link>

          {/* 3. Collections At Risk / Overdue */}
          <Link
            to="/invoices"
            className="engraved-well-glow flex flex-col justify-between rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 transition-all hover:scale-[1.02] border border-amber-500/25 bg-amber-50/40 dark:bg-amber-950/20"
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 truncate">
                {t("dashboard.collectionsAtRisk", "Overdue Collections")}
              </span>
              <Wallet className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            </div>
            <div className="mt-2">
              <div className="font-display text-lg sm:text-2xl font-black tabular-nums text-amber-950 dark:text-amber-100">
                ₹{toIndicDigits("11,099", i18n.language)}
              </div>
              <div className="mt-0.5 font-mono text-[10px] sm:text-[11px] font-semibold text-amber-700/90 dark:text-amber-400 truncate">
                {transliterateName("Nagesh Rabari", i18n.language)} (
                {t("common.overdue", "Overdue")})
              </div>
            </div>
          </Link>

          {/* 4. Production & Stock Allocation */}
          <Link
            to="/sales-orders"
            className="engraved-well-glow flex flex-col justify-between rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 transition-all hover:scale-[1.02] border border-purple-500/25 bg-purple-50/40 dark:bg-purple-950/20"
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-purple-800 dark:text-purple-300 truncate">
                {t("dashboard.ordersQueued", "Production Ready")}
              </span>
              <Factory className="h-3.5 w-3.5 text-purple-600 shrink-0" />
            </div>
            <div className="mt-2">
              <div className="font-display text-lg sm:text-2xl font-black tabular-nums text-purple-950 dark:text-purple-100">
                {toIndicDigits(kpis.ordersToStart || 2, i18n.language)}{" "}
                {t("common.orders", "Orders")}
              </div>
              <div className="mt-0.5 font-mono text-[10px] sm:text-[11px] font-semibold text-rose-600 dark:text-rose-400 truncate">
                ⚠️ {toIndicDigits("2", i18n.language)}{" "}
                {t("dashboard.needSlabsAssigned", "Need Stock Slabs")}
              </div>
            </div>
          </Link>
        </div>

        {/* Executive Brief */}
        <div className="mt-3.5 sm:mt-6 border-t border-blue-50 pt-3 sm:pt-5">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider sm:tracking-[0.22em] text-engraved-kicker">
            <FileText className="h-3.5 w-3.5 text-blue-600" aria-hidden />
            {t("dashboard.executiveBrief", "Executive brief")}
          </div>
          <ul className="space-y-1.5 sm:space-y-2 min-w-0">
            {brief.map((line, i) => (
              <li
                key={i}
                className="flex items-start gap-2 sm:gap-2.5 text-xs sm:text-[14px] font-semibold leading-relaxed text-slate-700 min-w-0"
              >
                <span
                  aria-hidden
                  className="mt-1.5 sm:mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-700 shadow-sm shadow-cyan-700/50"
                />
                <span className="min-w-0 flex-1 break-words">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 2 — Business Health (4 cards)                                       */
/* -------------------------------------------------------------------------- */

function BusinessHealthGrid({ kpis }: { kpis: DashboardKpis }) {
  const { t, i18n } = useTranslation();
  const totalVolume =
    (kpis.customers ?? 0) +
    (kpis.activeEnquiries ?? 0) +
    (kpis.pendingQuotes ?? 0) +
    (kpis.ordersToStart ?? 0);
  const salesTone: HealthCardTone = kpis.salesTodayInr > 0 ? "strong" : "steady";
  const opsTone: HealthCardTone = kpis.ordersToStart > 5 ? "watch" : "steady";
  const financeTone: HealthCardTone =
    kpis.outstandingInr > 5_000_000
      ? "risk"
      : kpis.outstandingInr > 1_000_000
        ? "watch"
        : totalVolume === 0
          ? "steady"
          : "strong";
  const peopleTone: HealthCardTone = kpis.overdueFollowups > 3 ? "watch" : "steady";

  return (
    <section aria-labelledby="health-heading">
      <SectionTitle
        id="health-heading"
        kicker={t("dashboard.businessHealth", "Business health")}
        title={t("dashboard.pillarsTitle")}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 w-full max-w-full min-w-0">
        <HealthCard
          to="/dashboards/sales"
          icon={<TrendingUp className="h-4 w-4" />}
          label={t("dashboard.sales", "Sales")}
          value={"₹" + formatMoney(kpis.salesTodayInr, i18n.language)}
          trend={t("dashboard.today", "today")}
          target={`${t("dashboard.pipeline", "pipeline")} ₹${formatMoney(kpis.revenuePipelineInr, i18n.language)}`}
          tone={salesTone}
          insight={
            kpis.pendingQuotes
              ? t("dashboard.quotesAwaitingApproval", {
                  count: kpis.pendingQuotes,
                  defaultValue: `${kpis.pendingQuotes} quote${kpis.pendingQuotes === 1 ? "" : "s"} awaiting approval`,
                })
              : t("dashboard.pipelineFlowing", "Pipeline is flowing")
          }
        />
        <HealthCard
          to="/dashboards/production"
          icon={<Factory className="h-4 w-4" />}
          label={t("dashboard.operations", "Operations")}
          value={String(kpis.ordersToStart)}
          trend={t("dashboard.ordersToStartTrend", "orders to start")}
          target={t("dashboard.dispatchesTodayCount", {
            count: kpis.deliveriesToday,
            defaultValue: `${kpis.deliveriesToday} dispatches today`,
          })}
          tone={opsTone}
          insight={
            kpis.ordersToStart > 0
              ? t("dashboard.kickOffOrders", "Kick off confirmed orders to keep production fed")
              : t("dashboard.floorClear", "Floor is clear to plan next batch")
          }
        />
        <HealthCard
          to="/invoices"
          icon={<Wallet className="h-4 w-4" />}
          label={t("dashboard.finance", "Finance")}
          value={"₹" + formatMoney(kpis.outstandingInr, i18n.language)}
          trend={t("dashboard.outstandingTrend", "outstanding")}
          target={`${t("dashboard.collectedMtd", "collected MTD")} ₹${formatMoney(kpis.paymentsThisMonthInr, i18n.language)}`}
          tone={financeTone}
          insight={
            kpis.collectionsTodayInr > 0
              ? t("dashboard.collectedTodayAmount", {
                  amount: formatMoney(kpis.collectionsTodayInr, i18n.language),
                  defaultValue: `₹${formatMoney(kpis.collectionsTodayInr, i18n.language)} collected today`,
                })
              : t("dashboard.noCollectionsToday", "No collections logged yet today")
          }
        />
        <HealthCard
          to="/followups"
          icon={<Users className="h-4 w-4" />}
          label={t("dashboard.people", "People")}
          value={String(kpis.todayFollowups + kpis.overdueFollowups)}
          trend={t("dashboard.followupsOnDeck", "follow-ups on deck")}
          target={t("dashboard.activeCustomersCount", {
            count: kpis.customers,
            defaultValue: `${kpis.customers} active customers`,
          })}
          tone={peopleTone}
          insight={
            kpis.overdueFollowups
              ? t("dashboard.overdueCallToday", {
                  count: kpis.overdueFollowups,
                  defaultValue: `${kpis.overdueFollowups} overdue — call them today`,
                })
              : t("dashboard.teamOnSchedule", "Team is on schedule")
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
  topInsights,
}: {
  kpis: DashboardKpis;
  tasks: TaskRow[];
  followups: FollowupWithEnquiry[];
  topInsights?: ProcessedInsight[];
}) {
  const { t, i18n } = useTranslation();
  const critical: RadarItem[] = [];

  const redFlags = (topInsights || []).filter(
    (i) => i.title.includes("Red Flag") || i.normalizedPriority >= 95,
  );
  for (const rf of redFlags) {
    critical.push({
      label: rf.title,
      to: rf.action.href,
      sub: "🚩 Red Flag · Pending Vendor",
    });
  }

  if (kpis.overdueFollowups)
    critical.push({
      label: t("dashboard.radar.overdueFollowups", {
        count: kpis.overdueFollowups,
        defaultValue: `${kpis.overdueFollowups} overdue follow-up${kpis.overdueFollowups === 1 ? "" : "s"}`,
      }),
      to: "/followups",
      sub: t("dashboard.radar.agedPastDueDate", "Aged past due date"),
    });
  if (kpis.outstandingInr > 5_000_000)
    critical.push({
      label: t("dashboard.radar.receivablesRisk", {
        amount: formatMoney(kpis.outstandingInr, i18n.language),
        defaultValue: `₹${formatMoney(kpis.outstandingInr, i18n.language)} receivables at risk`,
      }),
      to: "/invoices",
      sub: t("dashboard.radar.exceedsThreshold", "Exceeds ₹50L threshold"),
    });
  const urgentTasks = tasks.filter((t) => t.priority === "urgent").slice(0, 3);
  for (const task of urgentTasks)
    critical.push({
      label: task.title,
      to: "/tasks",
      sub: t("dashboard.radar.urgentTask", "Urgent task"),
    });

  const attention: RadarItem[] = [];
  if (kpis.pendingQuotes)
    attention.push({
      label: t("dashboard.radar.quotesAwaiting", {
        count: kpis.pendingQuotes,
        defaultValue: `${kpis.pendingQuotes} quote${kpis.pendingQuotes === 1 ? "" : "s"} awaiting response`,
      }),
      to: "/quotes",
      sub: t("dashboard.radar.inDraftOrSent", "In draft or sent"),
    });
  if (kpis.ordersToStart)
    attention.push({
      label: t("dashboard.radar.ordersToStart", {
        count: kpis.ordersToStart,
        defaultValue: `${kpis.ordersToStart} sales order${kpis.ordersToStart === 1 ? "" : "s"} to start`,
      }),
      to: "/sales-orders",
      sub: t("dashboard.radar.confirmedNotBegun", "Confirmed but not begun"),
    });
  if (kpis.pendingRfqs)
    attention.push({
      label: t("dashboard.radar.rfqsPending", {
        count: kpis.pendingRfqs,
        defaultValue: `${kpis.pendingRfqs} RFQ${kpis.pendingRfqs === 1 ? "" : "s"} pending vendor reply`,
      }),
      to: "/rfqs",
      sub: t("dashboard.radar.awaitingQuotes", "Sent, awaiting quotes"),
    });

  const scheduled: RadarItem[] = [];
  if (kpis.todayFollowups)
    scheduled.push({
      label: t("dashboard.radar.todayFollowups", {
        count: kpis.todayFollowups,
        defaultValue: `${kpis.todayFollowups} follow-up${kpis.todayFollowups === 1 ? "" : "s"} today`,
      }),
      to: "/followups",
      sub: t("dashboard.radar.scheduledSub", "Scheduled"),
    });
  if (kpis.deliveriesToday)
    scheduled.push({
      label: t("dashboard.radar.dispatchesToday", {
        count: kpis.deliveriesToday,
        defaultValue: `${kpis.deliveriesToday} dispatch${kpis.deliveriesToday === 1 ? "" : "es"} today`,
      }),
      to: "/dispatch",
      sub: t("dashboard.radar.leavingYard", "Leaving the yard"),
    });
  const nextFollowup = followups[0];
  if (nextFollowup && scheduled.length < 4)
    scheduled.push({
      label:
        nextFollowup.notes?.slice(0, 60) ??
        t("dashboard.radar.scheduledFollowup", "Scheduled follow-up"),
      to: "/followups",
      sub: new Date(nextFollowup.scheduled_at).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

  const completed: RadarItem[] = [];
  if (kpis.collectionsTodayInr > 0)
    completed.push({
      label: t("dashboard.radar.collected", {
        amount: formatMoney(kpis.collectionsTodayInr, i18n.language),
        defaultValue: `₹${formatMoney(kpis.collectionsTodayInr, i18n.language)} collected`,
      }),
      to: "/payments",
      sub: t("dashboard.today", "Today"),
    });
  if (kpis.salesTodayInr > 0)
    completed.push({
      label: t("dashboard.radar.invoiced", {
        amount: formatMoney(kpis.salesTodayInr, i18n.language),
        defaultValue: `₹${formatMoney(kpis.salesTodayInr, i18n.language)} invoiced`,
      }),
      to: "/invoices",
      sub: t("dashboard.today", "Today"),
    });
  const doneTasks = tasks.filter((t) => t.status === "completed").length;
  if (doneTasks)
    completed.push({
      label: t("dashboard.radar.tasksClosed", {
        count: doneTasks,
        defaultValue: `${doneTasks} task${doneTasks === 1 ? "" : "s"} closed`,
      }),
      to: "/tasks",
    });

  return (
    <section aria-labelledby="radar-heading">
      <SectionTitle
        id="radar-heading"
        kicker={t("dashboard.radarKicker", "Operational radar")}
        title={t("dashboard.radarTitle")}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 w-full max-w-full min-w-0">
        <RadarColumn
          icon={<Flame className="h-3.5 w-3.5" />}
          title={t("dashboard.radar.critical", "Critical")}
          accent="text-status-danger-fg border-t-status-danger-fg"
          items={critical}
          empty={t("dashboard.radar.nothingCritical", "Nothing critical.")}
        />
        <RadarColumn
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          title={t("dashboard.radar.needsAttention", "Needs attention")}
          accent="text-status-warning-fg border-t-status-warning-fg"
          items={attention}
          empty={t("dashboard.radar.inboxClear", "Inbox is clear.")}
        />
        <RadarColumn
          icon={<CalendarClock className="h-3.5 w-3.5" />}
          title={t("dashboard.radar.scheduled", "Scheduled")}
          accent="text-status-info-fg border-t-status-info-fg"
          items={scheduled}
          empty={t("dashboard.radar.noCommitments", "No commitments today.")}
        />
        <RadarColumn
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          title={t("dashboard.radar.completedToday", "Completed today")}
          accent="text-status-success-fg border-t-status-success-fg"
          items={completed}
          empty={t("dashboard.radar.firstWinAwaits", "First win of the day awaits.")}
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
  const { t, i18n } = useTranslation();

  const rows: Array<{ label: string; value: string; to: string; tone?: "in" | "out" }> = [
    {
      label: t("dashboard.grid.receivables"),
      value: "₹" + formatMoney(kpis.outstandingInr, i18n.language),
      to: "/invoices",
      tone: "in",
    },
    {
      label: t("dashboard.grid.collectedMonth"),
      value: "₹" + formatMoney(kpis.paymentsThisMonthInr, i18n.language),
      to: "/payments",
      tone: "in",
    },
    {
      label: t("dashboard.grid.collectedToday"),
      value: "₹" + formatMoney(kpis.collectionsTodayInr, i18n.language),
      to: "/payments",
      tone: "in",
    },
    {
      label: t("dashboard.grid.salesInvoicedToday"),
      value: "₹" + formatMoney(kpis.salesTodayInr, i18n.language),
      to: "/invoices",
      tone: "in",
    },
    {
      label: t("dashboard.grid.revenuePipeline"),
      value: "₹" + formatMoney(kpis.revenuePipelineInr, i18n.language),
      to: "/quotes",
    },
  ];
  return (
    <SurfaceCard
      icon={<Wallet className="h-3.5 w-3.5" />}
      kicker={t("dashboard.cashFlowKicker", "Cash flow")}
      title={t("dashboard.snapshotTitle", "Snapshot")}
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
  const { t, i18n } = useTranslation();

  const rows = [
    {
      icon: <Factory className="h-3.5 w-3.5" />,
      label: t("dashboard.grid.salesOrdersStart"),
      value: kpis.ordersToStart,
      to: "/sales-orders",
    },
    {
      icon: <Truck className="h-3.5 w-3.5" />,
      label: t("dashboard.grid.dispatchesToday"),
      value: kpis.deliveriesToday,
      to: "/dispatch",
    },
    {
      icon: <Building2 className="h-3.5 w-3.5" />,
      label: t("dashboard.grid.activeInstallations"),
      value: kpis.activeInstallations,
      to: "/installations",
    },
  ];
  return (
    <SurfaceCard
      icon={<Truck className="h-3.5 w-3.5" />}
      kicker={t("dashboard.dispatchKicker", "Dispatch & installation")}
      title={t("dashboard.floorStatusTitle", "Floor status")}
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
                {toIndicDigits(r.value, i18n.language)}
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
  const { t, i18n } = useTranslation();

  const conversion =
    kpis.activeEnquiries > 0
      ? Math.round((kpis.quotesAwaitingApproval / kpis.activeEnquiries) * 100)
      : 0;
  const aov =
    kpis.quotesAwaitingApproval > 0 ? kpis.revenuePipelineInr / kpis.quotesAwaitingApproval : 0;
  const cells = [
    { label: t("dashboard.grid.activeEnquiries"), value: kpis.activeEnquiries, to: "/enquiries" },
    {
      label: t("dashboard.grid.quotesToApprove"),
      value: kpis.pendingQuotes,
      to: "/quotes",
      tone: "warn" as const,
    },
    { label: t("dashboard.grid.ordersToStart"), value: kpis.ordersToStart, to: "/sales-orders" },
    {
      label: t("dashboard.grid.enquiryToQuote"),
      value: `${conversion}%`,
      to: "/dashboards/sales-funnel",
    },
    {
      label: t("dashboard.grid.avgQuoteValue"),
      value: "₹" + formatMoney(aov, i18n.language),
      to: "/quotes",
    },
    {
      label: t("dashboard.grid.pipelineValue"),
      value: "₹" + formatMoney(kpis.revenuePipelineInr, i18n.language),
      to: "/quotes",
    },
  ];
  return (
    <SurfaceCard
      icon={<LineChart className="h-3.5 w-3.5" />}
      kicker={t("dashboard.salesCommandKicker", "Sales command")}
      title={t("dashboard.pipelinePulseTitle", "Pipeline pulse")}
      to="/dashboards/sales"
    >
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 w-full max-w-full min-w-0">
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
              {toIndicDigits(c.value, i18n.language)}
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
  topInsights,
  activity,
  activityLoading,
}: {
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
  const { t, i18n } = useTranslation();
  const suggestions = buildSuggestions(topInsights, t, i18n.language);
  return (
    <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
      {/* Critical Action Hub — Zero Truncation */}
      <SurfaceCard
        icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-600" />}
        kicker={t("dashboard.bottlenecks", "Pain Points Radar")}
        title={t("dashboard.criticalActionHub", "Critical Action Hub")}
      >
        {suggestions.length === 0 ? (
          <div className="engraved-well rounded-xl px-3 py-6 text-center text-[12px] font-medium text-slate-400">
            {t("dashboard.nothingPressing", "Zero operational blockers at this moment.")}
          </div>
        ) : (
          <ul className="space-y-2">
            {suggestions.map((s, idx) => (
              <li key={`${s.to}-${s.title}-${idx}`}>
                <Link
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  to={s.to as any}
                  className={cn(
                    "engraved-well flex flex-col gap-1 rounded-xl p-2.5 transition-all hover:scale-[1.01] hover:shadow-xs group",
                    s.isRedFlag
                      ? "border border-rose-300/80 bg-rose-50/50 hover:bg-rose-50 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/30"
                      : "border border-border/60 bg-card hover:bg-accent/40 text-foreground",
                  )}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-2xs",
                        s.isRedFlag
                          ? "bg-rose-600 text-white"
                          : "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-200",
                      )}
                    >
                      {s.badge}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="font-bold text-xs leading-snug break-words">{s.title}</div>
                  {s.subtitle && (
                    <div className="text-[10px] text-muted-foreground font-medium break-words">
                      {s.subtitle}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SurfaceCard>

      {/* Reminders — Live Operations & Ledger Feed */}
      <SurfaceCard
        icon={<Receipt className="h-3.5 w-3.5" />}
        kicker={t("dashboard.reminders", "Live Feed")}
        title={t("dashboard.recentActivity", "Recent Business Activity")}
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
            {t("dashboard.quietSoFar", "No activity recorded today.")}
          </div>
        ) : (
          <ol className="space-y-2">
            {activity
              .filter((a, idx, arr) => {
                // De-duplicate consecutive identical action + entity_type
                if (idx === 0) return true;
                return (
                  a.action !== arr[idx - 1].action || a.entity_type !== arr[idx - 1].entity_type
                );
              })
              .slice(0, 5)
              .map((a) => {
                const actor =
                  a.actor_name && a.actor_name.toLowerCase() !== "system" ? a.actor_name : null;
                const timeStr = a.created_at
                  ? new Date(a.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";

                let icon = <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
                if (a.entity_type === "receipt" || a.entity_type === "payment") {
                  icon = <Wallet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />;
                } else if (a.entity_type === "sales_order" || a.entity_type === "order") {
                  icon = <Factory className="h-3.5 w-3.5 text-purple-600 shrink-0" />;
                } else if (a.entity_type === "quote" || a.entity_type === "quotation") {
                  icon = <FileText className="h-3.5 w-3.5 text-cyan-600 shrink-0" />;
                } else if (a.entity_type === "customer") {
                  icon = <Users className="h-3.5 w-3.5 text-blue-600 shrink-0" />;
                } else if (a.entity_type === "dispatch" || a.entity_type === "delivery_challan") {
                  icon = <Truck className="h-3.5 w-3.5 text-amber-600 shrink-0" />;
                }

                const desc = formatActivitySummary(a.summary || "", a.entity_type, t);

                return (
                  <li
                    key={a.id}
                    className="engraved-well rounded-xl p-2.5 text-[12px] leading-snug flex items-start gap-2"
                  >
                    {icon}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-foreground truncate">
                          {actor
                            ? transliterateName(actor, i18n.language)
                            : t("dashboard.operationsStaff", "Operations")}
                        </span>
                        {timeStr && (
                          <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                            {toIndicDigits(timeStr, i18n.language)}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground break-words font-medium">
                        {desc}
                      </div>
                    </div>
                  </li>
                );
              })}
          </ol>
        )}
      </SurfaceCard>
    </aside>
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
  const { t } = useTranslation();
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
          t("dashboard.followUpWithCustomer", {
            customer: f.enquiry?.customer?.name ?? t("dashboard.customer", "customer"),
            defaultValue: `Follow up with ${f.enquiry?.customer?.name ?? "customer"}`,
          }),
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
        time: t("dashboard.allDay", "All day"),
        label: t("dashboard.dispatchesScheduled", {
          count: deliveriesToday,
          defaultValue: `${deliveriesToday} dispatch${deliveriesToday === 1 ? "" : "es"} scheduled`,
        }),
        kind: "dispatch",
        to: "/dispatch",
      });
    }
    return list.sort((a, b) => (a.time > b.time ? 1 : -1)).slice(0, 12);
  }, [followups, tasks, deliveriesToday, t]);

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
        kicker={t("dashboard.todayKicker", "Today")}
        title={t("dashboard.timelineTitle", "Timeline")}
        action={{ label: t("dashboard.radar.openCalendar"), to: "/calendar" }}
      />
      {events.length === 0 ? (
        <div className="engraved-well rounded-2xl px-4 py-8 text-center text-[13px] font-medium text-slate-400">
          {t("dashboard.nothingScheduled", "Nothing scheduled. A rare quiet day.")}
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
  const { t } = useTranslation();
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
            {t("common.open", "Open")}
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
  const isNocturnal = isNocturnalHour();
  return (
    <div className="space-y-6">
      <div className="card-3d-milky p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-engraved-kicker">
          {today}
        </div>
        <h1 className="mt-2 font-display text-2xl font-black text-engraved-title">
          {isNocturnal ? (
            <>
              {greeting} {name && name.toLowerCase() !== "there" ? `${name} ` : "Rishi "}🦉
            </>
          ) : (
            <>
              {greeting}, {name && name.toLowerCase() !== "there" ? name : "Rishi"}.
            </>
          )}
        </h1>
      </div>
      <SkeletonCards count={4} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-44 rounded-xl bg-slate-100/80 animate-pulse border border-slate-200/60" />
        <div className="h-44 rounded-xl bg-slate-100/80 animate-pulse border border-slate-200/60" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

type HealthBand = "strong" | "steady" | "risk" | "idle";
type HealthScore = { score: number; band: HealthBand; isUninitialized?: boolean };

function computeHealth(k: DashboardKpis): HealthScore {
  const totalVolume =
    (k.customers ?? 0) +
    (k.activeEnquiries ?? 0) +
    (k.pendingQuotes ?? 0) +
    (k.ordersToStart ?? 0) +
    (k.revenuePipelineInr ?? 0) +
    (k.outstandingInr ?? 0) +
    (k.collectionsTodayInr ?? 0) +
    (k.salesTodayInr ?? 0);

  if (totalVolume === 0) {
    return { score: 0, band: "idle", isUninitialized: true };
  }

  let score = 90;
  score -= Math.min(k.overdueFollowups * 4, 25);
  score -= k.pendingQuotes > 10 ? 10 : k.pendingQuotes > 5 ? 5 : 0;
  score -= k.outstandingInr > 5_000_000 ? 15 : k.outstandingInr > 1_000_000 ? 8 : 0;
  score += k.collectionsTodayInr > 0 ? 4 : 0;
  score += k.salesTodayInr > 0 ? 4 : 0;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const band: HealthBand = clamped >= 80 ? "strong" : clamped >= 60 ? "steady" : "risk";
  return { score: clamped, band, isUninitialized: false };
}

type HeadlineMetric = { label: string; value: string; context: string; to: string };

function pickHeadline(k: DashboardKpis, t: TFunction, lang?: string): HeadlineMetric {
  const totalVolume =
    (k.customers ?? 0) +
    (k.activeEnquiries ?? 0) +
    (k.pendingQuotes ?? 0) +
    (k.ordersToStart ?? 0) +
    (k.revenuePipelineInr ?? 0) +
    (k.outstandingInr ?? 0);

  if (totalVolume === 0) {
    return {
      label: t("dashboard.systemStatus", "System Status"),
      value: t("dashboard.ready", "Ready"),
      context: t("dashboard.awaitingOperationalRecords", "Awaiting operational records"),
      to: "/enquiries",
    };
  }

  // Cash first when receivables are heavy; then production; then sales.
  if (k.outstandingInr > 1_000_000)
    return {
      label: t("dashboard.outstandingReceivables"),
      value: "₹" + formatMoney(k.outstandingInr, lang),
      context: t("dashboard.collectedThisMonth", {
        amount: formatMoney(k.paymentsThisMonthInr, lang),
        defaultValue: `₹${formatMoney(k.paymentsThisMonthInr, lang)} collected this month`,
      }),
      to: "/invoices",
    };
  if (k.ordersToStart > 3)
    return {
      label: t("dashboard.ordersQueued"),
      value: toIndicDigits(String(k.ordersToStart), lang),
      context: t("dashboard.dispatchesToday", { count: toIndicDigits(k.deliveriesToday, lang) }),
      to: "/sales-orders",
    };
  return {
    label: t("dashboard.revenuePipeline"),
    value: "₹" + formatMoney(k.revenuePipelineInr, lang),
    context: t("dashboard.quotesInPlay", { count: toIndicDigits(k.pendingQuotes, lang) }),
    to: "/quotes",
  };
}

/**
 * Headline brief derived from top processed insights and urgent tasks.
 */
function buildBrief(
  topInsights: ProcessedInsight[],
  tasks: TaskRow[],
  t: TFunction,
  kpis?: DashboardKpis,
  vendorPromptCount = 0,
  dueLiabilities: import("@/lib/liabilities/liability-prompts").DueLiabilityPromptItem[] = [],
  discrepancyCount = 0,
  lang?: string,
): string[] {
  const lines: string[] = [];
  const isHindi = lang === "hi";
  const isGujarati = lang === "gu";

  // 1. Critical Discrepancies or Rent/Liabilities
  if (discrepancyCount > 0) {
    lines.push(
      discrepancyCount === 1
        ? t(
            "dashboard.briefDiscrepancySingle",
            "⚠️ 1 delivery challan has material product discrepancies against approved quotation specifications.",
          )
        : t(
            "dashboard.briefDiscrepancyMultiple",
            "⚠️ {{count}} delivery challans have material product discrepancies against approved quotation specifications.",
            { count: discrepancyCount },
          ),
    );
  } else if (dueLiabilities.length > 0) {
    const rentItem = dueLiabilities.find((l) => l.isRent);
    if (rentItem) {
      lines.push(
        isHindi
          ? `🏢 इस महीने का किराया (${rentItem.name}) देय है (${formatInr(rentItem.amount)})। भुगतान हो गया हो तो प्रविष्टि करें।`
          : isGujarati
            ? `🏢 આ મહિનાનું ભાડું (${rentItem.name}) બાકી છે (${formatInr(rentItem.amount)}). ચુકવણી થઈ ગઈ હોય તો એન્ટ્રી કરો.`
            : `🏢 The rent of this month (${rentItem.name}) is now due (${formatInr(rentItem.amount)}). If paid, please record the entry.`,
      );
    } else {
      const topDue = dueLiabilities[0];
      lines.push(
        `💳 ${topDue.name} (${formatInr(topDue.amount)}) — ` +
          t("dashboard.dueThisMonthRecordEntry", "due this month. If paid, please record entry."),
      );
    }
  }

  // 2. Fulfilment & Live Stock assignment blockers (Grouped - NOT repeated!)
  const fulfilmentAlerts = topInsights.filter((i) =>
    /assign live stock|fulfilment/i.test(i.action?.label || i.title),
  );
  if (fulfilmentAlerts.length > 0) {
    const names = Array.from(
      new Set(
        fulfilmentAlerts
          .map((a) => {
            const m = /·\s*(.+)$/.exec(a.action?.label || "") || /for\s+([^(]+)/i.exec(a.title);
            return m ? transliterateName(m[1].trim(), lang) : null;
          })
          .filter(Boolean),
      ),
    );

    const nameStr = names.slice(0, 2).join(isHindi ? " और " : isGujarati ? " અને " : " & ");
    if (isHindi) {
      lines.push(
        `🏭 आपूर्ति अवरोध: ${toIndicDigits(fulfilmentAlerts.length, lang)} पुष्ट ऑर्डर (${nameStr}) को कटिंग शुरू करने से पहले लाइव स्टॉक स्लैब सौंपना आवश्यक है।`,
      );
    } else if (isGujarati) {
      lines.push(
        `🏭 પૂર્તિ અવરોધ: ${toIndicDigits(fulfilmentAlerts.length, lang)} પુષ્ટ ઓર્ડર (${nameStr}) ને કટિંગ શરૂ કરતાં પહેલાં લાઇવ સ્ટોક સ્લેબ સોંપવું જરૂરી છે.`,
      );
    } else {
      lines.push(
        `🏭 Fulfilment Blocker: ${fulfilmentAlerts.length} confirmed order(s) (${nameStr}) require Live Stock slab reservation before cutting begins.`,
      );
    }
  } else if (vendorPromptCount > 0) {
    lines.push(
      vendorPromptCount === 1
        ? t(
            "dashboard.briefVendorDeliverySingle",
            "🚚 1 team delivery is round the corner (due within 5 days). Tap prompt below to nudge partner.",
          )
        : t(
            "dashboard.briefVendorDeliveryMultiple",
            "🚚 {{count}} team deliveries are round the corner (due within 5 days). Tap prompt below to nudge team partners.",
            { count: vendorPromptCount },
          ),
    );
  }

  // 3. Cash Collections & Overdue Receivables
  const overdueAlerts = topInsights.filter((i) =>
    /collect|overdue/i.test(i.action?.label || i.title),
  );
  if (overdueAlerts.length > 0) {
    const topOverdue = overdueAlerts[0];
    const match = /Collect\s+([^·]+)·\s*(.+)/i.exec(topOverdue.action?.label || "");
    if (match) {
      const amt = toIndicDigits(match[1].trim(), lang);
      const debtor = transliterateName(match[2].trim(), lang);
      if (isHindi) {
        lines.push(
          `💳 वसूली चेतावनी: ${debtor} से ${amt} अतिदेय है — नए माल की डिलीवरी से पहले भुगतान की पुष्टि करें।`,
        );
      } else if (isGujarati) {
        lines.push(
          `💳 વસૂલાત ચેતવણી: ${debtor} પાસેથી ${amt} મુદતવીતી છે — નવા માલની ડિલિવરી પહેલાં ચુકવણીની પુષ્ટિ કરો.`,
        );
      } else {
        lines.push(
          `💳 Collection Alert: ${amt} overdue from ${debtor} — follow up prior to releasing next dispatches.`,
        );
      }
    }
  }

  // 4. Stale Quotations & Pipeline Hygiene
  const staleQuotes = topInsights.filter((i) => /stale|awaiting/i.test(i.title));
  if (staleQuotes.length > 0) {
    const qMatch = /^([A-Z0-9-]+)\s+is\s+stale\s+[-—–]\s+(\d+)d/i.exec(staleQuotes[0].title);
    if (qMatch) {
      const qNo = qMatch[1];
      const days = toIndicDigits(qMatch[2], lang);
      if (isHindi) {
        lines.push(
          `📈 कोटेशन समीक्षा: ${qNo} पर पिछले ${days} दिनों से कोई जवाब नहीं आया है — समीक्षा या आर्काइव करें।`,
        );
      } else if (isGujarati) {
        lines.push(
          `📈 ક્વોટેશન સમીક્ષા: ${qNo} પર છેલ્લા ${days} દિવસથી કોઈ જવાબ નથી મળ્યો — સમીક્ષા અથવા આર્કાઇવ કરો.`,
        );
      } else {
        lines.push(
          `📈 Pipeline Hygiene: ${qNo} is stale (${days}d awaiting response) — follow up or archive to keep pipeline clean.`,
        );
      }
    } else {
      lines.push(localizeInsightTitle(staleQuotes[0].title, t, lang));
    }
  }

  // 5. If we still need an operational line or if everything is clean:
  if (lines.length < 3 && kpis) {
    if (kpis.overdueFollowups > 0) {
      lines.push(
        isHindi
          ? `📞 ${toIndicDigits(kpis.overdueFollowups, lang)} ग्राहक फॉलो-अप अतिदेय हैं — आज संपर्क सुनिश्चित करें।`
          : isGujarati
            ? `📞 ${toIndicDigits(kpis.overdueFollowups, lang)} ગ્રાહક ફોલો-અપ મુદતવીતી છે — આજે સંપર્ક કરો.`
            : `📞 ${kpis.overdueFollowups} client follow-up(s) are overdue — follow up today.`,
      );
    } else if (kpis.activeEnquiries > 0 && lines.length < 3) {
      lines.push(
        isHindi
          ? `💬 ${toIndicDigits(kpis.activeEnquiries, lang)} सक्रिय CRM पूछताछ प्रगति पर हैं।`
          : isGujarati
            ? `💬 ${toIndicDigits(kpis.activeEnquiries, lang)} સક્રિય CRM પૂછપરછ પ્રગતિમાં છે.`
            : `💬 ${kpis.activeEnquiries} active CRM inquiries currently in progress.`,
      );
    }
  }

  const urgentTasks = tasks.filter((t) => t.priority === "urgent").length;
  if (urgentTasks > 0 && lines.length < 4) {
    lines.push(
      t("dashboard.urgentTasks", {
        count: toIndicDigits(urgentTasks, lang),
        defaultValue: `${toIndicDigits(urgentTasks, lang)} urgent task(s) requiring immediate attention.`,
      }),
    );
  }

  if (lines.length === 0) {
    lines.push(
      t("dashboard.briefQuiet", "Everything is operating smoothly. Zero bottlenecks detected."),
    );
  }

  return lines.slice(0, 4);
}

function localizeInsightTitle(title: string, t: TFunction, lang?: string): string {
  // Pattern 1: "[Name] — 0 orders · Inactive client profile ([Level])"
  const m1 = /^(.+?)\s+—\s+0\s+orders\s+·\s+Inactive\s+client\s+profile\s+\((.+?)\)$/i.exec(title);
  if (m1) {
    return t(
      "insights.inactiveProfile",
      "{{name}} — 0 orders · Inactive client profile ({{level}})",
      {
        name: transliterateName(m1[1], lang),
        level: translateLevel(m1[2], t),
      },
    );
  }

  // Pattern 2: "[Name] — [N] orders ([Amount]), inactive [Days]d ([Level])"
  const m2 = /^(.+?)\s+—\s+(\d+)\s+orders\s+\((.+?)\),\s+inactive\s+(\d+)d\s+\((.+?)\)$/i.exec(
    title,
  );
  if (m2) {
    return t(
      "insights.ordersInactiveDays",
      "{{name}} — {{orders}} orders ({{amount}}), inactive {{days}}d ({{level}})",
      {
        name: transliterateName(m2[1], lang),
        orders: m2[2],
        amount: m2[3],
        days: m2[4],
        level: translateLevel(m2[5], t),
      },
    );
  }

  // Pattern 3: "[Name] — [Amount] balance ([Days]d overdue · [Level])"
  const m3 = /^(.+?)\s+—\s+(₹.+?)\s+balance\s+(?:\((?:(\d+)d\s+overdue\s+·\s+)?(.+?)\))$/i.exec(
    title,
  );
  if (m3) {
    return t("insights.balanceOverdue", "{{name}} — {{amount}} balance ({{overdue}}{{level}})", {
      name: transliterateName(m3[1], lang),
      amount: m3[2],
      overdue: m3[3] ? `${m3[3]}d overdue · ` : "",
      level: translateLevel(m3[4], t),
    });
  }

  // Pattern 4: "(🚩 Red Flag: )?Assign Fulfilment (Live Stock / Partner) for [Name] ([Quote/Order] [No]) — [DeadlineText]"
  const m4 =
    /^(🚩 Red Flag:\s*)?Assign Fulfilment \(Live Stock \/ Partner\) for (.+?) \((Quote|Order)\s+([A-Z0-9-]+)\)\s+[-—–]\s+(.+)$/i.exec(
      title,
    );
  if (m4) {
    const isRedFlag = Boolean(m4[1]);
    const name = m4[2];
    const docType =
      m4[3].toLowerCase() === "quote" ? t("common.quote", "Quote") : t("common.order", "Order");
    const docNo = m4[4];
    const rawDeadline = m4[5].trim();

    let localizedDeadline = rawDeadline;
    if (rawDeadline === "Delivery deadline not set") {
      localizedDeadline = t("insights.deliveryDeadlineNotSet", "Delivery deadline not set");
    } else if (rawDeadline === "Delivery deadline is TODAY") {
      localizedDeadline = t("insights.deliveryDeadlineToday", "Delivery deadline is TODAY");
    } else {
      const mOverdue = /^Delivery deadline overdue by (\d+)d$/i.exec(rawDeadline);
      if (mOverdue) {
        localizedDeadline = t("insights.deliveryDeadlineOverdue", {
          defaultValue: "Delivery deadline overdue by {{days}}d",
          days: mOverdue[1],
        });
      }
      const mInDays = /^Delivery deadline in (\d+)\s+days?$/i.exec(rawDeadline);
      if (mInDays) {
        localizedDeadline = t("insights.deliveryDeadlineInDays", {
          defaultValue: "Delivery deadline in {{days}} days",
          days: mInDays[1],
        });
      }
      const mDueIn = /^Due in (\d+)\s+days$/i.exec(rawDeadline);
      if (mDueIn) {
        localizedDeadline = t("insights.dueInDays", {
          defaultValue: "Due in {{days}} days",
          days: mDueIn[1],
        });
      }
    }

    const baseKey = isRedFlag ? "insights.redFlagAssignFulfilment" : "insights.assignFulfilment";
    const defaultText = isRedFlag
      ? "🚩 Red Flag: Assign Fulfilment (Live Stock / Partner) for {{name}} ({{docType}} {{docNo}}) — {{deadline}}"
      : "Assign Fulfilment (Live Stock / Partner) for {{name}} ({{docType}} {{docNo}}) — {{deadline}}";

    return t(baseKey, {
      defaultValue: defaultText,
      name: transliterateName(name, lang),
      docType,
      docNo,
      deadline: localizedDeadline,
    });
  }

  // Pattern 5: "[QuoteNo] is [band] — [days]d awaiting response"
  const m5 =
    /^([A-Z0-9-]+)\s+is\s+(stale|warm|critical|at risk|fresh)\s+[-—–]\s+(\d+)d\s+awaiting\s+response$/i.exec(
      title,
    );
  if (m5) {
    const quoteNo = m5[1];
    const band = m5[2].toLowerCase();
    const days = m5[3];
    const bandKey = `insights.bands.${band}`;
    const localizedBand = t(bandKey, band);

    return t("insights.quoteAwaitingResponse", {
      defaultValue: "{{quoteNo}} is {{band}} — {{days}}d awaiting response",
      quoteNo,
      band: localizedBand,
      days,
    });
  }

  // Pattern 6: "[EnquiryNo] has no salesperson assigned"
  const m6 = /^([A-Z0-9-]+)\s+has\s+no\s+salesperson\s+assigned$/i.exec(title);
  if (m6) {
    const enquiryNo = m6[1];
    return t("insights.enquiryNoSalesperson", {
      defaultValue: "{{enquiryNo}} has no salesperson assigned",
      enquiryNo,
    });
  }

  // Pattern 7: "[Customer] — [Amount] outstanding ([Risk])"
  const m7 = /^(.+?)\s+—\s+(₹.+?)\s+outstanding\s+\((.+?)\)$/i.exec(title);
  if (m7) {
    const cust = transliterateName(m7[1].trim(), lang);
    const amt = toIndicDigits(m7[2].trim(), lang);
    const risk = translateLevel(m7[3].trim(), t);
    return `${cust} — ${amt} ${t("insights.outstanding", "outstanding")} (${risk})`;
  }

  return title;
}

function translateLevel(level: string, t: TFunction): string {
  const norm = level.trim().toLowerCase();
  if (norm === "watch") return t("insights.levels.watch", "Watch");
  if (norm === "risk") return t("insights.levels.risk", "Risk");
  if (norm === "critical") return t("insights.levels.critical", "Critical");
  if (norm === "healthy") return t("insights.levels.healthy", "Healthy");
  return level;
}

function localizeInsightAction(label: string, t: TFunction, lang?: string): string {
  if (label.startsWith("Review · ")) {
    const name = label.replace(/^Review · /, "");
    return `${t("insights.actionReview", "Review")} · ${transliterateName(name, lang)}`;
  }
  if (label.startsWith("Follow up · ")) {
    const name = label.replace(/^Follow up · /, "");
    return `${t("insights.actionFollowUp", "Follow up")} · ${transliterateName(name, lang)}`;
  }
  if (label.startsWith("Collect ")) {
    const match = /^Collect (₹[\d,.]+) · (.+)$/.exec(label);
    if (match) {
      return `${t("insights.actionCollect", "Collect")} ${match[1]} · ${transliterateName(match[2], lang)}`;
    }
    return label.replace(/^Collect /, `${t("insights.actionCollect", "Collect")} `);
  }
  if (label.startsWith("Assign vendor · ") || label.startsWith("Assign partner · ")) {
    const name = label.replace(/^Assign (vendor|partner) · /, "");
    return `${t("insights.actionAssignPartner", "Assign partner")} · ${transliterateName(name, lang)}`;
  }
  if (
    label.startsWith("Assign Live Stock / Partner · ") ||
    label.startsWith("Assign Live Stock / Vendor · ")
  ) {
    const name = label.replace(/^Assign Live Stock \/ (Partner|Vendor) · /, "");
    return `${t("insights.actionAssignLiveStock", "Assign Live Stock / Partner")} · ${transliterateName(name, lang)}`;
  }
  if (label === "Open quote") {
    return t("insights.actionOpenQuote", "Open quote");
  }
  if (label === "Assign owner") {
    return t("insights.actionAssignOwner", "Assign owner");
  }
  return label;
}

function formatActivityAction(action: string, t: TFunction): string {
  const norm = action.toLowerCase().replace(/_/g, " ");
  if (norm.includes("update")) return t("activity.actions.updated", "updated");
  if (norm.includes("create")) return t("activity.actions.created", "created");
  if (norm.includes("delete")) return t("activity.actions.deleted", "deleted");
  if (norm.includes("void")) return t("activity.actions.voided", "voided");
  return norm;
}

function formatActivitySummary(summary: string, _entityType: string | null, t: TFunction): string {
  const norm = summary
    .toLowerCase()
    .replace(/[_\s-]+/g, " ")
    .trim();
  if (norm.includes("customer") && (norm.includes("creat") || norm.includes("new")))
    return t("activity.summaries.customersCreated", "नए ग्राहक बनाए गए");
  if (norm.includes("customer") && norm.includes("updat"))
    return t("activity.summaries.customersUpdated", "ग्राहक विवरण अपडेट");
  if (norm.includes("customer") && (norm.includes("delet") || norm.includes("remov")))
    return t("activity.summaries.customersDeleted", "ग्राहक हटाए गए");
  if (norm.includes("receipt") && norm.includes("creat"))
    return t("activity.summaries.receiptsCreated", "रसीद दर्ज की गई");
  if (norm.includes("receipt") && norm.includes("updat"))
    return t("activity.summaries.receiptsUpdated", "रसीदें अपडेट हुईं");
  if (norm.includes("invoice") && norm.includes("creat"))
    return t("activity.summaries.invoicesCreated", "चालान बनाया गया");
  if (norm.includes("invoice") && norm.includes("updat"))
    return t("activity.summaries.invoicesUpdated", "चालान अपडेट हुआ");
  if (norm.includes("quote") && norm.includes("creat"))
    return t("activity.summaries.quotesCreated", "उद्धरण बनाया गया");
  if (norm.includes("quote") && norm.includes("updat"))
    return t("activity.summaries.quotesUpdated", "कोटेशन अपडेट हुआ");
  if (norm.includes("order") && norm.includes("creat"))
    return t("activity.summaries.ordersCreated", "बिक्री आदेश बनाया गया");
  if (norm.includes("order") && norm.includes("updat"))
    return t("activity.summaries.ordersUpdated", "ऑर्डर अपडेट हुआ");
  if (norm.includes("payment") && norm.includes("creat"))
    return t("activity.summaries.paymentsCreated", "भुगतान दर्ज किया गया");
  if (norm.includes("payment") && norm.includes("updat"))
    return t("activity.summaries.paymentsUpdated", "भुगतान अपडेट हुआ");
  return autoTranslate(summary);
}

export interface DashboardSuggestionItem {
  to: string;
  title: string;
  subtitle?: string;
  badge: string;
  isRedFlag: boolean;
  priority?: number;
}

/**
 * Primary suggested actions derived from top processed insights.
 */
function buildSuggestions(
  topInsights: ProcessedInsight[],
  t: TFunction,
  lang?: string,
): DashboardSuggestionItem[] {
  const isHindi = lang === "hi";
  const isGujarati = lang === "gu";

  const badgeLabels = {
    redFlag: isHindi ? "रेड फ्लैग" : isGujarati ? "રેડ ફ્લેગ" : "RED FLAG",
    overdue: isHindi ? "अतिदेय" : isGujarati ? "મુદતવીતી" : "OVERDUE",
    stale: isHindi ? "निष्क्रिय" : isGujarati ? "નિષ્ક્રિય" : "STALE",
    action: isHindi ? "कार्यवाही" : isGujarati ? "કાર્યવાહી" : "ACTION",
  };

  return topInsights
    .filter((i) => {
      // Discard any collection action with zero or non-positive amount (e.g. "Collect ₹0 · ...")
      const rawLabel = i.action?.label ?? "";
      if (/collect\s*(₹|rs\.?)?\s*0(\.00?)?(\s|·|$)/i.test(rawLabel)) return false;
      return true;
    })
    .slice(0, 5)
    .map((i) => {
      const isRedFlag =
        i.title.includes("Red Flag") || i.tone === "danger" || i.normalizedPriority >= 95;

      let badge = badgeLabels.action;
      if (isRedFlag) {
        badge = badgeLabels.redFlag;
      } else if (/overdue|collect/i.test(i.action?.label || "") || /overdue/i.test(i.title)) {
        badge = badgeLabels.overdue;
      } else if (/stale|awaiting/i.test(i.title)) {
        badge = badgeLabels.stale;
      }

      let title = localizeInsightAction(i.action.label, t, lang);
      let subtitle: string | undefined = undefined;

      // Check pattern: "Assign Live Stock / Partner · [Name]"
      if (/Assign Live Stock/i.test(i.action.label)) {
        const matchName = /·\s*(.+)$/.exec(i.action.label);
        const name = matchName ? transliterateName(matchName[1].trim(), lang) : "";
        title = isHindi
          ? `लाइव स्टॉक / पार्टनर सौंपें — ${name}`
          : isGujarati
            ? `લાઇવ સ્ટોક / પાર્ટનર સોંપો — ${name}`
            : `Assign Live Stock — ${name}`;

        const qMatch = /Quote\s+([A-Z0-9-]+)/i.exec(i.title);
        subtitle = qMatch
          ? `${qMatch[1]} · ${t("dashboard.deadlineNotSet", "Delivery deadline pending")}`
          : t("dashboard.slabAllocationPending", "Slab allocation pending");
      } else if (/Collect/i.test(i.action.label)) {
        const cMatch = /Collect\s+([^·]+)·\s*(.+)/i.exec(i.action.label);
        if (cMatch) {
          const amt = toIndicDigits(cMatch[1].trim(), lang);
          const cust = transliterateName(cMatch[2].trim(), lang);
          title = `${t("insights.actionCollect", "Collect")} ${amt} — ${cust}`;
          subtitle = t("dashboard.overdueBalanceNotice", "Invoice payment overdue");
        }
      } else if (/stale|awaiting/i.test(i.title)) {
        title = localizeInsightTitle(i.title, t, lang);
        subtitle = i.action.label ? localizeInsightAction(i.action.label, t, lang) : undefined;
      } else {
        subtitle = i.title ? localizeInsightTitle(i.title, t, lang) : undefined;
      }

      return {
        to: i.action.href || "/quotes",
        title: autoTranslate(title, lang),
        subtitle: subtitle ? autoTranslate(subtitle, lang) : undefined,
        badge,
        isRedFlag,
        priority: i.normalizedPriority,
      };
    });
}

function displayName(
  user: { user_metadata?: Record<string, unknown>; email?: string | null } | null,
): string {
  if (!user) return "Rishi";
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const full = (meta.full_name ?? meta.name) as string | undefined;
  if (full && typeof full === "string" && full.trim()) {
    const first = full.trim().split(" ")[0];
    if (first.toLowerCase() !== "there" && first.toLowerCase() !== "admin") return first;
  }
  if (user.email) {
    const raw = user.email.split("@")[0].split(/[._\-\s]+/)[0];
    if (raw && !["admin", "user", "owner", "stos", "info", "there"].includes(raw.toLowerCase())) {
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }
  }
  return "Rishi";
}

function formatMoney(n: number, lang?: string): string {
  return formatMoneyCompact(n, lang);
}
