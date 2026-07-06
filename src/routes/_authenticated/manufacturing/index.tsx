/**
 * Manufacturing Kanban — project-driven production orders grouped by status.
 * Each card shows the linked customer / project / installation coordinates so
 * shop-floor staff can see context without opening the record.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Factory, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonCards } from "@/components/layout/States";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { qk } from "@/lib/query-keys";
import { Can } from "@/hooks/use-roles";
import { toUserMessage } from "@/lib/errors";
import { ManufacturingStats } from "@/components/manufacturing/ManufacturingStats";

const STATUSES = [
  { key: "planned", label: "Planned", tone: "secondary" as const },
  { key: "in_progress", label: "In Progress", tone: "default" as const },
  { key: "on_hold", label: "On Hold", tone: "outline" as const },
  { key: "completed", label: "Completed", tone: "default" as const },
  { key: "cancelled", label: "Cancelled", tone: "destructive" as const },
];

type PO = {
  id: string;
  mfg_no: string;
  status: string;
  quantity: number;
  unit: string;
  room: string | null;
  elevation: string | null;
  wall: string | null;
  bundle_no: string | null;
  crate_no: string | null;
  drawing_ref: string | null;
  revision: string | null;
  planned_start: string | null;
  planned_end: string | null;
  products: { name: string; product_code: string } | null;
  customers: { name: string } | null;
  projects: { name: string } | null;
};

export const Route = createFileRoute("/_authenticated/manufacturing/")({
  component: ManufacturingKanban,
});

function ManufacturingKanban() {
  const q = useQuery({
    queryKey: qk.productionOrders.list(),
    queryFn: async (): Promise<PO[]> => {
      const { data, error } = await supabase
        .from("production_orders")
        .select(
          "id, mfg_no, status, quantity, unit, room, elevation, wall, bundle_no, crate_no, drawing_ref, revision, planned_start, planned_end, products(name, product_code), customers(name), projects(name)"
        )
        .order("planned_start", { ascending: true, nullsFirst: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as PO[];
    },
  });

  const byStatus = new Map<string, PO[]>();
  for (const s of STATUSES) byStatus.set(s.key, []);
  for (const p of q.data ?? []) byStatus.get(p.status)?.push(p);

  return (
    <div>
      <PageHeader
        title="Manufacturing"
        subtitle="Project-driven production orders across the shop floor."
        actions={
          <Can anyRole={["admin", "sales_manager", "sales"]}>
            <Button size="sm" disabled title="Create from Sales Order → Production tab">
              <Plus className="mr-1.5 h-4 w-4" /> New Production Order
            </Button>
          </Can>
        }
      />

      {q.isLoading ? (
        <SkeletonCards />
      ) : q.isError ? (
        <ErrorBlock message={toUserMessage(q.error)} onRetry={() => void q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState
          icon={<Factory className="h-6 w-6" />}
          title="No production orders yet"
          message="Create a Sales Order and open its Production tab to start manufacturing."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {STATUSES.map((s) => {
            const rows = byStatus.get(s.key) ?? [];
            return (
              <div key={s.key} className="flex min-h-[200px] flex-col gap-2 rounded-lg border bg-muted/30 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </h3>
                  <Badge variant={s.tone}>{rows.length}</Badge>
                </div>
                {rows.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">Empty</p>
                ) : (
                  rows.map((po) => (
                    <Link
                      key={po.id}
                      to={`/manufacturing/${po.id}` as string}
                      className="block"
                    >
                      <Card className="p-3 transition-colors hover:border-primary/60 hover:bg-accent/40">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-primary">
                            {po.mfg_no}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {po.quantity} {po.unit}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm font-medium">
                          {po.products?.name ?? "Product"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {po.customers?.name ?? "—"}
                          {po.projects?.name ? ` · ${po.projects.name}` : ""}
                        </p>
                        {(po.room || po.elevation || po.wall) && (
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {[po.room, po.elevation, po.wall].filter(Boolean).join(" / ")}
                          </p>
                        )}
                        {(po.drawing_ref || po.bundle_no) && (
                          <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                            {po.drawing_ref && `Dwg ${po.drawing_ref}`}
                            {po.revision && ` r${po.revision}`}
                            {po.bundle_no && ` · Bundle ${po.bundle_no}`}
                            {po.crate_no && ` · Crate ${po.crate_no}`}
                          </p>
                        )}
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
