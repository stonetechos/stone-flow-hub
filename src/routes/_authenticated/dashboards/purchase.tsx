import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Send, Award, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboards/purchase")({
  ssr: false,
  component: PurchaseDashboard,
});

function PurchaseDashboard() {
  const stats = useQuery({
    queryKey: ["dash", "purchase"],
    queryFn: async () => {
      const [rfqs, pos, vend, top] = await Promise.all([
        supabase.from("rfqs").select("id, status").limit(2000),
        supabase.from("purchase_orders").select("id, status").limit(2000),
        supabase.from("vendors").select("id", { count: "exact", head: true }),
        supabase
          .from("vendor_performance_cache")
          .select("vendor:vendor_id(company_name), score")
          .order("score", { ascending: false })
          .limit(5),
      ]);
      const rlist = rfqs.data ?? [];
      const plist = pos.data ?? [];
      return {
        rfqs_open: rlist.filter((r) => r.status === "sent" || r.status === "draft").length,
        po_open: plist.filter((p) => p.status !== "received" && p.status !== "cancelled").length,
        vendors: vend.count ?? 0,
        top: top.data ?? [],
      };
    },
  });
  const s = stats.data;
  return (
    <div>
      <PageHeader title="Purchase Dashboard" subtitle="RFQs, vendor performance and POs." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Send} label="Open RFQs" value={s?.rfqs_open ?? "—"} to="/rfqs" />
        <Kpi icon={ShoppingCart} label="Open POs" value={s?.po_open ?? "—"} to="/purchase-orders" />
        <Kpi icon={Package} label="Vendors" value={s?.vendors ?? "—"} to="/vendors" />
        <Kpi
          icon={Award}
          label="Top vendor"
          value={
            s?.top[0]
              ? ((s.top[0].vendor as { company_name?: string } | null)?.company_name ?? "—")
              : "—"
          }
          to="/vendors"
        />
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">Top 5 vendors by score</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {(s?.top ?? []).map((t, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span>{(t.vendor as { company_name?: string } | null)?.company_name ?? "—"}</span>
                <span className="font-mono text-xs">{Number(t.score ?? 0).toFixed(1)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
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
        <CardContent className="truncate text-2xl font-semibold">{value}</CardContent>
      </Card>
    </Link>
  );
}
