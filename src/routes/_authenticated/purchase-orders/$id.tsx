import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/entity/StatusPill";
import { AttachmentsPanel, NotesPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getPurchaseOrder } from "@/lib/purchase-orders/api";

export const Route = createFileRoute("/_authenticated/purchase-orders/$id")({
  ssr: false,
  component: PurchaseOrderDetailPage,
});

function PurchaseOrderDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const query = useQuery({
    queryKey: qk.purchaseOrders.byId(id),
    queryFn: () => getPurchaseOrder(id),
  });

  if (query.isLoading) return <LoadingBlock />;
  if (query.error)
    return <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />;
  if (!query.data) return <ErrorBlock message="Purchase order not found." />;
  const r = query.data;

  return (
    <div>
      <PageHeader
        title={r.po_no}
        subtitle={`Order date ${r.order_date}`}
        actions={
          <>
            <Button variant="ghost" onClick={() => nav({ to: "/purchase-orders" })}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={() => nav({ to: "/purchase-orders/$id/edit", params: { id } })}>
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
              <Row label="Status">
                <StatusPill status={r.status} />
              </Row>
              <Row label="Expected date">{r.expected_date ?? "—"}</Row>
              <Row label="Vendor">{r.vendor?.company_name ?? "—"}</Row>
              <Row label="Project">{r.project?.name ?? "—"}</Row>
            </CardContent>
          </Card>
          <NotesPanel
            table="purchase_orders"
            id={r.id}
            value={r.notes}
            invalidateKey={qk.purchaseOrders.byId(r.id)}
          />
          <AttachmentsPanel entityType="purchase_order" entityId={r.id} />
        </div>
        <div className="space-y-4">
          <TimelinePanel entityType="purchase_order" entityId={r.id} />
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
