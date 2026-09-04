import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Banknote } from "lucide-react";
import { DetailActionBar } from "@/components/entity/DetailActionBar";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/entity/StatusPill";
import { AttachmentsPanel, NotesPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getPurchaseInvoice } from "@/lib/purchase-invoices/api";
import { formatInr, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/purchase-invoices/$id")({
  ssr: false,
  component: PurchaseInvoiceDetailPage,
});

function PurchaseInvoiceDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const query = useQuery({
    queryKey: qk.purchaseInvoices.byId(id),
    queryFn: () => getPurchaseInvoice(id),
  });

  if (query.isLoading) return <LoadingBlock />;
  if (query.error)
    return <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />;
  if (!query.data) return <ErrorBlock message="Purchase invoice not found." />;
  const r = query.data;

  return (
    <div>
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/purchase-invoices" })}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
      <PageHeader
        title={r.invoice_no}
        subtitle={`Invoice date ${formatDate(r.invoice_date)}${r.vendor_invoice_no ? ` · Vendor's # ${r.vendor_invoice_no}` : ""}`}
        actions={
          <DetailActionBar
            pin={{ entityType: "purchase_invoice", entityId: id, label: r.invoice_no }}
            primary={
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    nav({
                      to: "/vendor-payments/new",
                      search: {
                        vendor: r.vendor_id,
                        po: r.purchase_order_id ?? undefined,
                      },
                    })
                  }
                >
                  <Banknote className="mr-2 h-4 w-4" /> Pay vendor
                </Button>
                <Button
                  size="sm"
                  onClick={() => nav({ to: "/purchase-invoices/$id/edit", params: { id } })}
                >
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
              </div>
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
                <StatusPill
                  status={r.status}
                  tone={r.status === "disputed" ? "warning" : undefined}
                />
              </Row>
              <Row label="Vendor">{r.vendor?.company_name ?? "—"}</Row>
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
              <Row label="Project">{r.project?.name ?? "—"}</Row>
              <Row label="Due date">{r.due_date ? formatDate(r.due_date) : "—"}</Row>
              <Row label="Subtotal">{formatInr(r.subtotal)}</Row>
              <Row label="Tax">{formatInr(r.tax_amount)}</Row>
              <Row label="Other charges">{formatInr(r.other_charges)}</Row>
              <Row label="Total">
                <span className="text-base font-semibold">{formatInr(r.total_amount)}</span>
              </Row>
            </CardContent>
          </Card>
          <NotesPanel
            table="purchase_invoices"
            id={r.id}
            value={r.notes}
            invalidateKey={qk.purchaseInvoices.byId(r.id)}
          />
          <div id="pinv-documents">
            <AttachmentsPanel entityType="purchase_invoice" entityId={r.id} />
          </div>
        </div>
        <div className="space-y-4">
          <TimelinePanel entityType="purchase_invoice" entityId={r.id} />
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
