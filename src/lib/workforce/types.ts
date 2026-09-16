import type { DbTable, DbEnum } from "@/lib/types";

export type Employee = DbTable<"employees"> & {
  kras?: Array<{
    title: string;
    description?: string;
    weightage: number;
    target_period: "daily" | "weekly" | "monthly" | "quarterly";
  }>;
  kpas?: Array<{
    title: string;
    metric?: string;
  }>;
  designation_ids?: string[];
  designation_names?: string[];
};
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

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  active: "Active",
  on_leave: "On Leave",
  notice: "Notice Period",
  resigned: "Resigned",
  terminated: "Terminated",
};

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

export const DEFAULT_DESIGNATION_IDS: Record<string, string> = {
  MD: "00000000-0000-0000-0000-000000000001",
  OPERATIONS_HEAD: "00000000-0000-0000-0000-000000000002",
  FIELD_SALES_EXEC: "00000000-0000-0000-0000-000000000003",
  DATA_ENTRY_EXEC: "00000000-0000-0000-0000-000000000004",
  OFFICE_ADMIN: "00000000-0000-0000-0000-000000000005",
  CUSTOMER_CARE: "00000000-0000-0000-0000-000000000006",
  HOUSEKEEPING: "00000000-0000-0000-0000-000000000007",
  SALES_HEAD: "00000000-0000-0000-0000-000000000008",
  OFFICE_SALES_EXEC: "00000000-0000-0000-0000-000000000009",
};

export const DEFAULT_DESIGNATIONS: Omit<Designation, "id" | "created_at" | "updated_at">[] = [
  {
    code: "FIELD_SALES_EXEC",
    name: "Field Sales Executive",
    purpose: "On-site client acquisition, architect visits, and site measurements",
    responsibilities:
      "Architect visits, builder presentations, site inspections, stone sampling, warm lead generation",
    expected_outcomes: "New customer acquisition and active pipeline building",
    level: 70,
    active: true,
  },
  {
    code: "DATA_ENTRY_EXEC",
    name: "Data Entry Executive",
    purpose: "ERP data processing and operational transaction entry",
    responsibilities:
      "Accurate logging of quotations, sales orders, delivery challans, purchase invoices, and inventory receipts",
    expected_outcomes: "Zero-defect ERP records, rapid turnaround of operational entries",
    level: 40,
    active: true,
  },
  {
    code: "OFFICE_ADMIN",
    name: "Office Admin",
    purpose: "Office facilities, administrative support, and showroom coordination",
    responsibilities:
      "Office administration, sample kit inventory management, front-desk coordination, billing support, logistics liaison",
    expected_outcomes:
      "Smooth showroom presentation, organized document filing, on-time admin support",
    level: 30,
    active: true,
  },
  {
    code: "CUSTOMER_CARE",
    name: "Customer Care",
    purpose: "Client relationship management, post-sales support, and customer satisfaction",
    responsibilities:
      "Handling client enquiries, service coordination, dispute resolution, client feedback collection",
    expected_outcomes: "High customer satisfaction, prompt issue resolution, repeat orders",
    level: 50,
    active: true,
  },
  {
    code: "HOUSEKEEPING",
    name: "Housekeeping",
    purpose: "Workplace hygiene, showroom upkeep, and office maintenance",
    responsibilities:
      "Daily cleaning and maintenance of showroom, sample displays, office desks, and inventory display areas",
    expected_outcomes: "Immaculate showroom presentation and clean, safe work environment",
    level: 20,
    active: true,
  },
  {
    code: "OPERATIONS_HEAD",
    name: "Operations Head",
    purpose: "Factory, site operations, and end-to-end execution",
    responsibilities:
      "Production scheduling, site installation management, inventory oversight, and delivery deadlines",
    expected_outcomes:
      "On-time project delivery, zero operational downtime, high fabrication quality",
    level: 90,
    active: true,
  },
  {
    code: "MD",
    name: "Managing Director",
    purpose: "Overall business leadership and strategic direction",
    responsibilities:
      "Strategy, key architect and client relationships, vendor negotiations, executive governance",
    expected_outcomes: "Revenue growth, operational excellence, profitability",
    level: 100,
    active: true,
  },
  {
    code: "SALES_HEAD",
    name: "Sales Head",
    purpose: "Head of sales operations and revenue targets",
    responsibilities:
      "Sales pipeline management, quota achievement, team coordination, high-value quotation closures",
    expected_outcomes: "Monthly sales quota achievement and lead conversion",
    level: 80,
    active: true,
  },
  {
    code: "OFFICE_SALES_EXEC",
    name: "Office Sales Executive",
    purpose: "Showroom consultation, estimate preparation, and client closing",
    responsibilities:
      "In-showroom client walkthroughs, fast estimate and quotation generation, follow-up calls, payment tracking",
    expected_outcomes: "High conversion rate of showroom enquiries and timely closures",
    level: 50,
    active: true,
  },
];
