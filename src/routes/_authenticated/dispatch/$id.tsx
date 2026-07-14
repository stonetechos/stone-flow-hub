import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, FolderOpen, History } from "lucide-react";
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
import { getDispatch, listDispatchItems } from "@/lib/dispatch/api";
import { formatInr } from "@/lib/format";
import { GuidedNextStep } from "@/components/guided-workflow/GuidedNextStep";

export const Route = createFileRoute("/_authenticated/dispatch/$id")({
  ssr: false,
  component: DispatchDetailPage,
});

function DispatchDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const query = useQuery({ queryKey: qk.dispatch.byId(id), queryFn: () => getDispatch(id) });
  const itemsQuery = useQuery({
    queryKey: qk.dispatch.items(id),
    queryFn: () => listDispatchItems(id),
  });

  if (query.isLoading) return <LoadingBlock />;
  if (query.error)
    return <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />;
  if (!query.data) return <ErrorBlock message="Delivery challan not found." />;
  const r = query.data;

  return (
    <div>
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/dispatch" })}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
      <PageHeader
        title={r.dispatch_no}
        subtitle={`Delivery challan · ${r.dispatch_date}`}
        actions={
          <DetailActionBar
            pin={{ entityType: "dispatch", entityId: id, label: r.dispatch_no }}
            primary={
              <>
                <Button size="sm" onClick={() => nav({ to: "/dispatch/$id/edit", params: { id } })}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => nav({ to: "/dispatch/$id/print", params: { id } })}
                >
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
              </>
            }
            overflow={[
              {
                label: "Documents",
                icon: <FolderOpen className="h-4 w-4" />,
                onSelect: () =>
                  document
                    .getElementById("dispatch-documents")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              },
              {
                label: "Timeline",
                icon: <History className="h-4 w-4" />,
                onSelect: () =>
                  document
                    .getElementById("dispatch-timeline")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              },
            ]}
          />
        }
      />
      <GuidedNextStep
        entity="dispatch"
        entityId={id}
        ctx={{ sales_order_id: r.sales_order_id, project_id: r.project_id, customer_id: r.customer_id }}
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
              <Row label="Sales order">{r.sales_order?.so_no ?? "—"}</Row>
              <Row label="Customer">{r.customer?.name ?? "—"}</Row>
              <Row label="Project">{r.project?.name ?? "—"}</Row>
              <Row label="Site address" className="md:col-span-2">
                {r.site_address ?? "—"}
              </Row>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Transport</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2">
              <Row label="Vehicle no.">{r.vehicle_no ?? "—"}</Row>
              <Row label="LR / Consignment #">{r.lr_no ?? "—"}</Row>
              <Row label="Driver">{r.driver_name ?? "—"}</Row>
              <Row label="Driver phone">{r.driver_phone ?? "—"}</Row>
              <Row label="Carrier">{r.carrier ?? "—"}</Row>
              <Row label="Tracking #">{r.tracking_no ?? "—"}</Row>
              <Row label="Delivered by">{r.delivered_by ?? "—"}</Row>
              <Row label="Received by">{r.received_by ?? "—"}</Row>
              <Row label="Carting charge">{formatInr(r.carting_charge ?? 0)}</Row>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Material</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {itemsQuery.isLoading ? (
                <p className="p-4 text-sm text-muted-foreground">Loading…</p>
              ) : (itemsQuery.data ?? []).length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No line items recorded on this challan.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-left">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(itemsQuery.data ?? []).map((it, idx) => (
                        <tr key={it.id} className="border-t">
                          <td className="px-3 py-2 align-top text-muted-foreground">{idx + 1}</td>
                          <td className="px-3 py-2 align-top">
                            <div className="font-medium">
                              {it.product_name ?? it.description}
                            </div>
                            {it.product_name && it.description !== it.product_name && (
                              <div className="text-xs text-muted-foreground">{it.description}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right align-top font-medium">
                            {Number(it.quantity)}
                          </td>
                          <td className="px-3 py-2 align-top">{it.unit ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Remarks</CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap">
              {r.remarks?.trim() ? r.remarks : "—"}
            </CardContent>
          </Card>

          <NotesPanel
            table="dispatches"
            id={r.id}
            value={r.notes}
            invalidateKey={qk.dispatch.byId(r.id)}
          />
          <div id="dispatch-documents">
            <AttachmentsPanel entityType="dispatch" entityId={r.id} />
          </div>
        </div>
        <div className="space-y-4" id="dispatch-timeline">
          <TimelinePanel entityType="dispatch" entityId={r.id} />
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
