import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  TrendingUp,
  Target,
  Sparkles,
  Layers,
  ArrowRight,
  AlertTriangle,
  Receipt,
  UserCheck,
  CheckCircle2,
  Calendar,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import {
  getCompanyProfitabilityAndTargets,
  type CompanyProfitabilityOverview,
  type SalespersonScorecard,
} from "@/lib/executive/salesperson-profitability";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboards/profitability")({
  ssr: false,
  component: ProfitabilityDashboard,
});

function ProfitabilityDashboard() {
  const [salespersonFilter, setSalespersonFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "leakage" | "loss">("all");

  const q = useQuery({
    queryKey: ["salesperson-profitability"],
    queryFn: () => getCompanyProfitabilityAndTargets(),
    staleTime: 30_000,
  });

  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data) return null;

  const data: CompanyProfitabilityOverview = q.data;
  const rishi = data.salespeople.find((s) => s.key === "rishi");
  const raman = data.salespeople.find((s) => s.key === "raman");

  // Filter project breakdowns
  const filteredProjects = data.projectBreakdowns.filter((p) => {
    if (salespersonFilter !== "all" && p.salesperson !== salespersonFilter) return false;
    if (statusFilter === "leakage" && !p.hasDamageLogged && !p.hasWriteoffLogged) return false;
    if (statusFilter === "loss" && p.netProfit >= 0) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profitability & Salesperson Performance"
        subtitle="Cumulative company profit, cash collected by salesperson, and ₹50 Lakh milestone tracking."
      />

      {/* 1. ₹50 Lakh Target Hero Banner */}
      <Card className="border-teal-800/30 bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 text-white shadow-md overflow-hidden relative">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <CardContent className="p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
                  <Target className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                  Cumulative Company Profit Target
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <span>{formatInr(data.totalNetProfit)}</span>
                <span className="text-lg font-normal text-slate-400">
                  / {formatInr(data.companyTargetProfit)} Goal
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs text-slate-400">Total Money Collected</span>
                <div className="text-lg font-bold text-emerald-400">
                  {formatInr(data.totalMoneyCollected)}
                </div>
              </div>
              <Badge
                className={cn(
                  "font-mono text-sm px-2.5 py-1 border font-bold",
                  data.overallTargetProgressPct >= 75
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-teal-500/20 text-teal-300 border-teal-500/40",
                )}
              >
                {data.overallTargetProgressPct.toFixed(1)}% Achieved
              </Badge>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>
                Target Split: <strong>Rishi Rai (₹25L)</strong> &{" "}
                <strong>Raman Pupneja (₹25L)</strong>
              </span>
              <span>
                {data.overallTargetGap > 0
                  ? `${formatInr(data.overallTargetGap)} remaining gap to milestone`
                  : "Target Complete! 🎉"}
              </span>
            </div>
            <Progress value={data.overallTargetProgressPct} className="h-3 bg-slate-800" />
          </div>

          {/* Aggregate Financial Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-400">Closed Projects:</span>
              <div className="text-sm font-bold text-white mt-0.5">{data.totalDeals} deals</div>
            </div>
            <div>
              <span className="text-slate-400">Invoiced Business:</span>
              <div className="text-sm font-bold text-white mt-0.5">
                {formatInr(data.totalInvoiced)}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Actual Realized Costs:</span>
              <div className="text-sm font-bold text-amber-300 mt-0.5">
                {formatInr(data.totalCosts)}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Realized Profit Margin:</span>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">
                {data.overallMarginPct.toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Salesperson Leaderboard & Profit Attribution (Rishi vs Raman) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-cyan-700" />
            Salesperson Business & Profit Scorecards
          </h3>
          <span className="text-xs text-muted-foreground">
            Target allocated ₹25 Lakhs profit each
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {rishi && <SalespersonCard scorecard={rishi} />}
          {raman && <SalespersonCard scorecard={raman} />}
        </div>
      </div>

      {/* 3. Detailed Projects Profitability & Cost Sheet Table */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-cyan-700" />
              Per-Project Realized Profit Ledger
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Every project's real procurement cost, transport, carting, damage losses, and net
              profit
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-lg bg-slate-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setSalespersonFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-all",
                  salespersonFilter === "all"
                    ? "bg-white shadow-2xs font-bold text-slate-900"
                    : "text-slate-600",
                )}
              >
                All People
              </button>
              <button
                type="button"
                onClick={() => setSalespersonFilter("rishi")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-all",
                  salespersonFilter === "rishi"
                    ? "bg-teal-700 text-white shadow-2xs font-bold"
                    : "text-slate-600",
                )}
              >
                Rishi
              </button>
              <button
                type="button"
                onClick={() => setSalespersonFilter("raman")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-all",
                  salespersonFilter === "raman"
                    ? "bg-indigo-700 text-white shadow-2xs font-bold"
                    : "text-slate-600",
                )}
              >
                Raman
              </button>
            </div>

            <div className="inline-flex items-center rounded-lg bg-slate-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-all",
                  statusFilter === "all"
                    ? "bg-white shadow-2xs font-bold text-slate-900"
                    : "text-slate-600",
                )}
              >
                All Projects
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("leakage")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1",
                  statusFilter === "leakage"
                    ? "bg-rose-700 text-white shadow-2xs font-bold"
                    : "text-rose-700",
                )}
              >
                <AlertTriangle className="h-3 w-3" /> Leakage
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b bg-slate-50/70">
              <tr>
                <th className="text-left p-3">Project & Customer</th>
                <th className="text-left p-3">Salesperson</th>
                <th className="text-right p-3">Quoted / Invoiced</th>
                <th className="text-right p-3">Cash Collected</th>
                <th className="text-right p-3">Actual Costs</th>
                <th className="text-right p-3">Realized Net Profit</th>
                <th className="text-right p-3">Margin %</th>
                <th className="text-center p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p) => (
                <tr key={p.projectId} className="border-b hover:bg-slate-50/50 transition-colors">
                  <td className="p-3">
                    <Link
                      to="/projects/$projectId"
                      params={{ projectId: p.projectId }}
                      className="font-semibold text-slate-900 hover:text-cyan-800 hover:underline block"
                    >
                      {p.projectName}
                    </Link>
                    <span className="text-xs text-muted-foreground">{p.customerName}</span>
                    {(p.hasDamageLogged || p.hasWriteoffLogged) && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                        <AlertTriangle className="h-2.5 w-2.5" /> Leakage
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold capitalize",
                        p.salesperson === "rishi"
                          ? "bg-teal-50 text-teal-800 border border-teal-200"
                          : p.salesperson === "raman"
                            ? "bg-indigo-50 text-indigo-800 border border-indigo-200"
                            : "bg-slate-100 text-slate-700",
                      )}
                    >
                      👤 {p.salesperson}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono text-xs">
                    {formatInr(p.invoicedValue || p.quotedValue)}
                  </td>
                  <td className="p-3 text-right font-mono text-xs text-emerald-800 font-semibold">
                    {formatInr(p.moneyCollected)}
                  </td>
                  <td className="p-3 text-right font-mono text-xs text-amber-900">
                    {formatInr(p.totalCosts)}
                  </td>
                  <td
                    className={cn(
                      "p-3 text-right font-mono font-bold text-sm",
                      p.netProfit >= 0 ? "text-emerald-900" : "text-rose-700",
                    )}
                  >
                    {formatInr(p.netProfit)}
                  </td>
                  <td className="p-3 text-right font-mono text-xs font-semibold">
                    {p.marginPct.toFixed(1)}%
                  </td>
                  <td className="p-3 text-center">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-cyan-300 text-cyan-900 hover:bg-cyan-50"
                    >
                      <Link to="/projects/$projectId" params={{ projectId: p.projectId }}>
                        Profit Diary →
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}

              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">
                    No projects found for the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function SalespersonCard({ scorecard }: { scorecard: SalespersonScorecard }) {
  const isAhead = scorecard.targetProgressPct >= 50;

  return (
    <Card className="border-slate-200 shadow-xs flex flex-col justify-between">
      <CardHeader className="border-b border-slate-100 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg font-bold text-xs uppercase",
                scorecard.avatarColor,
              )}
            >
              {scorecard.name.slice(0, 2)}
            </span>
            <div>
              <CardTitle className="text-base font-bold text-slate-900">{scorecard.name}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {scorecard.dealsCount} closed deals · Avg deal: {scorecard.avgDealSqft} sq.ft
              </p>
            </div>
          </div>
          <Badge
            className={cn(
              "font-mono text-xs font-bold border",
              scorecard.targetProgressPct >= 100
                ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                : "bg-teal-50 text-teal-800 border-teal-300",
            )}
          >
            {scorecard.targetProgressPct.toFixed(1)}% of Target
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Core Financials */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg bg-slate-50 p-2.5 space-y-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Wallet className="h-3 w-3 text-emerald-600" /> Money Collected
            </span>
            <div className="text-base font-bold text-slate-900">
              {formatInr(scorecard.moneyCollected)}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Invoiced: {formatInr(scorecard.invoicedRevenue)}
            </p>
          </div>

          <div className="rounded-lg bg-emerald-50/70 border border-emerald-200 p-2.5 space-y-1">
            <span className="text-emerald-800 font-semibold flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-emerald-700" /> Net Profit Brought
            </span>
            <div className="text-base font-extrabold text-emerald-950">
              {formatInr(scorecard.netProfit)}
            </div>
            <p className="text-[10px] text-emerald-800 font-semibold">
              {scorecard.profitMarginPct.toFixed(1)}% margin ·{" "}
              {formatInr(scorecard.avgProfitPerDeal)}/deal
            </p>
          </div>
        </div>

        {/* Target Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-700 font-medium">
            <span>Profit Target: {formatInr(scorecard.targetProfit)}</span>
            <span>
              {scorecard.targetGap > 0
                ? `${formatInr(scorecard.targetGap)} Gap`
                : "Milestone Achieved!"}
            </span>
          </div>
          <Progress value={scorecard.targetProgressPct} className="h-2" />
        </div>

        {/* AI Actionable Coaching Suggestion */}
        <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-3 space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-cyan-950">
            <Sparkles className="h-3.5 w-3.5 text-cyan-700" />
            <span>Target Coaching & Action Plan:</span>
          </div>
          <p className="text-cyan-900 leading-relaxed text-[11px]">
            {scorecard.coachingSuggestion}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
