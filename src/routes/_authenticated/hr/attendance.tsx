/**
 * Attendance register + self-service clock. The clock card captures GPS,
 * accuracy, battery and network exactly like the future mobile app will, and
 * evaluates the branch geofence client-side so the employee sees why an
 * out-of-fence punch needs a reason and an approval.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { LogIn, LogOut, Coffee, MapPin, Check, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  listBranches,
  listPunches,
  recordPunch,
  setPunchApproval,
  getMyEmployee,
} from "@/lib/hr/api";
import { listEmployees } from "@/lib/workforce/api";
import {
  evaluateGeofence,
  formatMinutes,
  nextDirection,
  summarizeDay,
} from "@/lib/hr/attendance-engine";
import { PUNCH_DIRECTION_LABEL, type PunchDirection } from "@/lib/hr/types";
import { toUserMessage } from "@/lib/errors";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/hr/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — Human Resources" },
      { name: "description", content: "Clock in, clock out and review the attendance register." },
    ],
  }),
  component: AttendancePage,
});

const todayIso = () => new Date().toISOString().slice(0, 10);

interface Capture {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  battery: number | null;
  network: string;
}

async function captureContext(): Promise<Capture> {
  const network = typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online";
  let battery: number | null = null;
  try {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number }> };
    if (nav.getBattery) battery = Math.round((await nav.getBattery()).level * 100);
  } catch {
    battery = null;
  }
  const position = await new Promise<GeolocationPosition | null>((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
  return {
    latitude: position?.coords.latitude ?? null,
    longitude: position?.coords.longitude ?? null,
    accuracy: position?.coords.accuracy ?? null,
    battery,
    network,
  };
}

function AttendancePage() {
  const qc = useQueryClient();
  const auth = useAuthReady();
  const roles = useRoles();
  const canApprove = roles.hasAnyRole(["admin", "hr", "sales_manager"]);

  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [branchId, setBranchId] = useState<string>("");
  const [reason, setReason] = useState("");

  const me = useQuery({
    queryKey: ["hr", "me-employee", auth.user?.id],
    queryFn: () => getMyEmployee(auth.user!.id),
    enabled: !!auth.user?.id,
  });
  const branches = useQuery({ queryKey: ["hr", "branches"], queryFn: listBranches });
  const employees = useQuery({
    queryKey: ["wf", "employees", "list", ""],
    queryFn: () => listEmployees(""),
  });
  const punches = useQuery({
    queryKey: ["hr", "punches", from, to, employeeFilter],
    queryFn: () =>
      listPunches({ from, to, employeeId: employeeFilter === "all" ? null : employeeFilter }),
  });

  const employeeName = useMemo(
    () => new Map((employees.data ?? []).map((e) => [e.id, e.full_name])),
    [employees.data],
  );

  const myPunchesToday = useMemo(() => {
    const mine = (punches.data ?? []).filter(
      (p) => me.data && p.employee_id === me.data.id && p.punch_at.slice(0, 10) === todayIso(),
    );
    return mine;
  }, [punches.data, me.data]);

  const expected = nextDirection(myPunchesToday);
  const summary = summarizeDay(myPunchesToday, { workDate: todayIso(), shift: null });
  const selectedBranch = (branches.data ?? []).find((b) => b.id === branchId) ?? null;

  const punch = useMutation({
    mutationFn: async (direction: PunchDirection) => {
      if (!me.data) throw new Error("Your login is not linked to an employee record yet.");
      const ctx = await captureContext();
      const fence = evaluateGeofence(
        ctx.latitude !== null && ctx.longitude !== null
          ? { latitude: ctx.latitude, longitude: ctx.longitude }
          : null,
        selectedBranch,
      );
      if (!fence.within && !reason.trim()) {
        throw new Error(
          "You are outside the office geofence. Add a reason — the punch will go to your manager for approval.",
        );
      }
      return recordPunch({
        employee_id: me.data.id,
        direction,
        source: "mobile",
        branch_id: branchId || null,
        latitude: ctx.latitude,
        longitude: ctx.longitude,
        gps_accuracy_m: ctx.accuracy,
        battery_pct: ctx.battery,
        network_status: ctx.network,
        device_info: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : null,
        within_geofence: fence.unconfigured ? null : fence.within,
        distance_m: fence.distanceM,
        reason: reason.trim() || null,
        approval_status: fence.within ? "not_required" : "pending",
      });
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["hr", "punches"] });
      setReason("");
      toast.success(
        row.approval_status === "pending"
          ? "Punch recorded — sent for manager approval"
          : `${PUNCH_DIRECTION_LABEL[row.direction]} recorded`,
      );
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const approve = useMutation({
    mutationFn: (v: { id: string; status: "approved" | "rejected" }) =>
      setPunchApproval(v.id, v.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "punches"] });
      toast.success("Approval updated");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Mobile, biometric and manual punches in one register."
        eyebrow="Human Resources"
      />

      <Card className="shadow-1">
        <CardHeader>
          <CardTitle className="text-sm">My attendance today</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {me.isLoading ? (
            <p className="text-muted-foreground">Loading your employee record…</p>
          ) : !me.data ? (
            <p className="text-muted-foreground">
              Your login isn&apos;t linked to an employee record yet, so you can&apos;t clock in.
              Ask HR to link your account from the Employees page.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Worked:{" "}
                  <strong className="text-foreground">
                    {formatMinutes(summary.workingMinutes)}
                  </strong>
                </span>
                <span>
                  Break:{" "}
                  <strong className="text-foreground">{formatMinutes(summary.breakMinutes)}</strong>
                </span>
                <span>
                  Next:{" "}
                  <strong className="text-foreground">{PUNCH_DIRECTION_LABEL[expected]}</strong>
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Office location" />
                  </SelectTrigger>
                  <SelectContent>
                    {(branches.data ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason (required only when outside the office geofence)"
                  rows={1}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={punch.isPending} onClick={() => punch.mutate("in")}>
                  <LogIn className="mr-1 h-4 w-4" /> Clock in
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={punch.isPending}
                  onClick={() => punch.mutate("break_in")}
                >
                  <Coffee className="mr-1 h-4 w-4" /> Break start
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={punch.isPending}
                  onClick={() => punch.mutate("break_out")}
                >
                  <Coffee className="mr-1 h-4 w-4" /> Break end
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={punch.isPending}
                  onClick={() => punch.mutate("out")}
                >
                  <LogOut className="mr-1 h-4 w-4" /> Clock out
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="min-w-48">
          <label className="mb-1 block text-xs text-muted-foreground">Employee</label>
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {(employees.data ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 min-w-0 overflow-x-auto">
        {punches.isLoading ? (
          <SkeletonTable />
        ) : punches.isError ? (
          <ErrorBlock message={toUserMessage(punches.error)} />
        ) : (punches.data ?? []).length === 0 ? (
          <EmptyState
            title="No punches in this range"
            message="Mobile and biometric punches will appear here as they are recorded."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Approval</TableHead>
                {canApprove && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(punches.data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-nowrap">
                    {employeeName.get(p.employee_id) ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {new Date(p.punch_at).toLocaleString()}
                  </TableCell>
                  <TableCell>{PUNCH_DIRECTION_LABEL[p.direction]}</TableCell>
                  <TableCell className="text-xs capitalize">{p.source}</TableCell>
                  <TableCell className="text-xs">
                    {p.within_geofence === null ? (
                      "—"
                    ) : p.within_geofence ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> In office
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {p.distance_m ? `${Math.round(Number(p.distance_m))} m away` : "Outside"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.approval_status === "approved"
                          ? "default"
                          : p.approval_status === "rejected"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {p.approval_status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  {canApprove && (
                    <TableCell className="text-right">
                      {p.approval_status === "pending" && (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={approve.isPending}
                            onClick={() => approve.mutate({ id: p.id, status: "approved" })}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={approve.isPending}
                            onClick={() => approve.mutate({ id: p.id, status: "rejected" })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}
