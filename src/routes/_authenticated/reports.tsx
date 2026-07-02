import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Users, Package, FileText, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { qk } from "@/lib/query-keys";
import { getDashboardKpis } from "@/lib/dashboard/api";

export const Route = createFileRoute("/_authenticated/reports")({
  ssr: false,
  component: ReportsPage,
});

type ReportCard = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "live" | "planned";
};

const REPORTS: ReportCard[] = [
  {
    title: "Sales Pipeline",
    description: "Enquiries by stage, conversion funnel.",
    href: "/enquiries",
    icon: TrendingUp,
    status: "live",
  },
  {
    title: "Customer Ledger",
    description: "Outstanding & payments per customer.",
    href: "/customers",
    icon: Users,
    status: "planned",
  },
  {
    title: "Inventory Snapshot",
    description: "Stock on hand by product & warehouse.",
    href: "/inventory",
    icon: Package,
    status: "planned",
  },
  {
    title: "Quotation Register",
    description: "All quotes with status & value.",
    href: "/quotes",
    icon: FileText,
    status: "live",
  },
  {
    title: "Invoice Aging",
    description: "Overdue invoices grouped by bucket.",
    href: "/invoices",
    icon: FileText,
    status: "planned",
  },
  {
    title: "Collections",
    description: "Payments received by period.",
    href: "/payments",
    icon: Wallet,
    status: "planned",
  },
];

function ReportsPage() {
  const kpis = useQuery({ queryKey: qk.dashboard, queryFn: getDashboardKpis });

  return (
    <div>
      <PageHeader title="Reports" subtitle="Business insights and operational reports." />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Active Enquiries" value={kpis.data?.activeEnquiries ?? "—"} />
        <MetricCard label="Pending RFQs" value={kpis.data?.pendingRfqs ?? "—"} />
        <MetricCard label="Customers" value={kpis.data?.customers ?? "—"} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Link key={r.title} to={r.href} className="block">
            <Card className="h-full shadow-1 transition hover:shadow-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <r.icon className="h-4 w-4 text-primary" /> {r.title}
                </CardTitle>
                <Badge variant={r.status === "live" ? "default" : "outline"} className="capitalize">
                  {r.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{r.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6 shadow-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4 text-primary" /> Coming soon
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Charts, exports (CSV/Excel), and scheduled email reports will land in a later phase.
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="shadow-1">
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 font-display text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
