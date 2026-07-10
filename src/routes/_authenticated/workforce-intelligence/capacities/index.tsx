/**
 * Workload capacity master — ideal / max / overload per role & metric.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  listCapacities,
  listDesignations,
  upsertCapacity,
  deleteCapacity,
} from "@/lib/workforce/api";
import type { CapacityInput } from "@/lib/workforce/schema";
import { toUserMessage } from "@/lib/errors";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/workforce-intelligence/capacities/")({
  head: () => ({ meta: [{ title: "Workload Capacity" }] }),
  component: CapacitiesPage,
});

function CapacitiesPage() {
  const qc = useQueryClient();
  const roles = useRoles();
  const canWrite = roles.isAdmin || roles.isSalesManager;

  const caps = useQuery({ queryKey: ["wf", "capacities"], queryFn: () => listCapacities() });
  const designations = useQuery({ queryKey: ["wf", "designations"], queryFn: listDesignations });
  const desigMap = new Map((designations.data ?? []).map((d) => [d.id, d.name]));

  const [form, setForm] = useState<CapacityInput>({
    designation_id: "",
    metric_key: "",
    metric_label: "",
    ideal_capacity: 0,
    maximum_capacity: 0,
    overload_threshold: 0,
    period: "daily",
    notes: "",
  });

  const add = useMutation({
    mutationFn: () => upsertCapacity(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wf", "capacities"] });
      setForm({ ...form, metric_key: "", metric_label: "", ideal_capacity: 0, maximum_capacity: 0, overload_threshold: 0 });
      toast.success("Capacity saved");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteCapacity(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wf", "capacities"] }),
  });

  return (
    <>
      <PageHeader
        title="Workload Capacity"
        subtitle="Ideal / Maximum / Overload thresholds per role & metric."
        eyebrow="Workforce Intelligence"
      />
      {caps.isLoading ? (
        <SkeletonTable />
      ) : caps.isError ? (
        <ErrorBlock message={toUserMessage(caps.error)} />
      ) : (caps.data ?? []).length === 0 ? (
        <EmptyState title="No capacities defined" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Metric</TableHead>
              <TableHead>Ideal</TableHead>
              <TableHead>Max</TableHead>
              <TableHead>Overload</TableHead>
              <TableHead>Period</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(caps.data ?? []).map((c) => (
              <TableRow key={c.id}>
                <TableCell>{desigMap.get(c.designation_id) ?? "—"}</TableCell>
                <TableCell>
                  <div className="font-medium">{c.metric_label}</div>
                  <div className="font-mono text-xs text-muted-foreground">{c.metric_key}</div>
                </TableCell>
                <TableCell>{Number(c.ideal_capacity)}</TableCell>
                <TableCell>{Number(c.maximum_capacity)}</TableCell>
                <TableCell>{Number(c.overload_threshold)}</TableCell>
                <TableCell>{c.period}</TableCell>
                <TableCell className="text-right">
                  {canWrite && (
                    <Button size="sm" variant="ghost" onClick={() => del.mutate(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {canWrite && (
        <div className="mt-6 rounded-md border p-4">
          <h4 className="mb-3 text-sm font-semibold">Add capacity</h4>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
            <Select value={form.designation_id} onValueChange={(v) => setForm({ ...form, designation_id: v })}>
              <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                {(designations.data ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="metric_key" value={form.metric_key} onChange={(e) => setForm({ ...form, metric_key: e.target.value })} />
            <Input placeholder="Label" value={form.metric_label} onChange={(e) => setForm({ ...form, metric_label: e.target.value })} />
            <Input type="number" placeholder="Ideal" value={form.ideal_capacity} onChange={(e) => setForm({ ...form, ideal_capacity: Number(e.target.value) })} />
            <Input type="number" placeholder="Max" value={form.maximum_capacity} onChange={(e) => setForm({ ...form, maximum_capacity: Number(e.target.value) })} />
            <Input type="number" placeholder="Overload" value={form.overload_threshold} onChange={(e) => setForm({ ...form, overload_threshold: Number(e.target.value) })} />
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={() => add.mutate()} disabled={!form.designation_id || !form.metric_key || add.isPending}>
              <Plus className="mr-1 h-4 w-4" /> Save
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
