import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, TrendingUp, Wallet, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BusinessInsightsCard } from "@/components/copilot/BusinessInsightsCard";

export const Route = createFileRoute("/_authenticated/dashboards/management")({
  ssr: false,
  component: ManagementDashboard,
});

function ManagementDashboard() {
  const stats = useQuery({
    queryKey: ["dash", "management"],
    queryFn: async () => {
      const [inv, proj] = await Promise.all([
        supabase.from("invoices").select("total, balance_due").limit(5000),
        supabase.from("projects").select("expected_value_inr").limit(5000),
      ]);
      const invoices = inv.data ?? [];
      const projects = proj.data ?? [];
      const revenue = invoices.reduce((s, i) => s + Number(i.total ?? 0), 0);
      const outstanding = invoices.reduce((s, i) => s + Number(i.balance_due ?? 0), 0);
      const pipeline = projects.reduce(
        (s, p) => s + Number((p as { expected_value_inr?: number }).expected_value_inr ?? 0),
        0,
      );
      return { revenue, outstanding, pipeline, est_margin: pipeline - revenue };
    },
  });
  const s = stats.data;
  const money = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  return (
    <div>
      <PageHeader
        title="Management Dashboard"
        subtitle="Financial health and project profitability."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={TrendingUp}
          label="Revenue billed"
          value={s ? money(s.revenue) : "—"}
          to="/invoices"
        />
        <Kpi
          icon={AlertTriangle}
          label="Outstanding"
          value={s ? money(s.outstanding) : "—"}
          to="/invoices"
        />
        <Kpi
          icon={Briefcase}
          label="Pipeline value"
          value={s ? money(s.pipeline) : "—"}
          to="/projects"
        />
        <Kpi
          icon={Wallet}
          label="Est. margin"
          value={s ? money(s.est_margin) : "—"}
          to="/projects"
        />
      </div>
      <BusinessInsightsCard />
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  to: string;
}) {
  return (
    <Link to={to as never}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{value}</CardContent>
      </Card>
    </Link>
  );
}
