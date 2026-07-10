/**
 * Employees master — list view. Owners can add / edit; everyone can search.
 * Sensitive columns (salary / aadhaar / pan / bank) are never rendered here.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listEmployees, listDesignations } from "@/lib/workforce/api";
import { toUserMessage } from "@/lib/errors";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Can } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/workforce-intelligence/employees/")({
  head: () => ({ meta: [{ title: "Employees — Workforce Intelligence" }] }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const [q, setQ] = useState("");
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

  return (
    <>
      <PageHeader
        title="Employees"
        subtitle="Workforce master"
        eyebrow="Workforce Intelligence"
        actions={
          <Can anyRole={["admin", "sales_manager"]}>
            <Button asChild size="sm">
              <Link to="/workforce-intelligence/employees/new">
                <Plus className="mr-1 h-4 w-4" /> New employee
              </Link>
            </Button>
          </Can>
        }
      />
      <div className="mb-4">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name / code / phone…"
          className="max-w-sm"
        />
      </div>
      {employees.isLoading ? (
        <SkeletonTable />
      ) : employees.isError ? (
        <ErrorBlock message={toUserMessage(employees.error)} />
      ) : (employees.data ?? []).length === 0 ? (
        <EmptyState
          title="No employees yet"
          description="Add your team to unlock Today, KRA tracking and workload planning."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Phone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(employees.data ?? []).map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs">{e.employee_code}</TableCell>
                <TableCell>
                  <Link
                    to="/workforce-intelligence/employees/$id"
                    params={{ id: e.id }}
                    className="font-medium hover:underline"
                  >
                    {e.full_name}
                  </Link>
                </TableCell>
                <TableCell>{e.designation_id ? desigById.get(e.designation_id) ?? "—" : "—"}</TableCell>
                <TableCell>{e.department ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={e.employment_status === "active" ? "default" : "outline"}>
                    {e.employment_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{e.phone ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
