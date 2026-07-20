/** Procurement Dashboard — 11 KPI cards + AI recommendations + follow-up trigger. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Send,
  FileText,
  Clock,
  ShoppingCart,
  AlertTriangle,
  Package,
  PackageCheck,
  Wallet,
  TrendingUp,
  Users,
  Sparkles,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { getProcurementKpis } from "@/lib/procurement/kpis";
import { runOverdueProcurementFollowups } from "@/lib/procurement/followups";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/dashboards/procurement")({
  ssr: false,
  component: ProcurementDashboard,
});

function ProcurementDashboard() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["dash", "procurement"],
    queryFn: getProcurementKpis,
    staleTime: 30_000,
  });

  const runFups = useMutation({
    mutationFn: runOverdueProcurementFollowups,
    onSuccess: (n) => {
      toast.success(
        n === 0
          ? "No new follow-ups — everything's covered"
          : `Created ${n} follow-up${n === 1 ? "" : "s"}`,
      );
      qc.invalidateQueries({ queryKey: ["followups"] });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (q.isLoading || !q.data) return <LoadingBlock />;
  if (q.error) return <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />;
  const s = q.data!;

  return (
    <div>
      <PageHeader
        title="Procurement Dashboard"
        subtitle="Live vendor pipeline, deliveries and payments — every card deep-links to the filtered list."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => runFups.mutate()}
            disabled={runFups.isPending}
          >
            {runFups.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Generate overdue follow-ups
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Kpi
          icon={Send}
          label="RFQs awaiting response"
          value={s.rfqs_awaiting_response}
          to="/rfqs"
          search={{ status: "sent" }}
        />
        <Kpi
          icon={FileText}
          label="Vendor quotations received"
          value={s.vendor_quotations_received}
          to="/rfqs"
          search={{ status: "responded" }}
        />
        <Kpi
          icon={Clock}
          label="Quotations pending approval"
          value={s.quotations_pending_approval}
          to="/rfqs"
        />
        <Kpi
          icon={ShoppingCart}
          label="Purchase orders pending"
          value={s.purchase_orders_pending}
          to="/purchase-orders"
          search={{ status: "sent" }}
        />
        <Kpi
          icon={AlertTriangle}
          label="Purchase orders delayed"
          value={s.purchase_orders_delayed}
          to="/purchase-orders"
          search={{ status: "acknowledged" }}
          tone="danger"
        />
        <Kpi
          icon={Package}
          label="Material awaiting dispatch"
          value={s.material_awaiting_dispatch}
          to="/purchase-orders"
          search={{ status: "acknowledged" }}
        />
        <Kpi
          icon={PackageCheck}
          label="Material received"
          value={s.material_received}
          to="/purchase-orders"
          search={{ status: "received" }}
        />
        <Kpi
          icon={Wallet}
          label="Vendor outstanding"
          value={formatInr(s.vendor_outstanding)}
          to="/vendors"
          tone={s.vendor_outstanding > 0 ? "warn" : undefined}
        />
        <Kpi
          icon={Sparkles}
          label="Vendor advances"
          value={formatInr(s.vendor_advances)}
          to="/vendors"
        />
        <Kpi
          icon={TrendingUp}
          label="Procurement pipeline"
          value={formatInr(s.procurement_pipeline)}
          to="/rfqs"
        />
        <Kpi
          icon={Users}
          label="Vendors awaiting payment"
          value={s.vendors_awaiting_payment}
          to="/vendors"
          tone={s.vendors_awaiting_payment > 0 ? "warn" : undefined}
        />
      </div>
    </div>
  );
}

type KpiProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  to: string;
  search?: Record<string, string | undefined>;
  tone?: "danger" | "warn";
};
function Kpi({ icon: Icon, label, value, to, search, tone }: KpiProps) {
  const toneCls = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-warning" : "";
  return (
    <Link to={to as never} search={search as never}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon className={`h-3.5 w-3.5 ${toneCls}`} />
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent className={`text-2xl font-semibold ${toneCls}`}>{value}</CardContent>
      </Card>
    </Link>
  );
}
