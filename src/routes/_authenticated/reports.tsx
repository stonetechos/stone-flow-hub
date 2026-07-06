import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  BarChart3, TrendingUp, Users, Package, FileText, Wallet,
  Truck, Factory, ShieldCheck, CalendarClock, Download, Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { downloadReport, type ReportKey } from "@/lib/reports/api";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/reports")({
  ssr: false,
  component: ReportsPage,
});

type ReportCard = {
  key: ReportKey;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const REPORTS: ReportCard[] = [
  { key: "sales", title: "Sales", description: "Invoices with customer, totals, balance.", icon: TrendingUp },
  { key: "purchases", title: "Purchases", description: "Purchase orders with vendor & status.", icon: Package },
  { key: "vendorPerformance", title: "Vendor Performance", description: "Score, approval, response, orders.", icon: Users },
  { key: "production", title: "Production Status", description: "Every production order with product & project.", icon: Factory },
  { key: "inventory", title: "Inventory", description: "Snapshot of stock on hand.", icon: Package },
  { key: "followups", title: "Pending Follow-ups", description: "All open follow-ups by date.", icon: CalendarClock },
  { key: "outstanding", title: "Outstanding Payments", description: "Unpaid invoices with balance.", icon: Wallet },
  { key: "projectProfitability", title: "Project Profitability", description: "Projects with pipeline value.", icon: BarChart3 },
];

function ReportsPage() {
  const [busy, setBusy] = useState<ReportKey | null>(null);

  async function run(key: ReportKey) {
    setBusy(key);
    try { await downloadReport(key); toast.success("Downloaded"); }
    catch (e) { toast.error(toUserMessage(e)); }
    finally { setBusy(null); }
  }

  return (
    <div>
      <PageHeader title="Reports" subtitle="Downloadable CSV reports across every module." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r.key} className="h-full shadow-1">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <r.icon className="h-4 w-4 text-primary" /> {r.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{r.description}</p>
              <Button size="sm" variant="outline" disabled={busy === r.key} onClick={() => run(r.key)}>
                {busy === r.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-6 shadow-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-primary" /> Also available
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Every entity page has "Export CSV" and a print-to-PDF option for its detail view. Vendor
          scorecard, QC results, and installation status are available inline on the relevant record.
        </CardContent>
      </Card>
    </div>
  );
}
