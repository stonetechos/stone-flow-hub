import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Building2, ExternalLink } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { RowActions } from "@/components/data/RowActions";
import { SafeDeleteDialog } from "@/components/mdm/SafeDeleteDialog";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useTablePrefs } from "@/hooks/use-table-prefs";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  createProject,
  deleteProject,
  listProjects,
  updateProject,
  type ProjectWithCustomer,
} from "@/lib/projects/api";
import { EntityPicker } from "@/components/forms/EntityPicker";
import { invalidateProject, seedPickerCache } from "@/lib/query-invalidation";
import { PROJECT_TYPES, projectCreateSchema, type ProjectCreateInput } from "@/lib/projects/schema";
import { LEAD_STAGE_LABEL } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/projects/")({
  ssr: false,
  component: ProjectsPage,
  validateSearch: (
    s: Record<string, unknown>,
  ): { edit?: string; new?: string; customer?: string; enquiry?: string } => {
    const out: { edit?: string; new?: string; customer?: string; enquiry?: string } = {};
    if (typeof s.edit === "string") out.edit = s.edit;
    if (typeof s.new === "string") out.new = s.new;
    if (typeof s.customer === "string") out.customer = s.customer;
    if (typeof s.enquiry === "string") out.enquiry = s.enquiry;
    return out;
  },
});

function ProjectsPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { edit, new: newParam, customer: customerParam } = Route.useSearch();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectWithCustomer | null>(null);
  const [toDelete, setToDelete] = useState<ProjectWithCustomer | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("projects");

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "code", label: "Code", required: true },
      { key: "name", label: "Name", required: true },
      { key: "customer", label: "Customer" },
      { key: "type", label: "Type" },
      { key: "city", label: "City" },
      { key: "stage", label: "Stage" },
    ],
    [],
  );

  const query = useQuery({ queryKey: qk.projects.list(dq), queryFn: () => listProjects(dq) });
  useEffect(() => setPage(1), [dq]);

  useEffect(() => {
    if (!edit) return;
    const row = (query.data ?? []).find((r) => r.id === edit);
    if (row) {
      setEditing(row);
      setFormOpen(true);
      nav({ to: "/projects", search: {}, replace: true });
    }
  }, [edit, query.data, nav]);

  // Auto-open create dialog on `?new=1`; strip the trigger after opening so
  // the URL stays clean and the browser back button behaves.
  useEffect(() => {
    if (newParam) {
      setEditing(null);
      setFormOpen(true);
      nav({
        to: "/projects",
        search: (s: Record<string, unknown>) => ({ ...s, new: undefined }),
        replace: true,
      });
    }
  }, [newParam, nav]);

  const delMut = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      toast.success("Project deleted");
      invalidateProject(qc);
      setToDelete(null);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const rows = query.data ?? [];
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const openCreate = () => { setEditing(null); setFormOpen(true); };

  return (
    <div>
      <PageHeader title="Projects" subtitle="Every enquiry lives inside a project." />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Search by name, code, city…"
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          <Button size="sm" className="h-8" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New project
          </Button>
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="No projects yet"
          message="Create a project against a customer to start tracking enquiries."
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> New project
            </Button>
          }
        />
      ) : (
        <DataTableShell
          density={prefs.density}
          footer={
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={rows.length}
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                {!isHidden("code") && <TableHead>Code</TableHead>}
                {!isHidden("name") && <TableHead>Name</TableHead>}
                {!isHidden("customer") && <TableHead>Customer</TableHead>}
                {!isHidden("type") && <TableHead>Type</TableHead>}
                {!isHidden("city") && <TableHead>City</TableHead>}
                {!isHidden("stage") && <TableHead>Stage</TableHead>}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((p) => (
                <TableRow key={p.id}>
                  {!isHidden("code") && (
                    <TableCell className="font-mono text-xs">
                      <Link to="/projects/$projectId" params={{ projectId: p.id }} className="hover:underline">
                        {p.project_code}
                      </Link>
                    </TableCell>
                  )}
                  {!isHidden("name") && (
                    <TableCell className="font-medium">
                      <Link to="/projects/$projectId" params={{ projectId: p.id }} className="hover:underline">
                        {p.name}
                      </Link>
                    </TableCell>
                  )}
                  {!isHidden("customer") && <TableCell>{p.customer?.name ?? "—"}</TableCell>}
                  {!isHidden("type") && (
                    <TableCell><Badge variant="secondary" className="capitalize">{p.project_type}</Badge></TableCell>
                  )}
                  {!isHidden("city") && <TableCell>{p.city ?? "—"}</TableCell>}
                  {!isHidden("stage") && (
                    <TableCell><Badge variant="outline">{LEAD_STAGE_LABEL[p.stage]}</Badge></TableCell>
                  )}
                  <TableCell>
                    <RowActions
                      extra={
                        <DropdownMenuItem asChild>
                          <Link to="/projects/$projectId" params={{ projectId: p.id }}>
                            <ExternalLink className="mr-2 h-4 w-4" /> Open
                          </Link>
                        </DropdownMenuItem>
                      }
                      onEdit={() => { setEditing(p); setFormOpen(true); }}
                      onDelete={() => setToDelete(p)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        presetCustomerId={customerParam ?? null}
      />
      <SafeDeleteDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        entityType="project"
        entityId={toDelete?.id ?? null}
        entityLabel={toDelete ? `${toDelete.name} (${toDelete.project_code})` : ""}
        busy={delMut.isPending}
        onConfirmDelete={() => toDelete && delMut.mutate(toDelete.id)}
      />
    </div>
  );
}

function emptyForm(): ProjectCreateInput {
  return {
    customer_id: "",
    name: "",
    city: "",
    project_type: "residential",
    site_address: null,
    state: null,
    pincode: null,
    expected_value_inr: null,
    expected_start_date: null,
    expected_completion_date: null,
    notes: null,
  };
}

function fromRow(p: ProjectWithCustomer): ProjectCreateInput {
  return {
    customer_id: p.customer_id,
    name: p.name,
    city: p.city ?? "",
    project_type: p.project_type,
    site_address: p.site_address,
    state: p.state,
    pincode: p.pincode,
    expected_value_inr: p.expected_value_inr,
    expected_start_date: p.expected_start_date,
    expected_completion_date: p.expected_completion_date,
    notes: p.notes,
  };
}

function ProjectFormDialog({
  open,
  onOpenChange,
  editing,
  presetCustomerId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: ProjectWithCustomer | null;
  presetCustomerId?: string | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProjectCreateInput>(emptyForm);

  useEffect(() => {
    if (!open) return;
    if (editing) setForm(fromRow(editing));
    else setForm({ ...emptyForm(), customer_id: presetCustomerId ?? "" });
  }, [open, editing, presetCustomerId]);

  const mutation = useMutation({
    mutationFn: (input: ProjectCreateInput) =>
      editing ? updateProject(editing.id, input) : createProject(input),
    onSuccess: (row) => {
      if (editing) {
        toast.success("Project updated");
      } else {
        toast.success(`Project ${row.project_code} created`, {
          description: "Ready to draft a quotation for this project?",
          action: {
            label: "Draft quote",
            onClick: () =>
              nav({
                to: "/quotes/new",
                search: { project: row.id, customer: row.customer_id ?? undefined },
              }),
          },
        });
        seedPickerCache(qc, "project", row);
      }
      invalidateProject(qc, row.id);
      onOpenChange(false);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = projectCreateSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues.map((i) => i.message).join(" • "));
    mutation.mutate(parsed.data);
  }
  const set = <K extends keyof ProjectCreateInput>(k: K, v: ProjectCreateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.name}` : "New project"}</DialogTitle>
        </DialogHeader>
        <QuickForm onSubmit={onSubmit} busy={mutation.isPending}>
          <QuickForm.QuickFill>
            <Field label="Customer" required className="md:col-span-2">
              <EntityPicker
                type="customer"
                value={form.customer_id || null}
                onChange={(id) => set("customer_id", id ?? "")}
              />
            </Field>
            <Field label="Project name" required>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </Field>
            <Field label="City" required>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} required />
            </Field>
          </QuickForm.QuickFill>

          <QuickForm.MoreDetails>
            <Field label="Type">
              <Select
                value={form.project_type}
                onValueChange={(v) => set("project_type", v as ProjectCreateInput["project_type"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="State">
              <Input value={form.state ?? ""} onChange={(e) => set("state", e.target.value)} />
            </Field>
            <Field label="Site address" className="md:col-span-2">
              <Textarea
                rows={2}
                value={form.site_address ?? ""}
                onChange={(e) => set("site_address", e.target.value)}
              />
            </Field>
            <Field label="Pincode">
              <Input value={form.pincode ?? ""} onChange={(e) => set("pincode", e.target.value)} />
            </Field>
          </QuickForm.MoreDetails>

          <QuickForm.Advanced>
            <Field label="Expected value (INR)">
              <Input
                type="number"
                value={form.expected_value_inr ?? ""}
                onChange={(e) =>
                  set("expected_value_inr", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </Field>
            <Field label="Expected start">
              <Input
                type="date"
                value={form.expected_start_date ?? ""}
                onChange={(e) => set("expected_start_date", e.target.value || null)}
              />
            </Field>
            <Field label="Expected completion">
              <Input
                type="date"
                value={form.expected_completion_date ?? ""}
                onChange={(e) => set("expected_completion_date", e.target.value || null)}
              />
            </Field>
            <Field label="Notes" className="md:col-span-2">
              <Textarea
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </QuickForm.Advanced>

          <QuickForm.Actions>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save" : "Create"}
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}
