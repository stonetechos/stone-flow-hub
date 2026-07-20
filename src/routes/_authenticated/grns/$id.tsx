import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityPicker } from "@/components/forms/EntityPicker";
import { StatusPill } from "@/components/entity/StatusPill";
import { AttachmentsPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  addGrnItem,
  deleteGrnItem,
  getGrn,
  listGrnItems,
  listInspections,
  updateGrn,
  upsertInspection,
} from "@/lib/grns/api";
import type { GrnItemCreateInput, GrnInspectionInput } from "@/lib/grns/schema";
import { GRN_ACCEPTANCE, GRN_STATUSES } from "@/lib/grns/schema";
import { invalidateGrn } from "@/lib/query-invalidation";

export const Route = createFileRoute("/_authenticated/grns/$id")({
  ssr: false,
  component: GrnDetailPage,
});

function GrnDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();

  const grnQuery = useQuery({ queryKey: qk.grns.byId(id), queryFn: () => getGrn(id) });
  const itemsQuery = useQuery({
    queryKey: qk.grns.items(id),
    queryFn: () => listGrnItems(id),
  });
  const insQuery = useQuery({
    queryKey: qk.grns.inspections(id),
    queryFn: async () => {
      const items = await listGrnItems(id);
      return listInspections(items.map((i) => i.id));
    },
    enabled: (itemsQuery.data?.length ?? 0) > 0,
  });

  const statusMut = useMutation({
    mutationFn: (patch: { status?: string; overall_acceptance?: string }) =>
      updateGrn(id, patch as never),
    onSuccess: () => {
      invalidateGrn(qc, id);
      toast.success("Updated");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const addItem = useMutation({
    mutationFn: (v: GrnItemCreateInput) => addGrnItem(v),
    onSuccess: () => {
      invalidateGrn(qc, id);
      toast.success("Line added");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const delItem = useMutation({
    mutationFn: (itemId: string) => deleteGrnItem(itemId),
    onSuccess: () => {
      invalidateGrn(qc, id);
      toast.success("Line removed");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const saveIns = useMutation({
    mutationFn: (v: GrnInspectionInput) => upsertInspection(v),
    onSuccess: () => {
      invalidateGrn(qc, id);
      toast.success("Inspection saved");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (grnQuery.isLoading) return <LoadingBlock />;
  if (grnQuery.error)
    return (
      <ErrorBlock message={toUserMessage(grnQuery.error)} onRetry={() => grnQuery.refetch()} />
    );
  if (!grnQuery.data) return <ErrorBlock message="GRN not found" />;
  const g = grnQuery.data;

  const inspByItem = new Map((insQuery.data ?? []).map((i) => [i.grn_item_id, i]));

  return (
    <div>
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/grns" })}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to GRNs
        </Button>
      </div>

      <PageHeader
        title={g.grn_no}
        subtitle={`Received ${g.received_date}`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                nav({
                  to: "/vendor-payments/new",
                  search: { vendor: g.vendor_id, grn: g.id, po: g.purchase_order_id ?? undefined },
                })
              }
            >
              Record payment
            </Button>
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
              <div>
                <div className="text-xs text-muted-foreground">Vendor</div>
                <div className="mt-0.5">{g.vendor?.company_name ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Purchase Order</div>
                <div className="mt-0.5">
                  {g.purchase_order ? (
                    <Link
                      to="/purchase-orders/$id"
                      params={{ id: g.purchase_order.id }}
                      className="text-primary hover:underline"
                    >
                      {g.purchase_order.po_no}
                    </Link>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Project</div>
                <div className="mt-0.5">{g.project?.name ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Delivery challan</div>
                <div className="mt-0.5">{g.delivery_challan_no ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Vehicle</div>
                <div className="mt-0.5">{g.vehicle_no ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Driver</div>
                <div className="mt-0.5">
                  {g.driver_name ?? "—"}
                  {g.driver_phone ? ` · ${g.driver_phone}` : ""}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="mt-0.5 flex items-center gap-2">
                  <StatusPill status={g.status} />
                  <Select value={g.status} onValueChange={(v) => statusMut.mutate({ status: v })}>
                    <SelectTrigger className="h-7 w-40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GRN_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Overall acceptance</div>
                <div className="mt-0.5 flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {g.overall_acceptance.replace(/_/g, " ")}
                  </Badge>
                  <Select
                    value={g.overall_acceptance}
                    onValueChange={(v) => statusMut.mutate({ overall_acceptance: v })}
                  >
                    <SelectTrigger className="h-7 w-56 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GRN_ACCEPTANCE.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <GrnItemsCard
            grnId={id}
            items={itemsQuery.data ?? []}
            loading={itemsQuery.isLoading}
            onAdd={(v) => addItem.mutate(v)}
            onDelete={(iid) => delItem.mutate(iid)}
            adding={addItem.isPending}
            inspByItem={inspByItem}
            onSaveInspection={(v) => saveIns.mutate(v)}
            savingInspection={saveIns.isPending}
          />

          <AttachmentsPanel entityType="grn" entityId={g.id} />
        </div>

        <div className="space-y-4">
          <TimelinePanel entityType="grn" entityId={g.id} />
        </div>
      </div>
    </div>
  );
}

function GrnItemsCard({
  grnId,
  items,
  loading,
  onAdd,
  onDelete,
  adding,
  inspByItem,
  onSaveInspection,
  savingInspection,
}: {
  grnId: string;
  items: Awaited<ReturnType<typeof listGrnItems>>;
  loading: boolean;
  onAdd: (v: GrnItemCreateInput) => void;
  onDelete: (id: string) => void;
  adding: boolean;
  inspByItem: Map<string, Awaited<ReturnType<typeof listInspections>>[number]>;
  onSaveInspection: (v: GrnInspectionInput) => void;
  savingInspection: boolean;
}) {
  const [draft, setDraft] = useState<GrnItemCreateInput>({
    grn_id: grnId,
    product_id: null,
    description: "",
    quantity_ordered: null,
    quantity_received: 0,
    quantity_accepted: 0,
    quantity_rejected: 0,
    unit: "sqft",
    unit_cost: 0,
    batch_no: "",
    lot_no: "",
    slab_no: "",
    bundle_no: "",
    crate_no: "",
    location: "",
    notes: "",
  });
  const setD = <K extends keyof GrnItemCreateInput>(k: K, v: GrnItemCreateInput[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm">Received lines</CardTitle>
        <span className="text-xs text-muted-foreground">
          Each line posts an inventory movement and accrues the vendor payable.
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <LoadingBlock />
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No lines yet.</div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => {
              const ins = inspByItem.get(it.id);
              return (
                <div key={it.id} className="rounded-md border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm">
                      <div className="font-medium">
                        {it.description || "Item"}
                        {it.unit ? ` · ${it.unit}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Ordered {it.quantity_ordered ?? "—"} · Received {it.quantity_received} ·
                        Accepted {it.quantity_accepted} · Rejected {it.quantity_rejected}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                        {it.batch_no && <Badge variant="outline">Batch {it.batch_no}</Badge>}
                        {it.lot_no && <Badge variant="outline">Lot {it.lot_no}</Badge>}
                        {it.slab_no && <Badge variant="outline">Slab {it.slab_no}</Badge>}
                        {it.bundle_no && <Badge variant="outline">Bundle {it.bundle_no}</Badge>}
                        {it.crate_no && <Badge variant="outline">Crate {it.crate_no}</Badge>}
                        {it.location && <Badge variant="outline">@ {it.location}</Badge>}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => onDelete(it.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <InspectionRow
                    itemId={it.id}
                    existing={ins}
                    onSave={onSaveInspection}
                    busy={savingInspection}
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-md border border-dashed border-border p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Plus className="h-4 w-4" /> Add line
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <EntityPicker
              type="product"
              value={draft.product_id ?? null}
              onChange={(v) => setD("product_id", v)}
              placeholder="Product"
            />
            <Input
              placeholder="Description"
              value={draft.description ?? ""}
              onChange={(e) => setD("description", e.target.value)}
            />
            <Input
              placeholder="Unit (sqft, slabs, kg…)"
              value={draft.unit ?? ""}
              onChange={(e) => setD("unit", e.target.value)}
            />
            <Input
              type="number"
              step="0.001"
              placeholder="Qty ordered"
              value={draft.quantity_ordered ?? ""}
              onChange={(e) =>
                setD("quantity_ordered", e.target.value ? Number(e.target.value) : null)
              }
            />
            <Input
              type="number"
              step="0.001"
              placeholder="Qty received"
              value={draft.quantity_received}
              onChange={(e) => setD("quantity_received", Number(e.target.value || 0))}
            />
            <Input
              type="number"
              step="0.001"
              placeholder="Qty accepted"
              value={draft.quantity_accepted}
              onChange={(e) => setD("quantity_accepted", Number(e.target.value || 0))}
            />
            <Input
              type="number"
              step="0.001"
              placeholder="Qty rejected"
              value={draft.quantity_rejected}
              onChange={(e) => setD("quantity_rejected", Number(e.target.value || 0))}
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Unit cost ₹"
              value={draft.unit_cost}
              onChange={(e) => setD("unit_cost", Number(e.target.value || 0))}
            />
            <Input
              placeholder="Batch #"
              value={draft.batch_no ?? ""}
              onChange={(e) => setD("batch_no", e.target.value)}
            />
            <Input
              placeholder="Lot #"
              value={draft.lot_no ?? ""}
              onChange={(e) => setD("lot_no", e.target.value)}
            />
            <Input
              placeholder="Slab #"
              value={draft.slab_no ?? ""}
              onChange={(e) => setD("slab_no", e.target.value)}
            />
            <Input
              placeholder="Bundle #"
              value={draft.bundle_no ?? ""}
              onChange={(e) => setD("bundle_no", e.target.value)}
            />
            <Input
              placeholder="Crate #"
              value={draft.crate_no ?? ""}
              onChange={(e) => setD("crate_no", e.target.value)}
            />
            <Input
              placeholder="Location"
              value={draft.location ?? ""}
              onChange={(e) => setD("location", e.target.value)}
            />
          </div>
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              onClick={() => onAdd(draft)}
              disabled={adding || draft.quantity_received <= 0}
            >
              Add line
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InspectionRow({
  itemId,
  existing,
  onSave,
  busy,
}: {
  itemId: string;
  existing: Awaited<ReturnType<typeof listInspections>>[number] | undefined;
  onSave: (v: GrnInspectionInput) => void;
  busy: boolean;
}) {
  const [ins, setIns] = useState<GrnInspectionInput>(() => ({
    grn_item_id: itemId,
    thickness_ok: existing?.thickness_ok ?? null,
    size_ok: existing?.size_ok ?? null,
    surface_finish_ok: existing?.surface_finish_ok ?? null,
    edge_finish_ok: existing?.edge_finish_ok ?? null,
    shade_ok: existing?.shade_ok ?? null,
    breakage_count: existing?.breakage_count ?? 0,
    cracks_count: existing?.cracks_count ?? 0,
    chips_count: existing?.chips_count ?? 0,
    moisture_pct: existing?.moisture_pct ?? null,
    packaging_condition: existing?.packaging_condition ?? "",
    outcome: (existing?.outcome as GrnInspectionInput["outcome"]) ?? "pending",
    remarks: existing?.remarks ?? "",
  }));

  const setB = (k: keyof GrnInspectionInput, v: boolean) => setIns((s) => ({ ...s, [k]: v }));
  const setN = (k: keyof GrnInspectionInput, v: number) => setIns((s) => ({ ...s, [k]: v }));

  return (
    <div className="mt-3 rounded-md bg-muted/40 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <ClipboardCheck className="h-3.5 w-3.5" /> Inspection
      </div>
      <div className="grid gap-2 md:grid-cols-5">
        {(
          [
            ["thickness_ok", "Thickness"],
            ["size_ok", "Size"],
            ["surface_finish_ok", "Surface"],
            ["edge_finish_ok", "Edge"],
            ["shade_ok", "Shade"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={!!ins[k]} onChange={(e) => setB(k, e.target.checked)} />
            {label} OK
          </label>
        ))}
      </div>
      <div className="mt-2 grid gap-2 md:grid-cols-4">
        <Input
          type="number"
          placeholder="Breakage"
          value={ins.breakage_count ?? 0}
          onChange={(e) => setN("breakage_count", Number(e.target.value || 0))}
        />
        <Input
          type="number"
          placeholder="Cracks"
          value={ins.cracks_count ?? 0}
          onChange={(e) => setN("cracks_count", Number(e.target.value || 0))}
        />
        <Input
          type="number"
          placeholder="Chips"
          value={ins.chips_count ?? 0}
          onChange={(e) => setN("chips_count", Number(e.target.value || 0))}
        />
        <Input
          type="number"
          step="0.1"
          placeholder="Moisture %"
          value={ins.moisture_pct ?? ""}
          onChange={(e) =>
            setIns((s) => ({
              ...s,
              moisture_pct: e.target.value ? Number(e.target.value) : null,
            }))
          }
        />
      </div>
      <div className="mt-2 grid gap-2 md:grid-cols-3">
        <Input
          placeholder="Packaging"
          value={ins.packaging_condition ?? ""}
          onChange={(e) => setIns((s) => ({ ...s, packaging_condition: e.target.value }))}
        />
        <Select
          value={ins.outcome}
          onValueChange={(v) =>
            setIns((s) => ({ ...s, outcome: v as GrnInspectionInput["outcome"] }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GRN_ACCEPTANCE.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          placeholder="Remarks"
          rows={1}
          value={ins.remarks ?? ""}
          onChange={(e) => setIns((s) => ({ ...s, remarks: e.target.value }))}
        />
      </div>
      <div className="mt-2 flex justify-end">
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => onSave(ins)}>
          Save inspection
        </Button>
      </div>
    </div>
  );
}
