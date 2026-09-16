/**
 * Employees master — list view.
 * Complete workforce management dashboard to add/create, edit, mark employment status, and remove employees.
 * Sensitive columns (salary / aadhaar / pan / bank) are never rendered here.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import {
  listEmployees,
  listDesignations,
  updateEmployeeStatus,
  deleteEmployee,
} from "@/lib/workforce/api";
import {
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_STATUS_LABELS,
  type EmploymentStatus,
  type Employee,
} from "@/lib/workforce/types";
import { toUserMessage } from "@/lib/errors";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export const Route = createFileRoute("/_authenticated/workforce-intelligence/employees/")({
  head: () => ({ meta: [{ title: "Employees — Workforce Intelligence" }] }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [toDelete, setToDelete] = useState<Employee | null>(null);

  const query = useDebouncedValue(q, 250);
  const employees = useQuery({
    queryKey: ["wf", "employees", "list", query],
    queryFn: () => listEmployees(query),
  });
  const designations = useQuery({
    queryKey: ["wf", "designations"],
    queryFn: listDesignations,
  });
  const desigById = new Map((designations.data ?? []).map((d) => [d.id, d.name]));

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EmploymentStatus }) =>
      updateEmployeeStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wf", "employees"] });
      toast.success("Employment status updated");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wf", "employees"] });
      toast.success("Employee removed successfully");
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const filteredRows = useMemo(() => {
    const list = employees.data ?? [];
    if (statusFilter === "all") return list;
    return list.filter((e) => e.employment_status === statusFilter);
  }, [employees.data, statusFilter]);

  return (
    <>
      <PageHeader
        title="Employees"
        subtitle="Workforce master — add, edit, mark employment status, and manage team members."
        eyebrow="Workforce Intelligence"
        actions={
          <Button asChild size="sm">
            <Link to="/workforce-intelligence/employees/new" search={{ id: undefined }}>
              <Plus className="mr-1 h-4 w-4" /> New employee
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name / code / phone…"
            className="max-w-xs"
          />
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[140px] text-xs">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Statuses
                </SelectItem>
                {EMPLOYMENT_STATUSES.map((st) => (
                  <SelectItem key={st} value={st} className="text-xs">
                    {EMPLOYMENT_STATUS_LABELS[st]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {employees.isLoading ? (
        <SkeletonTable />
      ) : employees.isError ? (
        <ErrorBlock message={toUserMessage(employees.error)} />
      ) : (employees.data ?? []).length === 0 ? (
        <EmptyState
          title="No employees yet"
          message="Add your team to unlock Today, KRA tracking, and workload planning."
          action={
            <Button asChild size="sm">
              <Link to="/workforce-intelligence/employees/new" search={{ id: undefined }}>
                <Plus className="mr-1.5 h-4 w-4" /> Add employee
              </Link>
            </Button>
          }
        />
      ) : filteredRows.length === 0 ? (
        <EmptyState
          title="No matching employees"
          message="Try adjusting your search query or status filter."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQ("");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Employment Status</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {e.employee_code || "—"}
                  </TableCell>
                  <TableCell>
                    <Link
                      to="/workforce-intelligence/employees/$id"
                      params={{ id: e.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {e.full_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const desigIds =
                        e.designation_ids && e.designation_ids.length > 0
                          ? e.designation_ids
                          : e.designation_id
                            ? [e.designation_id]
                            : [];
                      const names = desigIds
                        .map((id) => desigById.get(id))
                        .filter(Boolean) as string[];
                      if (names.length === 0) {
                        return <span className="text-muted-foreground">—</span>;
                      }
                      if (names.length === 1) {
                        return <span className="text-foreground">{names[0]}</span>;
                      }
                      return (
                        <div
                          className="flex items-center gap-1.5 flex-wrap"
                          title={names.join(", ")}
                        >
                          <span className="font-medium text-foreground">{names[0]}</span>
                          <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
                            +{names.length - 1} more
                          </span>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{e.department ?? "—"}</TableCell>
                  <TableCell>
                    <Select
                      value={e.employment_status}
                      disabled={updateStatusMut.isPending}
                      onValueChange={(val) =>
                        updateStatusMut.mutate({ id: e.id, status: val as EmploymentStatus })
                      }
                    >
                      <SelectTrigger className="h-7 w-[125px] text-xs font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYMENT_STATUSES.map((st) => (
                          <SelectItem key={st} value={st} className="text-xs">
                            {EMPLOYMENT_STATUS_LABELS[st]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.phone ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Edit employee"
                      >
                        <Link to="/workforce-intelligence/employees/new" search={{ id: e.id }}>
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Remove employee"
                        onClick={() => setToDelete(e)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Remove Employee"
        description={`Are you sure you want to remove ${toDelete?.full_name}? This action cannot be undone.`}
        confirmLabel="Remove"
        tone="danger"
        onConfirm={() => toDelete && deleteMut.mutate(toDelete.id)}
        busy={deleteMut.isPending}
      />
    </>
  );
}
