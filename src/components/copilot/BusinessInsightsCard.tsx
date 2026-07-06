/**
 * Business Insights card — AI-generated narrative summary of workspace health.
 * Reads a small snapshot from the DB and asks the Copilot to explain what
 * matters this week. Cached for 10 minutes to keep AI usage reasonable.
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { askCopilot } from "@/lib/ai/copilot.functions";
import { toUserMessage } from "@/lib/errors";
import { toast } from "sonner";

type Snapshot = {
  invoices_total: number;
  invoices_outstanding: number;
  invoices_count: number;
  pipeline: number;
  projects_active: number;
  overdue_prod_orders: number;
  pending_rfqs: number;
  top_customers: string[];
};

export function BusinessInsightsCard() {
  const snap = useQuery({
    queryKey: ["ai", "insights", "snapshot"],
    queryFn: async (): Promise<Snapshot> => {
      const [inv, proj, prod, rfq, cust] = await Promise.all([
        supabase.from("invoices").select("total, balance_due").limit(2000),
        supabase.from("projects").select("expected_value_inr, status").limit(2000),
        supabase.from("production_orders").select("status, planned_end_at").limit(2000),
        supabase.from("rfqs").select("status").limit(2000),
        supabase.from("customers").select("name").limit(20),
      ]);
      const invoices = inv.data ?? [];
      const projects = proj.data ?? [];
      const prods = (prod.data ?? []) as Array<{ status?: string; planned_end_at?: string | null }>;
      const rfqs = (rfq.data ?? []) as Array<{ status?: string }>;
      const now = Date.now();
      return {
        invoices_total: invoices.reduce((s, i) => s + Number(i.total ?? 0), 0),
        invoices_outstanding: invoices.reduce((s, i) => s + Number(i.balance_due ?? 0), 0),
        invoices_count: invoices.length,
        pipeline: projects.reduce((s, p) => s + Number((p as { expected_value_inr?: number }).expected_value_inr ?? 0), 0),
        projects_active: projects.filter((p) => (p as { status?: string }).status !== "closed").length,
        overdue_prod_orders: prods.filter(
          (p) => p.planned_end_at && new Date(p.planned_end_at).getTime() < now && p.status !== "completed",
        ).length,
        pending_rfqs: rfqs.filter((r) => r.status !== "closed").length,
        top_customers: (cust.data ?? []).map((c) => c.name).slice(0, 10),
      };
    },
    staleTime: 5 * 60_000,
  });

  const insights = useMutation({
    mutationFn: async () => {
      if (!snap.data) throw new Error("Loading data…");
      const prompt = `Here is a snapshot of the business right now:\n${JSON.stringify(snap.data, null, 2)}\n\nAs the Stone Tech OS management copilot, produce a concise executive brief with these sections:\n1. Top priorities this week (3 bullets)\n2. Cash & receivables\n3. Production risk (delays, bottlenecks)\n4. Sales pipeline signal\n5. Recommended next actions (3 bullets)\n\nBe specific with numbers where possible. Use short bullets, no filler.`;
      return askCopilot({
        data: {
          prompt,
          context: { route: "/dashboards/management", entity: "management", summary: "Executive brief request" },
        },
      });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Business Insights
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => insights.mutate()}
            disabled={insights.isPending || !snap.data}
          >
            {insights.isPending ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
            )}
            {insights.data ? "Refresh" : "Generate"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!insights.data && !insights.isPending && (
          <p className="text-sm text-muted-foreground">
            AI-generated executive brief covering priorities, cash, production risk, and pipeline. Click <em>Generate</em> to
            create the latest read.
          </p>
        )}
        {insights.isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Analyzing workspace…
          </div>
        )}
        {insights.data && (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{insights.data.reply}</div>
        )}
      </CardContent>
    </Card>
  );
}
