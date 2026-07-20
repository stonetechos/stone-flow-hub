import type { DbTable, DbEnum } from "@/lib/types";

export type Employee = DbTable<"employees">;
export type Designation = DbTable<"designations">;
export type Kra = DbTable<"kras">;
export type WorkloadCapacity = DbTable<"workload_capacities">;
export type WorkforceTask = DbTable<"workforce_tasks">;
export type WorkforceScoreSnapshot = DbTable<"workforce_score_snapshots">;
export type OwnerNote = DbTable<"owner_notes">;
export type WorkforceRuleAssignment = DbTable<"workforce_rule_assignments">;
export type EmployeeDocument = DbTable<"employee_documents">;

export type EmploymentType = DbEnum<"employment_type">;
export type EmploymentStatus = DbEnum<"employment_status">;
export type WorkforceTaskStatus = DbEnum<"workforce_task_status">;
export type WorkforceTaskPriority = DbEnum<"workforce_task_priority">;
export type KraPeriod = DbEnum<"kra_period">;
export type PerformanceGrade = DbEnum<"performance_grade">;
export type OwnerNoteKind = DbEnum<"owner_note_kind">;

export const TASK_STATUSES: WorkforceTaskStatus[] = [
  "pending",
  "in_progress",
  "completed",
  "deferred",
  "cancelled",
];

export const TASK_PRIORITIES: WorkforceTaskPriority[] = ["urgent", "high", "medium", "low"];

export const EMPLOYMENT_TYPES: EmploymentType[] = [
  "full_time",
  "part_time",
  "contract",
  "intern",
  "consultant",
];

export const EMPLOYMENT_STATUSES: EmploymentStatus[] = [
  "active",
  "on_leave",
  "notice",
  "terminated",
  "resigned",
];

export const OWNER_NOTE_KINDS: OwnerNoteKind[] = ["strength", "improvement", "observation"];

export const GRADE_LABELS: Record<PerformanceGrade, string> = {
  a_plus: "A+",
  a: "A",
  b: "B",
  c: "C",
  needs_attention: "Needs Attention",
};

export function gradeFromPct(pct: number): PerformanceGrade {
  if (pct >= 95) return "a_plus";
  if (pct >= 85) return "a";
  if (pct >= 70) return "b";
  if (pct >= 55) return "c";
  return "needs_attention";
}
