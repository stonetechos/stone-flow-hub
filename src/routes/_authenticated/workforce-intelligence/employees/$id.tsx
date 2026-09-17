/**
 * Employee profile — Overview, KRAs, Tasks, Performance, Owner Notes,
 * Documents, and placeholder future tabs (Attendance / Leave / Payroll /
 * Training / Promotions).
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2, Fingerprint, Mail } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { isBiometricLinked, registerDeviceBiometric } from "@/lib/auth/biometrics";
import {
  getEmployee,
  listTasks,
  listKras,
  listSnapshots,
  listOwnerNotes,
  createOwnerNote,
  deleteOwnerNote,
  listEmployeeDocuments,
  listDesignations,
  updateEmployeeStatus,
  deleteEmployee,
} from "@/lib/workforce/api";
import { computeEmployeeScore, type ScoredKra } from "@/lib/workforce/scoring";
import {
  GRADE_LABELS,
  OWNER_NOTE_KINDS,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_STATUS_LABELS,
  type OwnerNoteKind,
  type EmploymentStatus,
  type Designation,
} from "@/lib/workforce/types";
import { toUserMessage } from "@/lib/errors";
import { useRoles } from "@/hooks/use-roles";
import { format } from "date-fns";
import type { EmployeeKra, EmployeeKpa } from "@/lib/workforce/schema";

export const Route = createFileRoute("/_authenticated/workforce-intelligence/employees/$id")({
  head: () => ({ meta: [{ title: "Employee — Workforce Intelligence" }] }),
  component: EmployeeProfile,
  errorComponent: ({ error, reset }) => (
    <div className="p-6">
      <ErrorBlock
        message={`Unable to load employee profile: ${error instanceof Error ? error.message : "Unknown error"}`}
        onRetry={reset}
      />
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-6">
      <EmptyState
        title="Employee not found"
        message="The requested employee record could not be found or has been removed."
      />
    </div>
  ),
});

function safeFormatDate(val: string | null | undefined, pattern = "d MMM yyyy"): string {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "—";
    return format(d, pattern);
  } catch {
    return "—";
  }
}

function safeParseArray<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  if (typeof val === "string" && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch {
      // If comma-separated string, e.g. skills: "react, node"
      const parts = val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length > 0) return parts as unknown as T[];
    }
  }
  return [];
}

function EmployeeProfile() {
  const { id } = Route.useParams();
  const roles = useRoles();
  const isOwner = roles.isAdmin || roles.isSalesManager;

  const qc = useQueryClient();
  const nav = useNavigate();
  const [showDelete, setShowDelete] = useState(false);

  const emp = useQuery({ queryKey: ["wf", "employees", id], queryFn: () => getEmployee(id) });
  const designations = useQuery({ queryKey: ["wf", "designations"], queryFn: listDesignations });

  const empDesignationIds =
    emp.data?.designation_ids && emp.data.designation_ids.length > 0
      ? emp.data.designation_ids
      : emp.data?.designation_id
        ? [emp.data.designation_id]
        : [];

  const empDesignations = empDesignationIds
    .map((dId) => (designations.data ?? []).find((d) => d.id === dId))
    .filter(Boolean) as Designation[];

  const designation =
    empDesignations[0] ??
    (emp.data?.designation_id
      ? (designations.data ?? []).find((d) => d.id === emp.data!.designation_id)
      : undefined);

  const tasks = useQuery({
    queryKey: ["wf", "tasks", "emp", id],
    queryFn: () => listTasks({ employeeId: id }),
  });
  const kras = useQuery({
    queryKey: ["wf", "kras", designation?.id],
    queryFn: () => listKras(designation?.id),
    enabled: !!designation?.id,
  });
  const snapshots = useQuery({
    queryKey: ["wf", "snap", id],
    queryFn: () => listSnapshots(id),
  });
  const score = useQuery({
    queryKey: ["wf", "score", id, designation?.id, emp.data?.user_id],
    queryFn: () => computeEmployeeScore(id, designation?.id ?? null, emp.data?.user_id ?? null),
    enabled: !!emp.data && !!designation?.id,
  });

  const [bioLinked, setBioLinked] = useState(false);
  const [linkingBio, setLinkingBio] = useState(false);

  const handleLinkFingerprint = async () => {
    if (!emp.data?.email) {
      toast.error("Employee email is required to link fingerprint.");
      return;
    }
    setLinkingBio(true);
    try {
      toast.loading("Touch your phone's fingerprint sensor to register…", { id: "bio-reg" });
      await registerDeviceBiometric(emp.data.email, emp.data.user_id || emp.data.id);
      toast.dismiss("bio-reg");
      toast.success("Device fingerprint registered successfully!");
      setBioLinked(true);
    } catch (err: unknown) {
      toast.dismiss("bio-reg");
      toast.error(toUserMessage(err));
    } finally {
      setLinkingBio(false);
    }
  };

  const updateStatusMut = useMutation({
    mutationFn: (status: EmploymentStatus) => {
      if (status === "terminated" && !roles.isSuperAdmin) {
        throw new Error(
          "Admins are not permitted to terminate employees. Only Super Admin can perform termination.",
        );
      }
      return updateEmployeeStatus(id, status);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wf", "employees"] });
      toast.success("Employment status updated");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: () => {
      if (!roles.isSuperAdmin) {
        throw new Error(
          "Admins are not permitted to terminate or delete employees. Only Super Admin can remove staff.",
        );
      }
      return deleteEmployee(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wf", "employees"] });
      toast.success("Employee removed successfully");
      nav({ to: "/workforce-intelligence/employees" });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (emp.isLoading) return <SkeletonTable />;
  if (emp.isError) return <ErrorBlock message={toUserMessage(emp.error)} />;
  if (!emp.data) return <EmptyState title="Employee not found" />;

  const e = emp.data;
  const skillsList = safeParseArray<string>(e.skills);
  const isBioLinked = !!(e.email && isBiometricLinked(e.email));
  const hasFingerprint = bioLinked || isBioLinked;

  const designationSubtitle =
    empDesignations.length > 0
      ? empDesignations.map((d) => d.name).join(" • ")
      : (designation?.name ?? "No designation");

  return (
    <>
      <PageHeader
        title={e.full_name}
        subtitle={`${e.employee_code || "No code"} • ${designationSubtitle}`}
        eyebrow="Workforce Intelligence"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={e.employment_status}
              disabled={updateStatusMut.isPending}
              onValueChange={(val) => {
                if (val === "terminated" && !roles.isSuperAdmin) {
                  toast.error(
                    "Admins are not permitted to terminate employees. Only Super Admin can perform termination.",
                  );
                  return;
                }
                updateStatusMut.mutate(val as EmploymentStatus);
              }}
            >
              <SelectTrigger className="h-8 w-[130px] text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_STATUSES.map((st) => {
                  if (st === "terminated" && !roles.isSuperAdmin) return null;
                  return (
                    <SelectItem key={st} value={st} className="text-xs">
                      {EMPLOYMENT_STATUS_LABELS[st]}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Button asChild size="sm" variant="outline">
              <Link to="/workforce-intelligence/employees/new" search={{ id }}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Link>
            </Button>

            {roles.isSuperAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
              </Button>
            )}
          </div>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="kras">KRAs</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          {isOwner && <TabsTrigger value="notes">Owner Notes</TabsTrigger>}
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="attendance" disabled>
            Attendance
          </TabsTrigger>
          <TabsTrigger value="leave" disabled>
            Leave
          </TabsTrigger>
          <TabsTrigger value="payroll" disabled>
            Payroll
          </TabsTrigger>
          <TabsTrigger value="training" disabled>
            Training
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoRow
              label="Designation(s)"
              value={
                empDesignations.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {empDesignations.map((d, index) => (
                      <Badge
                        key={d.id}
                        variant={index === 0 ? "default" : "secondary"}
                        className={
                          index === 0
                            ? "text-xs font-semibold bg-primary text-primary-foreground"
                            : "text-xs font-medium bg-blue-50 text-blue-900 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                        }
                      >
                        {d.name}
                        {index === 0 && empDesignations.length > 1 && (
                          <span className="ml-1 text-[10px] opacity-80">(Primary)</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  (designation?.name ?? "—")
                )
              }
            />
            <InfoRow label="Employment type" value={e.employment_type} />
            <InfoRow label="Status" value={<Badge>{e.employment_status}</Badge>} />
            <InfoRow label="Joining date" value={e.joining_date ?? "—"} />
            <InfoRow label="Phone" value={e.phone ?? "—"} />
            <InfoRow
              label="Registered Email"
              value={
                e.email ? (
                  <a
                    href={`mailto:${e.email}`}
                    className="text-primary hover:underline font-mono inline-flex items-center gap-1.5"
                  >
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{e.email}</span>
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )
              }
            />
            <InfoRow label="Department" value={e.department ?? "—"} />
            <InfoRow label="Address" value={e.address ?? "—"} />
            <InfoRow label="Emergency contact" value={e.emergency_contact ?? "—"} />
            <InfoRow
              label="Skills"
              value={
                skillsList.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {skillsList.map((s) => (
                      <Badge
                        key={s}
                        variant="secondary"
                        className="text-xs bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  "—"
                )
              }
            />
            {isOwner && (
              <>
                <InfoRow label="Aadhaar" value={e.aadhaar ?? "—"} />
                <InfoRow label="PAN" value={e.pan ?? "—"} />
                <InfoRow
                  label="Salary CTC"
                  value={e.salary_ctc != null ? `₹${e.salary_ctc}` : "—"}
                />
              </>
            )}
          </div>

          {/* Biometric Phone Authentication */}
          <div className="rounded-lg border border-border p-4 bg-muted/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
                  <Fingerprint className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Phone Fingerprint Authentication</h4>
                  <p className="text-xs text-muted-foreground">
                    {hasFingerprint
                      ? "Device fingerprint is linked. This employee can log in using biometric verification."
                      : "No fingerprint linked on this device yet. Tap to link this phone's biometric."}
                  </p>
                </div>
              </div>
              <Button
                variant={hasFingerprint ? "outline" : "default"}
                size="sm"
                className="gap-1.5 text-xs shrink-0"
                onClick={handleLinkFingerprint}
                disabled={linkingBio || !e.email}
              >
                <Fingerprint className="h-3.5 w-3.5" />
                {hasFingerprint ? "Re-link Fingerprint" : "Link Device Fingerprint"}
              </Button>
            </div>
          </div>

          {/* KRAs & KPAs Summary on Overview */}
          {(() => {
            const bankObj = (() => {
              if (!e.bank_details) return {};
              if (typeof e.bank_details === "object")
                return e.bank_details as Record<string, unknown>;
              if (typeof e.bank_details === "string") {
                try {
                  return JSON.parse(e.bank_details) as Record<string, unknown>;
                } catch {
                  return {};
                }
              }
              return {};
            })();

            const rawKras = (e as unknown as { kras?: unknown }).kras ?? bankObj._kras;
            const rawKpas = (e as unknown as { kpas?: unknown }).kpas ?? bankObj._kpas;
            const empKras = safeParseArray<EmployeeKra>(rawKras);
            const empKpas = safeParseArray<EmployeeKpa>(rawKpas);
            if (empKras.length === 0 && empKpas.length === 0) return null;
            return (
              <div className="rounded-xl border border-blue-200/80 bg-gradient-to-b from-blue-50/30 to-transparent p-4 dark:border-blue-900/40 dark:from-blue-950/20 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground">
                    Employee Assigned KRAs &amp; KPAs
                  </h4>
                  <Link
                    to="/workforce-intelligence/employees/new"
                    search={{ id: e.id }}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Edit KRAs
                  </Link>
                </div>
                {empKras.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Key Result Areas (KRAs)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {empKras.map((k, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-border/80 bg-background/90 p-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-foreground line-clamp-1">
                              {k.title || "KRA"}
                            </span>
                            {k.weightage != null && (
                              <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                                {k.weightage}%
                              </Badge>
                            )}
                          </div>
                          {k.description && (
                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                              {k.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {empKpas.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Key Performance Areas &amp; Activities (KPAs)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {empKpas.map((k, i) => (
                        <div
                          key={i}
                          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs"
                        >
                          <span className="font-medium text-foreground">{k.title}</span>
                          {k.metric && (
                            <span className="ml-1.5 text-muted-foreground font-mono text-[11px]">
                              ({k.metric})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {e.remarks && (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Remarks</div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{e.remarks}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="kras" className="mt-4 space-y-6">
          {(() => {
            const bankObj = (() => {
              if (!e.bank_details) return {};
              if (typeof e.bank_details === "object")
                return e.bank_details as Record<string, unknown>;
              if (typeof e.bank_details === "string") {
                try {
                  return JSON.parse(e.bank_details) as Record<string, unknown>;
                } catch {
                  return {};
                }
              }
              return {};
            })();

            const rawKras = (e as unknown as { kras?: unknown }).kras ?? bankObj._kras;
            const rawKpas = (e as unknown as { kpas?: unknown }).kpas ?? bankObj._kpas;
            const empKras = safeParseArray<EmployeeKra>(rawKras);
            const empKpas = safeParseArray<EmployeeKpa>(rawKpas);

            return (
              <>
                {empKras.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-foreground">Employee-Specific KRAs</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>KRA Title</TableHead>
                          <TableHead>Weightage</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>Description / Target</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {empKras.map((k, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-semibold text-foreground">
                              {k.title}
                            </TableCell>
                            <TableCell className="font-mono font-bold">
                              {k.weightage ?? 0}%
                            </TableCell>
                            <TableCell className="capitalize">
                              {k.target_period ?? "monthly"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {k.description || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {empKpas.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-foreground">
                      Employee-Specific KPAs (Performance Activities)
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Activity / Performance Area</TableHead>
                          <TableHead>Target Metric</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {empKpas.map((k, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-semibold text-foreground">
                              {k.title}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-blue-700 dark:text-blue-300 font-medium">
                              {k.metric || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-foreground">
                    Designation Master KRAs ({designation?.name ?? "Role"})
                  </h4>
                  {kras.isLoading ? (
                    <SkeletonTable />
                  ) : (kras.data ?? []).length === 0 ? (
                    empKras.length === 0 ? (
                      <EmptyState
                        title="No KRAs configured"
                        message="Configure KRAs against the role master or assign employee-specific KRAs."
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground italic">
                        No additional role master KRAs.
                      </div>
                    )
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>KRA</TableHead>
                          <TableHead>Weight</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Period</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(kras.data ?? []).map((k) => (
                          <TableRow key={k.id}>
                            <TableCell className="font-medium">{k.name}</TableCell>
                            <TableCell>{Number(k.weightage)}%</TableCell>
                            <TableCell>{Number(k.target_value)}</TableCell>
                            <TableCell>{k.target_period}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </>
            );
          })()}
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          {tasks.isLoading ? (
            <SkeletonTable />
          ) : (tasks.data ?? []).length === 0 ? (
            <EmptyState title="No tasks yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(tasks.data ?? []).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.priority}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{safeFormatDate(t.due_at, "d MMM")}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="performance" className="mt-4 space-y-4">
          {score.isLoading ? (
            <SkeletonTable />
          ) : !score.data ? (
            <EmptyState
              title="Performance not yet computed"
              message="Assign a designation with KRAs to enable scoring."
            />
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-semibold">{score.data.overall_pct}%</div>
                <div>
                  <Badge variant="secondary">
                    Grade: {GRADE_LABELS[score.data.grade] ?? "N/A"}
                  </Badge>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {score.data.period_start} → {score.data.period_end}
                  </div>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>KRA</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Achieved</TableHead>
                    <TableHead>%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safeParseArray<ScoredKra>(score.data.kras).map((k) => (
                    <TableRow key={k.kra_id}>
                      <TableCell className="font-medium">{k.kra_name}</TableCell>
                      <TableCell>{k.weight}%</TableCell>
                      <TableCell>{k.target}</TableCell>
                      <TableCell>{k.achieved}</TableCell>
                      <TableCell>{k.pct}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {(snapshots.data ?? []).length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {snapshots.data!.length} historical snapshot
                  {snapshots.data!.length === 1 ? "" : "s"}.
                </div>
              )}
            </>
          )}
        </TabsContent>

        {isOwner && (
          <TabsContent value="notes" className="mt-4">
            <OwnerNotesTab employeeId={id} />
          </TabsContent>
        )}

        <TabsContent value="documents" className="mt-4">
          <DocumentsTab employeeId={id} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Remove Employee"
        description={`Are you sure you want to remove ${e.full_name}? This action cannot be undone.`}
        confirmLabel="Remove"
        tone="danger"
        onConfirm={() => deleteMut.mutate()}
        busy={deleteMut.isPending}
      />
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm">{value}</div>
    </div>
  );
}

function OwnerNotesTab({ employeeId }: { employeeId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["wf", "owner_notes", employeeId],
    queryFn: () => listOwnerNotes(employeeId),
  });
  const [kind, setKind] = useState<OwnerNoteKind>("observation");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const add = useMutation({
    mutationFn: () => createOwnerNote({ employee_id: employeeId, kind, title, body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wf", "owner_notes", employeeId] });
      setTitle("");
      setBody("");
      toast.success("Note added");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteOwnerNote(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wf", "owner_notes", employeeId] }),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-3 space-y-2">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <Select value={kind} onValueChange={(v) => setKind(v as OwnerNoteKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OWNER_NOTE_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short title"
            className="md:col-span-3"
          />
        </div>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Observation, evidence, follow-up…"
        />
        <div className="flex justify-end">
          <Button size="sm" disabled={!title.trim() || add.isPending} onClick={() => add.mutate()}>
            <Plus className="mr-1 h-4 w-4" /> Add note
          </Button>
        </div>
      </div>

      {q.isLoading ? (
        <SkeletonTable />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState title="No notes yet" />
      ) : (
        <div className="space-y-2">
          {(q.data ?? []).map((n) => (
            <div key={n.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="outline" className="mr-2">
                    {n.kind}
                  </Badge>
                  <span className="font-medium">{n.title}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => del.mutate(n.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {n.body && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{n.body}</p>
              )}
              <div className="mt-1 text-xs text-muted-foreground">
                {safeFormatDate(n.created_at, "d MMM yyyy, HH:mm")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentsTab({ employeeId }: { employeeId: string }) {
  const q = useQuery({
    queryKey: ["wf", "emp_docs", employeeId],
    queryFn: () => listEmployeeDocuments(employeeId),
  });
  if (q.isLoading) return <SkeletonTable />;
  if ((q.data ?? []).length === 0)
    return (
      <EmptyState title="No documents yet" message="Upload via the shared Documents module." />
    );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Uploaded</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(q.data ?? []).map((d) => (
          <TableRow key={d.id}>
            <TableCell>{d.doc_type}</TableCell>
            <TableCell>{d.title ?? "—"}</TableCell>
            <TableCell className="text-xs">{safeFormatDate(d.created_at, "d MMM yyyy")}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
