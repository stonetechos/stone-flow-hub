import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock, EmptyState } from "@/components/layout/States";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";
import {
  generateProcurementHealth,
  type ProcurementHealthReport,
} from "@/lib/procurement/ai-health.functions";

export const Route = createFileRoute("/_authenticated/dashboards/procurement-health")({
  ssr: false,
  component: ProcurementHealthPage,
});

function ProcurementHealthPage() {
  const run = useServerFn(generateProcurementHealth);
  const [report, setReport] = useState<ProcurementHealthReport | null>(null);
  const mut = useMutation({
    mutationFn: () => run({ data: {} }),
    onSuccess: (r) => {
      setReport(r);
      toast.success("Health report generated");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="AI Procurement Health"
        subtitle="Analyses vendor reliability, quality, prices, delays, cash flow, project risk and priorities using live KPIs."
        actions={
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            <Sparkles className="mr-2 h-4 w-4" />
            {mut.isPending ? "Analysing…" : report ? "Re-run analysis" : "Analyse now"}
          </Button>
        }
      />

      {mut.isPending ? (
        <LoadingBlock />
      ) : !report ? (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title="No report yet"
          message="Click Analyse now to generate a fresh procurement health report from your current KPIs."
        />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <span>Overall procurement health</span>
                <span className="text-2xl font-semibold">
                  {Math.round(report.overall_score)}
                  <span className="text-sm text-muted-foreground">/100</span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {report.summary}
              <div className="mt-2 text-xs">
                Generated {new Date(report.generated_at).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            {report.findings.map((f, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-sm">
                    <span className="capitalize">{f.dimension.replace(/_/g, " ")}</span>
                    <SeverityBadge severity={f.severity} />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="font-medium">{f.headline}</div>
                  <p className="text-muted-foreground">{f.detail}</p>
                  {f.actions.length > 0 && (
                    <ul className="ml-4 list-disc space-y-0.5 text-xs text-muted-foreground">
                      {f.actions.map((a, j) => (
                        <li key={j}>{a}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: "info" | "warn" | "risk" }) {
  if (severity === "risk")
    return (
      <Badge variant="destructive" className="gap-1">
        <ShieldAlert className="h-3 w-3" /> Risk
      </Badge>
    );
  if (severity === "warn")
    return (
      <Badge className="gap-1 bg-status-warning-fg text-white hover:bg-status-warning-fg">
        <AlertTriangle className="h-3 w-3" /> Warn
      </Badge>
    );
  return (
    <Badge variant="secondary" className="gap-1">
      <Info className="h-3 w-3" /> Info
    </Badge>
  );
}
