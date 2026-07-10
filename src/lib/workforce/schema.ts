import { z } from "zod";
import { zOptional, zRequired } from "@/lib/zod";

export const employeeSchema = z.object({
  full_name: zRequired("Full name"),
  designation_id: z.string().uuid().nullable().optional(),
  department: zOptional(),
  employment_type: z.enum(["full_time", "part_time", "contract", "intern", "consultant"]).default("full_time"),
  reporting_manager_id: z.string().uuid().nullable().optional(),
  joining_date: zOptional(),
  phone: zOptional(),
  email: zOptional(),
  emergency_contact: zOptional(),
  address: zOptional(),
  aadhaar: zOptional(),
  pan: zOptional(),
  bank_details: z.record(z.string(), z.any()).default({}),
  salary_ctc: z
    .preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().nullable().optional()),
  skills: z.array(z.string()).default([]),
  employment_status: z
    .enum(["active", "on_leave", "notice", "terminated", "resigned"])
    .default("active"),
  photo_url: zOptional(),
  remarks: zOptional(),
  user_id: z.string().uuid().nullable().optional(),
});
export type EmployeeInput = z.infer<typeof employeeSchema>;

export const designationSchema = z.object({
  code: zRequired("Code"),
  name: zRequired("Name"),
  purpose: zOptional(),
  responsibilities: zOptional(),
  expected_outcomes: zOptional(),
  level: z.preprocess((v) => Number(v ?? 0), z.number().int().min(0).default(0)),
  active: z.boolean().default(true),
});
export type DesignationInput = z.infer<typeof designationSchema>;

export const kraSchema = z.object({
  designation_id: z.string().uuid(),
  name: zRequired("KRA name"),
  description: zOptional(),
  weightage: z.preprocess((v) => Number(v ?? 0), z.number().min(0).max(100)),
  target_value: z.preprocess((v) => Number(v ?? 0), z.number().min(0)),
  target_period: z.enum(["daily", "weekly", "monthly", "quarterly"]).default("monthly"),
  metric_source: zOptional(),
  active: z.boolean().default(true),
  sort_order: z.preprocess((v) => Number(v ?? 0), z.number().int().default(0)),
});
export type KraInput = z.infer<typeof kraSchema>;

export const capacitySchema = z.object({
  designation_id: z.string().uuid(),
  metric_key: zRequired("Metric key"),
  metric_label: zRequired("Label"),
  ideal_capacity: z.preprocess((v) => Number(v ?? 0), z.number().min(0)),
  maximum_capacity: z.preprocess((v) => Number(v ?? 0), z.number().min(0)),
  overload_threshold: z.preprocess((v) => Number(v ?? 0), z.number().min(0)),
  period: z.enum(["daily", "weekly", "monthly", "quarterly"]).default("daily"),
  notes: zOptional(),
});
export type CapacityInput = z.infer<typeof capacitySchema>;

export const taskUpdateSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed", "deferred", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  deferred_until: z.string().nullable().optional(),
  estimated_minutes: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
});
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;

export const manualTaskSchema = z.object({
  employee_id: z.string().uuid(),
  title: zRequired("Title"),
  description: zOptional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  due_at: zOptional(),
  estimated_minutes: z
    .preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(0).nullable().optional()),
});
export type ManualTaskInput = z.infer<typeof manualTaskSchema>;

export const ownerNoteSchema = z.object({
  employee_id: z.string().uuid(),
  kind: z.enum(["strength", "improvement", "observation"]),
  title: zRequired("Title"),
  body: zOptional(),
});
export type OwnerNoteInput = z.infer<typeof ownerNoteSchema>;

export const ruleAssignmentSchema = z.object({
  rule_key: zRequired("Rule key"),
  designation_id: z.string().uuid().nullable().optional(),
  fallback_employee_id: z.string().uuid().nullable().optional(),
  active: z.boolean().default(true),
  notes: zOptional(),
});
export type RuleAssignmentInput = z.infer<typeof ruleAssignmentSchema>;
