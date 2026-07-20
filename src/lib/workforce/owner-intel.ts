/**
 * Rule-based owner intelligence.
 * Aggregates workforce tasks + performance snapshots into explainable
 * recommendations for the owner dashboard. No AI.
 */
import type { Employee, WorkforceTask } from "./types";
import type { EmployeeScore } from "./scoring";

export interface OwnerRecommendation {
  kind: "discussion" | "appreciation" | "coaching" | "risk" | "critical";
  employeeId?: string;
  employeeName?: string;
  title: string;
  reason: string;
}

export interface WorkforceSummary {
  totalEmployees: number;
  totalTasks: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  criticalPending: number;
  completionPct: number;
  topPerformer?: { name: string; pct: number };
  needsAttention?: { name: string; pct: number };
  byDepartment: Array<{ department: string; total: number; pending: number; completion: number }>;
  workloadByEmployee: Array<{ employeeId: string; name: string; pending: number; overdue: number }>;
  recommendations: OwnerRecommendation[];
}

export function buildOwnerSummary(
  employees: Employee[],
  tasks: WorkforceTask[],
  scores: Map<string, EmployeeScore>,
): WorkforceSummary {
  const now = Date.now();
  const empById = new Map(employees.map((e) => [e.id, e]));

  const perEmp = new Map<
    string,
    { pending: number; overdue: number; completed: number; critical: number }
  >();
  let pending = 0;
  let inProgress = 0;
  let completed = 0;
  let overdue = 0;
  let critical = 0;

  for (const t of tasks) {
    if (t.status === "completed") completed++;
    else if (t.status === "in_progress") inProgress++;
    else if (t.status === "pending") pending++;
    const isOverdue =
      t.due_at &&
      new Date(t.due_at).getTime() < now &&
      t.status !== "completed" &&
      t.status !== "cancelled";
    if (isOverdue) overdue++;
    const isCritical =
      (t.priority === "urgent" || t.priority === "high") &&
      t.status !== "completed" &&
      t.status !== "cancelled";
    if (isCritical) critical++;
    if (t.employee_id) {
      const s = perEmp.get(t.employee_id) ?? { pending: 0, overdue: 0, completed: 0, critical: 0 };
      if (t.status === "pending" || t.status === "in_progress") s.pending++;
      if (isOverdue) s.overdue++;
      if (t.status === "completed") s.completed++;
      if (isCritical) s.critical++;
      perEmp.set(t.employee_id, s);
    }
  }

  const total = tasks.length;
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Top performer / needs attention
  let top: { name: string; pct: number } | undefined;
  let low: { name: string; pct: number } | undefined;
  for (const [empId, s] of scores) {
    const name = empById.get(empId)?.full_name ?? "";
    if (!top || s.overall_pct > top.pct) top = { name, pct: s.overall_pct };
    if (!low || s.overall_pct < low.pct) low = { name, pct: s.overall_pct };
  }

  // Department breakdown
  const deptMap = new Map<string, { total: number; pending: number; completed: number }>();
  for (const e of employees) {
    const d = e.department ?? "Unassigned";
    const cur = deptMap.get(d) ?? { total: 0, pending: 0, completed: 0 };
    cur.total++;
    const s = perEmp.get(e.id);
    if (s) {
      cur.pending += s.pending;
      cur.completed += s.completed;
    }
    deptMap.set(d, cur);
  }
  const byDepartment = Array.from(deptMap, ([department, v]) => ({
    department,
    total: v.total,
    pending: v.pending,
    completion:
      v.pending + v.completed > 0 ? Math.round((v.completed / (v.pending + v.completed)) * 100) : 0,
  }));

  const workloadByEmployee = employees
    .map((e) => {
      const s = perEmp.get(e.id) ?? { pending: 0, overdue: 0, completed: 0, critical: 0 };
      return { employeeId: e.id, name: e.full_name, pending: s.pending, overdue: s.overdue };
    })
    .sort((a, b) => b.pending - a.pending);

  const recommendations: OwnerRecommendation[] = [];

  // Discussion recommendations
  for (const [empId, s] of perEmp) {
    const emp = empById.get(empId);
    if (!emp) continue;
    if (s.overdue >= 3) {
      recommendations.push({
        kind: "discussion",
        employeeId: empId,
        employeeName: emp.full_name,
        title: `Review delays with ${emp.full_name}`,
        reason: `${s.overdue} task${s.overdue === 1 ? "" : "s"} overdue.`,
      });
    }
    if (s.critical >= 2) {
      recommendations.push({
        kind: "critical",
        employeeId: empId,
        employeeName: emp.full_name,
        title: `Critical work pending with ${emp.full_name}`,
        reason: `${s.critical} high/urgent task${s.critical === 1 ? "" : "s"} not yet closed.`,
      });
    }
  }

  // Appreciation
  for (const [empId, sc] of scores) {
    if (sc.overall_pct >= 90) {
      const emp = empById.get(empId);
      if (emp) {
        recommendations.push({
          kind: "appreciation",
          employeeId: empId,
          employeeName: emp.full_name,
          title: `Appreciate ${emp.full_name}`,
          reason: `Performance at ${sc.overall_pct.toFixed(0)}% this month.`,
        });
      }
    } else if (sc.overall_pct < 55) {
      const emp = empById.get(empId);
      if (emp) {
        recommendations.push({
          kind: "coaching",
          employeeId: empId,
          employeeName: emp.full_name,
          title: `Coach ${emp.full_name}`,
          reason: `Performance at ${sc.overall_pct.toFixed(0)}% — below expected range.`,
        });
      }
    }
  }

  // Risk areas (department-wide)
  for (const d of byDepartment) {
    if (d.pending >= 10 && d.completion < 40) {
      recommendations.push({
        kind: "risk",
        title: `High-risk area: ${d.department}`,
        reason: `${d.pending} tasks pending with only ${d.completion}% completion.`,
      });
    }
  }

  return {
    totalEmployees: employees.length,
    totalTasks: total,
    pending,
    inProgress,
    completed,
    overdue,
    criticalPending: critical,
    completionPct,
    topPerformer: top,
    needsAttention: low,
    byDepartment,
    workloadByEmployee,
    recommendations,
  };
}
