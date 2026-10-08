import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Target,
  Receipt,
  CreditCard,
  Calendar,
  CheckCircle2,
  History,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, SkeletonTable, EmptyState } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { formatInr, formatDate } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import {
  createLiability,
  deleteLiability,
  listLiabilities,
  updateLiability,
  listLiabilityPayments,
  recordLiabilityPayment,
  deleteLiabilityPayment,
  type LiabilityRow,
  type LiabilityPaymentRow,
} from "@/lib/liabilities/api";
import type { LiabilityInput, LiabilityPaymentInput } from "@/lib/liabilities/schema";
import {
  DEFAULT_ANNUAL_NET_MARGIN_GOAL,
  getAnnualNetMarginGoal,
  setAnnualNetMarginGoal,
} from "@/lib/finance/annualGoal";
import { useRoles } from "@/hooks/use-roles";
import { AccountingGuard } from "@/components/auth/AccountingGuard";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
    onSuccess: (created) => {
      toast.success("Liability added");
      invalidate();
      setCreating(false);

      import("@/lib/notifications/broadcast").then(({ dispatchStosEvent }) => {
        void dispatchStosEvent({
          tier: "important",
          title: "New Liability Account Added",
          body: `New obligation registered: ${created.name} (${formatInr(created.amount)}/month).`,
          entityType: "liability",
          linkPath: "/liabilities",
          targetRole: "all",
        });
      });
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

  const paymentsQuery = useQuery({
    queryKey: qk.liabilities.payments(),
    queryFn: () => listLiabilityPayments(),
  });

  const [activeTab, setActiveTab] = useState<"liabilities" | "payments">("liabilities");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<LiabilityPaymentRow | null>(null);
  const [paymentForm, setPaymentForm] = useState<LiabilityPaymentInput>({
    liability_id: "",
    payment_date: new Date().toISOString().slice(0, 10),
    amount: 0,
    payment_mode: "Bank Transfer",
    reference_no: "",
    month_for: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
    notes: "",
  });

  const invalidatePayments = () => qc.invalidateQueries({ queryKey: qk.liabilities.payments() });

  const recordPaymentMut = useMutation({
    mutationFn: (input: LiabilityPaymentInput) => recordLiabilityPayment(input),
    onSuccess: (res) => {
      toast.success("Liability payment recorded");
      invalidatePayments();
      setPaymentDialogOpen(false);

      const targetLiability = liabilityMap.get(res.liability_id);
      import("@/lib/notifications/broadcast").then(({ notifyLiabilityPaymentRecorded }) => {
        notifyLiabilityPaymentRecorded({
          liabilityName: targetLiability?.name ?? "Liability Account",
          amount: Number(res.amount),
          paymentMode: res.payment_mode,
          monthFor: res.month_for,
          paymentDate: res.payment_date,
        });
      });

      // Reset form
      setPaymentForm({
        liability_id: "",
        payment_date: new Date().toISOString().slice(0, 10),
        amount: 0,
        payment_mode: "Bank Transfer",
        reference_no: "",
        month_for: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
        notes: "",
      });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const deletePaymentMut = useMutation({
    mutationFn: (id: string) => deleteLiabilityPayment(id),
    onSuccess: () => {
      toast.success("Payment entry deleted");
      invalidatePayments();
      setPaymentToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const openRecordPaymentFor = (liabilityId?: string, defaultAmount?: number) => {
    setPaymentForm((prev) => ({
      ...prev,
      liability_id: liabilityId ?? rows[0]?.id ?? "",
      amount: defaultAmount ?? prev.amount,
      payment_date: new Date().toISOString().slice(0, 10),
      month_for: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
    }));
    setPaymentDialogOpen(true);
  };

  const rows = useMemo(() => query.data ?? [], [query.data]);
  const paymentRows = useMemo(() => paymentsQuery.data ?? [], [paymentsQuery.data]);
  const liabilityMap = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
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
  const totalPaid = paymentRows.reduce((s, p) => s + Number(p.amount || 0), 0);
  const goalAmount = goalQuery.data?.amount ?? DEFAULT_ANNUAL_NET_MARGIN_GOAL;

  return (
    <AccountingGuard moduleName="Liabilities & Debt Obligations">
      <div>
        <PageHeader
          title={t("liabilities.title", "Liabilities & Recurring Expenses")}
          subtitle="Rental liabilities, equipment loans, recurring monthly obligations, and payments registry."
          actions={
            roles.canWrite ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  onClick={() => openRecordPaymentFor()}
                  disabled={rows.length === 0}
                >
                  <Receipt className="mr-2 h-4 w-4 text-emerald-600" />
                  Record Payment
                </Button>
                <Button size="sm" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("liabilities.addLiability", "Add liability")}
                </Button>
              </div>
            ) : undefined
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-amber-500/10 p-2 text-amber-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-medium tracking-wider">
                Monthly Active Drain
              </div>
              <div className="font-display text-xl font-semibold text-foreground">
                {formatInr(totalActive)}
              </div>
            </div>
          </Card>

          <Card className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-medium tracking-wider">
                Total Payments Settled
              </div>
              <div className="font-display text-xl font-semibold text-foreground">
                {formatInr(totalPaid)}
              </div>
            </div>
          </Card>

          <Card className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase font-medium tracking-wider">
                  Annual Net-Margin Goal
                </div>
                {goalQuery.isLoading ? (
                  <div className="text-lg font-semibold text-muted-foreground">
                    {t("common.loading", "Loading…")}
                  </div>
                ) : (
                  <div className="font-display text-xl font-semibold text-foreground">
                    {formatInr(goalAmount)}
                  </div>
                )}
              </div>
            </div>
            {roles.isAdmin &&
              (goalDraft === null ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGoalDraft(String(goalAmount))}
                >
                  {t("liabilities.editGoal", "Edit")}
                </Button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <CurrencyInput
                    className="w-28 text-xs"
                    value={goalDraft}
                    onChange={setGoalDraft}
                    min={0}
                  />
                  <Button
                    size="sm"
                    className="h-8 px-2 text-xs"
                    disabled={goalMut.isPending}
                    onClick={() => goalMut.mutate(Number(goalDraft || 0))}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setGoalDraft(null)}
                  >
                    ✕
                  </Button>
                </div>
              ))}
          </Card>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "liabilities" | "payments")}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="liabilities" className="gap-2">
              <Calendar className="h-4 w-4" />
              Active Liabilities & Rent Accounts ({rows.length})
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <Receipt className="h-4 w-4" />
              Monthly Payments Registry ({paymentRows.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="liabilities" className="space-y-6">
            {query.isLoading ? (
              <SkeletonTable rows={5} columns={5} />
            ) : query.error ? (
              <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
            ) : rows.length === 0 ? (
              <EmptyState
                title={t("liabilities.emptyTitle", "No liabilities yet")}
                message={t(
                  "liabilities.emptyMessage",
                  "Add a business debt, rental agreement or recurring monthly obligation.",
                )}
                action={
                  roles.canWrite ? (
                    <Button onClick={openCreate}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t("liabilities.addLiability", "Add liability")}
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
                        <span className="text-sm text-muted-foreground">
                          {formatInr(sectionTotal)}
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-md border border-border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("common.name", "Account / Liability")}</TableHead>
                              <TableHead>{t("common.amount", "Monthly Amount")}</TableHead>
                              <TableHead>
                                {t("liabilities.columns.recurring", "Recurring")}
                              </TableHead>
                              <TableHead>{t("liabilities.columns.active", "Active")}</TableHead>
                              <TableHead>{t("common.notes", "Notes")}</TableHead>
                              <TableHead className="w-28 text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {section.rows.map((r) => (
                              <TableRow key={r.id}>
                                <TableCell className="font-medium text-foreground">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-sm">{r.name}</span>
                                    {r.due_day_of_month ? (
                                      <span className="text-xs text-muted-foreground">
                                        Due {ordinal(r.due_day_of_month)} of every month
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground italic">
                                        No fixed date
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono font-semibold">
                                  {formatInr(r.amount)}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {r.is_recurring ? (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                    >
                                      Monthly
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px]">
                                      One-time
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {r.is_active ? (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-50/50"
                                    >
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] text-muted-foreground"
                                    >
                                      Inactive
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                                  {r.notes ?? "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {roles.canWrite && (
                                      <Button
                                        size="xs"
                                        variant="outline"
                                        className="h-7 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                                        onClick={() => openRecordPaymentFor(r.id, r.amount)}
                                        title="Record payment into this liability"
                                      >
                                        <Receipt className="h-3 w-3 mr-1" />
                                        Pay
                                      </Button>
                                    )}
                                    <RowActions
                                      onEdit={() => openEdit(r)}
                                      onDelete={() => setToDelete(r)}
                                    />
                                  </div>
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
                  {t("liabilities.totalActive", "Total active liabilities")}:{" "}
                  {formatInr(totalActive)}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            {paymentsQuery.isLoading ? (
              <SkeletonTable rows={5} columns={6} />
            ) : paymentsQuery.error ? (
              <ErrorBlock
                message={toUserMessage(paymentsQuery.error)}
                onRetry={() => paymentsQuery.refetch()}
              />
            ) : paymentRows.length === 0 ? (
              <EmptyState
                title="No liability payments recorded yet"
                message="Record recurring rent payments or loan EMIs to keep clean liability accounting."
                action={
                  roles.canWrite && rows.length > 0 ? (
                    <Button onClick={() => openRecordPaymentFor()}>
                      <Receipt className="mr-2 h-4 w-4" />
                      Record First Payment
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Liability / Account</TableHead>
                      <TableHead>Month For</TableHead>
                      <TableHead>Amount Paid</TableHead>
                      <TableHead>Mode / Ref</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-12 text-right" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentRows.map((p) => {
                      const liability = liabilityMap.get(p.liability_id);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs whitespace-nowrap">
                            {formatDate(p.payment_date)}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            {liability?.name ?? "Liability Account"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {p.month_for ? (
                              <Badge variant="outline" className="font-mono text-xs">
                                {p.month_for}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatInr(p.amount)}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-medium">{p.payment_mode}</span>
                            {p.reference_no && (
                              <span className="block text-muted-foreground font-mono">
                                Ref: {p.reference_no}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                            {p.notes || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {roles.canWrite && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => setPaymentToDelete(p)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

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
              <DialogTitle>
                {editing
                  ? t("liabilities.editLiability", "Edit liability")
                  : t("liabilities.addLiability", "Add liability")}
              </DialogTitle>
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

        {/* Record Liability Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-600" />
                Record Liability / Rent Payment
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!paymentForm.liability_id) {
                  toast.error("Please select a liability account");
                  return;
                }
                recordPaymentMut.mutate(paymentForm);
              }}
            >
              <DialogBody className="space-y-3">
                <Field label="Liability / Rental Account" required>
                  <Select
                    value={paymentForm.liability_id}
                    onValueChange={(v) => {
                      const sel = liabilityMap.get(v);
                      setPaymentForm((prev) => ({
                        ...prev,
                        liability_id: v,
                        amount: sel ? sel.amount : prev.amount,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select liability account…" />
                    </SelectTrigger>
                    <SelectContent>
                      {rows.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} ({formatInr(r.amount)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Amount Paid" required>
                    <CurrencyInput
                      value={String(paymentForm.amount || "")}
                      onChange={(v) =>
                        setPaymentForm((prev) => ({ ...prev, amount: Number(v || 0) }))
                      }
                    />
                  </Field>

                  <Field label="Payment Date" required>
                    <Input
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={(e) =>
                        setPaymentForm((prev) => ({ ...prev, payment_date: e.target.value }))
                      }
                      required
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Month For" hint="e.g. October 2026">
                    <Input
                      value={paymentForm.month_for ?? ""}
                      onChange={(e) =>
                        setPaymentForm((prev) => ({ ...prev, month_for: e.target.value }))
                      }
                      placeholder="October 2026"
                    />
                  </Field>

                  <Field label="Payment Mode">
                    <Select
                      value={paymentForm.payment_mode}
                      onValueChange={(v) =>
                        setPaymentForm((prev) => ({ ...prev, payment_mode: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bank Transfer">
                          Bank Transfer (NEFT/RTGS/IMPS)
                        </SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Auto Debit">Auto Debit / ECS</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field label="Reference / Cheque / UTR No.">
                  <Input
                    value={paymentForm.reference_no ?? ""}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({ ...prev, reference_no: e.target.value }))
                    }
                    placeholder="e.g. UTR12389812 / Chq #4091"
                  />
                </Field>

                <Field label="Notes">
                  <Textarea
                    rows={2}
                    value={paymentForm.notes ?? ""}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Paid from BOB Current Account / Landlord acknowledgement"
                  />
                </Field>
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setPaymentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={recordPaymentMut.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Receipt className="mr-1.5 h-4 w-4" />
                  {recordPaymentMut.isPending ? "Recording…" : "Save Payment"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Payment Confirm Dialog */}
        <ConfirmDialog
          open={!!paymentToDelete}
          onOpenChange={(o) => !o && setPaymentToDelete(null)}
          title="Delete this payment entry?"
          description={
            paymentToDelete
              ? `Payment of ${formatInr(paymentToDelete.amount)} for ${paymentToDelete.month_for || formatDate(paymentToDelete.payment_date)} will be removed.`
              : ""
          }
          busy={deletePaymentMut.isPending}
          onConfirm={() => paymentToDelete && deletePaymentMut.mutate(paymentToDelete.id)}
        />
      </div>
    </AccountingGuard>
  );
}
