/**
 * Roles master — designation list with quick edit and KRA count.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listDesignations, listKras, createDesignation } from "@/lib/workforce/api";
import type { DesignationInput } from "@/lib/workforce/schema";
import { toUserMessage } from "@/lib/errors";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/workforce-intelligence/roles/")({
  head: () => ({ meta: [{ title: "Roles & KRAs — Workforce Intelligence" }] }),
  component: RolesPage,
});

function RolesPage() {
  const qc = useQueryClient();
  const roles = useRoles();
  const canWrite = roles.isAdmin || roles.isSalesManager;
  const designations = useQuery({ queryKey: ["wf", "designations"], queryFn: listDesignations });
  const kras = useQuery({ queryKey: ["wf", "kras", "all"], queryFn: () => listKras() });
  const kraCount = new Map<string, number>();
  for (const k of kras.data ?? [])
    kraCount.set(k.designation_id, (kraCount.get(k.designation_id) ?? 0) + 1);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DesignationInput>({
    code: "",
    name: "",
    purpose: "",
    responsibilities: "",
    expected_outcomes: "",
    level: 0,
    active: true,
  });

  const add = useMutation({
    mutationFn: () => createDesignation(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wf", "designations"] });
      setOpen(false);
      setForm({
        code: "",
        name: "",
        purpose: "",
        responsibilities: "",
        expected_outcomes: "",
        level: 0,
        active: true,
      });
      toast.success("Designation added");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <>
      <PageHeader
        title="Roles & KRAs"
        subtitle="Every role stores its purpose, responsibilities and KRAs."
        eyebrow="Workforce Intelligence"
        actions={
          canWrite && (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> New role
            </Button>
          )
        }
      />
      {designations.isLoading ? (
        <SkeletonTable />
      ) : designations.isError ? (
        <ErrorBlock message={toUserMessage(designations.error)} />
      ) : (designations.data ?? []).length === 0 ? (
        <EmptyState title="No designations" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>KRAs</TableHead>
              <TableHead>Purpose</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(designations.data ?? []).map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-xs">{d.code}</TableCell>
                <TableCell>
                  <Link
                    to="/workforce-intelligence/roles/$id"
                    params={{ id: d.id }}
                    className="font-medium hover:underline"
                  >
                    {d.name}
                  </Link>
                </TableCell>
                <TableCell>{d.level}</TableCell>
                <TableCell>{kraCount.get(d.id) ?? 0}</TableCell>
                <TableCell className="max-w-md truncate text-muted-foreground">
                  {d.purpose}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New designation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Code (e.g. OPS_COORD)"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
            <Input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Level (higher = senior)"
              value={form.level}
              onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
            />
            <Textarea
              placeholder="Purpose"
              value={form.purpose ?? ""}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            />
            <Textarea
              placeholder="Responsibilities"
              value={form.responsibilities ?? ""}
              onChange={(e) => setForm({ ...form, responsibilities: e.target.value })}
            />
            <Textarea
              placeholder="Expected outcomes"
              value={form.expected_outcomes ?? ""}
              onChange={(e) => setForm({ ...form, expected_outcomes: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!form.code || !form.name || add.isPending}
              onClick={() => add.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
