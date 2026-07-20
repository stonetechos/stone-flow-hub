/**
 * Compact health-tier chip for a vendor. Uses semantic tokens; tooltip
 * shows the reason list computed from `vendor_performance_cache`.
 */
import { useQuery } from "@tanstack/react-query";
import { Award, ShieldAlert, ShieldCheck, ShieldQuestion, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getVendorHealth, type HealthTier } from "@/lib/vendors/health";

const CFG: Record<
  HealthTier,
  {
    variant: "default" | "secondary" | "outline" | "destructive";
    icon: React.ReactNode;
  }
> = {
  preferred: { variant: "default", icon: <Award className="mr-1 h-3 w-3" /> },
  good: { variant: "secondary", icon: <ShieldCheck className="mr-1 h-3 w-3" /> },
  average: { variant: "outline", icon: <ShieldQuestion className="mr-1 h-3 w-3" /> },
  risk: { variant: "destructive", icon: <ShieldAlert className="mr-1 h-3 w-3" /> },
  blacklisted: { variant: "destructive", icon: <Ban className="mr-1 h-3 w-3" /> },
};

export function VendorHealthBadge({ vendorId }: { vendorId: string }) {
  const q = useQuery({
    queryKey: ["vendor", vendorId, "health"],
    queryFn: () => getVendorHealth(vendorId),
    staleTime: 60_000,
  });

  if (q.isLoading || !q.data) {
    return (
      <Badge variant="outline" className="opacity-60">
        …
      </Badge>
    );
  }
  const h = q.data;
  const cfg = CFG[h.tier];

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={cfg.variant} className="cursor-help tabular-nums">
            {cfg.icon}
            {h.label} · {h.score.toFixed(0)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs space-y-1 text-xs">
          <div className="font-medium">Why this tier</div>
          <ul className="list-disc pl-4">
            {h.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
