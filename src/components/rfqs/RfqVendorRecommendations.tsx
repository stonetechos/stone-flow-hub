/**
 * Smart RFQ vendor recommendation panel with one-click bulk invite.
 * Data comes from the `recommend_vendors_for_rfq` RPC — ranked by
 * preferred flag, performance score, stone-type match, then rating.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Sparkles, Star, ExternalLink, Award, Gem, Send, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { recommendVendorsForRfq, tierFor } from "@/lib/rfqs/recommendations";
import { toUserMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

export function RfqVendorRecommendations({ rfqId }: { rfqId: string }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const q = useQuery({
    queryKey: ["rfq", rfqId, "recommendations"],
    queryFn: () => recommendVendorsForRfq(rfqId),
  });

  const existing = useQuery({
    queryKey: ["rfq", rfqId, "vendor_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_requests")
        .select("vendor_id")
        .eq("rfq_id", rfqId);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.vendor_id));
    },
  });

  const rows = useMemo(() => (q.data ?? []).slice(0, 10), [q.data]);
  const invitedSet = existing.data ?? new Set<string>();
  const recommendedFresh = rows.filter((v) => !invitedSet.has(v.vendor_id));

  const invite = useMutation({
    mutationFn: async (vendorIds: string[]) => {
      if (vendorIds.length === 0) return;
      const rows = vendorIds.map((vid) => ({
        rfq_id: rfqId, vendor_id: vid, response_status: "pending" as const,
        sent_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("vendor_requests").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_d, ids) => {
      toast.success(`Invited ${ids.length} vendor${ids.length === 1 ? "" : "s"}`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["rfq", rfqId] });
      qc.invalidateQueries({ queryKey: ["vendor_requests"] });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const toggle = (id: string) => {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const selectAll = () => setSelected(new Set(recommendedFresh.map((v) => v.vendor_id)));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" /> Recommended vendors
        </CardTitle>
        {recommendedFresh.length > 0 && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={selectAll}>Select all</Button>
            <Button
              size="sm"
              disabled={selected.size === 0 || invite.isPending}
              onClick={() => invite.mutate(Array.from(selected))}
            >
              {invite.isPending
                ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                : <Send className="mr-1.5 h-4 w-4" />}
              Invite {selected.size || ""}
            </Button>
          </div>
        )}
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
              const invited = invitedSet.has(v.vendor_id);
              return (
                <li key={v.vendor_id} className="flex items-center justify-between gap-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Checkbox
                      checked={selected.has(v.vendor_id)}
                      disabled={invited}
                      onCheckedChange={() => toggle(v.vendor_id)}
                      aria-label={`Select ${v.company_name}`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/vendors/$vendorId"
                          params={{ vendorId: v.vendor_id }}
                          className="flex items-center gap-1 truncate text-sm font-medium hover:text-primary hover:underline"
                        >
                          {v.company_name} <ExternalLink className="h-3 w-3 shrink-0" />
                        </Link>
                        {v.is_preferred && <Award className="h-3.5 w-3.5 shrink-0 text-primary" />}
                        {v.stone_match && <Gem className="h-3.5 w-3.5 shrink-0 text-blue-500" aria-label="Stone type match" />}
                        {invited && <Badge variant="secondary" className="text-[10px]">Invited</Badge>}
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        <span className="font-mono">{v.vendor_code}</span>
                        {v.city ? ` · ${v.city}` : ""}
                        {v.lead_time_days != null ? ` · ${v.lead_time_days}d lead` : ""}
                        {v.capability_match_count > 0 ? ` · ${v.capability_match_count} capabilities` : ""}
                        {v.orders_count > 0 ? ` · ${v.orders_count} orders` : ""}
                        {v.approval_pct > 0 ? ` · ${Math.round(v.approval_pct)}% approval` : ""}
                      </p>
                    </div>
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
        <Star key={i} className={cn("h-3.5 w-3.5", i < count ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
      ))}
    </div>
  );
}
