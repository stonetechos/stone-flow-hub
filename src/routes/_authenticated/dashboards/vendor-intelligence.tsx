/** Vendor intelligence route. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { getVendorIntel, type VendorScore } from "@/lib/executive/vendor-intel";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/dashboards/vendor-intelligence")({
  ssr: false,
  component: VendorIntelPage,
});

function VendorIntelPage() {
  const q = useQuery({ queryKey: ["exec", "vendor-intel"], queryFn: getVendorIntel, staleTime: 60_000 });
  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock message={toUserMessage(q.error)} />;
  const d = q.data!;
  return (
    <div>
      <PageHeader title="Vendor Intelligence" subtitle="Reliability, quality, cost and dependency across your vendor base." />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <VList title="Top vendors (spend)" rows={d.top} col="spend" />
        <VList title="Most reliable" rows={d.most_reliable} col="reliability" />
        <VList title="Fastest" rows={d.fastest} col="dispatch" />
        <VList title="Lowest average cost" rows={d.lowest_cost} col="spend" />
        <VList title="Highest quality" rows={d.highest_quality} col="quality" />
        <VList title="High risk" rows={d.high_risk} col="risk" tone="warn" />
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Vendor dependency analysis</CardTitle></CardHeader>
        <CardContent>
          {d.dependency.length === 0 ? <div className="text-sm text-muted-foreground">No data.</div> : (
            <ul className="space-y-2 text-sm">
              {d.dependency.map((v) => (
                <li key={v.name}>
                  <div className="flex justify-between text-xs mb-1"><span>{v.name}</span><span className="text-muted-foreground">{formatInr(v.purchase_value)} · {v.share_pct.toFixed(1)}%</span></div>
                  <div className="h-2 rounded bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.min(100, v.share_pct)}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Concentration &gt; 30% for a single vendor is a supply-chain risk — diversify sources or negotiate SLAs.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function VList({ title, rows, col, tone }: { title: string; rows: VendorScore[]; col: "spend" | "reliability" | "dispatch" | "quality" | "risk"; tone?: "warn" }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <div className="text-xs text-muted-foreground">No data.</div> : (
          <ol className="text-sm space-y-1">
            {rows.map((r, i) => (
              <li key={r.vendor_id + i} className="flex justify-between gap-2">
                <Link to="/vendors/$vendorId" params={{ vendorId: r.vendor_id }} className="truncate text-primary hover:underline">{i + 1}. {r.name}</Link>
                <span className={tone === "warn" ? "text-status-warning-fg" : "text-muted-foreground"}>{formatVendor(r, col)}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function formatVendor(r: VendorScore, col: "spend" | "reliability" | "dispatch" | "quality" | "risk"): string {
  if (col === "spend") return formatInr(r.purchase_value);
  if (col === "reliability") return `${r.reliability.toFixed(0)}%`;
  if (col === "dispatch") return r.avg_dispatch_days != null ? `${r.avg_dispatch_days.toFixed(1)}d` : "—";
  if (col === "quality") return `${r.quality.toFixed(0)}%`;
  return `risk ${r.risk.toFixed(0)}`;
}
