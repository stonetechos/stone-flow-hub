/** TaskDialog — shared create/edit form for tasks. */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityPicker, type EntityType } from "@/components/forms/EntityPicker";
import {
  createTask,
  updateTask,
  listAssignableUsers,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskRow,
  type TaskStatus,
} from "@/lib/tasks/api";
import { toUserMessage } from "@/lib/errors";
import { toast } from "sonner";

const PICKER_TYPES: ReadonlyArray<EntityType> = [
  "customer",
  "project",
  "vendor",
  "product",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskRow | null;
  defaultEntityType?: string;
  defaultEntityId?: string;
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultEntityType,
  defaultEntityId,
}: Props) {
  const qc = useQueryClient();
  const editing = !!task;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [due, setDue] = useState("");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [entityType, setEntityType] = useState<string | null>(null);
  const [entityId, setEntityId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setStatus(task.status);
      setPriority(task.priority);
      setDue(toLocalInput(task.due_at));
      setAssignedTo(task.assigned_to ?? null);
      setEntityType(task.entity_type ?? null);
      setEntityId(task.entity_id ?? null);
    } else {
      setTitle("");
      setDescription("");
      setStatus("pending");
      setPriority("medium");
      setDue("");
      setAssignedTo(null);
      setEntityType(defaultEntityType ?? null);
      setEntityId(defaultEntityId ?? null);
    }
  }, [open, task, defaultEntityType, defaultEntityId]);

  const { data: users = [] } = useQuery({
    queryKey: ["assignable_users"],
    queryFn: listAssignableUsers,
    enabled: open,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        due_at: due ? new Date(due).toISOString() : null,
        assigned_to: assignedTo,
        entity_type: entityType,
        entity_id: entityId,
      };
      if (task) return updateTask(task.id, payload);
      return createTask(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Task updated" : "Task created");
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const isPickerType = entityType && PICKER_TYPES.includes(entityType as EntityType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form
            id="task-dialog-form"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) return;
              save.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-desc">Description</Label>
              <Textarea
                id="task-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                  <SelectTrigger>
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
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="task-due">Due date</Label>
                <Input
                  id="task-due"
                  type="datetime-local"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Assignee</Label>
                <Select
                  value={assignedTo ?? "__none"}
                  onValueChange={(v) => setAssignedTo(v === "__none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email || u.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Linked entity</Label>
                <Select
                  value={entityType ?? "__none"}
                  onValueChange={(v) => {
                    const next = v === "__none" ? null : v;
                    setEntityType(next);
                    setEntityId(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>&nbsp;</Label>
                {isPickerType ? (
                  <EntityPicker
                    type={entityType as EntityType}
                    value={entityId}
                    onChange={(id) => setEntityId(id)}
                    allowClear
                  />
                ) : (
                  <Input
                    disabled
                    value={entityId ?? ""}
                    placeholder="Select an entity type"
                  />
                )}
              </div>
            </div>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="task-dialog-form"
            disabled={!title.trim() || save.isPending}
          >
            {editing ? "Save changes" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
