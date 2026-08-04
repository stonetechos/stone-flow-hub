/**
 * Holiday calendar — drives the "holiday" attendance status and leave
 * conflict checks.
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
import { listHolidays, upsertHoliday, deleteHoliday, listBranches } from "@/lib/hr/api";
import { toUserMessage } from "@/lib/errors";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/hr/holidays")({
  head: () => ({
    meta: [
      { title: "Holidays — Human Resources" },
      { name: "description", content: "Company holiday calendar by year and office." },
    ],
  }),
  component: HolidaysPage,
});

function HolidaysPage() {
  const qc = useQueryClient();
  const roles = useRoles();
  const canWrite = roles.hasAnyRole(["admin", "hr"]);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [branchId, setBranchId] = useState<string>("all");
  const [optional, setOptional] = useState(false);

  const holidays = useQuery({
    queryKey: ["hr", "holidays", year],
    queryFn: () => listHolidays(year),
  });
  const branches = useQuery({ queryKey: ["hr", "branches"], queryFn: listBranches });
  const branchName = new Map((branches.data ?? []).map((b) => [b.id, b.name]));

  const add = useMutation({
    mutationFn: () =>
      upsertHoliday({
        name,
        holiday_date: date,
        branch_id: branchId === "all" ? null : branchId,
        is_optional: optional,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "holidays"] });
      setName("");
      setDate("");
      setOptional(false);
      toast.success("Holiday added");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteHoliday(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "holidays"] }),
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <>
      <PageHeader
        title="Holidays"
        subtitle="Company holiday calendar, optionally scoped to an office."
        eyebrow="Human Resources"
      />

      <div className="mb-4 flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Year</label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="min-w-0 overflow-x-auto">
        {holidays.isLoading ? (
          <SkeletonTable />
        ) : holidays.isError ? (
          <ErrorBlock message={toUserMessage(holidays.error)} />
        ) : (holidays.data ?? []).length === 0 ? (
          <EmptyState title={`No holidays for ${year}`} message="Add the company calendar below." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Holiday</TableHead>
                <TableHead>Office</TableHead>
                <TableHead>Type</TableHead>
                {canWrite && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(holidays.data ?? []).map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {h.holiday_date}
                  </TableCell>
                  <TableCell className="font-medium">{h.name}</TableCell>
                  <TableCell>{h.branch_id ? (branchName.get(h.branch_id) ?? "—") : "All"}</TableCell>
                  <TableCell>
                    <Badge variant={h.is_optional ? "outline" : "default"}>
                      {h.is_optional ? "Optional" : "Company"}
                    </Badge>
                  </TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={del.isPending}
                        onClick={() => del.mutate(h.id)}
                      >
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
          <h4 className="mb-3 text-sm font-semibold">Add holiday</h4>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All offices</SelectItem>
                {(branches.data ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={optional} onCheckedChange={(c) => setOptional(c === true)} />
              Optional holiday
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              onClick={() => add.mutate()}
              disabled={!name || !date || add.isPending}
            >
              <Plus className="mr-1 h-4 w-4" /> Add holiday
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
