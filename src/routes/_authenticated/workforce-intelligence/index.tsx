/**
 * Workforce Intelligence — Today.
 * Personal work queue: every task currently assigned to the signed-in
 * employee, deep-linkable back into the ERP.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { transliterateName } from "@/lib/i18n/transliterate";

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
  const { t, i18n } = useTranslation();
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
      toast.success(t("common.updated", "Updated"));
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (me.isLoading) return <SkeletonTable />;
  if (!me.data) {
    return (
      <EmptyState
        title={t("workforce.noEmployeeLinked", "No employee record linked")}
        message={t(
          "workforce.noEmployeeLinkedDesc",
          "Ask an owner or HR manager to create your employee profile, or add an employee record to get started.",
        )}
        action={
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link to="/workforce-intelligence/employees/new" search={{ id: undefined }}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> {t("workforce.addEmployee", "Add employee")}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/workforce-intelligence/employees">
                <Users className="mr-1.5 h-3.5 w-3.5" />{" "}
                {t("workforce.viewEmployees", "View employees")}
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
            {t("workforce.hello", "Hello, {{name}}", {
              name: transliterateName(me.data.full_name.split(" ")[0], i18n.language),
            })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("workforce.pendingCompleted", "{{pending}} pending • {{done}} completed", {
              pending: pending.length,
              done,
            })}
          </p>
        </div>
      </div>

      {tasks.isLoading ? (
        <SkeletonTable />
      ) : tasks.isError ? (
        <ErrorBlock message={toUserMessage(tasks.error)} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={t("workforce.nothingOnPlate", "Nothing on your plate")}
          message={t("workforce.enjoyQuiet", "Enjoy a quiet moment.")}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("workforce.table.task", "Task")}</TableHead>
              <TableHead>{t("workforce.table.priority", "Priority")}</TableHead>
              <TableHead>{t("workforce.table.due", "Due")}</TableHead>
              <TableHead>{t("workforce.table.status", "Status")}</TableHead>
              <TableHead className="text-right">{t("workforce.table.action", "Action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((tRow) => (
              <TableRow key={tRow.id}>
                <TableCell>
                  <div className="font-medium">{tRow.title}</div>
                  {tRow.source_deep_link && (
                    <a
                      href={tRow.source_deep_link}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      {t("workforce.openSource", "Open source →")}
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={priorityColor(tRow.priority)}>
                    {t(`workforce.priority.${tRow.priority}`, tRow.priority)}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {tRow.due_at ? format(new Date(tRow.due_at), "d MMM, HH:mm") : "—"}
                </TableCell>
                <TableCell>
                  <Select
                    value={tRow.status}
                    onValueChange={(v) =>
                      updateMut.mutate({ id: tRow.id, status: v as WorkforceTaskStatus })
                    }
                  >
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">
                        {t("workforce.status.pending", "Pending")}
                      </SelectItem>
                      <SelectItem value="in_progress">
                        {t("workforce.status.in_progress", "In progress")}
                      </SelectItem>
                      <SelectItem value="completed">
                        {t("workforce.status.completed", "Completed")}
                      </SelectItem>
                      <SelectItem value="deferred">
                        {t("workforce.status.deferred", "Deferred")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  {tRow.status !== "completed" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateMut.mutate({ id: tRow.id, status: "completed" })}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" /> {t("workforce.doneAction", "Done")}
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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("today");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("workforce.title", "Workforce Intelligence")}
        subtitle={t(
          "workforce.subtitle",
          "Today's operations, performance scorecards, and workload intelligence.",
        )}
        eyebrow={t("workforce.eyebrow", "Operations")}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link to="/workforce-intelligence/employees/new" search={{ id: undefined }}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> {t("workforce.newEmployee", "New employee")}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/workforce-intelligence/employees">
                <Users className="mr-1.5 h-3.5 w-3.5" />{" "}
                {t("workforce.allEmployees", "All employees")}
              </Link>
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="today">{t("workforce.tabs.today", "Today's Work")}</TabsTrigger>
          <TabsTrigger value="performance">
            {t("workforce.tabs.performance", "Performance Board")}
          </TabsTrigger>
          <TabsTrigger value="owner">{t("workforce.tabs.owner", "Owner Intelligence")}</TabsTrigger>
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
