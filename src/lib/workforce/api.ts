/**
 * Workforce Intelligence data access layer.
 * All queries respect RLS. Salary / Aadhaar / PAN / bank fields are only
 * populated when the caller is an owner (admin / sales_manager).
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type {
  Employee,
  Designation,
  Kra,
  WorkloadCapacity,
  WorkforceTask,
  WorkforceScoreSnapshot,
  OwnerNote,
  WorkforceRuleAssignment,
  EmployeeDocument,
  WorkforceTaskStatus,
} from "./types";
import {
  employeeSchema,
  designationSchema,
  kraSchema,
  capacitySchema,
  taskUpdateSchema,
  manualTaskSchema,
  ownerNoteSchema,
  ruleAssignmentSchema,
  type EmployeeInput,
  type DesignationInput,
  type KraInput,
  type CapacityInput,
  type TaskUpdateInput,
  type ManualTaskInput,
  type OwnerNoteInput,
  type RuleAssignmentInput,
} from "./schema";

// -------------- Employees --------------
export async function listEmployees(q = ""): Promise<Employee[]> {
  let query = supabase
    .from("employees")
    .select("*")
    .order("full_name", { ascending: true })
    .limit(500);
  if (q.trim()) {
    const s = q.trim();
    query = query.or(
      [`full_name.ilike.%${s}%`, `employee_code.ilike.%${s}%`, `email.ilike.%${s}%`, `phone.ilike.%${s}%`].join(","),
    );
  }
  const { data, error } = await query;
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function getEmployee(id: string): Promise<Employee | null> {
  const { data, error } = await supabase.from("employees").select("*").eq("id", id).maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  const parsed = employeeSchema.parse(input);
  const { data, error } = await supabase
    .from("employees")
    .insert({ ...parsed, employee_code: "" })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updateEmployee(id: string, input: EmployeeInput): Promise<Employee> {
  const parsed = employeeSchema.parse(input);
  const { data, error } = await supabase
    .from("employees")
    .update(parsed)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

// -------------- Current signed-in employee --------------
export async function getCurrentEmployee(): Promise<Employee | null> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

// -------------- Designations --------------
export async function listDesignations(): Promise<Designation[]> {
  const { data, error } = await supabase
    .from("designations")
    .select("*")
    .order("level", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function getDesignation(id: string): Promise<Designation | null> {
  const { data, error } = await supabase.from("designations").select("*").eq("id", id).maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function createDesignation(input: DesignationInput): Promise<Designation> {
  const parsed = designationSchema.parse(input);
  const { data, error } = await supabase.from("designations").insert(parsed).select("*").single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updateDesignation(id: string, input: DesignationInput): Promise<Designation> {
  const parsed = designationSchema.parse(input);
  const { data, error } = await supabase
    .from("designations")
    .update(parsed)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

// -------------- KRAs --------------
export async function listKras(designationId?: string): Promise<Kra[]> {
  let q = supabase.from("kras").select("*").order("sort_order").order("name");
  if (designationId) q = q.eq("designation_id", designationId);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function createKra(input: KraInput): Promise<Kra> {
  const parsed = kraSchema.parse(input);
  const { data, error } = await supabase.from("kras").insert(parsed).select("*").single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updateKra(id: string, input: KraInput): Promise<Kra> {
  const parsed = kraSchema.parse(input);
  const { data, error } = await supabase.from("kras").update(parsed).eq("id", id).select("*").single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deleteKra(id: string): Promise<void> {
  const { error } = await supabase.from("kras").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

// -------------- Capacities --------------
export async function listCapacities(designationId?: string): Promise<WorkloadCapacity[]> {
  let q = supabase.from("workload_capacities").select("*").order("metric_label");
  if (designationId) q = q.eq("designation_id", designationId);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function upsertCapacity(input: CapacityInput, id?: string): Promise<WorkloadCapacity> {
  const parsed = capacitySchema.parse(input);
  if (id) {
    const { data, error } = await supabase
      .from("workload_capacities")
      .update(parsed)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new AppError(mapDbError(error));
    return data;
  }
  const { data, error } = await supabase
    .from("workload_capacities")
    .insert(parsed)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deleteCapacity(id: string): Promise<void> {
  const { error } = await supabase.from("workload_capacities").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

// -------------- Tasks --------------
export interface TaskFilter {
  employeeId?: string;
  status?: WorkforceTaskStatus;
  today?: boolean;
}

export async function listTasks(filter: TaskFilter = {}): Promise<WorkforceTask[]> {
  let q = supabase
    .from("workforce_tasks")
    .select("*")
    .order("priority", { ascending: false })
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(500);
  if (filter.employeeId) q = q.eq("employee_id", filter.employeeId);
  if (filter.status) q = q.eq("status", filter.status);
  if (filter.today) {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    q = q.lte("due_at", end.toISOString()).neq("status", "completed").neq("status", "cancelled");
  }
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function updateTask(id: string, input: TaskUpdateInput): Promise<WorkforceTask> {
  const parsed = taskUpdateSchema.parse(input);
  const completed_at =
    parsed.status === "completed"
      ? new Date().toISOString()
      : parsed.status
        ? null
        : undefined;
  const { data, error } = await supabase
    .from("workforce_tasks")
    .update({ ...parsed, ...(completed_at !== undefined ? { completed_at } : {}) })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function createManualTask(input: ManualTaskInput): Promise<WorkforceTask> {
  const parsed = manualTaskSchema.parse(input);
  const dedup = `manual:${parsed.employee_id}:${Date.now()}`;
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("workforce_tasks")
    .insert({
      employee_id: parsed.employee_id,
      title: parsed.title,
      description: parsed.description ?? null,
      priority: parsed.priority,
      due_at: parsed.due_at || null,
      estimated_minutes: parsed.estimated_minutes ?? null,
      status: "pending",
      dedup_key: dedup,
      auto_generated: false,
      created_by: auth.user?.id ?? null,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("workforce_tasks").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

// -------------- Snapshots --------------
export async function listSnapshots(employeeId: string): Promise<WorkforceScoreSnapshot[]> {
  const { data, error } = await supabase
    .from("workforce_score_snapshots")
    .select("*")
    .eq("employee_id", employeeId)
    .order("period_end", { ascending: false })
    .limit(200);
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function insertSnapshots(rows: Partial<WorkforceScoreSnapshot>[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from("workforce_score_snapshots").upsert(rows as never, {
    onConflict: "employee_id,kra_id,period_start,period_end",
  });
  if (error) throw new AppError(mapDbError(error));
}

// -------------- Owner notes --------------
export async function listOwnerNotes(employeeId: string): Promise<OwnerNote[]> {
  const { data, error } = await supabase
    .from("owner_notes")
    .select("*")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function createOwnerNote(input: OwnerNoteInput): Promise<OwnerNote> {
  const parsed = ownerNoteSchema.parse(input);
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("owner_notes")
    .insert({ ...parsed, created_by: auth.user?.id ?? null })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deleteOwnerNote(id: string): Promise<void> {
  const { error } = await supabase.from("owner_notes").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

// -------------- Rule assignments --------------
export async function listRuleAssignments(): Promise<WorkforceRuleAssignment[]> {
  const { data, error } = await supabase
    .from("workforce_rule_assignments")
    .select("*")
    .order("rule_key");
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function updateRuleAssignment(
  id: string,
  input: RuleAssignmentInput,
): Promise<WorkforceRuleAssignment> {
  const parsed = ruleAssignmentSchema.parse(input);
  const { data, error } = await supabase
    .from("workforce_rule_assignments")
    .update(parsed)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

// -------------- Documents --------------
export async function listEmployeeDocuments(employeeId: string): Promise<EmployeeDocument[]> {
  const { data, error } = await supabase
    .from("employee_documents")
    .select("*")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}
