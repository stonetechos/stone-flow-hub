import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, SkeletonTable, EmptyState } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field } from "@/components/forms/Field";
import { RowActions } from "@/components/data/RowActions";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toUserMessage } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import {
  createInstallationAgency,
  deleteInstallationAgency,
  listInstallationAgencies,
  updateInstallationAgency,
  AGENCY_WORK_TYPES,
  type AgencyWorkType,
  type InstallationAgencyInput,
  type InstallationAgencyRow,
} from "@/lib/installation-agencies/api";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/masters/installation-agencies")({
  ssr: false,
  component: InstallationAgenciesPage,
});

const EMPTY: InstallationAgencyInput = {
  code: "",
  name: "",
  contact_person: "",
  phone: "",
  work_types: ["installation"],
  notes: "",
  is_active: true,
  sort_order: 100,
};

function InstallationAgenciesPage() {
  const qc = useQueryClient();
  const roles = useRoles();
  const query = useQuery({
    queryKey: qk.installationAgencies.list(),
    queryFn: () => listInstallationAgencies(false),
  });
  const [editing, setEditing] = useState<InstallationAgencyRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<InstallationAgencyInput>(EMPTY);
  const [toDelete, setToDelete] = useState<InstallationAgencyRow | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const invalidate = () => qc.invalidateQueries({ queryKey: qk.installationAgencies.list() });

  const createMut = useMutation({
    mutationFn: (input: InstallationAgencyInput) => createInstallationAgency(input),
    onSuccess: () => {
      toast.success("Agency added");
      invalidate();
      setCreating(false);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const updateMut = useMutation({
    mutationFn: (vars: { id: string; input: InstallationAgencyInput }) =>
      updateInstallationAgency(vars.id, vars.input),
    onSuccess: () => {
      toast.success("Agency updated");
      invalidate();
      setEditing(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteInstallationAgency(id),
    onSuccess: () => {
      toast.success("Agency deleted");
      invalidate();
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const openCreate = () => {
    setForm(EMPTY);
    setCreating(true);
  };
  const openEdit = (row: InstallationAgencyRow) => {
    setForm({
      code: row.code,
      name: row.name,
      contact_person: row.contact_person ?? "",
      phone: row.phone ?? "",
      work_types: row.work_types && row.work_types.length > 0 ? row.work_types : ["installation"],
      notes: row.notes ?? "",
      is_active: row.is_active,
      sort_order: row.sort_order,
    });
    setEditing(row);
  };

  const rows = useMemo(() => query.data ?? [], [query.data]);
  const filteredRows = useMemo(() => {
    if (selectedFilter === "all") return rows;
    return rows.filter((r) => (r.work_types ?? []).includes(selectedFilter as AgencyWorkType));
  }, [rows, selectedFilter]);

  const dialogOpen = creating || !!editing;

  return (
    <div>
      <PageHeader
        title="Agencies & Specialized Work Crews"
        subtitle="Third-party agencies & contractors for Installation, Handcrafter, CNC Works, Polishing Work, Artwork, and Transport."
        actions={
          roles.canWrite ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add agency
            </Button>
          ) : undefined
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground mr-1">Work Type:</span>
        <Button
          type="button"
          size="sm"
          variant={selectedFilter === "all" ? "default" : "outline"}
          className="h-7 text-xs rounded-full"
          onClick={() => setSelectedFilter("all")}
        >
          All ({rows.length})
        </Button>
        {AGENCY_WORK_TYPES.map((wt) => {
          const count = rows.filter((r) => (r.work_types ?? []).includes(wt.value)).length;
          return (
            <Button
              key={wt.value}
              type="button"
              size="sm"
              variant={selectedFilter === wt.value ? "default" : "outline"}
              className="h-7 text-xs rounded-full"
              onClick={() => setSelectedFilter(wt.value)}
            >
              {wt.label} {count > 0 && `(${count})`}
            </Button>
          );
        })}
      </div>

      {query.isLoading ? (
        <SkeletonTable rows={5} columns={6} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : filteredRows.length === 0 ? (
        <EmptyState
          title="No agencies found"
          message={
            selectedFilter === "all"
              ? "Add an agency to assign it on quotations and installation jobs."
              : `No agencies found matching "${selectedFilter}".`
          }
          action={
            roles.canWrite ? (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add agency
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Agency Name</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(r.work_types && r.work_types.length > 0
                        ? r.work_types
                        : ["installation"]
                      ).map((wt) => {
                        const item = AGENCY_WORK_TYPES.find((w) => w.value === wt);
                        return (
                          <Badge
                            key={wt}
                            variant="secondary"
                            className="text-[10px] py-0 px-1.5 font-normal"
                          >
                            {item?.label ?? wt}
                          </Badge>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{r.contact_person ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.phone ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.is_active ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <RowActions onEdit={() => openEdit(r)} onDelete={() => setToDelete(r)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "Add Agency / Work Crew"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editing) updateMut.mutate({ id: editing.id, input: form });
              else createMut.mutate(form);
            }}
          >
            <DialogBody className="grid gap-3 sm:grid-cols-2">
              <Field label="Code" required>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. AG-001"
                  required
                />
              </Field>
              <Field label="Agency / Contractor Name" required>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Royal Marble Crafters"
                  required
                />
              </Field>

              {/* Work Specialization */}
              <div className="sm:col-span-2 space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Work Specialization
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Select all services provided
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {AGENCY_WORK_TYPES.map((wt) => {
                    const active = (form.work_types ?? []).includes(wt.value);
                    return (
                      <button
                        key={wt.value}
                        type="button"
                        onClick={() => {
                          const current = form.work_types ?? [];
                          const next = active
                            ? current.filter((x) => x !== wt.value)
                            : [...current, wt.value];
                          setForm((f) => ({
                            ...f,
                            work_types: next.length > 0 ? next : [wt.value],
                          }));
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                          active
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {active && <Check className="h-3 w-3" />}
                        {wt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Field label="Contact person">
                <Input
                  value={form.contact_person ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
                  placeholder="Lead craftsman / Manager"
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={form.phone ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+91..."
                />
              </Field>
              <Field label="Active">
                <div className="flex h-9 items-center">
                  <Switch
                    checked={form.is_active ?? true}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                  />
                </div>
              </Field>
              <Field label="Notes" className="sm:col-span-2">
                <Textarea
                  rows={2}
                  value={form.notes ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Capacity, toolkits, workshop location, rates notes…"
                />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCreating(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this installation agency?"
        description={toDelete ? `${toDelete.name} will be removed.` : ""}
        busy={delMut.isPending}
        onConfirm={() => toDelete && delMut.mutate(toDelete.id)}
      />
    </div>
  );
}
