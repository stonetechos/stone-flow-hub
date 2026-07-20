/**
 * Role detail — designation overview + inline KRA editor.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, SkeletonTable, ErrorBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
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
  getDesignation,
  updateDesignation,
  listKras,
  createKra,
  deleteKra,
} from "@/lib/workforce/api";
import type { KraInput, DesignationInput } from "@/lib/workforce/schema";
import { toUserMessage } from "@/lib/errors";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/workforce-intelligence/roles/$id")({
  head: () => ({ meta: [{ title: "Role — Workforce Intelligence" }] }),
  component: RoleDetail,
});

function RoleDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const roles = useRoles();
  const canWrite = roles.isAdmin || roles.isSalesManager;

  const d = useQuery({ queryKey: ["wf", "designations", id], queryFn: () => getDesignation(id) });
  const kras = useQuery({ queryKey: ["wf", "kras", id], queryFn: () => listKras(id) });

  const [edit, setEdit] = useState<DesignationInput | null>(null);
  const [newKra, setNewKra] = useState<KraInput>({
    designation_id: id,
    name: "",
    description: "",
    weightage: 10,
    target_value: 0,
    target_period: "monthly",
    metric_source: "",
    active: true,
    sort_order: 0,
  });

  const saveRole = useMutation({
    mutationFn: () => updateDesignation(id, edit!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wf", "designations"] });
      setEdit(null);
      toast.success("Role updated");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const addKra = useMutation({
    mutationFn: () => createKra(newKra),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wf", "kras"] });
      setNewKra({ ...newKra, name: "", target_value: 0, weightage: 10, metric_source: "" });
      toast.success("KRA added");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const delKra = useMutation({
    mutationFn: (kid: string) => deleteKra(kid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wf", "kras"] }),
  });

  if (d.isLoading) return <SkeletonTable />;
  if (d.isError) return <ErrorBlock message={toUserMessage(d.error)} />;
  if (!d.data) return <EmptyState title="Role not found" />;
  const role = d.data;

  return (
    <>
      <PageHeader
        title={role.name}
        subtitle={role.code}
        eyebrow="Role"
        actions={
          canWrite && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setEdit({
                  code: role.code,
                  name: role.name,
                  purpose: role.purpose ?? "",
                  responsibilities: role.responsibilities ?? "",
                  expected_outcomes: role.expected_outcomes ?? "",
                  level: role.level,
                  active: role.active,
                })
              }
            >
              Edit role
            </Button>
          )
        }
      />

      {edit ? (
        <div className="mb-6 space-y-3 rounded-md border p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              placeholder="Code"
              value={edit.code}
              onChange={(e) => setEdit({ ...edit, code: e.target.value })}
            />
            <Input
              placeholder="Name"
              value={edit.name}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Level"
              value={edit.level}
              onChange={(e) => setEdit({ ...edit, level: Number(e.target.value) })}
            />
          </div>
          <Textarea
            placeholder="Purpose"
            value={edit.purpose ?? ""}
            onChange={(e) => setEdit({ ...edit, purpose: e.target.value })}
          />
          <Textarea
            placeholder="Responsibilities"
            value={edit.responsibilities ?? ""}
            onChange={(e) => setEdit({ ...edit, responsibilities: e.target.value })}
          />
          <Textarea
            placeholder="Expected outcomes"
            value={edit.expected_outcomes ?? ""}
            onChange={(e) => setEdit({ ...edit, expected_outcomes: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button onClick={() => saveRole.mutate()} disabled={saveRole.isPending}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-6 space-y-3 text-sm">
          <Field label="Purpose">{role.purpose ?? "—"}</Field>
          <Field label="Responsibilities">{role.responsibilities ?? "—"}</Field>
          <Field label="Expected outcomes">{role.expected_outcomes ?? "—"}</Field>
        </div>
      )}

      <h3 className="mb-3 font-display text-sm font-semibold">KRAs</h3>
      {kras.isLoading ? (
        <SkeletonTable />
      ) : (kras.data ?? []).length === 0 ? (
        <EmptyState title="No KRAs yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Metric</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(kras.data ?? []).map((k) => (
              <TableRow key={k.id}>
                <TableCell className="font-medium">{k.name}</TableCell>
                <TableCell>{Number(k.weightage)}%</TableCell>
                <TableCell>{Number(k.target_value)}</TableCell>
                <TableCell>{k.target_period}</TableCell>
                <TableCell className="font-mono text-xs">{k.metric_source ?? "—"}</TableCell>
                <TableCell className="text-right">
                  {canWrite && (
                    <Button size="sm" variant="ghost" onClick={() => delKra.mutate(k.id)}>
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
          <h4 className="mb-3 text-sm font-semibold">Add KRA</h4>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
            <Input
              placeholder="Name"
              value={newKra.name}
              onChange={(e) => setNewKra({ ...newKra, name: e.target.value })}
              className="md:col-span-2"
            />
            <Input
              type="number"
              placeholder="Weight %"
              value={newKra.weightage}
              onChange={(e) => setNewKra({ ...newKra, weightage: Number(e.target.value) })}
            />
            <Input
              type="number"
              placeholder="Target"
              value={newKra.target_value}
              onChange={(e) => setNewKra({ ...newKra, target_value: Number(e.target.value) })}
            />
            <Select
              value={newKra.target_period}
              onValueChange={(v) =>
                setNewKra({ ...newKra, target_period: v as KraInput["target_period"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">daily</SelectItem>
                <SelectItem value="weekly">weekly</SelectItem>
                <SelectItem value="monthly">monthly</SelectItem>
                <SelectItem value="quarterly">quarterly</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="metric_source"
              value={newKra.metric_source ?? ""}
              onChange={(e) => setNewKra({ ...newKra, metric_source: e.target.value })}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              onClick={() => addKra.mutate()}
              disabled={!newKra.name || addKra.isPending}
            >
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 whitespace-pre-wrap">{children}</div>
    </div>
  );
}
