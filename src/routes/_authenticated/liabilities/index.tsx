import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Target } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, SkeletonTable, EmptyState } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field } from "@/components/forms/Field";
import { CurrencyInput } from "@/components/forms/inputs/SmartInputs";
import { RowActions } from "@/components/data/RowActions";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toUserMessage } from "@/lib/errors";
import { formatInr } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import {
  createLiability,
  deleteLiability,
  listLiabilities,
  updateLiability,
  type LiabilityRow,
} from "@/lib/liabilities/api";
import type { LiabilityInput } from "@/lib/liabilities/schema";
import {
  DEFAULT_ANNUAL_NET_MARGIN_GOAL,
  getAnnualNetMarginGoal,
  setAnnualNetMarginGoal,
} from "@/lib/finance/annualGoal";
import { useRoles } from "@/hooks/use-roles";

/**
 * Liabilities (Task #44) — Rishi: "The business liabilities are also
 * there. Make a section in the sidebar which opens a page in which we can
 * add liabilities. It should have sections like Xth day of every month."
 * Also carries the ₹50L annual net-margin goal card at the top, per the
 * same message — the two ideas arrived together and share this page
 * rather than getting a separate settings screen.
 *
 * growthAdvisory.ts (Task #46) reads both listLiabilities() and
 * getAnnualNetMarginGoal() to fold into the margin/pricing/sales-target
 * analysis.
 */
export const Route = createFileRoute("/_authenticated/liabilities/")({
  ssr: false,
  component: LiabilitiesPage,
});

