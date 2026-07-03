import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Printer, History } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AttachmentsPanel, NotesPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { DetailActionBar } from "@/components/entity/DetailActionBar";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getPayment } from "@/lib/payments/crud";

export const Route = createFileRoute("/_authenticated/payments/$id")({
  ssr: false,
  component: PaymentDetailPage,
});

function PaymentDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const query = useQuery({ queryKey: qk.paymentsAll.byId(id), queryFn: () => getPayment(id) });

  if (query.isLoading) return <LoadingBlock />;
  if (query.error)
    return <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />;
  if (!query.data) return <ErrorBlock message="Payment not found." />;
  const r = query.data;

  return (
    <div>
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/payments" })}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
      <PageHeader
        title={r.payment_no}
        subtitle={`Received ${new Date(r.paid_at).toLocaleDateString()}`}
        actions={
          <DetailActionBar
            pin={{ entityType: "payment", entityId: id, label: r.payment_no }}
            primary={
              <>
                <Button size="sm" onClick={() => nav({ to: "/payments/$id/edit", params: { id } })}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" /> Receipt
                </Button>
              </>
            }
            overflow={[
              {
                label: "Timeline",
                icon: <History className="h-4 w-4" />,
                onSelect: () =>
                  document
                    .getElementById("payment-timeline")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              },
            ]}
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
              <Row label="Invoice">{r.invoice?.invoice_no ?? "—"}</Row>
              <Row label="Amount">
                <span className="font-mono">{Number(r.amount).toFixed(2)}</span>
              </Row>
              <Row label="Method">
                <Badge variant="outline" className="capitalize">
                  {r.method.replace(/_/g, " ")}
                </Badge>
              </Row>
              <Row label="Reference #">{r.reference_no ?? "—"}</Row>
            </CardContent>
          </Card>
          <NotesPanel
            table="payments"
            id={r.id}
            value={r.notes}
            invalidateKey={qk.paymentsAll.byId(r.id)}
          />
          <AttachmentsPanel entityType="payment" entityId={r.id} />
        </div>
        <div className="space-y-4" id="payment-timeline">
          <TimelinePanel entityType="payment" entityId={r.id} />
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
