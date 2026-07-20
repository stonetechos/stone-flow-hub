import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Users,
  PackageMinus,
  PenSquare,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { qk } from "@/lib/query-keys";
import { getInstallationKpis } from "@/lib/installation/dashboard";
import { formatInr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboards/installation")({
  ssr: false,
  component: InstallationDashboard,
});

function InstallationDashboard() {
  const query = useQuery({ queryKey: qk.installations.kpis, queryFn: getInstallationKpis });
  const k = query.data;

  const cards: Array<{ label: string; value: string; icon: React.ElementType; to?: string }> = [
    {
      label: "Active installations",
      value: String(k?.active_installations ?? "—"),
      icon: Activity,
      to: "/installations",
    },
    {
      label: "Delayed sites",
      value: String(k?.delayed_sites ?? "—"),
      icon: AlertTriangle,
      to: "/installations",
    },
    {
      label: "Teams on site",
      value: String(k?.teams_on_site ?? "—"),
      icon: Users,
      to: "/installation-teams",
    },
    {
      label: "Avg progress",
      value: `${Math.round(k?.avg_progress_pct ?? 0)}%`,
      icon: TrendingUp,
      to: "/installations",
    },
    {
      label: "Material shortages",
      value: String(k?.material_shortages ?? "—"),
      icon: PackageMinus,
      to: "/installations",
    },
    {
      label: "Sign-offs pending",
      value: String(k?.signoffs_pending ?? "—"),
      icon: PenSquare,
      to: "/installations",
    },
    {
      label: "Installation revenue",
      value: formatInr(Number(k?.installation_revenue ?? 0)),
      icon: IndianRupee,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Installation dashboard"
        subtitle="Live KPIs across active sites and teams."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Body = (
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs text-muted-foreground">
                  <c.icon className="h-4 w-4 text-primary" /> {c.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{c.value}</CardContent>
            </Card>
          );
          return c.to ? (
            <Link key={c.label} to={c.to}>
              {Body}
            </Link>
          ) : (
            <div key={c.label}>{Body}</div>
          );
        })}
      </div>
    </div>
  );
}
