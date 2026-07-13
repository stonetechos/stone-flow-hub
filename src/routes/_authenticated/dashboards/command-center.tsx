/**
 * Executive Command Center — owner's operational control screen.
 * Every card deep-links to the source view. Reuses existing aggregators:
 * getExecutiveKpis, getDashboardKpis, getCustomerIntel, getVendorIntel,
 * WorkforceSummaryWidget, plus getCommandCenter for additive slices.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, AlertTriangle, Sparkles, ShieldAlert, Target, TrendingUp, Users,
  IndianRupee, Factory, Truck, Wrench, Wallet, ArrowUpRight, ArrowDownRight,
  FileText, Banknote, Coins, Building2, PhoneCall, CalendarClock, PackageX,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { getExecutiveKpis } from "@/lib/executive/kpis";
import { getDashboardKpis } from "@/lib/dashboard/api";
import { getCustomerIntel } from "@/lib/executive/customer-intel";
import { getVendorIntel } from "@/lib/executive/vendor-intel";
import { getCommandCenter, type OwnerInsight } from "@/lib/executive/command-center";
import { WorkforceSummaryWidget } from "@/components/dashboard/WorkforceSummaryWidget";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/dashboards/command-center")({
  ssr: false,
  component: CommandCenter,
});

function CommandCenter() {
  const exec = useQuery({ queryKey: ["dash", "executive"], queryFn: getExecutiveKpis, staleTime: 30_000 });
  const dash = useQuery({ queryKey: ["dash", "kpis"], queryFn: getDashboardKpis, staleTime: 30_000 });
  const cust = useQuery({ queryKey: ["exec", "customer-intel"], queryFn: getCustomerIntel, staleTime: 60_000 });
  const vend = useQuery({ queryKey: ["exec", "vendor-intel"], queryFn: getVendorIntel, staleTime: 60_000 });
  const cc = useQuery({ queryKey: ["exec", "command-center"], queryFn: getCommandCenter, staleTime: 30_000 });

  if (exec.isLoading || dash.isLoading || cc.isLoading) return <LoadingBlock />;
  const err = exec.error ?? dash.error ?? cc.error;
  if (err) return <ErrorBlock message={toUserMessage(err)} />;

  const k = exec.data!;
  const d = dash.data!;
  const c = cc.data!;

  // ---- Rule-based owner insights (composed here so intel data can join in) ----
  const insights: OwnerInsight[] = [...c.insights];
  const riskCust = cust.data?.delayed_payers[0];
  if (riskCust) insights.unshift({
    kind: "risk",
    title: "Highest-risk customer today",
    detail: `${riskCust.name} — ${riskCust.overdue_days}d overdue, ${formatInr(riskCust.outstanding)} outstanding`,
    to: `/customers/${riskCust.customer_id}`,
  });
  const riskVendor = vend.data?.high_risk[0];
  if (riskVendor) insights.push({
    kind: "warning",
    title: "Vendor requiring follow-up",
    detail: `${riskVendor.name} — ${riskVendor.delay_pct.toFixed(0)}% delayed, ${riskVendor.approval_pct.toFixed(0)}% approval`,
    to: `/vendors/${riskVendor.vendor_id}`,
  });
  const opp = cust.data?.potential_high_value.find((s) => s && s.name);
  if (opp) insights.push({
    kind: "opportunity",
    title: "Customer most likely to convert",
    detail: `${opp.name} — pipeline value ${formatInr(opp.revenue)}`,
    to: `/customers/${opp.customer_id}`,
  });
  if (c.customerActivity.overdueFollowups > 0) insights.push({
    kind: "action",
    title: "Follow-ups overdue",
    detail: `${c.customerActivity.overdueFollowups} pending past due — clear the list today`,
    to: `/followups`,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Executive Command Centre"
        subtitle="Where the owners focus first. Every card deep-links into the ERP."
        actions={
          <Link to="/dashboards/executive" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
            Executive KPIs <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {/* ------------------- OWNER INSIGHTS ------------------- */}
      <Section title="Owner insights" icon={Sparkles} subtitle="Rule-based signals from the running business." plain>
        {insights.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">All clear — no critical signals right now.</CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {insights.slice(0, 9).map((i, idx) => <InsightCard key={idx} insight={i} />)}
          </div>
        )}
      </Section>

      {/* ------------------- SALES ------------------- */}
      <Section title="Sales" icon={TrendingUp}>
        <Kpi label="New enquiries (MTD)" value={c.quotes.newEnquiriesMtd} to="/enquiries" icon={FileText} />
        <Kpi label="Quotations pending" value={c.quotes.pendingCount} sub={formatInr(c.quotes.pipelineInr)} to="/quotes" icon={FileText} />
        <Kpi label="Quotations accepted (MTD)" value={c.quotes.acceptedMtd} sub={formatInr(c.quotes.acceptedInrMtd)} to="/quotes" tone="ok" icon={Target} />
        <Kpi label="Lost quotations (MTD)" value={c.quotes.lostMtd} to="/quotes" tone={c.quotes.lostMtd > 0 ? "warn" : undefined} icon={ShieldAlert} />
        <Kpi label="Sales pipeline" value={formatInr(k.salesPipelineInr)} to="/dashboards/sales-funnel" icon={TrendingUp} />
        <Kpi label="Expected revenue (30d)" value={formatInr(k.expectedCashInflowInr)} to="/dashboards/forecast" icon={IndianRupee} />
      </Section>

      {/* ------------------- CUSTOMERS ------------------- */}
      <Section title="Customers" icon={Users}>
        <Kpi label="Overdue payments" value={c.finance.overduePaymentsCount} sub={formatInr(c.finance.overduePaymentsInr)} to="/dashboards/collections" tone={c.finance.overduePaymentsCount > 0 ? "warn" : undefined} icon={AlertTriangle} />
        <Kpi label="Follow-ups today" value={c.customerActivity.followupsToday} to="/followups" icon={PhoneCall} />
        <Kpi label="Inactive 30d" value={c.customerActivity.inactive30} to="/dashboards/customer-intelligence" icon={CalendarClock} />
        <Kpi label="Inactive 60d" value={c.customerActivity.inactive60} to="/dashboards/customer-intelligence" tone={c.customerActivity.inactive60 > 0 ? "warn" : undefined} icon={CalendarClock} />
        <Kpi label="Inactive 90d+" value={c.customerActivity.inactive90} to="/dashboards/customer-intelligence" tone={c.customerActivity.inactive90 > 0 ? "warn" : undefined} icon={CalendarClock} />
        <Kpi label="Repeat customers" value={cust.data?.repeat.length ?? "—"} to="/dashboards/customer-intelligence" icon={Users} />
        <Kpi label="High-value customers" value={cust.data?.top_by_revenue.length ?? "—"} sub={cust.data?.top_by_revenue[0] ? `Top: ${cust.data.top_by_revenue[0].name}` : undefined} to="/dashboards/customer-intelligence" icon={Building2} />
      </Section>

      {/* ------------------- OPERATIONS ------------------- */}
      <Section title="Operations" icon={Factory}>
        <Kpi label="Production pending" value={c.ops.productionPending} to="/production" tone={k.productionDelayed > 0 ? "warn" : undefined} sub={k.productionDelayed > 0 ? `${k.productionDelayed} delayed` : undefined} icon={Factory} />
        <Kpi label="Dispatch due today" value={c.ops.dispatchDueToday} to="/dispatches" icon={Truck} />
        <Kpi label="Installation pending" value={c.ops.installationPending} to="/installations" tone={k.installationDelayed > 0 ? "warn" : undefined} sub={k.installationDelayed > 0 ? `${k.installationDelayed} delayed` : undefined} icon={Wrench} />
        <Kpi label="Challans pending invoicing" value={c.ops.challansAwaitingInvoice} to="/dispatches" icon={FileText} />
      </Section>

      {/* ------------------- FINANCE ------------------- */}
      <Section title="Finance" icon={Wallet}>
        <Kpi label="Today's collections" value={formatInr(c.finance.todaysCollectionsInr)} to="/payments" tone="ok" icon={IndianRupee} />
        <Kpi label="Bank receipts (today)" value={formatInr(c.finance.bankInr)} to="/payments" icon={Banknote} />
        <Kpi label="Cash receipts (today)" value={formatInr(c.finance.cashInr)} to="/payments" icon={Coins} />
        <Kpi label="Expected collections (30d)" value={formatInr(k.expectedCashInflowInr)} to="/dashboards/forecast" icon={ArrowUpRight} />
        <Kpi label="Outstanding receivables" value={formatInr(k.customerOutstandingInr)} to="/dashboards/collections" tone={k.customerOutstandingInr > 0 ? "warn" : undefined} icon={ArrowDownRight} />
        <Kpi label="Advances received" value={formatInr(c.finance.advancesReceivedInr)} sub={`${c.finance.advancesCount} unallocated`} to="/receipts" icon={Wallet} />
      </Section>

      {/* ------------------- WORKFORCE (reuse existing widget) ------------------- */}
      <Section title="Workforce" icon={Users} subtitle="Reusing Workforce Intelligence — rule-based, no AI." plain>
        <div className="rounded-lg border bg-card p-4">
          <WorkforceSummaryWidget />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, subtitle, icon: Icon, plain = false, children }: { title: string; subtitle?: string; icon: React.ElementType; plain?: boolean; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-4 w-4" /> {title}
        </h2>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground/80">{subtitle}</p>}
      </div>
      {plain ? children : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>}
    </section>
  );
}

function Kpi({ label, value, sub, to, tone, icon: Icon }: { label: string; value: React.ReactNode; sub?: string; to?: string; tone?: "warn" | "ok"; icon?: React.ElementType }) {
  const signal = tone === "warn" ? "warning" : tone === "ok" ? "success" : undefined;
  return <KpiTile label={label} value={value} sub={sub} to={to} tone={signal} icon={Icon} />;
}

function InsightCardLocal({ insight }: { insight: OwnerInsight }) {
  return (
    <InsightCard
      kind={insight.kind}
      title={insight.title}
      detail={insight.detail}
      to={insight.to}
    />
  );
}
