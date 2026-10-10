import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  createCartingAgency,
  deleteCartingAgency,
  listCartingAgencies,
  updateCartingAgency,
  type CartingAgencyInput,
  type CartingAgencyRow,
} from "@/lib/purchase-transportation/api";
import { useRoles } from "@/hooks/use-roles";

/**
 * Carting Agencies master (Task #40). Not built on the shared
 * MasterListPage — that component's typed `.from()` call only accepts
 * tables already in the generated Database type, and this is a brand-new
 * table (see src/lib/masters/config.ts's note next to this omission). A
 * small bespoke CRUD page instead, same fields the migration defines.
 */
export const Route = createFileRoute("/_authenticated/masters/carting-agencies")({
  ssr: false,
  component: CartingAgenciesPage,
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

function CartingAgenciesPage() {
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
      toast.success("Carting agency added");
      invalidate();
      setCreating(false);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const updateMut = useMutation({
    mutationFn: (vars: { id: string; input: CartingAgencyInput }) =>
      updateCartingAgency(vars.id, vars.input),
    onSuccess: () => {
      toast.success("Carting agency updated");
      invalidate();
      setEditing(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteCartingAgency(id),
    onSuccess: () => {
      toast.success("Carting agency deleted");
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

  const [search, setSearch] = useState("");
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    const qDigits = q.replace(/\D/g, "");
    return rows.filter((r) => {
      const nameMatch = r.name.toLowerCase().includes(q);
      const codeMatch = (r.code ?? "").toLowerCase().includes(q);
      const contactMatch = (r.contact_person ?? "").toLowerCase().includes(q);
      const vehicleMatch = (r.vehicle_type ?? "").toLowerCase().includes(q);
      const phoneRaw = r.phone ?? "";
      const phoneMatch = phoneRaw.toLowerCase().includes(q);
      const phoneDigits = phoneRaw.replace(/\D/g, "");
      const digitMatch =
        qDigits.length >= 4 &&
        (phoneDigits.includes(qDigits) ||
          (qDigits.length >= 10 && phoneDigits.includes(qDigits.slice(-10))));
      return nameMatch || codeMatch || contactMatch || vehicleMatch || phoneMatch || digitMatch;
    });
  }, [rows, search]);

  const dialogOpen = creating || !!editing;

  return (
    <div>
      <PageHeader
        title="Carting Agencies"
        subtitle="Transporters used for inbound vendor shipments (Purchase Transportation)."
        actions={
          roles.canWrite ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add agency
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, contact, vehicle…"
            className="h-8 pl-8 text-xs w-full"
          />
        </div>
      </div>

      {query.isLoading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : filteredRows.length === 0 ? (
        <EmptyState
          title="No carting agencies found"
          message={
            search
              ? `No carting agencies matched "${search}".`
              : "Add a transporter to select it when logging a Purchase Transportation shipment."
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
              <TableRow className="bg-muted/40">
                <TableHead className="min-w-[180px]">Agency / Carrier Name</TableHead>
                <TableHead className="min-w-[140px]">Contact Person</TableHead>
                <TableHead className="min-w-[130px]">Phone</TableHead>
                <TableHead className="min-w-[140px]">Vehicle Type</TableHead>
                <TableHead className="w-20">Status</TableHead>
                <TableHead className="w-36 text-right pr-4 sticky right-0 bg-background/95 backdrop-blur-xs">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((r) => (
                <TableRow
                  key={r.id}
                  className="hover:bg-muted/40 transition-colors group cursor-pointer"
                  onDoubleClick={() => openEdit(r)}
                >
                  <TableCell
                    className="font-medium text-foreground py-3"
                    onClick={() => openEdit(r)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-foreground group-hover:text-primary group-hover:underline transition-colors">
                        {r.name}
                      </span>
                      <Pencil className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  </TableCell>
                  <TableCell className="text-sm py-3">{r.contact_person ?? "—"}</TableCell>
                  <TableCell className="text-sm py-3">
                    {r.phone ? (
                      <a
                        href={`tel:${r.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline text-primary font-mono text-xs"
                      >
                        {r.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm py-3">{r.vehicle_type ?? "—"}</TableCell>
                  <TableCell className="text-sm py-3">
                    <Badge
                      variant={r.is_active ? "outline" : "secondary"}
                      className={cn(
                        "text-[10px] font-medium",
                        r.is_active
                          ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                          : "text-muted-foreground",
                      )}
                    >
                      {r.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="py-3 text-right pr-4 sticky right-0 bg-background/95 backdrop-blur-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => openEdit(r)}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                      </Button>
                      <RowActions
                        onEdit={() => openEdit(r)}
                        onDelete={() => setToDelete(r)}
                        canEdit={true}
                        canDelete={roles.canDelete}
                      />
                    </div>
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
            <DialogTitle>{editing ? `Edit ${editing.name}` : "Add carting agency"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editing) updateMut.mutate({ id: editing.id, input: form });
              else createMut.mutate(form);
            }}
          >
            <DialogBody className="grid gap-3 sm:grid-cols-2">
              <Field label="Agency / Carrier Name" required className="sm:col-span-2">
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Gujarat Freight Carriers / Mukesh Bhai"
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
              <Field label="Vehicle type">
                <Input
                  value={form.vehicle_type ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, vehicle_type: e.target.value }))}
                  placeholder="Truck / Tempo / Trailer…"
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
        title="Delete this carting agency?"
        description={toDelete ? `${toDelete.name} will be removed.` : ""}
        busy={delMut.isPending}
        onConfirm={() => toDelete && delMut.mutate(toDelete.id)}
      />
    </div>
  );
}
