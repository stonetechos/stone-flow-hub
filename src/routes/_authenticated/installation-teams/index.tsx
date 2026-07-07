import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  createInstallationTeam,
  deleteInstallationTeam,
  listInstallationTeams,
  type InstallationTeam,
  type TeamMember,
} from "@/lib/installation/teams";
import { invalidateInstallationTeam } from "@/lib/query-invalidation";

export const Route = createFileRoute("/_authenticated/installation-teams/")({
  ssr: false,
  component: TeamsPage,
});

function TeamsPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [toDelete, setToDelete] = useState<InstallationTeam | null>(null);
  const query = useQuery({ queryKey: qk.installationTeams.list(q), queryFn: () => listInstallationTeams(q) });

  const del = useMutation({
    mutationFn: (id: string) => deleteInstallationTeam(id),
    onSuccess: () => {
      toast.success("Team removed");
      invalidateInstallationTeam(qc);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Installation teams"
        subtitle="Supervisors, members, skills, vehicles, daily capacity."
      />
      <div className="mb-3 flex items-center gap-2">
        <Input className="max-w-xs" placeholder="Search team, supervisor…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => nav({ to: "/installations" })}>Installations</Button>
          <NewTeamDialog />
        </div>
      </div>
      {query.isLoading ? <SkeletonTable /> :
       query.error ? <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} /> :
       !query.data?.length ? <EmptyState icon={<Users className="h-6 w-6" />} title="No teams yet" message="Create a team to assign to installations." /> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Capacity (sqft/day)</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs text-muted-foreground">{t.team_code}</TableCell>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.supervisor_name ?? "—"}{t.supervisor_phone ? ` · ${t.supervisor_phone}` : ""}</TableCell>
                    <TableCell>{t.members.length}</TableCell>
                    <TableCell className="text-xs">{t.skills.join(", ") || "—"}</TableCell>
                    <TableCell>{t.vehicle ?? "—"}</TableCell>
                    <TableCell>{t.daily_capacity_sqft ?? "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setToDelete(t)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Remove team "${toDelete?.name ?? ""}"?`}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
        confirmLabel="Remove"
      />
    </div>
  );
}

function NewTeamDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    supervisor_name: "",
    supervisor_phone: "",
    vehicle: "",
    daily_capacity_sqft: "",
    skills: "",
    members: "",
    notes: "",
  });

  const members: TeamMember[] = useMemo(() => {
    return form.members
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, phone, skill] = line.split("|").map((x) => x?.trim());
        return { name: name ?? line, phone: phone ?? null, skill: skill ?? null };
      });
  }, [form.members]);

  const create = useMutation({
    mutationFn: () =>
      createInstallationTeam({
        name: form.name,
        supervisor_name: form.supervisor_name || null,
        supervisor_phone: form.supervisor_phone || null,
        vehicle: form.vehicle || null,
        daily_capacity_sqft: form.daily_capacity_sqft ? Number(form.daily_capacity_sqft) : null,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        members,
        notes: form.notes || null,
      }),
    onSuccess: () => {
      toast.success("Team created");
      invalidateInstallationTeam(qc);
      setOpen(false);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New team</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New installation team</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Team name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Supervisor</Label>
              <Input value={form.supervisor_name} onChange={(e) => setForm({ ...form, supervisor_name: e.target.value })} />
            </div>
            <div className="space-y-1"><Label>Supervisor phone</Label>
              <Input value={form.supervisor_phone} onChange={(e) => setForm({ ...form, supervisor_phone: e.target.value })} />
            </div>
            <div className="space-y-1"><Label>Vehicle</Label>
              <Input value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} />
            </div>
            <div className="space-y-1"><Label>Daily capacity (sqft)</Label>
              <Input type="number" value={form.daily_capacity_sqft} onChange={(e) => setForm({ ...form, daily_capacity_sqft: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1"><Label>Skills (comma separated)</Label>
            <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="fabrication, chemical, edge polish" />
          </div>
          <div className="space-y-1"><Label>Members (one per line: name | phone | skill)</Label>
            <Textarea rows={3} value={form.members} onChange={(e) => setForm({ ...form, members: e.target.value })} placeholder="Ramesh | 9876543210 | Lead installer" />
          </div>
          <div className="space-y-1"><Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={!form.name || create.isPending}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
