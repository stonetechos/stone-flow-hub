import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, CalendarClock, Check } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { RowActions } from "@/components/data/RowActions";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  completeFollowup,
  createFollowup,
  deleteFollowup,
  listFollowups,
  updateFollowup,
  type FollowupWithEnquiry,
} from "@/lib/followups/api";
import {
  FOLLOWUP_CHANNELS,
  FOLLOWUP_ENTITY_TYPES,
  followupCreateSchema,
  type FollowupCreateInput,
} from "@/lib/followups/schema";
import { listEnquiries } from "@/lib/enquiries/api";
import { EntityPicker } from "@/components/forms/EntityPicker";
import { invalidateFollowup } from "@/lib/query-invalidation";

type Scope = "today" | "pending" | "all";

export const Route = createFileRoute("/_authenticated/followups/")({
  ssr: false,
  component: FollowupsPage,
  validateSearch: (s: Record<string, unknown>): { scope?: Scope } => {
    const v = typeof s.scope === "string" ? s.scope : "";
    return v === "today" || v === "pending" || v === "all" ? { scope: v as Scope } : {};
  },
});

function FollowupsPage() {
  const qc = useQueryClient();
  const search = Route.useSearch();
  const [scope, setScope] = useState<Scope>(search.scope ?? "today");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FollowupWithEnquiry | null>(null);
  const [toDelete, setToDelete] = useState<FollowupWithEnquiry | null>(null);

  const query = useQuery({
    queryKey: qk.followups.scope(scope),
    queryFn: () => listFollowups(scope),
  });


  const completeMut = useMutation({
    mutationFn: (id: string) => completeFollowup({ id }),
    onSuccess: () => {
      toast.success("Follow-up marked done");
      qc.invalidateQueries({ queryKey: qk.followups.all });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFollowup(id),
    onSuccess: () => {
      toast.success("Follow-up deleted");
      qc.invalidateQueries({ queryKey: qk.followups.all });
      qc.invalidateQueries({ queryKey: qk.dashboard });
      setToDelete(null);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  return (
    <div>
      <PageHeader
        title="Follow-ups"
        subtitle="Keep every lead moving."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New follow-up
          </Button>
        }
      />

      <div className="mb-3">
        <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="pending">All pending</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-6 w-6" />}
          title="Nothing scheduled"
          message="Add a follow-up so nothing slips through the cracks."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> New follow-up
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border border-border bg-card shadow-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Enquiry</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data!.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(f.scheduled_at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {f.enquiry ? (
                      <Link
                        to="/enquiries/$enquiryId"
                        params={{ enquiryId: f.enquiry.id }}
                        className="text-primary hover:underline"
                      >
                        {f.enquiry.enquiry_no}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{f.enquiry?.customer?.name ?? "—"}</TableCell>
                  <TableCell className="capitalize">{f.channel.replace("_", " ")}</TableCell>
                  <TableCell>
                    <Badge
                      variant={f.status === "done" ? "secondary" : "outline"}
                      className="capitalize"
                    >
                      {f.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {f.notes ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {f.status === "pending" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Mark done"
                          aria-label="Mark follow-up done"
                          onClick={() => completeMut.mutate(f.id)}
                          disabled={completeMut.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <RowActions
                        onEdit={() => {
                          setEditing(f);
                          setFormOpen(true);
                        }}
                        onDelete={() => setToDelete(f)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <FollowupFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete follow-up?"
        description="This can't be undone."
        busy={delMut.isPending}
        onConfirm={() => toDelete && delMut.mutate(toDelete.id)}
      />
    </div>
  );
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyForm(): FollowupCreateInput {
  const in1h = new Date(Date.now() + 60 * 60 * 1000);
  return {
    entity_type: "enquiry",
    entity_id: "",
    scheduled_at: toLocalInputValue(in1h.toISOString()),
    channel: "call",
    notes: null,
  };
}

function FollowupFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: FollowupWithEnquiry | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FollowupCreateInput>(emptyForm);
  const enquiries = useQuery({
    queryKey: qk.enquiries.list(""),
    queryFn: () => listEnquiries(""),
    enabled: open && form.entity_type === "enquiry",
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const et = (editing.entity_type as FollowupCreateInput["entity_type"] | null) ?? "enquiry";
      const eid = editing.entity_id ?? editing.enquiry_id ?? "";
      setForm({
        entity_type: et,
        entity_id: eid,
        scheduled_at: toLocalInputValue(editing.scheduled_at),
        channel: editing.channel,
        notes: editing.notes,
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, editing]);

  const mutation = useMutation({
    mutationFn: (input: FollowupCreateInput) => {
      const iso = new Date(input.scheduled_at).toISOString();
      const payload = { ...input, scheduled_at: iso };
      return editing ? updateFollowup(editing.id, payload) : createFollowup(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Follow-up updated" : "Follow-up scheduled");
      invalidateFollowup(qc, {
        entityType: form.entity_type,
        entityId: form.entity_id,
        enquiryId: form.entity_type === "enquiry" ? form.entity_id : null,
      });
      onOpenChange(false);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = followupCreateSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues.map((i) => i.message).join(" • "));
    mutation.mutate(parsed.data);
  }
  const set = <K extends keyof FollowupCreateInput>(k: K, v: FollowupCreateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const pickerType: "customer" | "project" | "vendor" | null =
    form.entity_type === "customer" || form.entity_type === "project" || form.entity_type === "vendor"
      ? form.entity_type
      : null;
  

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit follow-up" : "New follow-up"}</DialogTitle>
        </DialogHeader>
        <QuickForm onSubmit={onSubmit} busy={mutation.isPending}>
          <QuickForm.QuickFill>
            <Field label="Attach to" required>
              <Select
                value={form.entity_type}
                onValueChange={(v) => {
                  set("entity_type", v as FollowupCreateInput["entity_type"]);
                  set("entity_id", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLLOWUP_ENTITY_TYPES.filter((t) =>
                    ["enquiry", "customer", "project", "vendor"].includes(t.value),
                  ).map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {form.entity_type === "enquiry" ? (
              <Field label="Enquiry" required>
                <Select
                  value={form.entity_id}
                  onValueChange={(v) => set("entity_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={enquiries.isLoading ? "Loading…" : "Select enquiry"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(enquiries.data ?? []).map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.enquiry_no} — {e.customer?.name ?? "—"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : pickerType ? (
              <Field label={pickerType.charAt(0).toUpperCase() + pickerType.slice(1)} required>
                <EntityPicker
                  type={pickerType}
                  value={form.entity_id || null}
                  onChange={(id) => set("entity_id", id ?? "")}
                />
              </Field>
            ) : null}
            <Field label="When" required>
              <Input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => set("scheduled_at", e.target.value)}
                required
              />
            </Field>
            <Field label="Channel" required>
              <Select
                value={form.channel}
                onValueChange={(v) => set("channel", v as FollowupCreateInput["channel"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLLOWUP_CHANNELS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </QuickForm.QuickFill>

          <QuickForm.MoreDetails>
            <Field label="Notes" className="md:col-span-2">
              <Textarea
                rows={3}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </QuickForm.MoreDetails>

          <QuickForm.Actions>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save" : "Schedule"}
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}
