import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, FolderOpen, History, Truck, Banknote } from "lucide-react";
import { DetailActionBar } from "@/components/entity/DetailActionBar";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { DocumentToolbar } from "@/components/documents/DocumentToolbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/entity/StatusPill";
import { AttachmentsPanel, NotesPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getPurchaseOrder } from "@/lib/purchase-orders/api";
import { GuidedNextStep } from "@/components/guided-workflow/GuidedNextStep";

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
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/purchase-orders" })}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
      <PageHeader
        title={r.po_no}
        subtitle={`Order date ${r.order_date}`}
        actions={
          <DetailActionBar
            pin={{ entityType: "purchase_order", entityId: id, label: r.po_no }}
            primary={
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    nav({
                      to: "/grns/new",
                      search: {
                        po: id,
                        vendor: r.vendor_id ?? undefined,
                        project: r.project_id ?? undefined,
                      },
                    })
                  }
                >
                  <Truck className="mr-2 h-4 w-4" /> Receive (GRN)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    nav({
                      to: "/vendor-payments/new",
                      search: { po: id, vendor: r.vendor_id ?? undefined },
                    })
                  }
                >
                  <Banknote className="mr-2 h-4 w-4" /> Pay vendor
                </Button>
                <Button
                  size="sm"
                  onClick={() => nav({ to: "/purchase-orders/$id/edit", params: { id } })}
                >
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <DocumentToolbar entity="purchase_order" entityId={id} />
              </div>
            }
            overflow={[
              {
                label: "Documents",
                icon: <FolderOpen className="h-4 w-4" />,
                onSelect: () =>
                  document
                    .getElementById("po-documents")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              },
              {
                label: "Timeline",
                icon: <History className="h-4 w-4" />,
                onSelect: () =>
                  document
                    .getElementById("po-timeline")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              },
            ]}
          />
        }
      />
      <GuidedNextStep
        entity="purchase_order"
        entityId={id}
        ctx={{ vendor_id: r.vendor_id, project_id: r.project_id }}
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
          <div id="po-documents">
            <AttachmentsPanel entityType="purchase_order" entityId={r.id} />
          </div>
        </div>
        <div className="space-y-4" id="po-timeline">
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
