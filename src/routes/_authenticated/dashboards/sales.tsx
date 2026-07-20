import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, FileText, Users, CalendarClock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboards/sales")({
  ssr: false,
  component: SalesDashboard,
});

function SalesDashboard() {
  const stats = useQuery({
    queryKey: ["dash", "sales"],
    queryFn: async () => {
      const [enq, quo, foll, inv] = await Promise.all([
        supabase.from("enquiries").select("id, stage", { count: "exact", head: false }).limit(2000),
        supabase.from("quotes").select("id, total, status").limit(2000),
        supabase.from("followups").select("id").eq("status", "pending").limit(2000),
        supabase.from("invoices").select("total, balance_due").limit(2000),
      ]);
      const quotes = quo.data ?? [];
      const invoices = inv.data ?? [];
      return {
        enquiries: enq.data?.length ?? 0,
        quotes_open: quotes.filter((q) => q.status !== "converted" && q.status !== "rejected")
          .length,
        quote_value: quotes.reduce((s, q) => s + Number(q.total ?? 0), 0),
        followups: foll.data?.length ?? 0,
        revenue: invoices.reduce((s, i) => s + Number(i.total ?? 0), 0),
        outstanding: invoices.reduce((s, i) => s + Number(i.balance_due ?? 0), 0),
      };
    },
  });
  const s = stats.data;
  const money = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  return (
    <div>
      <PageHeader title="Sales Dashboard" subtitle="Pipeline, quotes and collections." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={BarChart3} label="Open enquiries" value={s?.enquiries ?? "—"} to="/enquiries" />
        <Kpi icon={FileText} label="Open quotes" value={s?.quotes_open ?? "—"} to="/quotes" />
        <Kpi
          icon={TrendingUp}
          label="Quote value"
          value={s ? money(s.quote_value) : "—"}
          to="/quotes"
        />
        <Kpi icon={CalendarClock} label="Follow-ups" value={s?.followups ?? "—"} to="/followups" />
        <Kpi
          icon={Users}
          label="Revenue (billed)"
          value={s ? money(s.revenue) : "—"}
          to="/invoices"
        />
        <Kpi
          icon={FileText}
          label="Outstanding"
          value={s ? money(s.outstanding) : "—"}
          to="/invoices"
        />
      </div>
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
