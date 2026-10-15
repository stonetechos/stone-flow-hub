/**
 * Vendor Payment detail — overview + Notes/Attachments/Timeline,
 * with Edit Vendor Payment modal to update amount, date, method, reference, or vendor.
 * Both the database trigger `trg_vpay_after_upd` and server function ensure
 * `vendor_ledger_entries` remains in sync with any updates.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import { DetailActionBar } from "@/components/entity/DetailActionBar";
import { EditVendorPaymentDialog } from "@/components/vendor-payments/EditVendorPaymentDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AttachmentsPanel, NotesPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getVendorPayment } from "@/lib/vendor-payments/api";
import { formatInr, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/vendor-payments/$id")({
  ssr: false,
  component: VendorPaymentDetailPage,
});

function VendorPaymentDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const query = useQuery({
    queryKey: qk.vendorPayments.byId(id),
    queryFn: () => getVendorPayment(id),
  });

  if (query.isLoading) return <LoadingBlock />;
  if (query.error)
    return <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />;
  if (!query.data) return <ErrorBlock message="Vendor payment not found." />;
  const r = query.data;

  return (
    <div>
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/vendor-payments" })}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
      <PageHeader
        title={r.payment_no}
        subtitle={`Paid ${formatDate(r.paid_at)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Payment
            </Button>
            <DetailActionBar
              pin={{ entityType: "vendor_payment", entityId: id, label: r.payment_no }}
            />
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
              <Row label="Type">
                <Badge variant="secondary" className="capitalize">
                  {r.payment_type.replace(/_/g, " ")}
                </Badge>
              </Row>
              <Row label="Amount">
                <span className="text-base font-semibold">{formatInr(r.amount)}</span>
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
              <Row label="Method">{r.method?.replace(/_/g, " ") ?? "—"}</Row>
              <Row label="Reference #">{r.reference_no ?? "—"}</Row>
            </CardContent>
          </Card>
          <NotesPanel
            table="vendor_payments"
            id={r.id}
            value={r.notes}
            invalidateKey={qk.vendorPayments.byId(r.id)}
          />
          <div id="vpay-documents">
            <AttachmentsPanel entityType="vendor_payment" entityId={r.id} />
          </div>
        </div>
        <div className="space-y-4">
          <TimelinePanel entityType="vendor_payment" entityId={r.id} />
        </div>
      </div>

      <EditVendorPaymentDialog
        open={isEditing}
        onOpenChange={setIsEditing}
        payment={r}
        onSuccess={() => void query.refetch()}
      />
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
