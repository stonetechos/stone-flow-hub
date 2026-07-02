import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  planned: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800",
  confirmed: "bg-blue-100 text-blue-800",
  acknowledged: "bg-blue-100 text-blue-800",
  in_production: "bg-amber-100 text-amber-800",
  in_transit: "bg-amber-100 text-amber-800",
  ready: "bg-teal-100 text-teal-800",
  shipped: "bg-teal-100 text-teal-800",
  partially_received: "bg-amber-100 text-amber-800",
  received: "bg-green-100 text-green-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize", TONE[status] ?? "")}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
