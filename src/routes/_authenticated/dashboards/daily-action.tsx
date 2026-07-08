/**
 * Daily Action Dashboard — one page for salespeople and ops managers
 * summarising what needs attention today. Composed entirely from existing
 * data + Phase-4 intelligence (risk + Next Best Action). Read-only.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CircleDollarSign, Clock, Flame, Snowflake, Truck, Wrench, Users, Zap } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { toUserMessage } from "@/lib/errors";
import { getRiskSummary, type RiskItem } from "@/lib/intelligence/risk";
import { getFollowupBuckets } from "@/lib/lead-analytics/api";
import { supabase } from "@/integrations/supabase/client";
import { STAGE_TO_UMBRELLA } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboards/daily-action")({
  ssr: false,
  component: DailyActionDashboard,
});

async function loadLeadBuckets() {
  const { data } = await supabase
    .from("enquiries")
    .select("id,enquiry_no,stage,updated_at,budget_inr,customer:customers(name)")
    .limit(2000);
  const rows = data ?? [];
  const hot: typeof rows = [];
  const cold: typeof rows = [];
  const highValue: typeof rows = [];
  const lostReview: typeof rows = [];
  const now = Date.now();
  for (const r of rows) {
    const umb = STAGE_TO_UMBRELLA[r.stage];
    const ageDays = r.updated_at ? Math.floor((now - new Date(r.updated_at).getTime()) / 86_400_000) : 0;
    if (umb === "lost") { if (lostReview.length < 8) lostReview.push(r); continue; }
    if (Number(r.budget_inr ?? 0) >= 1_000_000 && highValue.length < 8) highValue.push(r);
    if (["negotiation", "qualified", "order_confirmed", "quotation_sent"].includes(umb) && ageDays <= 7) {
      if (hot.length < 8) hot.push(r);
    }
    if (ageDays > 30 && !["completed", "after_sales", "cancelled"].includes(umb)) {
      if (cold.length < 8) cold.push(r);
    }
  }
  return { hot, cold, highValue, lostReview };
}

function DailyActionDashboard() {
  const riskQ = useQuery({ queryKey: ["intel", "risk"], queryFn: () => getRiskSummary(), staleTime: 60_000 });
  const fupQ = useQuery({ queryKey: ["intel", "followup-buckets"], queryFn: getFollowupBuckets, staleTime: 60_000 });
  const leadsQ = useQuery({ queryKey: ["intel", "lead-buckets"], queryFn: loadLeadBuckets, staleTime: 60_000 });

  if (riskQ.isLoading || fupQ.isLoading || leadsQ.isLoading) return <><PageHeader title="Daily Action" /><LoadingBlock /></>;
  if (riskQ.error) return <><PageHeader title="Daily Action" /><ErrorBlock message={toUserMessage(riskQ.error)} onRetry={() => riskQ.refetch()} /></>;

  const risks = riskQ.data!;
  const fup = fupQ.data!;
  const leads = leadsQ.data!;

  const priorities = [
    { icon: <CalendarClock className="h-4 w-4" />, label: "Today's follow-ups", value: fup.today, tone: "info" as const, href: "/followups?scope=today" },
    { icon: <AlertTriangle className="h-4 w-4" />, label: "Overdue follow-ups", value: fup.overdue, tone: "danger" as const, href: "/followups?scope=pending" },
    { icon: <CircleDollarSign className="h-4 w-4" />, label: "Payments overdue", value: risks.counts.payment_overdue ?? 0, tone: "danger" as const, href: "/invoices" },
    { icon: <Truck className="h-4 w-4" />, label: "Dispatches due", value: risks.counts.dispatch_overdue ?? 0, tone: "warn" as const, href: "/dispatch" },
    { icon: <Wrench className="h-4 w-4" />, label: "Installations due", value: risks.counts.installation_overdue ?? 0, tone: "warn" as const, href: "/installations" },
    { icon: <Users className="h-4 w-4" />, label: "Vendor follow-ups", value: risks.counts.vendor_delay ?? 0, tone: "warn" as const, href: "/purchase-orders" },
    { icon: <Clock className="h-4 w-4" />, label: "Inactive leads", value: risks.counts.inactive_enquiry ?? 0, tone: "muted" as const, href: "/enquiries" },
    { icon: <Zap className="h-4 w-4" />, label: "Unassigned leads", value: risks.counts.no_salesperson ?? 0, tone: "danger" as const, href: "/enquiries" },
  ];

  return (
    <div>
      <PageHeader title="Daily Action Dashboard" subtitle="Everything that needs attention today — recommendations only, nothing runs automatically." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {priorities.map((p) => (
          <Link key={p.label} to={p.href} className="block">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">{p.icon} {p.label}</div>
                  <div className="mt-1 text-2xl font-bold tabular-nums">{p.value}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <TopRisks items={risks.items.slice(0, 12)} />
        <LeadColumn title="Hot leads" icon={<Flame className="h-4 w-4 text-orange-500" />} rows={leads.hot} tone="hot" />
        <LeadColumn title="High-value opportunities" icon={<CircleDollarSign className="h-4 w-4 text-emerald-500" />} rows={leads.highValue} tone="hv" />
        <LeadColumn title="Cold leads" icon={<Snowflake className="h-4 w-4 text-sky-500" />} rows={leads.cold} tone="cold" />
        <LeadColumn title="Lost leads to review" icon={<AlertTriangle className="h-4 w-4 text-zinc-500" />} rows={leads.lostReview} tone="lost" />
      </div>
    </div>
  );
}

function TopRisks({ items }: { items: RiskItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Top risks</CardTitle></CardHeader>
      <CardContent className="space-y-1.5">
        {items.length === 0 ? <div className="text-xs text-muted-foreground">No risks detected.</div> : items.map((r) => (
          <Link key={r.entity + r.entityId + r.key} to={r.href} className="flex items-start justify-between gap-2 rounded-md p-2 text-xs hover:bg-muted/60">
            <div>
              <div className="font-medium">{r.label} <span className="text-muted-foreground">· {r.entity}</span></div>
              <div className="text-muted-foreground">{r.reason}</div>
            </div>
            <Badge variant="outline" className={cn("shrink-0 text-[10px] uppercase",
              r.severity === "high" ? "border-red-500/40 text-red-600" :
              r.severity === "medium" ? "border-amber-500/40 text-amber-600" : "border-muted"
            )}>{r.severity}</Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

interface LeadRow { id: string; enquiry_no: string | null; budget_inr: number | null; customer?: { name: string | null } | null; updated_at?: string | null }
function LeadColumn({ title, icon, rows, tone }: { title: string; icon: React.ReactNode; rows: LeadRow[]; tone: string }) {
  void tone;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">{icon} {title}</CardTitle></CardHeader>
      <CardContent className="space-y-1">
        {rows.length === 0 ? <div className="text-xs text-muted-foreground">Nothing here.</div> : rows.map((r) => (
          <Link key={r.id} to="/enquiries/$enquiryId" params={{ enquiryId: r.id }} className="flex items-center justify-between rounded-md p-1.5 text-xs hover:bg-muted/60">
            <div className="truncate">
              <span className="font-medium">{r.enquiry_no ?? "—"}</span>
              <span className="text-muted-foreground"> · {r.customer?.name ?? "—"}</span>
            </div>
            {Number(r.budget_inr ?? 0) > 0 && <span className="tabular-nums text-muted-foreground">₹{Number(r.budget_inr).toLocaleString("en-IN")}</span>}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
