/**
 * Capability matrix editor for a vendor. Renders every stone-industry
 * capability as a togglable chip and persists to `vendor_capabilities`.
 * Feeds automatic RFQ vendor selection in a later phase.
 */
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { qk } from "@/lib/query-keys";
import { invalidateVendorCapability } from "@/lib/query-invalidation";
import { toUserMessage } from "@/lib/errors";
import { useRoles } from "@/hooks/use-roles";

const CAPABILITIES = [
  "cnc",
  "waterjet",
  "rockface",
  "splitface",
  "shot_blast",
  "bush_hammer",
  "polished",
  "honed",
  "leather",
  "calibration",
  "bevel",
  "bullnose",
  "flexible_stone",
  "semi_precious_inlay",
  "metal_inlay",
  "brass_inlay",
  "inlay",
  "edge_processing",
  "polishing",
  "sculpture",
] as const;

const LABELS: Record<string, string> = {
  cnc: "CNC",
  waterjet: "Waterjet",
  rockface: "Rockface",
  splitface: "Splitface",
  shot_blast: "Shot Blast",
  bush_hammer: "Bush Hammer",
  polished: "Polished",
  honed: "Honed",
  leather: "Leather",
  calibration: "Calibration",
  bevel: "Bevel",
  bullnose: "Bullnose",
  flexible_stone: "Flexible Stone Veneer",
  semi_precious_inlay: "Semi-Precious Inlay",
  metal_inlay: "Metal Inlay",
  brass_inlay: "Brass Inlay",
  inlay: "Generic Inlay",
  edge_processing: "Edge Processing",
  polishing: "Polishing (generic)",
  sculpture: "Sculpture",
};

export function CapabilityMatrix({ vendorId }: { vendorId: string }) {
  const qc = useQueryClient();
  const roles = useRoles();
  const canEdit = roles.hasAnyRole(["admin", "sales_manager", "purchase"]);

  const q = useQuery({
    queryKey: qk.vendorCapabilities.byVendor(vendorId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_capabilities")
        .select("capability")
        .eq("vendor_id", vendorId);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.capability as string));
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ cap, enabled }: { cap: string; enabled: boolean }) => {
      if (enabled) {
        const { error } = await supabase
          .from("vendor_capabilities")
          .insert({ vendor_id: vendorId, capability: cap as never });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("vendor_capabilities")
          .delete()
          .eq("vendor_id", vendorId)
          .eq("capability", cap as never);
        if (error) throw error;
      }
    },
    onSuccess: () => invalidateVendorCapability(qc, vendorId),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const enabled = useMemo(() => q.data ?? new Set<string>(), [q.data]);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">Capabilities</h3>
        {toggle.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {CAPABILITIES.map((cap) => {
            const on = enabled.has(cap);
            return (
              <button
                key={cap}
                type="button"
                disabled={!canEdit || toggle.isPending}
                onClick={() => toggle.mutate({ cap, enabled: !on })}
                className="disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Badge variant={on ? "default" : "outline"} className="cursor-pointer">
                  {LABELS[cap] ?? cap}
                </Badge>
              </button>
            );
          })}
        </div>
      )}
      {!canEdit && (
        <p className="mt-3 text-xs text-muted-foreground">
          Read-only. Ask an admin or purchase manager to update capabilities.
        </p>
      )}
    </Card>
  );
}
