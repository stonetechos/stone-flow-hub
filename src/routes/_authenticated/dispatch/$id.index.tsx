import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, FolderOpen, History, Calendar, Loader2 } from "lucide-react";
import { DetailActionBar } from "@/components/entity/DetailActionBar";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentToolbar } from "@/components/documents/DocumentToolbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/entity/StatusPill";
import { AttachmentsPanel, NotesPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getDispatch, listDispatchItems, updateDispatch } from "@/lib/dispatch/api";
import { invalidateDispatch } from "@/lib/query-invalidation";
import { formatInr } from "@/lib/format";
import { GuidedNextStep } from "@/components/guided-workflow/GuidedNextStep";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dispatch/$id/")({
  ssr: false,
  component: DispatchDetailPage,
});

function DispatchDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [editDateOpen, setEditDateOpen] = useState(false);
  const [newDate, setNewDate] = useState("");

  const query = useQuery({ queryKey: qk.dispatch.byId(id), queryFn: () => getDispatch(id) });
  const itemsQuery = useQuery({
    queryKey: qk.dispatch.items(id),
    queryFn: () => listDispatchItems(id),
  });

  const updateDateMut = useMutation({
    mutationFn: async (updatedDate: string) => {
      if (!query.data) return;
      const r = query.data;
      await updateDispatch(id, {
        sales_order_id: r.sales_order_id,
        customer_id: r.customer_id,
        project_id: r.project_id,
        status: r.status,
        dispatch_date: updatedDate,
        carrier: r.carrier,
        tracking_no: r.tracking_no,
        site_address: r.site_address,
        vehicle_no: r.vehicle_no,
        driver_name: r.driver_name,
        driver_phone: r.driver_phone,
        lr_no: r.lr_no,
        delivered_by: r.delivered_by,
        received_by: r.received_by,
        carting_charge: Number(r.carting_charge ?? 0),
        remarks: r.remarks,
        notes: r.notes,
      });
    },
    onSuccess: (_, updatedDate) => {
      toast.success(`Delivery date updated to ${updatedDate}`);
      invalidateDispatch(qc, id);
      setEditDateOpen(false);
    },
    onError: (e) => toast.error(toUserMessage(e)),
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
                <DocumentToolbar entity="delivery_challan" entityId={id} />
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
        ctx={{
          sales_order_id: r.sales_order_id,
          project_id: r.project_id,
          customer_id: r.customer_id,
        }}
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
              <Row label="Delivery / Challan Date">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground flex items-center gap-1.5 font-mono text-xs">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    {r.dispatch_date || "—"}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[11px] px-2 cursor-pointer text-slate-700 hover:text-primary"
                    onClick={() => {
                      setNewDate(r.dispatch_date || "");
                      setEditDateOpen(true);
                    }}
                    title="Change delivery date at any stage"
                  >
                    <Pencil className="mr-1 h-3 w-3" /> Change date
                  </Button>
                </div>
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

      <Dialog open={editDateOpen} onOpenChange={setEditDateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Delivery Date</DialogTitle>
            <DialogDescription>
              Update the delivery date for challan{" "}
              <span className="font-semibold text-foreground font-mono">{r.dispatch_no}</span>. This
              can be updated at any stage.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <label className="text-xs font-semibold text-slate-700 block">
              Delivery / Challan Date
            </label>
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full"
              required
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDateOpen(false)}
              disabled={updateDateMut.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateDateMut.mutate(newDate)}
              disabled={!newDate || updateDateMut.isPending}
            >
              {updateDateMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Delivery Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
