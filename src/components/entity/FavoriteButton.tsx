/** Pin/unpin any entity for the current user. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { qk } from "@/lib/query-keys";
import { addFavorite, isFavorite, removeFavorite } from "@/lib/favorites/api";
import { toUserMessage } from "@/lib/errors";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props { entityType: string; entityId: string; label?: string; size?: "icon" | "sm"; }

export function FavoriteButton({ entityType, entityId, label, size = "icon" }: Props) {
  const qc = useQueryClient();
  const { data: pinned = false } = useQuery({
    queryKey: qk.favorites.check(entityType, entityId),
    queryFn: () => isFavorite(entityType, entityId),
    enabled: !!entityId,
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (pinned) await removeFavorite(entityType, entityId);
      else await addFavorite(entityType, entityId, label);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.favorites.check(entityType, entityId) });
      void qc.invalidateQueries({ queryKey: qk.favorites.byUser });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={() => toggle.mutate()}
      aria-label={pinned ? "Unpin" : "Pin"}
      className={size === "sm" ? "gap-1.5" : undefined}
    >
      <Star className={cn("h-4 w-4", pinned && "fill-primary text-primary")} />
      {size === "sm" && <span className="text-xs">{pinned ? "Pinned" : "Pin"}</span>}
    </Button>
  );
}
