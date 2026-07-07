/**
 * Multi-select of the vendor's service categories.
 * Reads from `vendor_service_categories` and persists via `setVendorCategories`.
 * Uses tokenised colours; no hardcoded palette.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2, Tags } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toUserMessage } from "@/lib/errors";
import { invalidateVendor } from "@/lib/query-invalidation";
import {
  listServiceCategories,
  listVendorCategoryIds,
  setVendorCategories,
} from "@/lib/vendors/categories";

export function VendorCategoryPicker({ vendorId }: { vendorId: string }) {
  const qc = useQueryClient();
  const catalog = useQuery({
    queryKey: ["vendor-service-categories"],
    queryFn: listServiceCategories,
    staleTime: 10 * 60_000,
  });
  const assigned = useQuery({
    queryKey: ["vendor", vendorId, "categories"],
    queryFn: () => listVendorCategoryIds(vendorId),
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (assigned.data) setSelected(new Set(assigned.data));
  }, [assigned.data]);

  const dirty = useMemo(() => {
    const a = new Set(assigned.data ?? []);
    if (a.size !== selected.size) return true;
    for (const id of selected) if (!a.has(id)) return true;
    return false;
  }, [assigned.data, selected]);

  const save = useMutation({
    mutationFn: () => setVendorCategories(vendorId, [...selected]),
    onSuccess: () => {
      toast.success("Categories updated");
      invalidateVendor(qc, vendorId);
      qc.invalidateQueries({ queryKey: ["vendor", vendorId, "categories"] });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Tags className="h-4 w-4" /> Service Categories
        </CardTitle>
        <Button
          size="sm"
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </CardHeader>
      <CardContent>
        {catalog.isLoading || assigned.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading catalogue…
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(catalog.data ?? []).map((c) => {
              const on = selected.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                >
                  <Badge
                    variant={on ? "default" : "outline"}
                    className="cursor-pointer select-none"
                  >
                    {on && <Check className="mr-1 h-3 w-3" />}
                    {c.name}
                  </Badge>
                </button>
              );
            })}
            {(catalog.data ?? []).length === 0 && (
              <span className="text-sm text-muted-foreground">
                No categories in the catalogue yet.
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
