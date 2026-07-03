import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Truck, Receipt, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/entity/StatusPill";
import { AttachmentsPanel, NotesPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getSalesOrder } from "@/lib/sales-orders/api";
import { convertQuoteToInvoice } from "@/lib/quotes/api";

export const Route = createFileRoute("/_authenticated/sales-orders/$id")({
  ssr: false,
  component: SalesOrderDetailPage,
});

function SalesOrderDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: qk.salesOrders.byId(id), queryFn: () => getSalesOrder(id) });

  const convertMut = useMutation({
    mutationFn: (quoteId: string) => convertQuoteToInvoice({ quote_id: quoteId }),
    onSuccess: (inv) => {
      toast.success(`Invoice ${inv.invoice_no} created`);
      qc.invalidateQueries({ queryKey: qk.invoices.all });
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
      <PageHeader
        title={r.so_no}
        subtitle={`Order date ${r.order_date}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => nav({ to: "/sales-orders" })}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button
              variant="outline"
              onClick={() => nav({ to: "/sales-orders/$id/edit", params: { id } })}
            >
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Link to="/dispatch/new" search={{ so: id }}>
              <Button variant="outline">
                <Truck className="mr-2 h-4 w-4" /> New dispatch
              </Button>
            </Link>
            {r.quote ? (
              <Button
                onClick={() => convertMut.mutate(r.quote!.id)}
                disabled={!quoteAccepted || convertMut.isPending}
                title={
                  quoteAccepted
                    ? undefined
                    : "Source quote must be marked Accepted first"
                }
              >
                {convertMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Receipt className="mr-2 h-4 w-4" /> Create invoice
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled
                title="Invoices are generated from an accepted quote"
              >
                <Receipt className="mr-2 h-4 w-4" /> Create invoice
              </Button>
            )}
          </div>
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
          <NotesPanel
            table="sales_orders"
            id={r.id}
            value={r.notes}
            invalidateKey={qk.salesOrders.byId(r.id)}
          />
          <AttachmentsPanel entityType="sales_order" entityId={r.id} />
        </div>
        <div className="space-y-4">
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
