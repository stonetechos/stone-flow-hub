/**
 * Production order detail — installation coordinates + stage timeline.
 * Each stage row supports assignment (vendor/user), in-house/outside toggle,
 * planned vs actual dates, QC checklist, delay reason, images/files, notes.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Clock, ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EntityPicker } from "@/components/forms/EntityPicker";
import { qk } from "@/lib/query-keys";
import { invalidateProductionOrder } from "@/lib/query-invalidation";
import { toUserMessage } from "@/lib/errors";
import { InstallationTracker } from "@/components/manufacturing/InstallationTracker";
import { QcChecklist } from "@/components/manufacturing/QcChecklist";
import { GuidedNextStep } from "@/components/guided-workflow/GuidedNextStep";


const STAGE_STATUSES = ["pending", "in_progress", "completed", "on_hold", "skipped"] as const;
const PO_STATUSES = ["planned", "in_progress", "on_hold", "completed", "cancelled"] as const;

export const Route = createFileRoute("/_authenticated/manufacturing/$id")({
  component: ProductionOrderDetail,
});

type Stage = {
  id: string;
  stage_id: string;
  sort_order: number;
  status: string;
  is_outsourced: boolean;
  assigned_vendor_id: string | null;
  assigned_user_id: string | null;
  planned_start: string | null;
  planned_date: string | null;
  actual_start: string | null;
  actual_completed_at: string | null;
  delay_reason: string | null;
  notes: string | null;
  qc_checklist: unknown;
  manufacturing_stages: { name: string; code: string } | null;
};

function ProductionOrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const orderQ = useQuery({
    queryKey: qk.productionOrders.byId(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_orders")
        .select(
          "*, products(id,name,product_code), customers(id,name), projects(id,name), enquiries(id,enquiry_no), sales_orders(id,so_no)"
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const stagesQ = useQuery({
    queryKey: qk.productionOrders.stages(id),
    queryFn: async (): Promise<Stage[]> => {
      const { data, error } = await supabase
        .from("production_stages")
        .select("*, manufacturing_stages(name, code)")
        .eq("production_order_id", id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Stage[];
    },
  });

  const updateOrder = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await (supabase.from("production_orders") as unknown as {
        update: (v: Record<string, unknown>) => { eq: (c: string, id: string) => Promise<{ error: unknown }> };
      }).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order updated");
      invalidateProductionOrder(qc, id, orderQ.data?.sales_order_id);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const updateStage = useMutation({
    mutationFn: async ({ stageId, patch }: { stageId: string; patch: Record<string, unknown> }) => {
      const { error } = await (supabase.from("production_stages") as unknown as {
        update: (v: Record<string, unknown>) => { eq: (c: string, id: string) => Promise<{ error: unknown }> };
      }).update(patch).eq("id", stageId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.productionOrders.stages(id) });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (orderQ.isLoading) return <SkeletonTable />;
  if (orderQ.isError) return <ErrorBlock message={toUserMessage(orderQ.error)} />;
  if (!orderQ.data) return <ErrorBlock message="Production order not found" />;
  const po = orderQ.data as unknown as {
    mfg_no: string; status: string; quantity: number; unit: string;
    room: string | null; elevation: string | null; wall: string | null;
    drawing_ref: string | null; revision: string | null;
    bundle_no: string | null; crate_no: string | null; install_sequence: number | null;
    planned_start: string | null; planned_end: string | null; notes: string | null;
    sales_order_id: string | null;
    products: { id: string; name: string; product_code: string } | null;
    customers: { id: string; name: string } | null;
    projects: { id: string; name: string } | null;
    enquiries: { id: string; enquiry_no: string } | null;
    sales_orders: { id: string; so_no: string } | null;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={po.mfg_no}
        subtitle={`${po.products?.name ?? "Product"} · ${po.quantity} ${po.unit}`}
        actions={
          <Select
            value={po.status}
            onValueChange={(v) => updateOrder.mutate({ status: v })}
          >
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PO_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <GuidedNextStep entity="production_order" entityId={id} />



      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <LinkCard label="Customer" value={po.customers?.name} to={po.customers ? `/customers/${po.customers.id}` : undefined} />
        <LinkCard label="Project" value={po.projects?.name} to={po.projects ? `/projects/${po.projects.id}` : undefined} />
        <LinkCard label="Enquiry" value={po.enquiries?.enquiry_no} to={po.enquiries ? `/enquiries/${po.enquiries.id}` : undefined} />
        <LinkCard label="Sales Order" value={po.sales_orders?.so_no} to={po.sales_orders ? `/sales-orders/${po.sales_orders.id}` : undefined} />
      </div>

      <Card className="p-4">
        <h2 className="mb-3 font-display text-base font-semibold">Installation Coordinates</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FieldRow label="Room" value={po.room} onSave={(v) => updateOrder.mutate({ room: v })} />
          <FieldRow label="Elevation" value={po.elevation} onSave={(v) => updateOrder.mutate({ elevation: v })} />
          <FieldRow label="Wall" value={po.wall} onSave={(v) => updateOrder.mutate({ wall: v })} />
          <FieldRow label="Install seq." value={po.install_sequence?.toString() ?? null} type="number"
            onSave={(v) => updateOrder.mutate({ install_sequence: v ? Number(v) : null })} />
          <FieldRow label="Drawing ref" value={po.drawing_ref} onSave={(v) => updateOrder.mutate({ drawing_ref: v })} />
          <FieldRow label="Revision" value={po.revision} onSave={(v) => updateOrder.mutate({ revision: v })} />
          <FieldRow label="Bundle" value={po.bundle_no} onSave={(v) => updateOrder.mutate({ bundle_no: v })} />
          <FieldRow label="Crate" value={po.crate_no} onSave={(v) => updateOrder.mutate({ crate_no: v })} />
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-display text-base font-semibold">Production Stages</h2>
        {stagesQ.isLoading ? (
          <SkeletonTable />
        ) : (
          <div className="space-y-2">
            {(stagesQ.data ?? []).map((s) => (
              <StageCard
                key={s.id}
                stage={s}
                onPatch={(patch) => updateStage.mutate({ stageId: s.id, patch })}
              />
            ))}
            {!(stagesQ.data ?? []).length && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No stages seeded — check Manufacturing Stages master.
              </p>
            )}
          </div>
        )}
      </Card>

      <InstallationTracker orderId={id} projectId={po.projects?.id ?? null} />
    </div>
  );
}

function LinkCard({ label, value, to }: { label: string; value?: string | null; to?: string }) {
  return (
    <Card className="p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      {value ? (
        to ? (
          <Link to={to} className="mt-1 flex items-center gap-1 font-medium text-primary hover:underline">
            {value} <ExternalLink className="h-3 w-3" />
          </Link>
        ) : (
          <p className="mt-1 font-medium">{value}</p>
        )
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">—</p>
      )}
    </Card>
  );
}

function FieldRow({
  label, value, type = "text", onSave,
}: { label: string; value: string | null; type?: string; onSave: (v: string | null) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        defaultValue={value ?? ""}
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (v !== (value ?? "")) onSave(v || null);
        }}
      />
    </div>
  );
}

function StageCard({ stage, onPatch }: { stage: Stage; onPatch: (p: Record<string, unknown>) => void }) {
  const icon =
    stage.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-primary" /> :
    stage.status === "in_progress" ? <Clock className="h-5 w-5 text-amber-500" /> :
    stage.status === "on_hold" ? <AlertTriangle className="h-5 w-5 text-destructive" /> :
    <Circle className="h-5 w-5 text-muted-foreground" />;
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <p className="font-medium">{stage.manufacturing_stages?.name ?? "Stage"}</p>
          <p className="font-mono text-[10px] text-muted-foreground">
            {stage.manufacturing_stages?.code}
          </p>
        </div>
        <Select value={stage.status} onValueChange={(v) => {
          const patch: Record<string, unknown> = { status: v };
          if (v === "in_progress" && !stage.actual_start) patch.actual_start = new Date().toISOString();
          if (v === "completed" && !stage.actual_completed_at) patch.actual_completed_at = new Date().toISOString();
          onPatch(patch);
        }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STAGE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="flex items-center gap-2 rounded-md border px-3 py-2">
          <Switch
            checked={stage.is_outsourced}
            onCheckedChange={(v) => onPatch({ is_outsourced: v })}
          />
          <span className="text-sm">{stage.is_outsourced ? "Outsourced" : "In-house"}</span>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">
            {stage.is_outsourced ? "Assigned Vendor" : "Planned date"}
          </Label>
          {stage.is_outsourced ? (
            <EntityPicker
              type="vendor"
              value={stage.assigned_vendor_id}
              onChange={(vid) => onPatch({ assigned_vendor_id: vid })}
            />
          ) : (
            <Input
              type="date"
              defaultValue={stage.planned_date?.slice(0, 10) ?? ""}
              onBlur={(e) => onPatch({ planned_date: e.target.value || null })}
            />
          )}
        </div>
      </div>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <Textarea
          rows={1}
          placeholder="Delay reason (if any)"
          defaultValue={stage.delay_reason ?? ""}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v !== (stage.delay_reason ?? "")) onPatch({ delay_reason: v || null });
          }}
        />
        <Textarea
          rows={1}
          placeholder="Notes"
          defaultValue={stage.notes ?? ""}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v !== (stage.notes ?? "")) onPatch({ notes: v || null });
          }}
        />
      </div>
      <div className="mt-3">
        <QcChecklist stageId={stage.id} />
      </div>
    </div>
  );
}
