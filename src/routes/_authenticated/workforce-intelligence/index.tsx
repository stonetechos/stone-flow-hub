/**
 * Workforce Intelligence — Today.
 * Personal work queue: every task currently assigned to the signed-in
 * employee, deep-linkable back into the ERP.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PerformanceView } from "./performance";
import { OwnerIntelView } from "./owner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCurrentEmployee, listTasks, updateTask } from "@/lib/workforce/api";
import type { WorkforceTaskStatus } from "@/lib/workforce/types";
import { toUserMessage } from "@/lib/errors";
import { format } from "date-fns";
import { CheckCircle2, Plus, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workforce-intelligence/")({
  head: () => ({ meta: [{ title: "Workforce Intelligence — Today" }] }),
  component: WorkforceHubPage,
});

function priorityColor(p: string) {
  return p === "urgent"
    ? "destructive"
    : p === "high"
      ? "default"
      : p === "medium"
        ? "secondary"
        : "outline";
}

export function TodayView() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["wf", "me"], queryFn: getCurrentEmployee });
  const employeeId = me.data?.id;
  const tasks = useQuery({
    queryKey: ["wf", "tasks", "me", employeeId],
    queryFn: () => listTasks({ employeeId }),
    enabled: !!employeeId,
  });

  const updateMut = useMutation({
    mutationFn: (v: { id: string; status: WorkforceTaskStatus }) =>
      updateTask(v.id, { status: v.status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wf", "tasks"] });
      toast.success("Updated");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (me.isLoading) return <SkeletonTable />;
  if (!me.data) {
    return (
      <EmptyState
        title="No employee record linked"
        message="Ask an owner or HR manager to create your employee profile, or add an employee record to get started."
        action={
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link to="/workforce-intelligence/employees/new" search={{ id: undefined }}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add employee
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/workforce-intelligence/employees">
                <Users className="mr-1.5 h-3.5 w-3.5" /> View employees
              </Link>
            </Button>
          </div>
        }
      />
    );
  }

  const rows = tasks.data ?? [];
  const pending = rows.filter((r) => r.status === "pending" || r.status === "in_progress");
  const done = rows.filter((r) => r.status === "completed").length;

  return (
    <>
      <div className="flex items-center justify-between pb-2 border-b">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Hello, {me.data.full_name.split(" ")[0]}
          </h2>
          <p className="text-sm text-muted-foreground">
            {pending.length} pending • {done} completed
          </p>
        </div>
      </div>

      {tasks.isLoading ? (
        <SkeletonTable />
      ) : tasks.isError ? (
        <ErrorBlock message={toUserMessage(tasks.error)} />
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing on your plate" message="Enjoy a quiet moment." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="font-medium">{t.title}</div>
                  {t.source_deep_link && (
                    <a
                      href={t.source_deep_link}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Open source →
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={priorityColor(t.priority)}>{t.priority}</Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {t.due_at ? format(new Date(t.due_at), "d MMM, HH:mm") : "—"}
                </TableCell>
                <TableCell>
                  <Select
                    value={t.status}
                    onValueChange={(v) =>
                      updateMut.mutate({ id: t.id, status: v as WorkforceTaskStatus })
                    }
                  >
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="deferred">Deferred</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  {t.status !== "completed" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateMut.mutate({ id: t.id, status: "completed" })}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Done
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}

export function WorkforceHubPage() {
  const [activeTab, setActiveTab] = useState("today");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workforce Intelligence"
        subtitle="Today's operations, performance scorecards, and workload intelligence."
        eyebrow="Operations"
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link to="/workforce-intelligence/employees/new" search={{ id: undefined }}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> New employee
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/workforce-intelligence/employees">
                <Users className="mr-1.5 h-3.5 w-3.5" /> All employees
              </Link>
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="today">Today's Work</TabsTrigger>
          <TabsTrigger value="performance">Performance Board</TabsTrigger>
          <TabsTrigger value="owner">Owner Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4 space-y-6">
          <TodayView />
        </TabsContent>

        <TabsContent value="performance" className="mt-4 space-y-6">
          <PerformanceView />
        </TabsContent>

        <TabsContent value="owner" className="mt-4 space-y-6">
          <OwnerIntelView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
