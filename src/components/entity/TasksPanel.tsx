/** Tasks panel — either entity-scoped or global. Progressive-disclosure form. */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { qk } from "@/lib/query-keys";
import { createTask, deleteTask, listTasks, TASK_PRIORITIES, TASK_STATUSES, updateTaskStatus, type TaskPriority, type TaskStatus } from "@/lib/tasks/api";
import { toUserMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { ChevronDown, Trash2 } from "lucide-react";

interface Props { entityType?: string; entityId?: string; title?: string; }

const priorityTone: Record<TaskPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-secondary text-secondary-foreground",
  high: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  urgent: "bg-destructive/15 text-destructive",
};

export function TasksPanel({ entityType, entityId, title = "Tasks" }: Props) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [t, setT] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [due, setDue] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");

  const filters = { entityType, entityId, status: statusFilter === "all" ? undefined : statusFilter };
  const keyFilters = { entityType: entityType ?? null, entityId: entityId ?? null, status: statusFilter };
  const listKey = entityType && entityId
    ? qk.tasks.byEntity(entityType, entityId)
    : qk.tasks.list(keyFilters);

  const { data: tasks = [] } = useQuery({
    queryKey: [...listKey, statusFilter] as const,
    queryFn: () => listTasks(filters),
  });

  const create = useMutation({
    mutationFn: () => createTask({
      title: t,
      description: desc || null,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      priority,
      status: "pending",
      due_at: due ? new Date(due).toISOString() : null,
    }),
    onSuccess: () => {
      setT(""); setDesc(""); setDue(""); setPriority("medium"); setExpanded(false);
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TaskStatus | "all")}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {TASK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 rounded-sm border border-border p-2">
          <div className="flex gap-2">
            <Input placeholder="Quick add a task…" value={t} onChange={(e) => setT(e.target.value)} className="h-9" />
            <Button size="sm" disabled={!t.trim() || create.isPending} onClick={() => create.mutate()}>Add</Button>
          </div>
          <button type="button" onClick={() => setExpanded((v) => !v)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
            {expanded ? "Hide" : "More"} details
          </button>
          {expanded && (
            <div className="grid grid-cols-2 gap-2">
              <Textarea rows={2} placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} className="col-span-2" />
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="h-9" />
            </div>
          )}
        </div>

        {tasks.length === 0 ? (
          <div className="rounded-sm border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No tasks.</div>
        ) : (
          <ul className="divide-y divide-border rounded-sm border border-border">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2 px-2 py-2">
                <Select value={task.status} onValueChange={(v) => setStatus.mutate({ id: task.id, status: v as TaskStatus })}>
                  <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{task.title}</div>
                  {task.description && <div className="truncate text-xs text-muted-foreground">{task.description}</div>}
                </div>
                {task.due_at && <span className="text-xs text-muted-foreground">{formatDate(task.due_at)}</span>}
                <Badge variant="secondary" className={`text-[10px] capitalize ${priorityTone[task.priority]}`}>{task.priority}</Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate(task.id)} aria-label="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
