---
name: Workforce Intelligence
description: New top-level module — Employee master, Roles/KRAs, Workload Capacities, hybrid rule-based task engine, rule-based scoring, Owner Intelligence dashboard, Owner Notes. No AI. Not payroll.
type: feature
---
Route root: `/workforce-intelligence` (folder `src/routes/_authenticated/workforce-intelligence/`).
Sub-routes: `/` Today, `/employees`, `/employees/new?id=` create/edit, `/employees/$id` profile (Overview / KRAs / Tasks / Performance / Notes / Documents + placeholder Attendance/Leave/Payroll/Training), `/roles`, `/roles/$id`, `/capacities`, `/performance`, `/owner` Owner Intelligence Panel.

Data layer: `src/lib/workforce/{types,schema,api,scoring,owner-intel}.ts`.

DB tables (all in `public`, RLS enabled, owner = admin|sales_manager via `workforce_is_owner`):
- `employees` (auto code `EMP-#####` via `set_employee_code` trigger), `employee_documents`, `designations`, `kras`, `workload_capacities` (ideal/max/overload triple), `workforce_tasks` (`dedup_key` unique), `workforce_score_snapshots`, `owner_notes`, `workforce_rule_assignments`.
- Sensitive fields (aadhaar/pan/bank/salary) exposed to owners only via view `employees_sensitive` (security_invoker=on) — the base table itself allows self-read but owner-only writes.

Hybrid rule engine:
- Immediate: triggers on `enquiries`, `purchase_orders`, `dispatches`, `site_visits`, `customer_payment_schedules`, `installations` call `workforce_upsert_task(rule_key,…)` / `workforce_close_task`. Assignment resolves through `workforce_rule_assignments(rule_key → designation)` then first active employee of that designation.
- Daily housekeeping: `/api/public/hooks/workforce-daily` invoked by pg_cron job `workforce-daily` (01:00 UTC / 06:30 IST) — cancels stale auto-tasks, refreshes today's payment-reminder schedules.

Scoring: `computeEmployeeScore(employeeId, designationId, userId)` counts ERP rows attributable to `created_by = userId` matched to KRA `metric_source` for the current period, weights by `weightage`, grades via `gradeFromPct` (A+ ≥95, A ≥85, B ≥70, C ≥55, else Needs Attention). Fully explainable, no AI.

Owner Intelligence: `buildOwnerSummary(employees, tasks, scores)` produces workload distribution, department summary, and typed recommendations (discussion / appreciation / coaching / risk / critical). Owner-only widget mounted on `/dashboard` via `WorkforceSummaryWidget` and full page at `/workforce-intelligence/owner`.

Owner Notes: `owner_notes(kind ∈ strength|improvement|observation)` — owner-only read/write. Do not use for scoring in this phase.

Nav: new group `workforce` with items Today, Employees, Roles & KRAs, Workload Capacity, Performance, Owner Intelligence (owner-only).

Not built (intentional placeholders in employee profile tabs): Attendance, Biometrics, Payroll, Leave, Training, Promotions, Appraisals, Hiring AI. Do not implement until explicitly requested.
