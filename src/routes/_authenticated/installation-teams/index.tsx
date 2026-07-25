import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useListPageState } from "@/hooks/use-list-page-state";
import { Can } from "@/hooks/use-roles";
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
  // Sprint 1.8, Part 3 — search/debounce/pagination/table-prefs via the
  // shared list-page hook (same 250ms debounce and prefs key as before).
  const list = useListPageState("installation-teams");
  const dq = list.debouncedQuery;
  const [toDelete, setToDelete] = useState<InstallationTeam | null>(null);
  const { prefs, setDensity, toggleColumn, isHidden } = list;

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "code", label: "Code", required: true },
      { key: "name", label: "Name" },
      { key: "supervisor", label: "Supervisor" },
      { key: "members", label: "Members" },
      { key: "skills", label: "Skills" },
      { key: "vehicle", label: "Vehicle" },
      { key: "capacity", label: "Capacity (sqft/day)" },
    ],
    [],
  );

  const query = useQuery({
    queryKey: qk.installationTeams.list(dq),
    queryFn: () => listInstallationTeams(dq),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteInstallationTeam(id),
    onSuccess: () => {
      toast.success("Team removed");
      invalidateInstallationTeam(qc);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const rows = query.data ?? [];
  const pageRows = list.paginate(rows);

  return (
    <div>
      <PageHeader
        title="Installation teams"
        subtitle="Supervisors, members, skills, vehicles, daily capacity."
      />

      <DataToolbar
        count={rows.length}
        search={list.query}
        onSearchChange={list.setQuery}
        searchPlaceholder="Search team, supervisor…"
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        extra={
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => nav({ to: "/installations" })}
          >
            Installations
          </Button>
        }
        action={
          /* Sprint 1.8, Part 7 — installation_teams RLS only allows admin /
             sales_manager writes (migration 20260707171536); previously the
             button rendered for read-only users and their save failed at the
             database. The policy itself is unchanged — this only stops
             showing an affordance the DB was already rejecting. */
          <Can anyRole={["admin", "sales_manager"]}>
            <NewTeamDialog />
          </Can>
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={7} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : !rows.length ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No teams yet"
          message="Create a team to assign to installations."
        />
      ) : (
        <DataTableShell
          density={prefs.density}
          footer={<TablePagination {...list.paginationProps(rows.length)} />}
        >
          <Table>
            <TableHeader>
              <TableRow>
                {!isHidden("code") && <TableHead>Code</TableHead>}
                {!isHidden("name") && <TableHead>Name</TableHead>}
                {!isHidden("supervisor") && <TableHead>Supervisor</TableHead>}
                {!isHidden("members") && <TableHead>Members</TableHead>}
                {!isHidden("skills") && <TableHead>Skills</TableHead>}
                {!isHidden("vehicle") && <TableHead>Vehicle</TableHead>}
                {!isHidden("capacity") && <TableHead>Capacity (sqft/day)</TableHead>}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((t) => (
                <TableRow key={t.id}>
                  {!isHidden("code") && (
                    <TableCell className="text-xs text-muted-foreground">{t.team_code}</TableCell>
                  )}
                  {!isHidden("name") && <TableCell className="font-medium">{t.name}</TableCell>}
                  {!isHidden("supervisor") && (
                    <TableCell>
                      {t.supervisor_name ?? "—"}
                      {t.supervisor_phone ? ` · ${t.supervisor_phone}` : ""}
                    </TableCell>
                  )}
                  {!isHidden("members") && <TableCell>{t.members.length}</TableCell>}
                  {!isHidden("skills") && (
                    <TableCell className="text-xs">{t.skills.join(", ") || "—"}</TableCell>
                  )}
                  {!isHidden("vehicle") && <TableCell>{t.vehicle ?? "—"}</TableCell>}
                  {!isHidden("capacity") && <TableCell>{t.daily_capacity_sqft ?? "—"}</TableCell>}
                  <TableCell>
                    {/* Sprint 1.8, Part 7 — same RLS alignment as the New
                        team button: delete is admin / sales_manager only. */}
                    <Can anyRole={["admin", "sales_manager"]}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToDelete(t)}
                        aria-label="Remove team"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Can>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
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
        skills: form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
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
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" /> New team
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New installation team</DialogTitle>
        </DialogHeader>
        <QuickForm
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name) return;
            create.mutate();
          }}
          busy={create.isPending}
        >
          <QuickForm.QuickFill>
            <Field label="Team name" required className="md:col-span-2">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Supervisor">
              <Input
                value={form.supervisor_name}
                onChange={(e) => setForm({ ...form, supervisor_name: e.target.value })}
              />
            </Field>
            <Field label="Supervisor phone">
              <Input
                value={form.supervisor_phone}
                onChange={(e) => setForm({ ...form, supervisor_phone: e.target.value })}
              />
            </Field>
            <Field label="Vehicle">
              <Input
                value={form.vehicle}
                onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
              />
            </Field>
            <Field label="Daily capacity (sqft)">
              <Input
                type="number"
                value={form.daily_capacity_sqft}
                onChange={(e) => setForm({ ...form, daily_capacity_sqft: e.target.value })}
              />
            </Field>
          </QuickForm.QuickFill>

          <QuickForm.MoreDetails>
            <Field label="Skills (comma separated)" className="md:col-span-2">
              <Input
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                placeholder="fabrication, chemical, edge polish"
              />
            </Field>
            <Field label="Members (one per line: name | phone | skill)" className="md:col-span-2">
              <Textarea
                rows={3}
                value={form.members}
                onChange={(e) => setForm({ ...form, members: e.target.value })}
                placeholder="Ramesh | 9876543210 | Lead installer"
              />
            </Field>
            <Field label="Notes" className="md:col-span-2">
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </QuickForm.MoreDetails>

          <QuickForm.Actions>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!form.name || create.isPending}>
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}
