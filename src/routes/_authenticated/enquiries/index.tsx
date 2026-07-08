import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { EntityPicker } from "@/components/forms/EntityPicker";
import { RowActions } from "@/components/data/RowActions";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { qk } from "@/lib/query-keys";
import { LostReasonDialog } from "@/components/enquiry/LostReasonDialog";
import { invalidateCustomer, invalidateEnquiry } from "@/lib/query-invalidation";
import { toUserMessage } from "@/lib/errors";
import {
  createEnquiry,
  deleteEnquiry,
  listEnquiries,
  updateEnquiry,
  updateEnquiryStage,
  type EnquiryListItem,
} from "@/lib/enquiries/api";
import {
  enquiryCreateSchema,
  enquiryUpdateSchema,
  type EnquiryCreateInput,
  type EnquiryUpdateInput,
} from "@/lib/enquiries/schema";
import {
  LEAD_STAGES,
  LEAD_UMBRELLAS,
  LOST_REASONS,
  STAGE_TO_UMBRELLA,
  UMBRELLA_BY_ID,
  stageToUmbrella,
  type LeadUmbrellaId,
} from "@/lib/constants";
import type { LeadStage } from "@/lib/types";
import { computeLeadHealth, daysSince } from "@/lib/lead-stage/health";
import { listEnquirySignals } from "@/lib/lead-stage/signals";
import { LeadHealthBadge } from "@/components/enquiry/LeadHealthBadge";
import { StageAgeChip } from "@/components/enquiry/StageAgeChip";
import { NextFollowupChip } from "@/components/enquiry/NextFollowupChip";

const UMBRELLA_IDS = LEAD_UMBRELLAS.map((u) => u.id) as ReadonlyArray<LeadUmbrellaId>;

export const Route = createFileRoute("/_authenticated/enquiries/")({
  ssr: false,
  component: EnquiriesPage,
  validateSearch: (
    s: Record<string, unknown>,
  ): { edit?: string; umbrella?: LeadUmbrellaId } => {
    const out: { edit?: string; umbrella?: LeadUmbrellaId } = {};
    if (typeof s.edit === "string") out.edit = s.edit;
    if (typeof s.umbrella === "string" && (UMBRELLA_IDS as readonly string[]).includes(s.umbrella))
      out.umbrella = s.umbrella as LeadUmbrellaId;
    return out;
  },
});

function EnquiriesPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { edit, umbrella } = Route.useSearch();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<EnquiryListItem | null>(null);
  const [toDelete, setToDelete] = useState<EnquiryListItem | null>(null);

  const query = useQuery({ queryKey: qk.enquiries.list(dq), queryFn: () => listEnquiries(dq) });

  useEffect(() => {
    if (!edit) return;
    const row = (query.data ?? []).find((r) => r.id === edit);
    if (row) {
      setEditing(row);
      nav({ to: "/enquiries", search: (s: Record<string, unknown>) => ({ ...s, edit: undefined }), replace: true });
    }
  }, [edit, query.data, nav]);

  const delMut = useMutation({
    mutationFn: (id: string) => deleteEnquiry(id),
    onSuccess: () => {
      toast.success("Enquiry deleted");
      qc.invalidateQueries({ queryKey: qk.enquiries.all });
      qc.invalidateQueries({ queryKey: qk.dashboard });
      setToDelete(null);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const stageMut = useMutation({
    mutationFn: ({
      id,
      stage,
      lost_reason,
      lost_notes,
    }: {
      id: string;
      stage: LeadStage;
      lost_reason?: string | null;
      lost_notes?: string | null;
    }) => updateEnquiryStage(id, stage, { lost_reason, lost_notes }),
    onSuccess: () => {
      toast.success("Stage updated");
      qc.invalidateQueries({ queryKey: qk.enquiries.all });
      qc.invalidateQueries({ queryKey: qk.enquiries.pipeline });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const [lostFor, setLostFor] = useState<{ id: string; stage: LeadStage } | null>(null);

  const rows = (query.data ?? []).filter((r) =>
    umbrella ? STAGE_TO_UMBRELLA[r.stage] === umbrella : true,
  );

  return (
    <div>
      <PageHeader
        title="Enquiries"
        subtitle="Every lead in the pipeline — capture first, qualify later."
        actions={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New enquiry
          </Button>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by enquiry no, requirement, or notes…"
          className="max-w-md"
        />
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => nav({ to: "/enquiries", search: {}, replace: true })}
            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${!umbrella ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}
          >
            All
          </button>
          {LEAD_UMBRELLAS.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() =>
                nav({ to: "/enquiries", search: { umbrella: u.id }, replace: true })
              }
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${umbrella === u.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title={umbrella ? "No enquiries in this stage" : "No enquiries yet"}
          message={umbrella ? "Try a different stage or clear the filter." : "Log your first lead — you can convert it into a project later."}
          action={
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New enquiry
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border border-border bg-card shadow-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Requirement</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="min-w-[180px]">Lead Stage</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Budget (INR)</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => {
                const currentUmbrella = stageToUmbrella(e.stage);
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">
                      <Link
                        to="/enquiries/$enquiryId"
                        params={{ enquiryId: e.id }}
                        className="text-primary hover:underline"
                      >
                        {e.enquiry_no}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{e.customer?.name ?? "—"}</TableCell>
                    <TableCell className="max-w-xs truncate">{e.requirement ?? "—"}</TableCell>
                    <TableCell>
                      {e.project ? (
                        e.project.name
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={currentUmbrella.id}
                        onValueChange={(v) => {
                          const target = UMBRELLA_BY_ID[v as LeadUmbrellaId];
                          const primary = target.stages[0];
                          // If already inside this umbrella, don't churn.
                          if (target.stages.includes(e.stage)) return;
                          if (primary === "lost" || primary === "cancelled") {
                            setLostFor({ id: e.id, stage: primary });
                            return;
                          }
                          stageMut.mutate({ id: e.id, stage: primary });
                        }}
                      >
                        <SelectTrigger className="h-8 w-full text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_UMBRELLAS.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="capitalize">{e.priority}</TableCell>
                    <TableCell>
                      {e.budget_inr != null ? e.budget_inr.toLocaleString("en-IN") : "—"}
                    </TableCell>
                    <TableCell>
                      <RowActions onEdit={() => setEditing(e)} onDelete={() => setToDelete(e)} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <NewEnquiryDialog open={newOpen} onOpenChange={setNewOpen} />
      <EditEnquiryDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        editing={editing}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete enquiry?"
        description={toDelete ? `${toDelete.enquiry_no} will be permanently removed.` : ""}
        busy={delMut.isPending}
        onConfirm={() => toDelete && delMut.mutate(toDelete.id)}
      />
      <LostReasonDialog
        open={!!lostFor}
        onOpenChange={(o) => !o && setLostFor(null)}
        onConfirm={(reason, notes) => {
          if (!lostFor) return;
          stageMut.mutate({
            id: lostFor.id,
            stage: lostFor.stage,
            lost_reason: reason,
            lost_notes: notes,
          });
          setLostFor(null);
        }}
        stage={lostFor?.stage ?? "lost"}
      />
    </div>
  );
}




function emptyNew(): EnquiryCreateInput {
  return {
    customer_id: null,
    customer_name: "",
    mobile: "",
    email: null,
    source: "",
    requirement: "",
    budget_inr: null,
    notes: null,
    priority: "normal",
    required_delivery_date: null,
  };
}

function NewEnquiryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<EnquiryCreateInput>(emptyNew);

  useEffect(() => {
    if (open) setForm(emptyNew());
  }, [open]);

  const mutation = useMutation({
    mutationFn: (input: EnquiryCreateInput) => createEnquiry(input),
    onSuccess: (row) => {
      toast.success(`Enquiry ${row.enquiry_no} created`);
      invalidateEnquiry(qc, row.id);
      // createEnquiry auto-creates a customer when the phone is new — refresh every picker.
      invalidateCustomer(qc, row.customer_id ?? undefined);
      onOpenChange(false);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = enquiryCreateSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues.map((i) => i.message).join(" • "));
    mutation.mutate(parsed.data);
  }
  const set = <K extends keyof EnquiryCreateInput>(k: K, v: EnquiryCreateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New enquiry</DialogTitle>
        </DialogHeader>
        <QuickForm onSubmit={onSubmit} busy={mutation.isPending}>
          <QuickForm.QuickFill>
            <Field
              label="Customer"
              required
              className="md:col-span-2"
              hint="Pick an existing customer or create a new one."
            >
              <EntityPicker
                type="customer"
                value={form.customer_id ?? null}
                onChange={(id) => {
                  set("customer_id", id);
                  if (id) {
                    // Selected an existing customer — clear inline-create fields.
                    set("customer_name", "");
                    set("mobile", "");
                    set("email", null);
                  }
                }}
                allowCreate
                placeholder="Search customer by name, code, phone…"
              />
            </Field>
            {!form.customer_id ? (
              <>
                <Field label="Customer name" required>
                  <Input
                    value={form.customer_name}
                    onChange={(e) => set("customer_name", e.target.value)}
                    required
                  />
                </Field>
                <Field label="Mobile number" required hint="New number → new customer created">
                  <Input
                    value={form.mobile}
                    onChange={(e) => set("mobile", e.target.value)}
                    required
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) => set("email", e.target.value || null)}
                  />
                </Field>
              </>
            ) : null}
            <Field label="Lead source" required hint="e.g. walk-in, referral, website">
              <Input
                value={form.source ?? ""}
                onChange={(e) => set("source", e.target.value)}
                required
              />
            </Field>
            <Field label="Requirement" required className="md:col-span-2">
              <Textarea
                rows={2}
                value={form.requirement ?? ""}
                onChange={(e) => set("requirement", e.target.value)}
                placeholder="What is the customer looking for?"
                required
              />
            </Field>
            <Field label="Budget (INR)">
              <Input
                type="number"
                value={form.budget_inr ?? ""}
                onChange={(e) =>
                  set("budget_inr", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </Field>
          </QuickForm.QuickFill>

          <QuickForm.MoreDetails>
            <Field label="Priority">
              <Select
                value={form.priority}
                onValueChange={(v) => set("priority", v as EnquiryCreateInput["priority"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Required by">
              <Input
                type="date"
                value={form.required_delivery_date ?? ""}
                onChange={(e) => set("required_delivery_date", e.target.value || null)}
              />
            </Field>
          </QuickForm.MoreDetails>

          <QuickForm.Advanced>
            <Field label="Notes" className="md:col-span-2">
              <Textarea
                rows={3}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </QuickForm.Advanced>

          <QuickForm.Actions>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Edit enquiry ----------

function fromRowForEdit(e: EnquiryListItem): EnquiryUpdateInput {
  return {
    source: e.source,
    requirement: e.requirement,
    priority: e.priority,
    budget_inr: e.budget_inr,
    required_delivery_date: e.required_delivery_date,
    notes: e.notes,
  };
}

function EditEnquiryDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: EnquiryListItem | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<EnquiryUpdateInput>({
    source: null,
    requirement: null,
    priority: "normal",
    budget_inr: null,
    required_delivery_date: null,
    notes: null,
  });

  useEffect(() => {
    if (open && editing) setForm(fromRowForEdit(editing));
  }, [open, editing]);

  const mutation = useMutation({
    mutationFn: (input: EnquiryUpdateInput) => {
      if (!editing) throw new Error("no enquiry");
      return updateEnquiry(editing.id, input);
    },
    onSuccess: () => {
      toast.success("Enquiry updated");
      qc.invalidateQueries({ queryKey: qk.enquiries.all });
      onOpenChange(false);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = enquiryUpdateSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues.map((i) => i.message).join(" • "));
    mutation.mutate(parsed.data);
  }
  const set = <K extends keyof EnquiryUpdateInput>(k: K, v: EnquiryUpdateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit {editing?.enquiry_no}</DialogTitle>
        </DialogHeader>
        <QuickForm onSubmit={onSubmit} busy={mutation.isPending}>
          <QuickForm.QuickFill>
            <Field label="Requirement" className="md:col-span-2">
              <Textarea
                rows={2}
                value={form.requirement ?? ""}
                onChange={(e) => set("requirement", e.target.value)}
              />
            </Field>
            <Field label="Lead source">
              <Input value={form.source ?? ""} onChange={(e) => set("source", e.target.value)} />
            </Field>
            <Field label="Budget (INR)">
              <Input
                type="number"
                value={form.budget_inr ?? ""}
                onChange={(e) =>
                  set("budget_inr", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </Field>
          </QuickForm.QuickFill>

          <QuickForm.MoreDetails>
            <Field label="Priority">
              <Select
                value={form.priority}
                onValueChange={(v) => set("priority", v as EnquiryUpdateInput["priority"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Required by">
              <Input
                type="date"
                value={form.required_delivery_date ?? ""}
                onChange={(e) => set("required_delivery_date", e.target.value || null)}
              />
            </Field>
          </QuickForm.MoreDetails>

          <QuickForm.Advanced>
            <Field label="Notes" className="md:col-span-2">
              <Textarea
                rows={3}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </QuickForm.Advanced>

          <QuickForm.Actions>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}
