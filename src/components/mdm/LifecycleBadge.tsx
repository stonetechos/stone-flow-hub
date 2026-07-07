/**
 * Compact status pill for MDM records. Uses semantic tokens so it inherits
 * the Granite & Teal theme automatically. `active` renders as the neutral
 * absence of a badge to keep list tables uncluttered.
 */
import { Badge } from "@/components/ui/badge";
import { Archive, Ban, CircleDot, Trash2 } from "lucide-react";
import { lifecycleLabel, type LifecycleStatus } from "@/lib/mdm/lifecycle";

interface Props {
  status: LifecycleStatus | string | null | undefined;
  showActive?: boolean;
  className?: string;
}

export function LifecycleBadge({ status, showActive = false, className }: Props) {
  const s = (status ?? "active") as LifecycleStatus;
  if (s === "active" && !showActive) return null;

  const map: Record<
    LifecycleStatus,
    { variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ReactNode }
  > = {
    active:   { variant: "secondary",   icon: <CircleDot className="mr-1 h-3 w-3" /> },
    inactive: { variant: "outline",     icon: <Ban className="mr-1 h-3 w-3" /> },
    archived: { variant: "outline",     icon: <Archive className="mr-1 h-3 w-3" /> },
    deleted:  { variant: "destructive", icon: <Trash2 className="mr-1 h-3 w-3" /> },
  };
  const cfg = map[s] ?? map.inactive;

  return (
    <Badge variant={cfg.variant} className={className}>
      {cfg.icon}
      {lifecycleLabel(s)}
    </Badge>
  );
}
