/** Procurement Intelligence panel — Best / Fastest / Cheapest / Preferred vendor
 *  recommendations with plain-English reasons derived from real quote metrics.
 */
import { useMemo, useState } from "react";
import { Award, Gauge, IndianRupee, Star, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { QuoteComparisonRow } from "@/lib/quotes/comparison";
import { buildRecommendations, type RecommendationKind } from "@/lib/procurement/intelligence";
import { formatInr } from "@/lib/format";
import { CreatePoFromQuoteDialog } from "@/components/procurement/CreatePoFromQuoteDialog";

const META: Record<RecommendationKind, { title: string; icon: React.ComponentType<{ className?: string }> }> = {
  best:      { title: "Best overall",     icon: Award },
  fastest:   { title: "Fastest",          icon: Gauge },
  cheapest:  { title: "Cheapest",         icon: IndianRupee },
  preferred: { title: "Preferred vendor", icon: Star },
};

export function ProcurementIntelligencePanel({ rows }: { rows: QuoteComparisonRow[] }) {
  const recs = useMemo(() => buildRecommendations(rows), [rows]);
  const [poQuoteId, setPoQuoteId] = useState<string | null>(null);
  if (recs.length === 0) return null;
  const approvedQuoteId = rows.find((r) => r.quote?.is_approved)?.quote?.id ?? null;

  return (
    <>
      <Card className="shadow-1">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Award className="h-4 w-4 text-primary" /> Procurement recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recs.map((r) => {
              const Icon = META[r.kind].icon;
              return (
                <div key={r.kind} className="rounded-md border border-border bg-muted/30 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
                    <Icon className="h-3.5 w-3.5 text-primary" /> {META[r.kind].title}
                  </div>
                  <div className="text-sm font-semibold">{r.vendorName}</div>
                  <div className="mt-1 flex flex-wrap gap-1 text-xs">
                    <Badge variant="outline">{formatInr(r.totalCost)}</Badge>
                    {r.dispatchDays != null && <Badge variant="outline">{r.dispatchDays}d</Badge>}
                    {r.rating != null && <Badge variant="outline">★ {r.rating}</Badge>}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{r.reason}</p>
                </div>
              );
            })}
          </div>
          {approvedQuoteId && (
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={() => setPoQuoteId(approvedQuoteId)}>
                <ShoppingCart className="mr-1.5 h-4 w-4" /> Create PO from approved quote
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CreatePoFromQuoteDialog
        quoteId={poQuoteId}
        open={!!poQuoteId}
        onOpenChange={(o) => !o && setPoQuoteId(null)}
      />
    </>
  );
}
