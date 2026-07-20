/** Tasks panel — either entity-scoped or global. Row click/dblclick opens editor. */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { TaskDialog } from "./TaskDialog";
import { qk } from "@/lib/query-keys";
import {
  createTask,
  deleteTask,
  listTasks,
  TASK_STATUSES,
  updateTaskStatus,
  type TaskPriority,
  type TaskRow,
  type TaskStatus,
} from "@/lib/tasks/api";
import { toUserMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

interface Props {
  entityType?: string;
  entityId?: string;
  title?: string;
}

const priorityTone: Record<TaskPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-secondary text-secondary-foreground",
  high: "bg-status-warning-bg text-status-warning-fg",
  urgent: "bg-destructive/15 text-destructive",
};

export function TasksPanel({ entityType, entityId, title = "Tasks" }: Props) {
  const qc = useQueryClient();
  const [quickTitle, setQuickTitle] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [toDelete, setToDelete] = useState<TaskRow | null>(null);

  const filters = {
    entityType,
    entityId,
    status: statusFilter === "all" ? undefined : statusFilter,
  };
  const keyFilters = {
    entityType: entityType ?? null,
    entityId: entityId ?? null,
    status: statusFilter,
  };
  const listKey =
    entityType && entityId ? qk.tasks.byEntity(entityType, entityId) : qk.tasks.list(keyFilters);

  const { data: tasks = [] } = useQuery({
    queryKey: [...listKey, statusFilter] as const,
    queryFn: () => listTasks(filters),
  });

  const quickCreate = useMutation({
    mutationFn: () =>
      createTask({
        title: quickTitle,
        entity_type: entityType ?? null,
        entity_id: entityId ?? null,
        priority: "medium",
        status: "pending",
      }),
    onSuccess: () => {
      setQuickTitle("");
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: TaskStatus }) => updateTaskStatus(v.id, v.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      toast.success("Task deleted");
      setToDelete(null);
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  function openEdit(task: TaskRow) {
    setEditing(task);
    setDialogOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as TaskStatus | "all")}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            New task
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 rounded-sm border border-border p-2">
          <Input
            placeholder="Quick add a task…"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && quickTitle.trim()) {
                e.preventDefault();
                quickCreate.mutate();
              }
            }}
            className="h-9"
          />
          <Button
            size="sm"
            disabled={!quickTitle.trim() || quickCreate.isPending}
            onClick={() => quickCreate.mutate()}
          >
            Add
          </Button>
        </div>

        {tasks.length === 0 ? (
          <div className="rounded-sm border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No tasks.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-sm border border-border">
            {tasks.map((task) => (
              <li
                key={task.id}
                role="button"
                tabIndex={0}
                onDoubleClick={() => openEdit(task)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openEdit(task);
                  }
                }}
                className="group flex cursor-pointer items-center gap-2 px-2 py-2 hover:bg-muted/40 focus:bg-muted/60 focus:outline-none"
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={task.status}
                    onValueChange={(v) =>
                      setStatus.mutate({ id: task.id, status: v as TaskStatus })
                    }
                  >
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{task.title}</div>
                  {task.description && (
                    <div className="truncate text-xs text-muted-foreground">{task.description}</div>
                  )}
                </div>
                {task.due_at && (
                  <span className="text-xs text-muted-foreground">{formatDate(task.due_at)}</span>
                )}
                <Badge
                  variant="secondary"
                  className={`text-[10px] capitalize ${priorityTone[task.priority]}`}
                >
                  {task.priority}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(task);
                  }}
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    setToDelete(task);
                  }}
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editing}
        defaultEntityType={entityType}
        defaultEntityId={entityId}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => {
          if (!o) setToDelete(null);
        }}
        title="Delete task?"
        description={toDelete ? `“${toDelete.title}” will be permanently removed.` : ""}
        confirmLabel="Delete"
        busy={del.isPending}
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete.id);
        }}
      />
    </Card>
  );
}
