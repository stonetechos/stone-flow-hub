/** Revenue Dashboard — expected/confirmed/collected/outstanding + trend. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  TrendingUp,
  PackageCheck,
  Truck,
  Wrench,
  CircleDollarSign,
  Receipt,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { getRevenueSnapshot } from "@/lib/lead-analytics/api";
import { toUserMessage } from "@/lib/errors";
import { moneyShort, LineCard } from "@/components/dashboard/ChartCards";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboards/revenue-crm")({
  ssr: false,
  component: RevenueCrmDashboard,
});

function RevenueCrmDashboard() {
  const q = useQuery({
    queryKey: ["lead-analytics", "revenue"],
    queryFn: getRevenueSnapshot,
    staleTime: 60_000,
  });
  if (q.isLoading || !q.data)
    return (
      <>
        <PageHeader title="Revenue Dashboard" />
        <LoadingBlock />
      </>
    );
  if (q.error)
    return (
      <>
        <PageHeader title="Revenue Dashboard" />
        <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />
      </>
    );
  const d = q.data!;

  return (
    <div>
      <PageHeader
        title="Revenue Dashboard"
        subtitle="From pipeline to collection — every rupee at a glance."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Kpi
          to="/quotes"
          search={{ status: "sent" }}
          label="Expected Revenue"
          value={moneyShort(d.expectedInr)}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="info"
        />
        <Kpi
          to="/sales-orders"
          search={{ status: "confirmed" }}
          label="Confirmed Revenue"
          value={moneyShort(d.confirmedInr)}
          icon={<PackageCheck className="h-4 w-4" />}
          tone="ok"
        />
        <Kpi
          to="/payments"
          label="Collected (YTD)"
          value={moneyShort(d.collectedAdvanceInr)}
          icon={<Receipt className="h-4 w-4" />}
          tone="ok"
        />
        <Kpi
          to="/invoices"
          search={{ status: "overdue" }}
          label="Outstanding"
          value={moneyShort(d.outstandingInr)}
          icon={<Wallet className="h-4 w-4" />}
          tone="warn"
        />
        <Kpi
          to="/dispatch"
          label="Dispatch Pending"
          value={moneyShort(d.dispatchPendingInr)}
          icon={<Truck className="h-4 w-4" />}
          tone="info"
        />
        <Kpi
          to="/installations"
          label="Installation Pending"
          value={moneyShort(d.installationPendingInr)}
          icon={<Wrench className="h-4 w-4" />}
          tone="info"
        />
        <Kpi
          to="/invoices"
          search={{ status: "paid" }}
          label="Completed Revenue"
          value={moneyShort(d.completedInr)}
          icon={<CircleDollarSign className="h-4 w-4" />}
          tone="ok"
        />
        <Kpi
          to="/dashboards/forecast"
          label="Cash Forecast"
          value="Open"
          icon={<Sparkles className="h-4 w-4" />}
          tone="muted"
        />
      </div>

      <div className="mt-4">
        <LineCard title="Monthly revenue trend (invoiced)" data={d.monthlyTrend} />
      </div>
    </div>
  );
}

type Tone = "info" | "ok" | "warn" | "muted";
function toneClass(t: Tone) {
  return t === "ok"
    ? "border-success/40 bg-success/5"
    : t === "warn"
      ? "border-warning/40 bg-warning/5"
      : t === "info"
        ? "border-primary/25 bg-primary/5"
        : "border-border bg-card";
}
function Kpi({
  label,
  value,
  icon,
  to,
  search,
  tone = "muted",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  to: string;
  search?: Record<string, string>;
  tone?: Tone;
}) {
  return (
    <Link to={to} search={search as never} className="block">
      <div
        className={cn(
          "rounded-lg border px-3 py-3 transition-shadow hover:shadow-md",
          toneClass(tone),
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
          <span className="text-primary">{icon}</span>
        </div>
        <div className="mt-0.5 font-display text-2xl font-bold">{value}</div>
      </div>
    </Link>
  );
}
