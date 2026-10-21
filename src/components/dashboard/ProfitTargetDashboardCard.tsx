import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Target,
  ArrowRight,
  Sparkles,
  Users,
  Building2,
  Wallet,
  Coins,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCompanyProfitabilityAndTargets,
  type CompanyProfitabilityOverview,
} from "@/lib/executive/salesperson-profitability";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ProfitTargetDashboardCard() {
  const q = useQuery({
    queryKey: ["salesperson-profitability"],
    queryFn: () => getCompanyProfitabilityAndTargets(),
    staleTime: 30_000,
  });

  if (q.isLoading) {
    return (
      <Card className="border border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (q.error || !q.data) return null;

  const data: CompanyProfitabilityOverview = q.data;
  const rishi = data.salespeople.find((s) => s.key === "rishi");
  const raman = data.salespeople.find((s) => s.key === "raman");

  const progressPct = Math.round(data.overallTargetProgressPct);

  return (
    <Card className="border-2 border-emerald-500/20 bg-linear-to-br from-emerald-50/40 via-card to-amber-50/30 dark:from-emerald-950/20 dark:via-card dark:to-amber-950/15 shadow-sm overflow-hidden">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground tracking-tight">
                  ₹50 Lakh Cumulative Profit Target
                </h3>
                <Badge
                  variant="outline"
                  className="bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 font-semibold text-[10px]"
                >
                  <Target className="mr-1 h-3 w-3 inline text-emerald-600" />
                  Live Target
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Realized net profit from customer collections vs. ₹50L company profit goal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 text-xs font-semibold gap-1.5 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
            >
              <Link to="/dashboards/profitability">
                Full 50L Leaderboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="h-8 text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Link to="/projects">
                <Building2 className="h-3.5 w-3.5 text-amber-600" />
                Profit Diary
              </Link>
            </Button>
          </div>
        </div>

        {/* Progress Bar & KPI Rollup */}
        <div className="rounded-xl border border-emerald-500/20 bg-card/80 p-3.5 space-y-2.5 backdrop-blur-xs">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-sm">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                {formatInr(data.totalNetProfit)}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                realized of ₹50,00,000 target
              </span>
            </div>
            <div className="text-xs font-bold text-muted-foreground">
              {progressPct}% Achieved · Gap:{" "}
              <span className="text-rose-600 dark:text-rose-400 font-bold tabular-nums">
                {formatInr(data.overallTargetGap)}
              </span>
            </div>
          </div>

          <Progress value={progressPct} className="h-2.5 bg-emerald-100 dark:bg-emerald-950/40" />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div className="border-r border-border/50 pr-2">
              <span className="text-muted-foreground block text-[11px]">Money Collected</span>
              <span className="font-bold text-foreground tabular-nums">
                {formatInr(data.totalMoneyCollected)}
              </span>
            </div>
            <div className="border-r border-border/50 pr-2">
              <span className="text-muted-foreground block text-[11px]">Direct Project Costs</span>
              <span className="font-bold text-foreground tabular-nums">
                {formatInr(data.totalCosts)}
              </span>
            </div>
            <div className="border-r border-border/50 pr-2">
              <span className="text-muted-foreground block text-[11px]">Overall Margin</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {data.overallMarginPct.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Closed Projects</span>
              <span className="font-bold text-foreground tabular-nums">
                {data.totalDeals} projects
              </span>
            </div>
          </div>
        </div>

        {/* Side-by-Side Salesperson Mini Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
          {/* Rishi Rai */}
          {rishi && (
            <div className="rounded-xl border border-cyan-500/25 bg-card/60 p-3 space-y-2 hover:border-cyan-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-600 text-white font-black text-xs">
                    R
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Rishi Rai</h4>
                    <p className="text-[10px] text-muted-foreground">Target: ₹25 Lakhs</p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-cyan-100 text-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-200 font-bold text-[10px]"
                >
                  {Math.round(rishi.targetProgressPct)}% Goal
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Profit Earned</span>
                  <span className="font-bold text-cyan-700 dark:text-cyan-300 tabular-nums">
                    {formatInr(rishi.netProfit)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Cash Collected</span>
                  <span className="font-bold text-foreground tabular-nums">
                    {formatInr(rishi.moneyCollected)}
                  </span>
                </div>
              </div>

              {rishi.coachingSuggestion && (
                <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-2 flex items-start gap-1.5 leading-snug">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-600 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{rishi.coachingSuggestion}</span>
                </div>
              )}
            </div>
          )}

          {/* Raman Pupneja */}
          {raman && (
            <div className="rounded-xl border border-amber-500/25 bg-card/60 p-3 space-y-2 hover:border-amber-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 text-white font-black text-xs">
                    RP
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Raman Pupneja</h4>
                    <p className="text-[10px] text-muted-foreground">Target: ₹25 Lakhs</p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 font-bold text-[10px]"
                >
                  {Math.round(raman.targetProgressPct)}% Goal
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Profit Earned</span>
                  <span className="font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                    {formatInr(raman.netProfit)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Cash Collected</span>
                  <span className="font-bold text-foreground tabular-nums">
                    {formatInr(raman.moneyCollected)}
                  </span>
                </div>
              </div>

              {raman.coachingSuggestion && (
                <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-2 flex items-start gap-1.5 leading-snug">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{raman.coachingSuggestion}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