const EMPTY: LiabilityInput = {
  name: "",
  amount: 0,
  due_day_of_month: null,
  is_recurring: true,
  is_active: true,
  notes: "",
  sort_order: 100,
};

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function LiabilitiesPage() {
  const qc = useQueryClient();
  const roles = useRoles();

  const query = useQuery({
    queryKey: qk.liabilities.list(),
    queryFn: () => listLiabilities(false),
  });
  const goalQuery = useQuery({
    queryKey: qk.annualGoal.current(),
    queryFn: getAnnualNetMarginGoal,
  });

  const [editing, setEditing] = useState<LiabilityRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<LiabilityInput>(EMPTY);
  const [toDelete, setToDelete] = useState<LiabilityRow | null>(null);
  const [goalDraft, setGoalDraft] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: qk.liabilities.list() });

  const createMut = useMutation({
    mutationFn: (input: LiabilityInput) => createLiability(input),
    onSuccess: () => {
      toast.success("Liability added");
      invalidate();
      setCreating(false);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const updateMut = useMutation({
    mutationFn: (vars: { id: string; input: LiabilityInput }) =>
      updateLiability(vars.id, vars.input),
    onSuccess: () => {
      toast.success("Liability updated");
      invalidate();
      setEditing(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteLiability(id),
    onSuccess: () => {
      toast.success("Liability deleted");
      invalidate();
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const goalMut = useMutation({
    mutationFn: (amount: number) => setAnnualNetMarginGoal({ amount }),
    onSuccess: () => {
      toast.success("Annual goal updated");
      qc.invalidateQueries({ queryKey: qk.annualGoal.current() });
      setGoalDraft(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const openCreate = () => {
    setForm(EMPTY);
    setCreating(true);
  };
  const openEdit = (row: LiabilityRow) => {
    setForm({
      name: row.name,
      amount: row.amount,
      due_day_of_month: row.due_day_of_month,
      is_recurring: row.is_recurring,
      is_active: row.is_active,
      notes: row.notes ?? "",
      sort_order: row.sort_order,
    });
    setEditing(row);
  };

  const rows = useMemo(() => query.data ?? [], [query.data]);
  const dialogOpen = creating || !!editing;

  const sections = useMemo(() => {
    const byDay = new Map<number | null, LiabilityRow[]>();
    for (const r of rows) {
      const key = r.due_day_of_month;
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(r);
    }
    const dayKeys = [...byDay.keys()].filter((k): k is number => k !== null).sort((a, b) => a - b);
    const out: { title: string; rows: LiabilityRow[] }[] = dayKeys.map((d) => ({
      title: `Due on the ${ordinal(d)} of every month`,
      rows: byDay.get(d)!,
    }));
    if (byDay.has(null)) out.push({ title: "No fixed date", rows: byDay.get(null)! });
    return out;
  }, [rows]);

  const totalActive = rows.filter((r) => r.is_active).reduce((s, r) => s + r.amount, 0);
  const goalAmount = goalQuery.data?.amount ?? DEFAULT_ANNUAL_NET_MARGIN_GOAL;

  return (
    <div>
      <PageHeader
        title="Liabilities"
        subtitle="Business debts and recurring obligations, and the annual net-margin goal used to size the Growth Advisory."
        actions={
          roles.canWrite ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add liability
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Annual net-margin goal</div>
            {goalQuery.isLoading ? (
              <div className="text-lg font-semibold text-muted-foreground">Loading…</div>
            ) : (
              <div className="font-display text-xl font-semibold text-foreground">
                {formatInr(goalAmount)}
              </div>
            )}
          </div>
        </div>
        {roles.isAdmin ? (
          goalDraft === null ? (
            <Button variant="outline" size="sm" onClick={() => setGoalDraft(String(goalAmount))}>
              Edit goal
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <CurrencyInput className="w-40" value={goalDraft} onChange={setGoalDraft} min={0} />
              <Button
                size="sm"
                disabled={goalMut.isPending}
                onClick={() => goalMut.mutate(Number(goalDraft || 0))}
              >
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setGoalDraft(null)}>
                Cancel
              </Button>
            </div>
          )
        ) : (
          <span className="text-xs text-muted-foreground">Only admins can change this goal.</span>
        )}
      </Card>

      {query.isLoading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No liabilities yet"
          message="Add a business debt or recurring obligation to track it here."
          action={
            roles.canWrite ? (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add liability
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {sections.map((section) => {
            const sectionTotal = section.rows.reduce((s, r) => s + r.amount, 0);
            return (
              <div key={section.title}>
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="font-display text-sm font-semibold text-foreground">
                    {section.title}
                  </h3>
                  <span className="text-sm text-muted-foreground">{formatInr(sectionTotal)}</span>
                </div>
                <div className="overflow-x-auto rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Recurring</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {section.rows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell>{formatInr(r.amount)}</TableCell>
                          <TableCell className="text-sm">{r.is_recurring ? "Yes" : "No"}</TableCell>
                          <TableCell className="text-sm">{r.is_active ? "Yes" : "No"}</TableCell>
                          <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                            {r.notes ?? "—"}
                          </TableCell>
                          <TableCell>
                            <RowActions
                              onEdit={() => openEdit(r)}
                              onDelete={() => setToDelete(r)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
          <div className="flex justify-end text-sm font-semibold">
            Total active liabilities: {formatInr(totalActive)}
          </div>
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit liability" : "Add liability"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editing) updateMut.mutate({ id: editing.id, input: form });
              else createMut.mutate(form);
            }}
          >
            <DialogBody className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" required className="sm:col-span-2">
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Equipment loan EMI"
                  required
                />
              </Field>
              <Field label="Amount" required>
                <CurrencyInput
                  value={String(form.amount ?? "")}
                  onChange={(v) => setForm((f) => ({ ...f, amount: Number(v || 0) }))}
                />
              </Field>
              <Field label="Due day of month" hint="Leave blank if there's no fixed monthly date">
                <Select
                  value={form.due_day_of_month ? String(form.due_day_of_month) : "none"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, due_day_of_month: v === "none" ? null : Number(v) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No fixed date</SelectItem>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {ordinal(d)} of every month
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Recurring">
                <div className="flex h-9 items-center">
                  <Switch
                    checked={form.is_recurring ?? true}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_recurring: v }))}
                  />
                </div>
              </Field>
              <Field label="Active">
                <div className="flex h-9 items-center">
                  <Switch
                    checked={form.is_active ?? true}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                  />
                </div>
              </Field>
              <Field label="Notes" className="sm:col-span-2">
                <Textarea
                  rows={2}
                  value={form.notes ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCreating(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this liability?"
        description={toDelete ? `${toDelete.name} will be removed.` : ""}
        busy={delMut.isPending}
        onConfirm={() => toDelete && delMut.mutate(toDelete.id)}
      />
    </div>
  );
}
