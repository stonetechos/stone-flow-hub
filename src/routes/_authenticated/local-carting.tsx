import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Truck } from "lucide-react";
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
  createCartingAgency,
  deleteCartingAgency,
  listCartingAgencies,
  updateCartingAgency,
  type CartingAgencyInput,
  type CartingAgencyRow,
} from "@/lib/purchase-transportation/api";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/local-carting")({
  ssr: false,
  component: LocalCartingView,
});

const EMPTY: CartingAgencyInput = {
  code: "",
  name: "",
  contact_person: "",
  phone: "",
  vehicle_type: "",
  notes: "",
  is_active: true,
  sort_order: 100,
};

export function LocalCartingView() {
  const qc = useQueryClient();
  const roles = useRoles();
  const query = useQuery({
    queryKey: qk.cartingAgencies.list(),
    queryFn: () => listCartingAgencies(false),
  });
  const [editing, setEditing] = useState<CartingAgencyRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CartingAgencyInput>(EMPTY);
  const [toDelete, setToDelete] = useState<CartingAgencyRow | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: qk.cartingAgencies.list() });

  const createMut = useMutation({
    mutationFn: (input: CartingAgencyInput) => createCartingAgency(input),
    onSuccess: () => {
      toast.success("Local carting agency added");
      invalidate();
      setCreating(false);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; input: CartingAgencyInput }) =>
      updateCartingAgency(vars.id, vars.input),
    onSuccess: () => {
      toast.success("Local carting agency updated");
      invalidate();
      setEditing(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteCartingAgency(id),
    onSuccess: () => {
      toast.success("Local carting agency deleted");
      invalidate();
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const openCreate = () => {
    setForm(EMPTY);
    setCreating(true);
  };

  const openEdit = (row: CartingAgencyRow) => {
    setForm({
      code: row.code,
      name: row.name,
      contact_person: row.contact_person ?? "",
      phone: row.phone ?? "",
      vehicle_type: row.vehicle_type ?? "",
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
        title="Local Carting"
        subtitle="Manage local delivery and carting agencies for dispatch and transport operations."
        actions={
          roles.canWrite ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add carting agency
            </Button>
          ) : undefined
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={5} columns={6} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No carting agencies yet"
          message="Add a local carting agency to track dispatch transporters and vehicle rates."
          action={
            roles.canWrite ? (
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add carting agency
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
                <TableHead>Agency name</TableHead>
                <TableHead>Contact person</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Vehicle type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs font-semibold">{r.code}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span>{r.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{r.contact_person || "—"}</TableCell>
                  <TableCell>{r.phone || "—"}</TableCell>
                  <TableCell>{r.vehicle_type || "—"}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.is_active
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {roles.canWrite && (
                      <RowActions onEdit={() => openEdit(r)} onDelete={() => setToDelete(r)} />
                    )}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {creating ? "Add local carting agency" : `Edit ${editing?.name ?? "agency"}`}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (creating) createMut.mutate(form);
              else if (editing) updateMut.mutate({ id: editing.id, input: form });
            }}
          >
            <DialogBody className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Agency code" required>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="e.g. CRT-001"
                    required
                  />
                </Field>
                <Field label="Agency name" required>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Royal Roadways"
                    required
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Contact person">
                  <Input
                    value={form.contact_person ?? ""}
                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={form.phone ?? ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91..."
                  />
                </Field>
              </div>
              <Field label="Vehicle type">
                <Input
                  value={form.vehicle_type ?? ""}
                  onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
                  placeholder="e.g. 10 Wheeler, Bolero Maxi Truck"
                />
              </Field>
              <Field label="Notes">
                <Textarea
                  value={form.notes ?? ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                />
              </Field>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Active</div>
                  <div className="text-xs text-muted-foreground">
                    Inactive agencies won't appear in dispatch pickers.
                  </div>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(c) => setForm({ ...form, is_active: c })}
                />
              </div>
            </DialogBody>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreating(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {creating ? "Add agency" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete carting agency"
        description={`Are you sure you want to delete ${toDelete?.name ?? "this agency"}? This action cannot be undone.`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => toDelete && delMut.mutate(toDelete.id)}
      />
    </div>
  );
}
