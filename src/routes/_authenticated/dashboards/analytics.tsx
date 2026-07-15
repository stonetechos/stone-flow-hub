/** Interactive analytics — sales/collections/procurement trends, aging,
 *  revenue by family/customer, at daily/weekly/monthly/quarterly/yearly grain
 *  with a custom date range. */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { getTrends, getCustomerAging, getVendorAging, getRevenueByProductFamily, getRevenueByCustomer, defaultRange, type Grain, type Range } from "@/lib/executive/timeseries";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/dashboards/analytics")({
  ssr: false,
  component: AnalyticsDashboard,
});

const GRAINS: Grain[] = ["day", "week", "month", "quarter", "year"];
const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2, 173 58% 39%))", "hsl(var(--chart-3, 43 74% 66%))", "hsl(var(--chart-4, 12 76% 61%))", "hsl(var(--chart-5, 262 60% 55%))", "#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE"];

function AnalyticsDashboard() {
  const [range, setRange] = useState<Range>(defaultRange(90));
  const [grain, setGrain] = useState<Grain>("week");

  const trends = useQuery({ queryKey: ["exec", "trends", range, grain], queryFn: () => getTrends(range, grain), staleTime: 60_000 });
  const custAging = useQuery({ queryKey: ["exec", "cust-aging"], queryFn: getCustomerAging, staleTime: 60_000 });
  const vendAging = useQuery({ queryKey: ["exec", "vend-aging"], queryFn: getVendorAging, staleTime: 60_000 });
  const byFamily = useQuery({ queryKey: ["exec", "by-family", range], queryFn: () => getRevenueByProductFamily(range), staleTime: 60_000 });
  const byCustomer = useQuery({ queryKey: ["exec", "by-customer", range], queryFn: () => getRevenueByCustomer(range), staleTime: 60_000 });

  return (
    <div>
      <PageHeader title="Business Analytics" subtitle="Interactive charts across sales, collections, procurement, aging and mix." />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 pt-4">
          <div>
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className="w-40" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className="w-40" />
          </div>
          <div className="flex flex-wrap gap-1">
            {GRAINS.map((g) => (
              <Button key={g} size="sm" variant={grain === g ? "default" : "outline"} onClick={() => setGrain(g)} className="capitalize">{g}</Button>
            ))}
          </div>
          <div className="ml-auto flex gap-1">
            <Button size="sm" variant="outline" onClick={() => setRange(defaultRange(30))}>30d</Button>
            <Button size="sm" variant="outline" onClick={() => setRange(defaultRange(90))}>90d</Button>
            <Button size="sm" variant="outline" onClick={() => setRange(defaultRange(365))}>1y</Button>
          </div>
        </CardContent>
      </Card>

      {trends.isLoading || !trends.data ? <LoadingBlock /> : trends.error ? <ErrorBlock message={toUserMessage(trends.error)} /> : (
        <div className="grid gap-3 md:grid-cols-2">
          <TrendChart title="Sales trend (₹)" data={trends.data.sales} />
          <TrendChart title="Collections trend (₹)" data={trends.data.collections} />
          <TrendChart title="Procurement — POs created" data={trends.data.procurement} money={false} />
          <TrendChart title="Purchases paid (₹)" data={trends.data.purchases} />
        </div>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <AgingCard title="Customer outstanding aging" q={custAging} />
        <AgingCard title="Vendor outstanding aging" q={vendAging} />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <PieCard title="Revenue by product family" q={byFamily} />
        <BarCard title="Revenue by customer" q={byCustomer} />
      </div>
    </div>
  );
}

function TrendChart({ title, data, money = true }: { title: string; data: Array<{ label: string; value: number }>; money?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 8, right: 8, top: 6, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => money ? `₹${Math.round(v / 1000)}k` : String(v)} />
            <Tooltip formatter={(v: number) => money ? formatInr(v) : v} />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function AgingCard({ title, q }: { title: string; q: ReturnType<typeof useQuery<Awaited<ReturnType<typeof getCustomerAging>>, Error>> }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent style={{ height: 260 }}>
        {q.isLoading || !q.data ? <LoadingBlock /> : q.error ? <ErrorBlock message={toUserMessage(q.error)} /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={q.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: number) => formatInr(v)} />
              <Bar dataKey="amount" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function PieCard({ title, q }: { title: string; q: ReturnType<typeof useQuery<Array<{ label: string; value: number }>, Error>> }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent style={{ height: 300 }}>
        {q.isLoading ? <LoadingBlock /> : q.error ? <ErrorBlock message={toUserMessage(q.error)} /> : (q.data ?? []).length === 0 ? <div className="text-sm text-muted-foreground">No data.</div> : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={q.data!} dataKey="value" nameKey="label" innerRadius={50} outerRadius={100} paddingAngle={2}>
                {(q.data ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatInr(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function BarCard({ title, q }: { title: string; q: ReturnType<typeof useQuery<Array<{ label: string; value: number }>, Error>> }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent style={{ height: 300 }}>
        {q.isLoading ? <LoadingBlock /> : q.error ? <ErrorBlock message={toUserMessage(q.error)} /> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={q.data ?? []} layout="vertical" margin={{ left: 90 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={90} />
              <Tooltip formatter={(v: number) => formatInr(v)} />
              <Bar dataKey="value" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
