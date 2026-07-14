import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, MapPin, Printer } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EntityInsightPanel } from "@/components/insights/EntityInsightPanel";
import { ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "@/components/entity/StatusPill";
import { AttachmentsPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  getInstallation,
  updateInstallation,
  INSTALLATION_ORDER_STATUSES,
  type InstallationOrderStatus,
} from "@/lib/installation/orders";
import { listTeamsForPicker } from "@/lib/installation/teams";
import { listProgress } from "@/lib/installation/progress";
import { listInstallationMaterials } from "@/lib/installation/materials";
import { getSignoff } from "@/lib/installation/signoff";
import { invalidateInstallation } from "@/lib/query-invalidation";
import { DailyProgressDialog } from "@/components/installation/DailyProgressDialog";
import { RecordMaterialDialog } from "@/components/installation/RecordMaterialDialog";
import { SignoffDialog } from "@/components/installation/SignoffDialog";
import { SiteAiPanel } from "@/components/installation/SiteAiPanel";
import { printCompletionCertificate } from "@/lib/installation/certificate";
import { GuidedNextStep } from "@/components/guided-workflow/GuidedNextStep";


export const Route = createFileRoute("/_authenticated/installations/$id")({
  ssr: false,
  component: InstallationDetailPage,
});

function InstallationDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: qk.installations.byId(id), queryFn: () => getInstallation(id) });
  const progressQ = useQuery({ queryKey: qk.installations.progress(id), queryFn: () => listProgress(id) });
  const materialsQ = useQuery({ queryKey: qk.installations.materials(id), queryFn: () => listInstallationMaterials(id) });
  const signoffQ = useQuery({ queryKey: qk.installations.signoff(id), queryFn: () => getSignoff(id) });
  const teamsQ = useQuery({ queryKey: qk.installationTeams.picker, queryFn: listTeamsForPicker });

  const [edit, setEdit] = useState<{
    team_id: string | null;
    supervisor_name: string;
    site_address: string;
    gps_lat: string;
    gps_lng: string;
    planned_start_date: string;
    planned_end_date: string;
    actual_start_date: string;
    actual_end_date: string;
    status: InstallationOrderStatus;
    notes: string;
  } | null>(null);

  const saveMut = useMutation({
    mutationFn: () => {
      if (!edit) throw new Error("no edit");
      return updateInstallation(id, {
        team_id: edit.team_id,
        supervisor_name: edit.supervisor_name || null,
        site_address: edit.site_address || null,
        gps_lat: edit.gps_lat ? Number(edit.gps_lat) : null,
        gps_lng: edit.gps_lng ? Number(edit.gps_lng) : null,
        planned_start_date: edit.planned_start_date || null,
        planned_end_date: edit.planned_end_date || null,
        actual_start_date: edit.actual_start_date || null,
        actual_end_date: edit.actual_end_date || null,
        status: edit.status,
        notes: edit.notes || null,
      });
    },
    onSuccess: () => {
      toast.success("Installation updated");
      invalidateInstallation(qc, id);
      setEdit(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (query.isLoading) return <LoadingBlock />;
  if (query.error) return <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />;
  if (!query.data) return <ErrorBlock message="Installation not found." />;
  const r = query.data;

  function startEdit() {
    setEdit({
      team_id: r.team_id,
      supervisor_name: r.supervisor_name ?? "",
      site_address: r.site_address ?? "",
      gps_lat: r.gps_lat != null ? String(r.gps_lat) : "",
      gps_lng: r.gps_lng != null ? String(r.gps_lng) : "",
      planned_start_date: r.planned_start_date ?? "",
      planned_end_date: r.planned_end_date ?? "",
      actual_start_date: r.actual_start_date ?? "",
      actual_end_date: r.actual_end_date ?? "",
      status: r.status,
      notes: r.notes ?? "",
    });
  }

  async function captureGps() {
    if (!edit) return;
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => setEdit({ ...edit, gps_lat: String(pos.coords.latitude), gps_lng: String(pos.coords.longitude) }),
      () => toast.error("Unable to read GPS"),
    );
  }

  const totalDispatched = materialsQ.data?.reduce((s, m) => s + Number(m.qty_dispatched), 0) ?? 0;
  const totalReceived = materialsQ.data?.reduce((s, m) => s + Number(m.qty_received), 0) ?? 0;
  const totalInstalled = materialsQ.data?.reduce((s, m) => s + Number(m.qty_installed), 0) ?? 0;
  const totalDamaged = materialsQ.data?.reduce((s, m) => s + Number(m.qty_damaged), 0) ?? 0;
  const totalReturned = materialsQ.data?.reduce((s, m) => s + Number(m.qty_returned), 0) ?? 0;

  return (
    <div>
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/installations" })}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
      <PageHeader
        title={r.installation_no ?? "Installation"}
        subtitle={`${r.customer?.name ?? ""} · ${r.project?.name ?? ""} · SO ${r.sales_order?.so_no ?? ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusPill status={r.status} />
            <DailyProgressDialog installationId={id} />
            <RecordMaterialDialog installationId={id} />
            <SignoffDialog installationId={id} disabled={!!signoffQ.data} />
            {signoffQ.data && (() => {
              const so = signoffQ.data;
              return (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    printCompletionCertificate({
                      installation_no: r.installation_no ?? "",
                      customer_name: r.customer?.name ?? "",
                      project_name: r.project?.name ?? null,
                      site_address: r.site_address,
                      actual_start_date: r.actual_start_date,
                      actual_end_date: r.actual_end_date,
                      rating: so.customer_rating,
                      remarks: so.remarks,
                    })
                  }
                >
                  <Printer className="mr-1 h-4 w-4" /> Certificate
                </Button>
              );
            })()}

          </div>
        }
      />

      <EntityInsightPanel entityType="installation" entityId={id} />
      <GuidedNextStep
        entity="installation"
        entityId={id}
        ctx={{ customer_id: r.customer_id, project_id: r.project_id, sales_order_id: r.sales_order_id }}
      />

      <div className="grid gap-4 md:grid-cols-3">

        <div className="space-y-4 md:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">Site & schedule</CardTitle>
              {!edit ? (
                <Button size="sm" variant="ghost" onClick={startEdit}>Edit</Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
                  <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                    <Save className="mr-1 h-4 w-4" /> Save
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="text-sm">
              {!edit ? (
                <dl className="grid grid-cols-2 gap-y-1">
                  <dt className="text-muted-foreground">Team</dt><dd>{r.team?.name ?? "—"}</dd>
                  <dt className="text-muted-foreground">Supervisor</dt><dd>{r.supervisor_name ?? "—"}</dd>
                  <dt className="text-muted-foreground">Site</dt><dd className="whitespace-pre-wrap">{r.site_address ?? "—"}</dd>
                  <dt className="text-muted-foreground">GPS</dt>
                  <dd>{r.gps_lat != null && r.gps_lng != null ? `${r.gps_lat}, ${r.gps_lng}` : "—"}</dd>
                  <dt className="text-muted-foreground">Planned</dt>
                  <dd>{r.planned_start_date ?? "—"} → {r.planned_end_date ?? "—"}</dd>
                  <dt className="text-muted-foreground">Actual</dt>
                  <dd>{r.actual_start_date ?? "—"} → {r.actual_end_date ?? "—"}</dd>
                  <dt className="text-muted-foreground">Progress</dt><dd>{Number(r.progress_pct).toFixed(0)}%</dd>
                  <dt className="text-muted-foreground">Notes</dt><dd className="whitespace-pre-wrap">{r.notes ?? "—"}</dd>
                </dl>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Team</Label>
                    <Select value={edit.team_id ?? "none"} onValueChange={(v) => setEdit({ ...edit, team_id: v === "none" ? null : v })}>
                      <SelectTrigger><SelectValue placeholder="Assign team" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— No team —</SelectItem>
                        {teamsQ.data?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Supervisor</Label>
                    <Input value={edit.supervisor_name} onChange={(e) => setEdit({ ...edit, supervisor_name: e.target.value })} />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label>Site address</Label>
                    <Textarea rows={2} value={edit.site_address} onChange={(e) => setEdit({ ...edit, site_address: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>GPS latitude</Label>
                    <Input value={edit.gps_lat} onChange={(e) => setEdit({ ...edit, gps_lat: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>GPS longitude</Label>
                    <Input value={edit.gps_lng} onChange={(e) => setEdit({ ...edit, gps_lng: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <Button size="sm" variant="outline" type="button" onClick={captureGps}>
                      <MapPin className="mr-1 h-4 w-4" /> Use device GPS
                    </Button>
                  </div>
                  <div className="space-y-1"><Label>Planned start</Label><Input type="date" value={edit.planned_start_date} onChange={(e) => setEdit({ ...edit, planned_start_date: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Planned end</Label><Input type="date" value={edit.planned_end_date} onChange={(e) => setEdit({ ...edit, planned_end_date: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Actual start</Label><Input type="date" value={edit.actual_start_date} onChange={(e) => setEdit({ ...edit, actual_start_date: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Actual end</Label><Input type="date" value={edit.actual_end_date} onChange={(e) => setEdit({ ...edit, actual_end_date: e.target.value })} /></div>
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select value={edit.status} onValueChange={(v) => setEdit({ ...edit, status: v as InstallationOrderStatus })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INSTALLATION_ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label>Notes</Label>
                    <Textarea rows={2} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Materials on site</CardTitle></CardHeader>
            <CardContent className="text-sm">
              <div className="mb-3 grid grid-cols-5 gap-2">
                {[
                  ["Dispatched", totalDispatched],
                  ["Received", totalReceived],
                  ["Installed", totalInstalled],
                  ["Damaged", totalDamaged],
                  ["Returned", totalReturned],
                ].map(([label, val]) => (
                  <div key={label as string} className="rounded-md border p-2">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="text-lg font-medium">{Number(val)}</div>
                  </div>
                ))}
              </div>
              {materialsQ.data?.length ? (
                <ul className="divide-y">
                  {materialsQ.data.map((m) => (
                    <li key={m.id} className="grid grid-cols-6 gap-2 py-1.5 text-xs">
                      <span className="col-span-2">{m.product?.name ?? m.description ?? "—"}</span>
                      <span>D {m.qty_dispatched}</span>
                      <span>R {m.qty_received}</span>
                      <span>I {m.qty_installed}</span>
                      <span>Dm {m.qty_damaged} / Rt {m.qty_returned}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No material recorded yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Daily reports</CardTitle></CardHeader>
            <CardContent className="text-sm">
              {progressQ.data?.length ? (
                <ul className="divide-y">
                  {progressQ.data.map((p) => (
                    <li key={p.id} className="py-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{p.report_date}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.progress_pct != null ? `${p.progress_pct}%` : ""} · {p.labour_present ?? "—"} labour
                        </span>
                      </div>
                      {p.work_completed && <div className="text-xs">✓ {p.work_completed}</div>}
                      {p.balance_work && <div className="text-xs text-muted-foreground">Balance: {p.balance_work}</div>}
                      {p.material_shortage && <div className="text-xs text-destructive">Shortage: {p.material_shortage}</div>}
                      {p.customer_remarks && <div className="text-xs">Customer: {p.customer_remarks}</div>}
                      {p.supervisor_remarks && <div className="text-xs">Supervisor: {p.supervisor_remarks}</div>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No progress reported yet.</p>
              )}
            </CardContent>
          </Card>

          <SiteAiPanel installationId={id} />
        </div>

        <div className="space-y-4">
          {signoffQ.data && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Customer sign-off</CardTitle></CardHeader>
              <CardContent className="text-sm">
                <p><span className="text-muted-foreground">By </span>{signoffQ.data.customer_name ?? "—"}</p>
                <p><span className="text-muted-foreground">Rating </span>{signoffQ.data.customer_rating ?? "—"}/5</p>
                <p><span className="text-muted-foreground">Signed </span>{new Date(signoffQ.data.signed_at).toLocaleString()}</p>
                {signoffQ.data.remarks && <p className="mt-2 whitespace-pre-wrap">{signoffQ.data.remarks}</p>}
              </CardContent>
            </Card>
          )}
          <AttachmentsPanel entityType="installation" entityId={id} />
          <TimelinePanel entityType="installation" entityId={id} />
        </div>
      </div>
    </div>
  );
}
