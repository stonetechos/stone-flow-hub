/** Shared chart helpers for lead-workflow dashboards. Recharts wrapper. */
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatInr } from "@/lib/format";

export const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(173 58% 39%)",
  "hsl(43 74% 66%)",
  "hsl(12 76% 61%)",
  "hsl(262 60% 55%)",
  "hsl(197 71% 52%)",
  "hsl(340 65% 55%)",
  "hsl(120 40% 45%)",
];

export function DonutCard({
  title,
  data,
  valueLabel = "Revenue",
  formatValue = formatInr,
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  valueLabel?: string;
  formatValue?: (v: number) => string;
}) {
  const empty = data.length === 0 || data.every((d) => d.value === 0);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent style={{ height: 260 }}>
        {empty ? (
          <div className="grid h-full place-items-center text-xs text-muted-foreground">No data yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={95} paddingAngle={2}>
                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [formatValue(v), valueLabel]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function BarCard({
  title,
  data,
  vertical = true,
  formatValue = formatInr,
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  vertical?: boolean;
  formatValue?: (v: number) => string;
}) {
  const empty = data.length === 0 || data.every((d) => d.value === 0);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent style={{ height: 320 }}>
        {empty ? (
          <div className="grid h-full place-items-center text-xs text-muted-foreground">No data yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout={vertical ? "vertical" : "horizontal"} margin={vertical ? { left: 110 } : undefined}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              {vertical ? (
                <>
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatValue(v)} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={110} />
                </>
              ) : (
                <>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatValue(v)} />
                </>
              )}
              <Tooltip formatter={(v: number) => formatValue(v)} />
              <Bar dataKey="value" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function LineCard({
  title,
  data,
  formatValue = formatInr,
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  formatValue?: (v: number) => string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 8, right: 8, top: 6, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatValue(v)} />
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function moneyShort(n: number): string {
  if (n >= 1_00_00_000) return "₹" + (n / 1_00_00_000).toFixed(1) + " Cr";
  if (n >= 1_00_000) return "₹" + (n / 1_00_000).toFixed(1) + " L";
  if (n >= 1_000) return "₹" + (n / 1_000).toFixed(1) + "K";
  return "₹" + n.toLocaleString("en-IN");
}
