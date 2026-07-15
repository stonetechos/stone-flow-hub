/** Cash forecast route. */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { getForecast, type ForecastGrain } from "@/lib/executive/forecast";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/dashboards/forecast")({
  ssr: false,
  component: ForecastPage,
});

function ForecastPage() {
  const [grain, setGrain] = useState<ForecastGrain>("week");
  const [horizon, setHorizon] = useState(90);
  const q = useQuery({ queryKey: ["exec", "forecast", grain, horizon], queryFn: () => getForecast(horizon, grain), staleTime: 60_000 });
  if (q.isLoading || !q.data) return <LoadingBlock />;
  if (q.error) return <ErrorBlock message={toUserMessage(q.error)} />;
  const f = q.data!;
  return (
    <div>
      <PageHeader title="Cash Forecast" subtitle={`Rolling ${horizon}-day inflow, outflow and net cash — confidence ${f.confidencePct}%.`} />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["week", "month"] as const).map((g) => (
          <Button key={g} size="sm" variant={grain === g ? "default" : "outline"} onClick={() => setGrain(g)} className="capitalize">{g}</Button>
        ))}
        <div className="ml-auto flex gap-1">
          {[30, 60, 90, 180].map((d) => (
            <Button key={d} size="sm" variant={horizon === d ? "default" : "outline"} onClick={() => setHorizon(d)}>{d}d</Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <Kpi label="Expected inflow" value={formatInr(f.totalInflow)} />
        <Kpi label="Expected outflow" value={formatInr(f.totalOutflow)} />
        <Kpi label="Net cash" value={formatInr(f.netCash)} />
        <Kpi label="Confidence" value={`${f.confidencePct}%`} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Cash flow ({grain})</CardTitle></CardHeader>
        <CardContent style={{ height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={f.points}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: number) => formatInr(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="inflow" fill="hsl(var(--primary))" name="Inflow" />
              <Bar dataKey="outflow" fill="#f59e0b" name="Outflow" />
              <Line type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2} name="Net" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        Inflow uses live customer payment schedules. Outflow approximates open POs via the last 90 days of vendor-payment averages.
        Confidence blends horizon coverage with historical payment volume. Numbers are sourced live — never estimated.
      </p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}
