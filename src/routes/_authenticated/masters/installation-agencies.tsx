import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, SkeletonTable, EmptyState } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  type InstallationAgencyInput,
  type InstallationAgencyRow,
} from "@/lib/installation-agencies/api";
import { useRoles } from "@/hooks/use-roles";

/**
 * Installation Agencies master (Task #47). Not built on the shared
 * MasterListPage — same reason Carting Agencies isn't (see
 * src/lib/masters/config.ts's note): brand-new table, MasterListPage's
 * typed `.from()` call only accepts tables already in the generated
 * Database type. Mirrors carting-agencies.tsx exactly.
 */
export const Route = createFileRoute("/_authenticated/masters/installation-agencies")({
  ssr: false,
  component: InstallationAgenciesPage,
});

const EMPTY: InstallationAgencyInput = {
  code: "",
  name: "",
  contact_person: "",
  phone: "",
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

  const invalidate = () => qc.invalidateQueries({ queryKey: qk.installationAgencies.list() });

  const createMut = useMutation({
    mutationFn: (input: InstallationAgencyInput) => createInstallationAgency(input),
    onSuccess: () => {
      toast.success("Installation agency added");
      invalidate();
      setCreating(false);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const updateMut = useMutation({
    mutationFn: (vars: { id: string; input: InstallationAgencyInput }) =>
      updateInstallationAgency(vars.id, vars.input),
    onSuccess: () => {
      toast.success("Installation agency updated");
      invalidate();
      setEditing(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteInstallationAgency(id),
    onSuccess: () => {
      toast.success("Installation agency deleted");
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
      notes: row.notes ?? "",
      is_active: row.is_active,
      sort_order: row.sort_order,
    });
    setEditing(row);
  };

  const rows = query.data ?? [];
  const dialogOpen = creating || !!editing;

  return (
    <div>
      <PageHeader
        title="Installation Agencies"
        subtitle="Third-party crews who handle installation on approved quotations."
        actions={
          roles.canWrite ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add agency
            </Button>
          ) : undefined
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No installation agencies yet"
          message="Add an agency to assign it on an approved quotation."
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
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit installation agency" : "Add installation agency"}
            </DialogTitle>
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
                  required
                />
              </Field>
              <Field label="Name" required>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Contact person">
                <Input
                  value={form.contact_person ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={form.phone ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
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
