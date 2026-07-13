/** Executive Dashboard — owner-facing KPI cards, every card deep-links. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles, Briefcase, ShoppingCart, Factory, Wrench, Truck, IndianRupee,
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Activity,
  FileText, AlertTriangle, LineChart, Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { KpiTile } from "@/components/dashboard/KpiTile";
import { getExecutiveKpis } from "@/lib/executive/kpis";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/dashboards/executive")({
  ssr: false,
  component: ExecutiveDashboard,
});

function ExecutiveDashboard() {
  const q = useQuery({ queryKey: ["dash", "executive"], queryFn: getExecutiveKpis, staleTime: 30_000 });
  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock message={toUserMessage(q.error)} />;
  const k = q.data!;
  const money = (n: number) => formatInr(n);
  return (
    <div>
      <PageHeader title="Executive Dashboard" subtitle="Live business snapshot — click any card to drill down." actions={
        <Link to="/dashboards/business-intelligence" className="text-sm text-primary hover:underline flex items-center gap-1">
          <Sparkles className="h-4 w-4" /> AI Business Brief
        </Link>
      } />

      <Section title="Sales & pipeline">
        <Kpi icon={LineChart} label="Sales pipeline" value={money(k.salesPipelineInr)} to="/quotes" />
        <Kpi icon={FileText} label="Estimates pending" value={k.estimatesPending} to="/estimates" />
        <Kpi icon={FileText} label="Quotes pending" value={k.quotesPending} to="/quotes" />
        <Kpi icon={ShoppingCart} label="Orders confirmed" value={k.ordersConfirmed} to="/sales-orders" />
        <Kpi icon={Briefcase} label="Active projects" value={k.activeProjects} to="/projects" />
      </Section>

      <Section title="Operations">
        <Kpi icon={Factory} label="Production in progress" value={k.productionInProgress} to="/production" tone={k.productionDelayed > 0 ? "warn" : undefined} sub={k.productionDelayed > 0 ? `${k.productionDelayed} delayed` : undefined} />
        <Kpi icon={ShoppingCart} label="Procurement open" value={k.procurementOpen} to="/purchase-orders" tone={k.procurementDelayed > 0 ? "warn" : undefined} sub={k.procurementDelayed > 0 ? `${k.procurementDelayed} delayed` : undefined} />
        <Kpi icon={Wrench} label="Installations active" value={k.installationActive} to="/installations" tone={k.installationDelayed > 0 ? "warn" : undefined} sub={k.installationDelayed > 0 ? `${k.installationDelayed} delayed` : undefined} />
        <Kpi icon={Truck} label="Dispatch pending" value={k.dispatchPending} to="/dispatches" />
      </Section>

      <Section title="Receivables & payables">
        <Kpi icon={ArrowUpRight} label="Customer outstanding" value={money(k.customerOutstandingInr)} to="/dashboards/collections" tone={k.customerOutstandingInr > 0 ? "warn" : undefined} />
        <Kpi icon={ArrowDownRight} label="Vendor outstanding" value={money(k.vendorOutstandingInr)} to="/vendor-payments" />
        <Kpi icon={TrendingUp} label="Monthly sales" value={money(k.monthlySalesInr)} to="/invoices" />
        <Kpi icon={TrendingDown} label="Monthly purchases" value={money(k.monthlyPurchasesInr)} to="/vendor-payments" />
        <Kpi icon={IndianRupee} label="Monthly collections" value={money(k.monthlyCollectionsInr)} to="/payments" />
        <Kpi icon={Activity} label="Monthly profit" value={money(k.monthlyProfitInr)} to="/dashboards/profitability" tone={k.monthlyProfitInr < 0 ? "warn" : "ok"} />
      </Section>

      <Section title="Cash position">
        <Kpi icon={Wallet} label="Cash available" value={money(k.cashAvailableInr)} to="/dashboards/forecast" />
        <Kpi icon={ArrowUpRight} label="Expected inflow (30d)" value={money(k.expectedCashInflowInr)} to="/dashboards/forecast" />
        <Kpi icon={ArrowDownRight} label="Expected outflow (30d)" value={money(k.expectedCashOutflowInr)} to="/dashboards/forecast" />
        <Kpi icon={Wallet} label="Net cash position" value={money(k.netCashPositionInr)} to="/dashboards/forecast" tone={k.netCashPositionInr < 0 ? "warn" : "ok"} />
      </Section>

      <Section title="Intelligence">
        <LinkCard icon={LineChart} title="Analytics & charts" desc="Sales, collections, procurement, aging, revenue mix." to="/dashboards/analytics" />
        <LinkCard icon={Sparkles} title="AI business brief" desc="Daily / weekly / monthly narrative & risks." to="/dashboards/business-intelligence" />
        <LinkCard icon={Activity} title="Cash forecast" desc="Inflow, outflow, confidence over 90 days." to="/dashboards/forecast" />
        <LinkCard icon={Briefcase} title="Project profitability" desc="Per-project P&L with AI explanation." to="/dashboards/profitability" />
        <LinkCard icon={Users} title="Customer intelligence" desc="Top, profitable, repeat, at-risk, inactive." to="/dashboards/customer-intelligence" />
        <LinkCard icon={AlertTriangle} title="Vendor intelligence" desc="Reliable, fastest, quality, risk, dependency." to="/dashboards/vendor-intelligence" />
        <LinkCard icon={Sparkles} title="Command Centre" desc="Owner morning brief — sales, customers, ops, finance, workforce, insights." to="/dashboards/command-center" />
        <LinkCard icon={Briefcase} title="Control Centre" desc="One-screen owner view of the whole business." to="/dashboards/control-centre" />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">{children}</div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, to, sub, tone }: { icon: React.ElementType; label: string; value: React.ReactNode; to?: string; sub?: string; tone?: "warn" | "ok" }) {
  const signal = tone === "warn" ? "warning" : tone === "ok" ? "success" : undefined;
  return (
    <KpiTile
      icon={Icon}
      label={label}
      value={value}
      sub={sub}
      to={to}
      tone={signal}
    />
  );
}

function LinkCard({ icon: Icon, title, desc, to }: { icon: React.ElementType; title: string; desc: string; to: string }) {
  return (
    <Link to={to as never}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Icon className="h-4 w-4 text-primary" />{title}</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">{desc}</CardContent>
      </Card>
    </Link>
  );
}
