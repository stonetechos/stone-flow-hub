import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, SkeletonTable, EmptyState } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
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
  createBusinessExpense,
  deleteBusinessExpense,
  listBusinessExpenses,
  updateBusinessExpense,
  type BusinessExpenseRow,
} from "@/lib/business-expenses/api";
import type { BusinessExpenseInput } from "@/lib/business-expenses/schema";
import { useRoles } from "@/hooks/use-roles";

/**
 * Business Expenses (Task #45) — Rishi: "There should be Business Expense
 * Column too, in which the current date is already available, the date
 * can also be scrolled if we want to make a few days old entry today, but
 * by default it should have the current date set. It should have blank
 * boxes to enter. Such as stationary, tea, maid, donation... and in the
 * next box the amount has to be entered."
 *
 * The quick-entry row at the top is the primary interaction — date
 * defaults to today (native <input type="date">, freely scrollable/
 * editable), description is free text, amount uses the new ₹-prefixed
 * CurrencyInput (Task #43). Full edit (incl. notes) is via the row's edit
 * dialog, same pattern as every other list page in this app.
 */
export const Route = createFileRoute("/_authenticated/business-expenses/")({
  ssr: false,
  component: BusinessExpensesPage,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_EDIT: BusinessExpenseInput = {
  expense_date: today(),
  description: "",
  amount: 0,
  notes: "",
};

function BusinessExpensesPage() {
  const qc = useQueryClient();
  const roles = useRoles();

  const query = useQuery({
    queryKey: qk.businessExpenses.list(),
    queryFn: () => listBusinessExpenses(),
  });

  const [quickDate, setQuickDate] = useState(today());
  const [quickDesc, setQuickDesc] = useState("");
  const [quickAmount, setQuickAmount] = useState<string>("");

  const [editing, setEditing] = useState<BusinessExpenseRow | null>(null);
  const [form, setForm] = useState<BusinessExpenseInput>(EMPTY_EDIT);
  const [toDelete, setToDelete] = useState<BusinessExpenseRow | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: qk.businessExpenses.list() });

  const createMut = useMutation({
    mutationFn: (input: BusinessExpenseInput) => createBusinessExpense(input),
    onSuccess: () => {
      toast.success("Expense recorded");
      invalidate();
      setQuickDesc("");
      setQuickAmount("");
      // Keep quickDate as-is so multiple same-day entries stay fast.
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const updateMut = useMutation({
    mutationFn: (vars: { id: string; input: BusinessExpenseInput }) =>
      updateBusinessExpense(vars.id, vars.input),
    onSuccess: () => {
      toast.success("Expense updated");
      invalidate();
      setEditing(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteBusinessExpense(id),
    onSuccess: () => {
      toast.success("Expense deleted");
      invalidate();
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const openEdit = (row: BusinessExpenseRow) => {
    setForm({
      expense_date: row.expense_date,
      description: row.description,
      amount: row.amount,
      notes: row.notes ?? "",
    });
    setEditing(row);
  };

  const rows = useMemo(() => query.data ?? [], [query.data]);
  const total = useMemo(() => rows.reduce((s, r) => s + r.amount, 0), [rows]);

  return (
    <div>
      <PageHeader
        title="Business Expenses"
        subtitle="Day-to-day office spend — stationery, tea, maid, donations, and the like."
      />

      {roles.canWrite && (
        <Card className="mb-6 p-4">
          <form
            className="grid gap-3 sm:grid-cols-[160px_1fr_180px_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (!quickDesc.trim()) {
                toast.error("Description is required");
                return;
              }
              createMut.mutate({
                expense_date: quickDate,
                description: quickDesc.trim(),
                amount: Number(quickAmount || 0),
              });
            }}
          >
            <Field label="Date" required>
              <Input type="date" value={quickDate} onChange={(e) => setQuickDate(e.target.value)} />
            </Field>
            <Field label="Description" required>
              <Input
                value={quickDesc}
                onChange={(e) => setQuickDesc(e.target.value)}
                placeholder="e.g. Stationery, Tea, Maid, Donation…"
              />
            </Field>
            <Field label="Amount" required>
              <CurrencyInput value={quickAmount} onChange={setQuickAmount} />
            </Field>
            <Button type="submit" disabled={createMut.isPending}>
              <Plus className="mr-2 h-4 w-4" /> Add
            </Button>
          </form>
        </Card>
      )}

      {query.isLoading ? (
        <SkeletonTable rows={5} columns={4} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No expenses recorded yet"
          message="Use the form above to log your first business expense."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.expense_date}</TableCell>
                    <TableCell className="font-medium">{r.description}</TableCell>
                    <TableCell>{formatInr(r.amount)}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {r.notes ?? "—"}
                    </TableCell>
                    <TableCell>
                      <RowActions onEdit={() => openEdit(r)} onDelete={() => setToDelete(r)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-2 flex justify-end text-sm font-semibold">
            Total: {formatInr(total)}
          </div>
        </>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit expense</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editing) updateMut.mutate({ id: editing.id, input: form });
            }}
          >
            <DialogBody className="grid gap-3">
              <Field label="Date" required>
                <Input
                  type="date"
                  value={form.expense_date}
                  onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Description" required>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Amount" required>
                <CurrencyInput
                  value={String(form.amount ?? "")}
                  onChange={(v) => setForm((f) => ({ ...f, amount: Number(v || 0) }))}
                />
              </Field>
              <Field label="Notes">
                <Textarea
                  rows={2}
                  value={form.notes ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMut.isPending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this expense?"
        description={
          toDelete ? `${toDelete.description} (${formatInr(toDelete.amount)}) will be removed.` : ""
        }
        busy={delMut.isPending}
        onConfirm={() => toDelete && delMut.mutate(toDelete.id)}
      />
    </div>
  );
}
