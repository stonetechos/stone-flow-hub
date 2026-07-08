/** Tasks: universal task system. Polymorphic entity_type/entity_id. */
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { zOptional, zRequired } from "@/lib/zod";
import type { DbTable, DbEnum } from "@/lib/types";

export type TaskRow = DbTable<"tasks">;
export type TaskStatus = DbEnum<"task_status">;
export type TaskPriority = DbEnum<"task_priority">;

export const TASK_STATUSES: ReadonlyArray<{ value: TaskStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "overdue", label: "Overdue" },
];

export const TASK_PRIORITIES: ReadonlyArray<{ value: TaskPriority; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const taskCreateSchema = z.object({
  title: zRequired("Title"),
  description: zOptional(),
  entity_type: z.string().nullable().optional(),
  entity_id: z.string().uuid().nullable().optional(),
  status: z
    .enum(["pending", "in_progress", "completed", "cancelled", "overdue"])
    .default("pending"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  due_at: z.string().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;

export const taskUpdateSchema = taskCreateSchema.partial();
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;

export async function listTasks(
  filters: {
    entityType?: string;
    entityId?: string;
    status?: TaskStatus;
    q?: string;
  } = {},
): Promise<TaskRow[]> {
  let q = supabase
    .from("tasks")
    .select("*")
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (filters.entityType) q = q.eq("entity_type", filters.entityType);
  if (filters.entityId) q = q.eq("entity_id", filters.entityId);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.q) q = q.ilike("title", `%${filters.q}%`);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function createTask(input: TaskCreateInput): Promise<TaskRow> {
  const parsed = taskCreateSchema.parse(input);
  const auth = await supabase.auth.getUser();
  const uid = auth.data.user?.id ?? null;
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...parsed, created_by: uid })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updateTask(id: string, input: TaskUpdateInput): Promise<TaskRow> {
  const parsed = taskUpdateSchema.parse(input);
  const patch: Partial<TaskRow> = { ...parsed };
  if (parsed.status === "completed") patch.completed_at = new Date().toISOString();
  else if (parsed.status && parsed.status !== "completed") patch.completed_at = null;
  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const patch: Partial<TaskRow> = { status };
  if (status === "completed") patch.completed_at = new Date().toISOString();
  const { error } = await supabase.from("tasks").update(patch).eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

export interface AssignableUser {
  id: string;
  full_name: string | null;
  email: string | null;
}

export async function listAssignableUsers(): Promise<AssignableUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .order("full_name", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}
