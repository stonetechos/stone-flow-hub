/**
 * Human Resources — module dashboard. Every figure is read live from the HR
 * tables; nothing here is illustrative.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Clock,
  Fingerprint,
  Plane,
  Users,
  Building2,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listAttendanceDays, listHolidays, listLeaveRequests, listBranches } from "@/lib/hr/api";
import { listEmployees } from "@/lib/workforce/api";
import { ATTENDANCE_STATUS_LABEL } from "@/lib/hr/types";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/hr/")({
  head: () => ({
    meta: [
      { title: "Human Resources — STOS" },
      { name: "description", content: "Headcount, attendance, leave and HR operations." },
    ],
  }),
  component: HrDashboard,
});

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function HrDashboard() {
  const employees = useQuery({
    queryKey: ["wf", "employees", "list", ""],
    queryFn: () => listEmployees(""),
  });
  const attendance = useQuery({
    queryKey: ["hr", "attendance-days", today(), today()],
    queryFn: () => listAttendanceDays({ from: today(), to: today() }),
  });
  const leave = useQuery({
    queryKey: ["hr", "leave-requests", "pending"],
    queryFn: () => listLeaveRequests({ status: "pending" }),
  });
  const holidays = useQuery({
    queryKey: ["hr", "holidays", new Date().getFullYear()],
    queryFn: () => listHolidays(new Date().getFullYear()),
  });
  const branches = useQuery({ queryKey: ["hr", "branches"], queryFn: listBranches });

  const loading =
    employees.isLoading || attendance.isLoading || leave.isLoading || branches.isLoading;
  const error = employees.error ?? attendance.error ?? leave.error ?? branches.error;

  const rows = attendance.data ?? [];
  const present = rows.filter((r) => r.status === "present" || r.status === "late").length;
  const onLeave = rows.filter((r) => r.status === "on_leave").length;
  const active = (employees.data ?? []).filter((e) => e.employment_status === "active").length;
  const upcoming = (holidays.data ?? []).filter((h) => h.holiday_date >= today()).slice(0, 4);

  return (
    <>
      <PageHeader
        title="Human Resources"
        subtitle="Headcount, attendance, shifts and leave at a glance."
        eyebrow="People"
      />

      {error ? (
        <ErrorBlock message={toUserMessage(error)} />
      ) : loading ? (
        <SkeletonTable />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={Users}
              label="Active employees"
              value={active}
              to="/workforce-intelligence/employees"
            />
            <StatCard icon={Clock} label="Marked present today" value={present} to="/hr/attendance" />
            <StatCard icon={Plane} label="On leave today" value={onLeave} to="/hr/leave" />
            <StatCard
              icon={Fingerprint}
              label="Leave approvals pending"
              value={(leave.data ?? []).length}
              to="/hr/leave"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="shadow-1">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">Today&apos;s attendance</CardTitle>
                <Link
                  to="/hr/attendance"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Open register <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {rows.length === 0 ? (
                  <p className="text-muted-foreground">
                    No attendance recorded for today yet. Punches appear here as soon as employees
                    clock in.
                  </p>
                ) : (
                  Object.entries(
                    rows.reduce<Record<string, number>>((acc, r) => {
                      acc[r.status] = (acc[r.status] ?? 0) + 1;
                      return acc;
                    }, {}),
                  ).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {ATTENDANCE_STATUS_LABEL[status as keyof typeof ATTENDANCE_STATUS_LABEL] ??
                          status}
                      </span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="shadow-1">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">Upcoming holidays</CardTitle>
                <Link
                  to="/hr/holidays"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Calendar <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {upcoming.length === 0 ? (
                  <p className="text-muted-foreground">
                    No holidays configured for the rest of this year.
                  </p>
                ) : (
                  upcoming.map((h) => (
                    <div key={h.id} className="flex items-center justify-between gap-3">
                      <span className="truncate">{h.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {h.holiday_date}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="shadow-1">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">Offices &amp; geofences</CardTitle>
                <Link
                  to="/hr/branches"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Manage <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(branches.data ?? []).length === 0 ? (
                  <p className="text-muted-foreground">
                    No offices yet. Add one with coordinates to enable geofenced attendance.
                  </p>
                ) : (
                  (branches.data ?? []).slice(0, 5).map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 truncate">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {b.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {b.latitude === null ? "No geofence" : `${b.geofence_radius_m} m`}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="shadow-1">
              <CardHeader>
                <CardTitle className="text-sm">Pending leave approvals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(leave.data ?? []).length === 0 ? (
                  <p className="text-muted-foreground">Nothing waiting on an approval.</p>
                ) : (
                  (leave.data ?? []).slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 truncate">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        {r.from_date} → {r.to_date}
                      </span>
                      <Badge variant="outline">{Number(r.days)} d</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  to: string;
}) {
  return (
    <Link to={to} className="block">
      <Card className="shadow-1 transition-colors hover:border-primary/40">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
            <span className="truncate">{label}</span>
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
