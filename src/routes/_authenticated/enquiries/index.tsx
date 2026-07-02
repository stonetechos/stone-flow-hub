import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, LoadingBlock } from "@/components/layout/States";
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
import { RowActions } from "@/components/data/RowActions";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  createEnquiry,
  deleteEnquiry,
  listEnquiries,
  updateEnquiry,
  type EnquiryListItem,
} from "@/lib/enquiries/api";
import { enquiryCreateSchema, type EnquiryCreateInput } from "@/lib/enquiries/schema";
import { listProjectsForPicker } from "@/lib/projects/api";
import { LEAD_STAGE_LABEL } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/enquiries/")({
  ssr: false,
  component: EnquiriesPage,
});

function EnquiriesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EnquiryListItem | null>(null);
  const [toDelete, setToDelete] = useState<EnquiryListItem | null>(null);

  const query = useQuery({ queryKey: qk.enquiries.list(q), queryFn: () => listEnquiries(q) });

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

  return (
    <div>
      <PageHeader
        title="Enquiries"
        subtitle="Every lead in the pipeline."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New enquiry
          </Button>
        }
      />
      <div className="mb-3 flex items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by enquiry no or notes…"
          className="max-w-md"
        />
      </div>

      {query.isLoading ? (
        <LoadingBlock />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="No enquiries yet"
          message="Log your first enquiry against an existing project."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
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
                <TableHead>Project</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Budget (INR)</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data!.map((e) => (
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
                  <TableCell className="font-medium">{e.project?.name ?? "—"}</TableCell>
                  <TableCell>{e.customer?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{LEAD_STAGE_LABEL[e.stage]}</Badge>
                  </TableCell>
                  <TableCell className="capitalize">{e.priority}</TableCell>
                  <TableCell>
                    {e.budget_inr != null ? e.budget_inr.toLocaleString("en-IN") : "—"}
                  </TableCell>
                  <TableCell>
                    <RowActions
                      onEdit={() => {
                        setEditing(e);
                        setFormOpen(true);
                      }}
                      onDelete={() => setToDelete(e)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <EnquiryFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete enquiry?"
        description={toDelete ? `${toDelete.enquiry_no} will be permanently removed.` : ""}
        busy={delMut.isPending}
        onConfirm={() => toDelete && delMut.mutate(toDelete.id)}
      />
    </div>
  );
}

function emptyForm(): EnquiryCreateInput {
  return {
    project_id: "",
    source: null,
    priority: "normal",
    budget_inr: null,
    required_delivery_date: null,
    notes: null,
  };
}
function fromRow(e: EnquiryListItem): EnquiryCreateInput {
  return {
    project_id: e.project_id,
    source: e.source,
    priority: e.priority,
    budget_inr: e.budget_inr,
    required_delivery_date: e.required_delivery_date,
    notes: e.notes,
  };
}

function EnquiryFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: EnquiryListItem | null;
}) {
  const qc = useQueryClient();
  const projects = useQuery({ queryKey: qk.projects.list(""), queryFn: listProjectsForPicker });
  const [form, setForm] = useState<EnquiryCreateInput>(emptyForm);

  useEffect(() => {
    if (open) setForm(editing ? fromRow(editing) : emptyForm());
  }, [open, editing]);

  const mutation = useMutation({
    mutationFn: (input: EnquiryCreateInput) =>
      editing ? updateEnquiry(editing.id, input) : createEnquiry(input),
    onSuccess: (row) => {
      toast.success(editing ? "Enquiry updated" : `Enquiry ${row.enquiry_no} created`);
      qc.invalidateQueries({ queryKey: qk.enquiries.all });
      qc.invalidateQueries({ queryKey: qk.dashboard });
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
          <DialogTitle>{editing ? `Edit ${editing.enquiry_no}` : "New enquiry"}</DialogTitle>
        </DialogHeader>
        <QuickForm onSubmit={onSubmit} busy={mutation.isPending}>
          <QuickForm.QuickFill>
            <Field
              label="Project"
              required
              className="md:col-span-2"
              hint="Customer is derived from the project."
            >
              <Select value={form.project_id} onValueChange={(v) => set("project_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder={projects.isLoading ? "Loading…" : "Select project"} />
                </SelectTrigger>
                <SelectContent>
                  {(projects.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.customer?.name ?? "no customer"}
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {p.project_code}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Field label="Source" hint="e.g. walk-in, referral, website">
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
              {editing ? "Save" : "Create"}
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}
