/** Business Control Centre — one screen for the owner. Aggregates every
 *  slice's live KPI view and lets the owner drill into any of them. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, TrendingUp, Wallet, Users, ShoppingCart, Factory, Wrench, Truck, IndianRupee, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { getExecutiveKpis } from "@/lib/executive/kpis";
import { getVendorIntel } from "@/lib/executive/vendor-intel";
import { getCustomerIntel } from "@/lib/executive/customer-intel";
import { supabase } from "@/integrations/supabase/client";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/dashboards/control-centre")({
  ssr: false,
  component: ControlCentre,
});

function ControlCentre() {
  const kpis = useQuery({ queryKey: ["dash", "executive"], queryFn: getExecutiveKpis, staleTime: 30_000 });
  const vendors = useQuery({ queryKey: ["exec", "vendor-intel"], queryFn: getVendorIntel, staleTime: 60_000 });
  const customers = useQuery({ queryKey: ["exec", "customer-intel"], queryFn: getCustomerIntel, staleTime: 60_000 });
  const commitments = useQuery({
    queryKey: ["exec", "commitments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("followups").select("id,scheduled_at,notes,entity_type,entity_id").eq("status", "pending").order("scheduled_at", { ascending: true }).limit(10);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  if (kpis.isLoading) return <LoadingBlock />;
  if (kpis.error) return <ErrorBlock message={toUserMessage(kpis.error)} />;
  const k = kpis.data!;

  const alerts: Array<{ label: string; tone: "warn" | "critical"; to: string }> = [];
  if (k.productionDelayed > 0) alerts.push({ label: `${k.productionDelayed} production orders delayed`, tone: "warn", to: "/production" });
  if (k.procurementDelayed > 0) alerts.push({ label: `${k.procurementDelayed} POs delayed`, tone: "warn", to: "/purchase-orders" });
  if (k.installationDelayed > 0) alerts.push({ label: `${k.installationDelayed} installations delayed`, tone: "warn", to: "/installations" });
  if (k.customerOutstandingInr > k.monthlySalesInr) alerts.push({ label: `Receivables exceed a month of sales`, tone: "critical", to: "/dashboards/collections" });
  if (k.netCashPositionInr < 0) alerts.push({ label: `Net cash position negative`, tone: "critical", to: "/dashboards/forecast" });

  return (
    <div>
      <PageHeader title="Business Control Centre" subtitle="Everything the owner needs on one screen." />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Panel icon={TrendingUp} title="Sales" to="/dashboards/sales" rows={[
          [`Pipeline`, formatInr(k.salesPipelineInr)],
          [`Monthly sales`, formatInr(k.monthlySalesInr)],
          [`Orders confirmed`, String(k.ordersConfirmed)],
        ]} />
        <Panel icon={Wallet} title="Finance" to="/dashboards/management" rows={[
          [`Monthly profit`, formatInr(k.monthlyProfitInr)],
          [`Cash available`, formatInr(k.cashAvailableInr)],
          [`Net cash position`, formatInr(k.netCashPositionInr)],
        ]} />
        <Panel icon={ShoppingCart} title="Procurement" to="/dashboards/procurement" rows={[
          [`Open POs`, String(k.procurementOpen)],
          [`Delayed POs`, String(k.procurementDelayed)],
          [`Monthly purchases`, formatInr(k.monthlyPurchasesInr)],
        ]} />
        <Panel icon={Factory} title="Production" to="/dashboards/production" rows={[
          [`In progress`, String(k.productionInProgress)],
          [`Delayed`, String(k.productionDelayed)],
        ]} />
        <Panel icon={Wrench} title="Installation" to="/dashboards/installation" rows={[
          [`Active`, String(k.installationActive)],
          [`Delayed`, String(k.installationDelayed)],
        ]} />
        <Panel icon={Truck} title="Dispatch / Inventory" to="/inventory/movements" rows={[
          [`Dispatches pending`, String(k.dispatchPending)],
        ]} />
        <Panel icon={IndianRupee} title="Collections" to="/dashboards/collections" rows={[
          [`Customer outstanding`, formatInr(k.customerOutstandingInr)],
          [`Expected inflow (30d)`, formatInr(k.expectedCashInflowInr)],
          [`Monthly collections`, formatInr(k.monthlyCollectionsInr)],
        ]} />
        <Panel icon={AlertTriangle} title="Vendor health" to="/dashboards/vendor-intelligence" rows={
          vendors.data ? [
            [`High risk`, String(vendors.data.high_risk.length)],
            [`Dependency top vendor`, vendors.data.dependency[0] ? `${vendors.data.dependency[0].share_pct.toFixed(1)}%` : "—"],
          ] : [["Loading…", ""]]
        } />
        <Panel icon={Users} title="Customer health" to="/dashboards/customer-intelligence" rows={
          customers.data ? [
            [`Delayed payers`, String(customers.data.delayed_payers.length)],
            [`Inactive`, String(customers.data.inactive.length)],
            [`Top customer`, customers.data.top_by_revenue[0]?.name ?? "—"],
          ] : [["Loading…", ""]]
        } />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><CalendarClock className="h-4 w-4 text-primary" />Upcoming commitments</CardTitle></CardHeader>
          <CardContent>
            {commitments.isLoading ? <LoadingBlock /> : (commitments.data ?? []).length === 0 ? <div className="text-sm text-muted-foreground">Nothing scheduled.</div> : (
              <ul className="text-sm space-y-1">
                {(commitments.data ?? []).map((f) => (
                  <li key={f.id} className="flex justify-between gap-2">
                    <span className="truncate">{f.notes ?? f.entity_type}</span>
                    <span className="text-muted-foreground">{f.scheduled_at ? new Date(f.scheduled_at).toLocaleDateString("en-IN") : "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-amber-500" />Critical alerts</CardTitle></CardHeader>
          <CardContent>
            {alerts.length === 0 ? <div className="text-sm text-muted-foreground">All clear.</div> : (
              <ul className="text-sm space-y-2">
                {alerts.map((a, i) => (
                  <li key={i}>
                    <Link to={a.to as never} className={`flex justify-between gap-2 hover:underline ${a.tone === "critical" ? "text-red-600" : "text-amber-600 dark:text-amber-400"}`}>
                      <span>{a.label}</span>
                      <span className="text-xs">Open →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Panel({ icon: Icon, title, to, rows }: { icon: React.ElementType; title: string; to: string; rows: Array<[string, string]> }) {
  return (
    <Link to={to as never}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Icon className="h-4 w-4 text-primary" />{title}</CardTitle></CardHeader>
        <CardContent>
          <dl className="text-xs space-y-1">
            {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-2"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>)}
          </dl>
        </CardContent>
      </Card>
    </Link>
  );
}
