/**
 * Smart RFQ vendor recommendation panel.
 * Data comes from the `recommend_vendors_for_rfq` RPC — ranked by
 * preferred flag, performance score, stone-type match, then rating.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Sparkles, Star, ExternalLink, Award, Gem } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { recommendVendorsForRfq, tierFor } from "@/lib/rfqs/recommendations";
import { cn } from "@/lib/utils";

export function RfqVendorRecommendations({ rfqId }: { rfqId: string }) {
  const q = useQuery({
    queryKey: ["rfq", rfqId, "recommendations"],
    queryFn: () => recommendVendorsForRfq(rfqId),
  });
  const rows = (q.data ?? []).slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" /> Recommended vendors
        </CardTitle>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading recommendations…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No vendors matched yet — add vendor capabilities and stone-type coverage in the
            Vendors module to power recommendations.
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((v) => {
              const t = tierFor(v);
              return (
                <li key={v.vendor_id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to="/vendors/$vendorId"
                        params={{ vendorId: v.vendor_id }}
                        className="flex items-center gap-1 truncate text-sm font-medium hover:text-primary hover:underline"
                      >
                        {v.company_name} <ExternalLink className="h-3 w-3 shrink-0" />
                      </Link>
                      {v.is_preferred && (
                        <Award className="h-3.5 w-3.5 shrink-0 text-primary" />
                      )}
                      {v.stone_match && (
                        <Gem className="h-3.5 w-3.5 shrink-0 text-blue-500" aria-label="Stone type match" />
                      )}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      <span className="font-mono">{v.vendor_code}</span>
                      {v.city ? ` · ${v.city}` : ""}
                      {v.lead_time_days != null ? ` · ${v.lead_time_days}d lead` : ""}
                      {v.capability_match_count > 0
                        ? ` · ${v.capability_match_count} capabilities`
                        : ""}
                      {v.orders_count > 0 ? ` · ${v.orders_count} orders` : ""}
                      {v.approval_pct > 0 ? ` · ${Math.round(v.approval_pct)}% approval` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Stars count={t.stars} />
                    <Badge variant={t.tone}>{t.label}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex" aria-label={`${count} stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < count ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}
