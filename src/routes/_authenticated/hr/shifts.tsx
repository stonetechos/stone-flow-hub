/**
 * Shift master — the rules the attendance engine applies when reducing punches
 * into a daily status (grace, half-day, overtime, weekly offs).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { listShifts, upsertShift, deleteShift } from "@/lib/hr/api";
import { SHIFT_TYPES, type ShiftType } from "@/lib/hr/types";
import { toUserMessage } from "@/lib/errors";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/hr/shifts")({
  head: () => ({
    meta: [
      { title: "Shifts — Human Resources" },
      { name: "description", content: "Shift timings, grace periods and overtime rules." },
    ],
  }),
  component: ShiftsPage,
});

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Draft {
  name: string;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  grace_minutes: string;
  full_day_hours: string;
  half_day_hours: string;
  weekly_offs: number[];
  overtime_enabled: boolean;
}

const EMPTY: Draft = {
  name: "",
  shift_type: "general",
  start_time: "09:00",
  end_time: "18:00",
  grace_minutes: "10",
  full_day_hours: "8",
  half_day_hours: "4",
  weekly_offs: [0],
  overtime_enabled: false,
};

function ShiftsPage() {
  const qc = useQueryClient();
  const roles = useRoles();
  const canWrite = roles.hasAnyRole(["admin", "hr"]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const shifts = useQuery({ queryKey: ["hr", "shifts"], queryFn: listShifts });

  const add = useMutation({
    mutationFn: () =>
      upsertShift({
        name: draft.name,
        shift_type: draft.shift_type,
        start_time: draft.start_time ? `${draft.start_time}:00` : null,
        end_time: draft.end_time ? `${draft.end_time}:00` : null,
        grace_minutes: Number(draft.grace_minutes || 0),
        full_day_hours: Number(draft.full_day_hours || 8),
        half_day_hours: Number(draft.half_day_hours || 4),
        weekly_offs: draft.weekly_offs,
        overtime_enabled: draft.overtime_enabled,
        is_active: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "shifts"] });
      setDraft(EMPTY);
      toast.success("Shift saved");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteShift(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "shifts"] });
      setPendingDelete(null);
      toast.success("Shift removed");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  function toggleDay(day: number) {
    setDraft((d) => ({
      ...d,
      weekly_offs: d.weekly_offs.includes(day)
        ? d.weekly_offs.filter((x) => x !== day)
        : [...d.weekly_offs, day].sort(),
    }));
  }

  return (
    <>
      <PageHeader
        title="Shifts"
        subtitle="Timings, grace periods, half-day thresholds and overtime rules."
        eyebrow="Human Resources"
      />

      <div className="min-w-0 overflow-x-auto">
        {shifts.isLoading ? (
          <SkeletonTable />
        ) : shifts.isError ? (
          <ErrorBlock message={toUserMessage(shifts.error)} />
        ) : (shifts.data ?? []).length === 0 ? (
          <EmptyState
            title="No shifts defined"
            message="Create at least one shift so attendance can be evaluated against a schedule."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shift</TableHead>
                <TableHead>Timing</TableHead>
                <TableHead>Grace</TableHead>
                <TableHead>Full / half day</TableHead>
                <TableHead>Weekly off</TableHead>
                <TableHead>Overtime</TableHead>
                {canWrite && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(shifts.data ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs capitalize text-muted-foreground">
                      {s.shift_type.replace("_", " ")}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {s.start_time ? `${s.start_time.slice(0, 5)} – ${s.end_time?.slice(0, 5)}` : "Flexible"}
                  </TableCell>
                  <TableCell>{s.grace_minutes} min</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {Number(s.full_day_hours)}h / {Number(s.half_day_hours)}h
                  </TableCell>
                  <TableCell className="text-xs">
                    {(s.weekly_offs ?? []).map((d) => DAYS[d]).join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.overtime_enabled ? "default" : "outline"}>
                      {s.overtime_enabled ? `After ${s.overtime_after_minutes}m` : "Off"}
                    </Badge>
                  </TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setPendingDelete(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {canWrite && (
        <div className="mt-6 rounded-md border p-4">
          <h4 className="mb-3 text-sm font-semibold">Add shift</h4>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
            <Input
              placeholder="Name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <Select
              value={draft.shift_type}
              onValueChange={(v) => setDraft({ ...draft, shift_type: v as ShiftType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHIFT_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="time"
              value={draft.start_time}
              onChange={(e) => setDraft({ ...draft, start_time: e.target.value })}
            />
            <Input
              type="time"
              value={draft.end_time}
              onChange={(e) => setDraft({ ...draft, end_time: e.target.value })}
            />
            <Input
              placeholder="Grace (min)"
              value={draft.grace_minutes}
              onChange={(e) => setDraft({ ...draft, grace_minutes: e.target.value })}
            />
            <Input
              placeholder="Full day hours"
              value={draft.full_day_hours}
              onChange={(e) => setDraft({ ...draft, full_day_hours: e.target.value })}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-muted-foreground">Weekly off</span>
              {DAYS.map((d, i) => (
                <label key={d} className="flex items-center gap-1.5 text-xs">
                  <Checkbox
                    checked={draft.weekly_offs.includes(i)}
                    onCheckedChange={() => toggleDay(i)}
                  />
                  {d}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-xs">
              <Checkbox
                checked={draft.overtime_enabled}
                onCheckedChange={(c) => setDraft({ ...draft, overtime_enabled: c === true })}
              />
              Track overtime
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={() => add.mutate()} disabled={!draft.name || add.isPending}>
              <Plus className="mr-1 h-4 w-4" /> Save shift
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Remove this shift?"
        description="Employees assigned to it will need a new shift before their attendance can be evaluated."
        tone="danger"
        confirmLabel="Remove"
        busy={del.isPending}
        onConfirm={() => pendingDelete && del.mutate(pendingDelete)}
      />
    </>
  );
}
