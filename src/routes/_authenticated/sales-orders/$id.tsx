import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useDetailHotkeys } from "@/hooks/use-detail-hotkeys";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Pencil,
  Truck,
  Receipt,
  Loader2,
  FolderOpen,
  History,
  UserCheck,
  Send,
} from "lucide-react";
import { useRoles } from "@/hooks/use-roles";
import { TransferOwnershipDialog } from "@/components/ownership/TransferOwnershipDialog";
import { DetailActionBar } from "@/components/entity/DetailActionBar";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EntityInsightPanel } from "@/components/insights/EntityInsightPanel";
import { GuidedNextStep } from "@/components/guided-workflow/GuidedNextStep";
import { ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { DocumentToolbar } from "@/components/documents/DocumentToolbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/entity/StatusPill";
import { AttachmentsPanel, NotesPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { ProductionOrdersPanel } from "@/components/manufacturing/ProductionOrdersPanel";
import { SalesOrderInstallationPanel } from "@/components/installation/SalesOrderInstallationPanel";
import { SalesOrderDeliveryPanel } from "@/components/dispatch/SalesOrderDeliveryPanel";

import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getSalesOrder, listSalesOrderItems } from "@/lib/sales-orders/api";
import { convertQuoteToInvoice } from "@/lib/quotes/api";
import { invalidateInvoice } from "@/lib/query-invalidation";
import { formatInr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/sales-orders/$id")({
  ssr: false,
  component: SalesOrderDetailPage,
});

function SalesOrderDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  useDetailHotkeys({ onBack: () => nav({ to: "/sales-orders" }) });
  const qc = useQueryClient();
  const roles = useRoles();
  const canTransfer = roles.isAdmin || roles.isSalesManager;
  const [transferOpen, setTransferOpen] = useState(false);
  const query = useQuery({ queryKey: qk.salesOrders.byId(id), queryFn: () => getSalesOrder(id) });
  const itemsQuery = useQuery({
    queryKey: qk.salesOrders.items(id),
    queryFn: () => listSalesOrderItems(id),
  });

  const convertMut = useMutation({
    mutationFn: (quoteId: string) => convertQuoteToInvoice({ quote_id: quoteId }),
    onSuccess: (inv) => {
      toast.success(`Invoice ${inv.invoice_no} created`);
      invalidateInvoice(qc);
      nav({ to: "/invoices/$invoiceId", params: { invoiceId: inv.id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (query.isLoading) return <LoadingBlock />;
  if (query.error)
    return <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />;
  if (!query.data) return <ErrorBlock message="Sales order not found." />;
  const r = query.data;
  const quoteAccepted = r.quote?.status === "accepted";

  return (
    <div>
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/sales-orders" })}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
      <PageHeader
        title={r.so_no}
        subtitle={`Order date ${r.order_date}`}
        actions={
          <DetailActionBar
            pin={{ entityType: "sales_order", entityId: id, label: r.so_no }}
            primary={
              <>
                <Button
                  size="sm"
                  onClick={() => nav({ to: "/sales-orders/$id/edit", params: { id } })}
                >
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Link to="/dispatch/new" search={{ so: id }}>
                  <Button size="sm" variant="outline">
                    <Truck className="mr-2 h-4 w-4" /> New dispatch
                  </Button>
                </Link>
                {r.quote ? (
                  <Button
                    size="sm"
                    onClick={() => convertMut.mutate(r.quote!.id)}
                    disabled={!quoteAccepted || convertMut.isPending}
                    title={quoteAccepted ? undefined : "Source quote must be marked Accepted first"}
                  >
                    {convertMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Receipt className="mr-2 h-4 w-4" /> Create invoice
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    title="Invoices are generated from an accepted quote"
                  >
                    <Receipt className="mr-2 h-4 w-4" /> Create invoice
                  </Button>
                )}
                <DocumentToolbar entity="sales_order" entityId={id} />
              </>
            }
            overflow={[
              {
                label: "Documents",
                icon: <FolderOpen className="h-4 w-4" />,
                onSelect: () =>
                  document
                    .getElementById("so-documents")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              },
              {
                label: "Timeline",
                icon: <History className="h-4 w-4" />,
                onSelect: () =>
                  document
                    .getElementById("so-timeline")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              },
              ...(canTransfer && r.customer_id
                ? [
                    {
                      label: "Transfer ownership",
                      icon: <UserCheck className="h-4 w-4" />,
                      onSelect: () => setTransferOpen(true),
                      separatorBefore: true,
                    },
                  ]
                : []),
            ]}
          />
        }
      />

      <EntityInsightPanel entityType="sales_order" entityId={id} />

      <GuidedNextStep
        entity="sales_order"
        entityId={id}
        ctx={{
          customer_id: r.customer_id,
          project_id: r.project_id,
          sales_order_id: id,
          quote_id: r.quote_id,
        }}
      />

      {r.quote?.enquiry_id && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Need vendor pricing before you raise POs?</span>
          <Button asChild variant="outline" size="sm" className="h-7">
            <Link
              to="/enquiries/$enquiryId"
              params={{ enquiryId: r.quote.enquiry_id }}
              search={{ rfq: "1" }}
            >
              <Send className="mr-1 h-3.5 w-3.5" /> Send vendor RFQ
            </Link>
          </Button>
        </div>
      )}

      {canTransfer && r.customer_id && (
        <TransferOwnershipDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          sourceType="sales_order"
          sourceId={id}
          sourceLabel={r.so_no}
          fromCustomerId={r.customer_id}
        />
      )}

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
              <Row label="Delivery date">{r.delivery_date ?? "—"}</Row>
              <Row label="Customer">{r.customer?.name ?? "—"}</Row>
              <Row label="Project">
                {r.project ? (
                  <Link className="text-primary hover:underline" to="/projects">
                    {r.project.name}
                  </Link>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Source quote">
                {r.quote ? (
                  <Link
                    className="text-primary hover:underline"
                    to="/quotes/$quoteId"
                    params={{ quoteId: r.quote.id }}
                  >
                    {r.quote.quote_no}
                  </Link>
                ) : (
                  "—"
                )}
              </Row>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Line items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {itemsQuery.isLoading ? (
                <p className="p-4 text-sm text-muted-foreground">Loading…</p>
              ) : (itemsQuery.data ?? []).length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No line items on this sales order.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Rate</th>
                        <th className="px-3 py-2 text-right">Disc %</th>
                        <th className="px-3 py-2 text-right">GST %</th>
                        <th className="px-3 py-2 text-right">Total</th>
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
                            <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                              {it.category && <span>{it.category}</span>}
                              {it.stone_type && <span>· {it.stone_type}</span>}
                              {it.finish && <span>· {it.finish}</span>}
                              {it.size && <span>· {it.size}</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right align-top">
                            {Number(it.quantity)} {it.unit ?? ""}
                          </td>
                          <td className="px-3 py-2 text-right align-top">
                            {formatInr(it.unit_price)}
                          </td>
                          <td className="px-3 py-2 text-right align-top">
                            {Number(it.discount_pct)}
                          </td>
                          <td className="px-3 py-2 text-right align-top">{Number(it.tax_pct)}</td>
                          <td className="px-3 py-2 text-right align-top font-medium">
                            {formatInr(it.line_total)}
                          </td>
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
              <CardTitle className="text-sm">Totals</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm md:grid-cols-2">
              <Row label="Subtotal">
                {formatInr((r as unknown as { subtotal?: number }).subtotal ?? 0)}
              </Row>
              <Row label="Discount">
                {formatInr((r as unknown as { discount?: number }).discount ?? 0)}
              </Row>
              <Row label="Freight">
                {formatInr((r as unknown as { freight?: number }).freight ?? 0)}
              </Row>
              <Row label="Other charges">
                {formatInr((r as unknown as { other_charges?: number }).other_charges ?? 0)}
              </Row>
              <Row label="Tax">
                {formatInr((r as unknown as { tax_amount?: number }).tax_amount ?? 0)}
              </Row>
              <Row label="Round off">
                {formatInr((r as unknown as { round_off?: number }).round_off ?? 0)}
              </Row>
              <div className="md:col-span-2 border-t pt-2 flex items-center justify-between font-semibold">
                <span>Grand total</span>
                <span>{formatInr((r as unknown as { total?: number }).total ?? 0)}</span>
              </div>
            </CardContent>
          </Card>

          <SalesOrderDeliveryPanel salesOrderId={r.id} />
          <ProductionOrdersPanel salesOrderId={r.id} />
          <SalesOrderInstallationPanel salesOrderId={r.id} />

          <NotesPanel
            table="sales_orders"
            id={r.id}
            value={r.notes}
            invalidateKey={qk.salesOrders.byId(r.id)}
          />
          <div id="so-documents">
            <AttachmentsPanel entityType="sales_order" entityId={r.id} />
          </div>
        </div>
        <div className="space-y-4" id="so-timeline">
          <TimelinePanel entityType="sales_order" entityId={r.id} />
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
