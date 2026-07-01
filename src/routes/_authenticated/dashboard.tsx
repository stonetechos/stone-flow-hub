import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Send, CalendarClock, Users, ArrowRight, Wallet, Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toUserMessage } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import { getDashboardKpis } from "@/lib/dashboard/api";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.dashboard,
    queryFn: getDashboardKpis,
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Today's action items across your pipeline."
      />

      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={toUserMessage(error)} onRetry={() => refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Kpi
            title="Active Enquiries"
            value={data?.activeEnquiries ?? 0}
            icon={<ClipboardList className="h-5 w-5" />}
            to="/enquiries"
          />
          <Kpi
            title="Pending RFQs"
            value={data?.pendingRfqs ?? 0}
            icon={<Send className="h-5 w-5" />}
            to="/enquiries"
          />
          <Kpi
            title="Today's Follow-ups"
            value={data?.todayFollowups ?? 0}
            icon={<CalendarClock className="h-5 w-5" />}
            to="/enquiries"
          />
          <Kpi
            title="Outstanding (₹)"
            value={formatMoney(data?.outstandingInr ?? 0)}
            icon={<Wallet className="h-5 w-5" />}
            to="/invoices"
          />
          <Kpi
            title="Collected This Month (₹)"
            value={formatMoney(data?.paymentsThisMonthInr ?? 0)}
            icon={<Receipt className="h-5 w-5" />}
            to="/invoices"
          />
          <Kpi
            title="Active Customers"
            value={data?.customers ?? 0}
            icon={<Users className="h-5 w-5" />}
            to="/customers"
          />
        </div>
      )}
    </div>
  );
}

function formatMoney(n: number): string {
  if (n >= 1_00_00_000) return (n / 1_00_00_000).toFixed(1) + " Cr";
  if (n >= 1_00_000) return (n / 1_00_000).toFixed(1) + " L";
  return n.toLocaleString("en-IN");
}

function Kpi({
  title,
  value,
  icon,
  to,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  to: string;
}) {
  return (
    <Link to={to} className="block">
      <Card className="shadow-1 transition-shadow hover:shadow-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </CardTitle>
          <div className="text-primary">{icon}</div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div className="font-display text-3xl font-bold text-foreground">{value}</div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
