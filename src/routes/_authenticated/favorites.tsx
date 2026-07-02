import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { qk } from "@/lib/query-keys";
import { listMyFavorites } from "@/lib/favorites/api";
import { formatRelative } from "@/lib/format";
import { FavoriteButton } from "@/components/entity/FavoriteButton";

export const Route = createFileRoute("/_authenticated/favorites")({
  ssr: false,
  component: FavoritesPage,
});

function FavoritesPage() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: qk.favorites.byUser,
    queryFn: listMyFavorites,
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Favorites" subtitle="Records you have pinned for quick access." />
      {isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nothing pinned yet. Use the star icon on any detail page.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {rows.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <Star className="h-4 w-4 shrink-0 fill-current text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{f.label ?? f.entity_id}</div>
                    <div className="text-xs text-muted-foreground">
                      <Badge variant="secondary" className="mr-2 text-[10px] capitalize">
                        {f.entity_type.replace(/_/g, " ")}
                      </Badge>
                      {formatRelative(f.created_at)}
                    </div>
                  </div>
                  <FavoriteButton
                    entityType={f.entity_type}
                    entityId={f.entity_id}
                    label={f.label ?? undefined}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
