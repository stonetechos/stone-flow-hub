import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import { DetailActionBar } from "@/components/entity/DetailActionBar";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/entity/StatusPill";
import { AttachmentsPanel, NotesPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  getPurchaseTransportation,
  listPurchaseTransportationItems,
} from "@/lib/purchase-transportation/api";
import { formatInr, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/purchase-transport/$id")({
  ssr: false,
  component: PurchaseTransportDetailPage,
});

function PurchaseTransportDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const query = useQuery({
    queryKey: qk.purchaseTransport.byId(id),
    queryFn: () => getPurchaseTransportation(id),
  });
  const itemsQuery = useQuery({
    queryKey: qk.purchaseTransport.items(id),
    queryFn: () => listPurchaseTransportationItems(id),
  });

  if (query.isLoading) return <LoadingBlock />;
  if (query.error)
    return <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />;
  if (!query.data) return <ErrorBlock message="Shipment not found." />;
  const r = query.data;

  return (
    <div>
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/purchase-transport" })}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
      <PageHeader
        title={r.transport_no}
        subtitle={`Inbound shipment · ${formatDate(r.transport_date)}`}
        actions={
          <DetailActionBar
            pin={{ entityType: "purchase_transportation", entityId: id, label: r.transport_no }}
            primary={
              <Button
                size="sm"
                onClick={() => nav({ to: "/purchase-transport/$id/edit", params: { id } })}
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
            }
          />
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
              <Row label="Purchase order">
                {r.purchase_order ? (
                  <Link
                    to="/purchase-orders/$id"
                    params={{ id: r.purchase_order.id }}
                    className="text-primary hover:underline"
                  >
                    {r.purchase_order.po_no}
                  </Link>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Vendor">
                {r.vendor ? (
                  <Link
                    to="/vendors/$vendorId"
                    params={{ vendorId: r.vendor.id }}
                    className="text-primary hover:underline"
                  >
                    {r.vendor.company_name}
                  </Link>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Project">{r.project?.name ?? "—"}</Row>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Transport</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2">
              <Row label="Carting agency">{r.carting_agency?.name ?? "—"}</Row>
              <Row label="Vehicle no.">{r.vehicle_no ?? "—"}</Row>
              <Row label="LR / Consignment #">{r.lr_no ?? "—"}</Row>
              <Row label="Driver">{r.driver_name ?? "—"}</Row>
              <Row label="Driver phone">{r.driver_phone ?? "—"}</Row>
              <Row label="Delivered by">{r.delivered_by ?? "—"}</Row>
              <Row label="Received by">{r.received_by ?? "—"}</Row>
              <Row label="Freight amount">{formatInr(r.freight_amount)}</Row>
              <Row label="Amount paid">{formatInr(r.amount_paid)}</Row>
              <Row label="Balance due">
                <span className="font-semibold">{formatInr(r.balance_due)}</span>
              </Row>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Manifest</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {itemsQuery.isLoading ? (
                <p className="p-4 text-sm text-muted-foreground">Loading…</p>
              ) : (itemsQuery.data ?? []).length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No line items recorded on this shipment.
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
                            <div className="font-medium">{it.product_name ?? it.description}</div>
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
            table="purchase_transportation"
            id={r.id}
            value={r.notes}
            invalidateKey={qk.purchaseTransport.byId(r.id)}
          />
          <div id="ptr-documents">
            <AttachmentsPanel entityType="purchase_transportation" entityId={r.id} />
          </div>
        </div>
        <div className="space-y-4">
          <TimelinePanel entityType="purchase_transportation" entityId={r.id} />
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
