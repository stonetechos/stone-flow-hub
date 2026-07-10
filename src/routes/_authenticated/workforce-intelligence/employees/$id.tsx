/**
 * Employee profile — Overview, KRAs, Tasks, Performance, Owner Notes,
 * Documents, and placeholder future tabs (Attendance / Leave / Payroll /
 * Training / Promotions).
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
} from "@/lib/workforce/api";
import { computeEmployeeScore } from "@/lib/workforce/scoring";
import { GRADE_LABELS, OWNER_NOTE_KINDS, type OwnerNoteKind } from "@/lib/workforce/types";
import { toUserMessage } from "@/lib/errors";
import { useRoles, Can } from "@/hooks/use-roles";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/workforce-intelligence/employees/$id")({
  head: () => ({ meta: [{ title: "Employee — Workforce Intelligence" }] }),
  component: EmployeeProfile,
});

function EmployeeProfile() {
  const { id } = Route.useParams();
  const roles = useRoles();
  const isOwner = roles.isAdmin || roles.isSalesManager;

  const emp = useQuery({ queryKey: ["wf", "employees", id], queryFn: () => getEmployee(id) });
  const designations = useQuery({ queryKey: ["wf", "designations"], queryFn: listDesignations });
  const designation = emp.data?.designation_id
    ? (designations.data ?? []).find((d) => d.id === emp.data!.designation_id)
    : undefined;

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

  if (emp.isLoading) return <SkeletonTable />;
  if (emp.isError) return <ErrorBlock message={toUserMessage(emp.error)} />;
  if (!emp.data) return <EmptyState title="Employee not found" />;

  const e = emp.data;

  return (
    <>
      <PageHeader
        title={e.full_name}
        subtitle={`${e.employee_code} • ${designation?.name ?? "No designation"}`}
        eyebrow="Workforce Intelligence"
        actions={
          <Can anyRole={["admin", "sales_manager"]}>
            <Button asChild size="sm" variant="outline">
              <Link to="/workforce-intelligence/employees/new" search={{ id }}>
                <Pencil className="mr-1 h-4 w-4" /> Edit
              </Link>
            </Button>
          </Can>
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
          <TabsTrigger value="attendance" disabled>Attendance</TabsTrigger>
          <TabsTrigger value="leave" disabled>Leave</TabsTrigger>
          <TabsTrigger value="payroll" disabled>Payroll</TabsTrigger>
          <TabsTrigger value="training" disabled>Training</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoRow label="Employment type" value={e.employment_type} />
            <InfoRow label="Status" value={<Badge>{e.employment_status}</Badge>} />
            <InfoRow label="Joining date" value={e.joining_date ?? "—"} />
            <InfoRow label="Phone" value={e.phone ?? "—"} />
            <InfoRow label="Email" value={e.email ?? "—"} />
            <InfoRow label="Department" value={e.department ?? "—"} />
            <InfoRow label="Address" value={e.address ?? "—"} />
            <InfoRow label="Emergency contact" value={e.emergency_contact ?? "—"} />
            <InfoRow label="Skills" value={(e.skills ?? []).join(", ") || "—"} />
            {isOwner && (
              <>
                <InfoRow label="Aadhaar" value={e.aadhaar ?? "—"} />
                <InfoRow label="PAN" value={e.pan ?? "—"} />
                <InfoRow label="Salary CTC" value={e.salary_ctc != null ? `₹${e.salary_ctc}` : "—"} />
              </>
            )}
          </div>
          {e.remarks && (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Remarks</div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{e.remarks}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="kras" className="mt-4">
          {kras.isLoading ? (
            <SkeletonTable />
          ) : (kras.data ?? []).length === 0 ? (
            <EmptyState title="No KRAs configured" message="Configure KRAs against the role master." />
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
                    <TableCell><Badge variant="outline">{t.priority}</Badge></TableCell>
                    <TableCell className="text-xs">{t.due_at ? format(new Date(t.due_at), "d MMM") : "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{t.status}</Badge></TableCell>
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
            <EmptyState title="Performance not yet computed" message="Assign a designation with KRAs to enable scoring." />
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-semibold">{score.data.overall_pct}%</div>
                <div>
                  <Badge variant="secondary">Grade: {GRADE_LABELS[score.data.grade]}</Badge>
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
                  {score.data.kras.map((k) => (
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
                  {snapshots.data!.length} historical snapshot{snapshots.data!.length === 1 ? "" : "s"}.
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
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {OWNER_NOTE_KINDS.map((k) => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short title" className="md:col-span-3" />
        </div>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Observation, evidence, follow-up…" />
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
                  <Badge variant="outline" className="mr-2">{n.kind}</Badge>
                  <span className="font-medium">{n.title}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => del.mutate(n.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {n.body && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{n.body}</p>}
              <div className="mt-1 text-xs text-muted-foreground">
                {format(new Date(n.created_at), "d MMM yyyy, HH:mm")}
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
    return <EmptyState title="No documents yet" message="Upload via the shared Documents module." />;
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
            <TableCell className="text-xs">{format(new Date(d.created_at), "d MMM yyyy")}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
