/**
 * Workforce Intelligence data access layer.
 * All queries respect RLS. Salary / Aadhaar / PAN / bank fields are only
 * populated when the caller is an owner (admin / sales_manager).
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import {
  DEFAULT_DESIGNATIONS,
  type Employee,
  type Designation,
  type Kra,
  type WorkloadCapacity,
  type WorkforceTask,
  type WorkforceScoreSnapshot,
  type OwnerNote,
  type WorkforceRuleAssignment,
  type EmployeeDocument,
  type WorkforceTaskStatus,
  type EmploymentStatus,
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
      [
        `full_name.ilike.%${s}%`,
        `employee_code.ilike.%${s}%`,
        `email.ilike.%${s}%`,
        `phone.ilike.%${s}%`,
      ].join(","),
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

import { saveEmployeeServerFn, deleteEmployeeServerFn } from "./workforce.functions";

export async function createEmployee(input: EmployeeInput, systemRole?: string): Promise<Employee> {
  const parsed = employeeSchema.parse(input);
  try {
    const res = await saveEmployeeServerFn({ data: { data: parsed, systemRole } });
    if (res) return res;
  } catch (serverErr: unknown) {
    console.error("[workforce.api] saveEmployeeServerFn failed:", serverErr);
    const msg = serverErr instanceof Error ? serverErr.message : String(serverErr);
    const isNetwork =
      msg.includes("Failed to fetch") ||
      msg.includes("NetworkError") ||
      msg.includes("Load failed");
    if (!isNetwork) {
      throw new AppError(msg || "Failed to create employee");
    }
  }

  // Fallback to client-side insert if server function unreachable
  const { data, error } = await supabase
    .from("employees")
    .insert({
      full_name: parsed.full_name,
      designation_id: parsed.designation_id,
      department: parsed.department,
      employment_type: parsed.employment_type,
      reporting_manager_id: parsed.reporting_manager_id,
      joining_date: parsed.joining_date,
      phone: parsed.phone,
      email: parsed.email,
      emergency_contact: parsed.emergency_contact,
      address: parsed.address,
      aadhaar: parsed.aadhaar,
      pan: parsed.pan,
      bank_details: {
        ...(parsed.bank_details ?? {}),
        _kras: parsed.kras,
        _kpas: parsed.kpas,
      },
      salary_ctc: parsed.salary_ctc,
      skills: parsed.skills,
      employment_status: parsed.employment_status,
      photo_url: parsed.photo_url,
      remarks: parsed.remarks,
      user_id: parsed.user_id,
      employee_code: "",
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updateEmployee(
  id: string,
  input: EmployeeInput,
  systemRole?: string,
): Promise<Employee> {
  const parsed = employeeSchema.parse(input);
  try {
    const res = await saveEmployeeServerFn({ data: { id, data: parsed, systemRole } });
    if (res) return res;
  } catch (serverErr: unknown) {
    console.error("[workforce.api] updateEmployee server function failed:", serverErr);
    const msg = serverErr instanceof Error ? serverErr.message : String(serverErr);
    const isNetwork =
      msg.includes("Failed to fetch") ||
      msg.includes("NetworkError") ||
      msg.includes("Load failed");
    if (!isNetwork) {
      throw new AppError(msg || "Failed to update employee");
    }
  }

  // Fallback to client-side update
  const { data, error } = await supabase
    .from("employees")
    .update({
      full_name: parsed.full_name,
      designation_id: parsed.designation_id,
      department: parsed.department,
      employment_type: parsed.employment_type,
      reporting_manager_id: parsed.reporting_manager_id,
      joining_date: parsed.joining_date,
      phone: parsed.phone,
      email: parsed.email,
      emergency_contact: parsed.emergency_contact,
      address: parsed.address,
      aadhaar: parsed.aadhaar,
      pan: parsed.pan,
      bank_details: {
        ...(parsed.bank_details ?? {}),
        _kras: parsed.kras,
        _kpas: parsed.kpas,
      },
      salary_ctc: parsed.salary_ctc,
      skills: parsed.skills,
      employment_status: parsed.employment_status,
      photo_url: parsed.photo_url,
      remarks: parsed.remarks,
      user_id: parsed.user_id,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updateEmployeeStatus(
  id: string,
  status: EmploymentStatus,
): Promise<Employee> {
  const { data, error } = await supabase
    .from("employees")
    .update({ employment_status: status })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deleteEmployee(id: string): Promise<void> {
  try {
    await deleteEmployeeServerFn({ data: { id } });
    return;
  } catch {
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) throw new AppError(mapDbError(error));
  }
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
export { DEFAULT_DESIGNATIONS };

export async function listDesignations(): Promise<Designation[]> {
  try {
    const { data, error } = await supabase
      .from("designations")
      .select("*")
      .order("level", { ascending: false });
    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn(
      "[workforce.api] Failed to fetch designations from database, using fallback:",
      err,
    );
  }

  return DEFAULT_DESIGNATIONS.map((d, index) => ({
    id: `00000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`,
    code: d.code,
    name: d.name,
    purpose: d.purpose,
    responsibilities: d.responsibilities,
    expected_outcomes: d.expected_outcomes,
    level: d.level,
    active: d.active,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

export async function getDesignation(id: string): Promise<Designation | null> {
  const { data, error } = await supabase
    .from("designations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
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
  const { data, error } = await supabase
    .from("kras")
    .update(parsed)
    .eq("id", id)
    .select("*")
    .single();
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
    parsed.status === "completed" ? new Date().toISOString() : parsed.status ? null : undefined;
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
