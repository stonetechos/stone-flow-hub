import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttachmentsPanel, NotesPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getInventoryItem } from "@/lib/inventory/api";

export const Route = createFileRoute("/_authenticated/inventory/$id")({
  ssr: false,
  component: InventoryDetailPage,
});

function InventoryDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const query = useQuery({ queryKey: qk.inventory.byId(id), queryFn: () => getInventoryItem(id) });

  if (query.isLoading) return <LoadingBlock />;
  if (query.error)
    return <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />;
  if (!query.data) return <ErrorBlock message="Stock item not found." />;
  const r = query.data;

  return (
    <div>
      <PageHeader
        title={r.stock_code}
        subtitle={r.product?.name ?? "Unassigned product"}
        actions={
          <>
            <Button variant="ghost" onClick={() => nav({ to: "/inventory" })}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={() => nav({ to: "/inventory/$id/edit", params: { id } })}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2">
              <Row label="Product">{r.product?.name ?? "—"}</Row>
              <Row label="Location">{r.location ?? "—"}</Row>
              <Row label="Unit">{r.unit ?? "—"}</Row>
              <Row label="On hand">{r.quantity_on_hand}</Row>
              <Row label="Reorder level">{r.reorder_level}</Row>
            </CardContent>
          </Card>
          <NotesPanel
            table="inventory_items"
            id={r.id}
            value={r.notes}
            invalidateKey={qk.inventory.byId(r.id)}
          />
          <AttachmentsPanel entityType="inventory_item" entityId={r.id} />
        </div>
        <div className="space-y-4">
          <TimelinePanel entityType="inventory_item" entityId={r.id} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
