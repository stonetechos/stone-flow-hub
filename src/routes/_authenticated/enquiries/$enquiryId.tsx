import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  FolderPlus,
  Loader2,
  Send,
  Pencil,
  CheckCircle2,
  XCircle,
  FolderOpen,
  History,
} from "lucide-react";
import { AttachmentsPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { DetailActionBar } from "@/components/entity/DetailActionBar";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuickForm } from "@/components/forms/QuickForm";
import { Field } from "@/components/forms/Field";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  convertEnquiryToProject,
  getEnquiry,
  listEnquiryVisitedStages,
  sendRfq,
  updateEnquiryStage,
} from "@/lib/enquiries/api";
import { convertToProjectSchema, type ConvertToProjectInput } from "@/lib/enquiries/schema";
import { listVendorsForPicker } from "@/lib/vendors/api";
import {
  LEAD_STAGE_LABEL,
  LEAD_UMBRELLAS,
  LOST_LIKE_STAGES,
  LOST_REASONS,
  UMBRELLA_BY_ID,
  stageToUmbrella,
  suggestNextStage,
  type LeadUmbrellaId,
} from "@/lib/constants";
import type { LeadStage } from "@/lib/types";
import { invalidateEnquiry } from "@/lib/query-invalidation";
import { LostReasonDialog } from "@/components/enquiry/LostReasonDialog";
import { getEnquirySignal } from "@/lib/lead-stage/signals";
import { computeLeadHealth, daysSince } from "@/lib/lead-stage/health";
import { LeadHealthBadge } from "@/components/enquiry/LeadHealthBadge";
import { StageAgeChip } from "@/components/enquiry/StageAgeChip";
import { NextFollowupChip } from "@/components/enquiry/NextFollowupChip";
import { SuggestedRecommendations } from "@/components/enquiry/SuggestedRecommendations";
import { OperationalProgress } from "@/components/enquiry/OperationalProgress";
import { listAssignableUsers } from "@/lib/tasks/api";

export const Route = createFileRoute("/_authenticated/enquiries/$enquiryId")({
  ssr: false,
  component: EnquiryDetailPage,
});

function EnquiryDetailPage() {
  const { enquiryId } = Route.useParams();
  const qc = useQueryClient();
  const [rfqOpen, setRfqOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  const query = useQuery({
    queryKey: qk.enquiries.byId(enquiryId),
    queryFn: () => getEnquiry(enquiryId),
  });

  const stageMut = useMutation({
    mutationFn: (input: {
      stage: LeadStage;
      lost_reason?: string | null;
      lost_notes?: string | null;
    }) =>
      updateEnquiryStage(enquiryId, input.stage, {
        lost_reason: input.lost_reason,
        lost_notes: input.lost_notes,
      }),
    onSuccess: () => {
      toast.success("Stage updated");
      invalidateEnquiry(qc, enquiryId);
      qc.invalidateQueries({ queryKey: qk.enquiries.pipeline });
      qc.invalidateQueries({ queryKey: ["enquiry_stage_history", enquiryId] });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const [lostFor, setLostFor] = useState<LeadStage | null>(null);

  const visited = useQuery({
    queryKey: ["enquiry_stage_history", enquiryId],
    queryFn: () => listEnquiryVisitedStages(enquiryId),
  });

  function attemptStageChange(stage: LeadStage) {
    if (LOST_LIKE_STAGES.includes(stage)) {
      setLostFor(stage);
      return;
    }
    stageMut.mutate({ stage });
  }

  if (query.isLoading) return <LoadingBlock />;
  if (query.error)
    return <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />;
  if (!query.data) return <ErrorBlock message="Enquiry not found." />;

  const enq = query.data;

  return (
    <div>
      <div className="mb-2">
        <Link
          to="/enquiries"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to enquiries
        </Link>
      </div>

      <PageHeader
        title={enq.enquiry_no}
        subtitle={`${enq.customer?.name ?? "—"}${enq.project ? ` • ${enq.project.name}` : " • Unassigned lead"}`}
        actions={
          <DetailActionBar
            pin={{ entityType: "enquiry", entityId: enquiryId, label: enq.enquiry_no }}
            primary={
              <>
                <Link to="/enquiries" search={{ edit: enquiryId }}>
                  <Button size="sm">
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                </Link>
                {!enq.project_id && (
                  <Button size="sm" onClick={() => setConvertOpen(true)}>
                    <FolderPlus className="mr-2 h-4 w-4" /> Convert to project
                  </Button>
                )}
                {enq.project_id && (
                  <Link
                    to="/quotes"
                    search={{ new: "1", project: enq.project?.id, enquiry: enq.id }}
                  >
                    <Button variant="outline" size="sm">
                      <FileText className="mr-2 h-4 w-4" /> Create quote
                    </Button>
                  </Link>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => attemptStageChange("completed")}
                  disabled={enq.stage === "completed" || stageMut.isPending}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Mark won
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => attemptStageChange("lost")}
                  disabled={enq.stage === "lost" || stageMut.isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" /> Mark lost
                </Button>
              </>
            }
            overflow={[
              {
                label: "Send RFQ",
                icon: <Send className="h-4 w-4" />,
                onSelect: () => setRfqOpen(true),
              },
              {
                label: "Documents",
                icon: <FolderOpen className="h-4 w-4" />,
                onSelect: () =>
                  document
                    .getElementById("enquiry-documents")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                separatorBefore: true,
              },
              {
                label: "Timeline",
                icon: <History className="h-4 w-4" />,
                onSelect: () =>
                  document
                    .getElementById("enquiry-timeline")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              },
            ]}
          />
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Customer" value={enq.customer?.name} />
            <Info label="Project" value={enq.project?.name ?? "Not yet assigned"} />
            <Info label="Requirement" value={enq.requirement ?? "—"} />
            <Info label="City" value={enq.project?.city} />
            <Info label="Priority" value={enq.priority} capitalize />
            <Info label="Source" value={enq.source ?? "—"} />
            <Info
              label="Budget (INR)"
              value={enq.budget_inr != null ? enq.budget_inr.toLocaleString("en-IN") : "—"}
            />
            <Info label="Required by" value={enq.required_delivery_date ?? "—"} />
            <Info label="Notes" value={enq.notes ?? "—"} />
          </CardContent>
        </Card>

        <Card className="shadow-1">
          <CardHeader>
            <CardTitle className="text-sm">Lead Stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const umb = stageToUmbrella(enq.stage);
              const suggested = suggestNextStage(enq.stage);
              return (
                <>
                  <div>
                    <Badge
                      variant="outline"
                      className="border-primary/40 bg-primary/10 px-2 py-1 text-sm font-semibold text-primary"
                    >
                      {umb.label}
                    </Badge>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Operational stage: {LEAD_STAGE_LABEL[enq.stage]}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Move to stage
                    </label>
                    <Select
                      value={umb.id}
                      onValueChange={(v) => {
                        const target = UMBRELLA_BY_ID[v as LeadUmbrellaId];
                        if (target.stages.includes(enq.stage)) return;
                        attemptStageChange(target.stages[0]);
                      }}
                    >
                      <SelectTrigger className="mt-1">
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
                    {stageMut.isPending && (
                      <p className="mt-1 text-xs text-muted-foreground">Saving…</p>
                    )}
                  </div>

                  {suggested && (
                    <button
                      type="button"
                      onClick={() => attemptStageChange(suggested)}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs text-primary hover:bg-primary/10"
                    >
                      Suggested next: {LEAD_STAGE_LABEL[suggested]} →
                    </button>
                  )}

                  {/* Operational milestones inside the current umbrella */}
                  {umb.milestones.length > 1 && (
                    <div className="space-y-1 border-t border-border pt-3">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Milestones
                      </div>
                      <ul className="space-y-1">
                        {umb.milestones.map((m) => {
                          const done = visited.data?.has(m.stage) || enq.stage === m.stage;
                          const isCurrent = enq.stage === m.stage;
                          return (
                            <li
                              key={m.stage}
                              className="flex items-center justify-between gap-2 text-xs"
                            >
                              <span className="flex items-center gap-2">
                                <span
                                  className={`inline-block h-2 w-2 rounded-full ${done ? "bg-success" : "bg-muted-foreground/40"}`}
                                />
                                <span className={isCurrent ? "font-medium" : ""}>{m.label}</span>
                              </span>
                              {!done && (
                                <button
                                  type="button"
                                  onClick={() => attemptStageChange(m.stage)}
                                  className="text-primary hover:underline"
                                >
                                  Set
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {(enq.stage === "lost" || enq.stage === "cancelled") && enq.lost_reason && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs">
                      <div className="font-medium text-destructive">
                        {enq.stage === "cancelled" ? "Cancelled" : "Lost"} — {enq.lost_reason}
                      </div>
                      {enq.lost_notes && (
                        <div className="mt-0.5 text-muted-foreground">{enq.lost_notes}</div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      <LostReasonDialog
        open={!!lostFor}
        onOpenChange={(o) => !o && setLostFor(null)}
        stage={lostFor ?? "lost"}
        onConfirm={(reason, notes) => {
          if (!lostFor) return;
          stageMut.mutate({ stage: lostFor, lost_reason: reason, lost_notes: notes });
          setLostFor(null);
        }}
      />

      <div className="mt-4">
        <RfqsForEnquiry enquiryId={enquiryId} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div id="enquiry-documents">
          <AttachmentsPanel entityType="enquiry" entityId={enquiryId} />
        </div>
        <div id="enquiry-timeline">
          <TimelinePanel entityType="enquiry" entityId={enquiryId} />
        </div>
      </div>


      <SendRfqDialog open={rfqOpen} onOpenChange={setRfqOpen} enquiryId={enq.id} />
      <ConvertToProjectDialog open={convertOpen} onOpenChange={setConvertOpen} enquiryId={enq.id} />
    </div>
  );
}

function ConvertToProjectDialog({
  open,
  onOpenChange,
  enquiryId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  enquiryId: string;
}) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const empty: ConvertToProjectInput = {
    name: "",
    site_address: null,
    city: "",
    state: null,
    architect_name: null,
    contractor_name: null,
    area_sqft: null,
    expected_completion_date: null,
  };
  const [form, setForm] = useState<ConvertToProjectInput>(empty);

  useEffect(() => {
    if (open) setForm(empty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const mutation = useMutation({
    mutationFn: (input: ConvertToProjectInput) => convertEnquiryToProject(enquiryId, input),
    onSuccess: ({ project_id }) => {
      toast.success("Project created and linked");
      invalidateEnquiry(qc, enquiryId);
      qc.invalidateQueries({ queryKey: qk.projects.all });
      qc.invalidateQueries({ queryKey: qk.dashboard });
      onOpenChange(false);
      nav({ to: "/projects/$projectId", params: { projectId: project_id } });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = convertToProjectSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues.map((i) => i.message).join(" • "));
    mutation.mutate(parsed.data);
  }
  const set = <K extends keyof ConvertToProjectInput>(k: K, v: ConvertToProjectInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Convert enquiry to project</DialogTitle>
        </DialogHeader>
        <QuickForm onSubmit={onSubmit} busy={mutation.isPending}>
          <QuickForm.QuickFill>
            <Field label="Project name" required className="md:col-span-2">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </Field>
            <Field label="City" required>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} required />
            </Field>
            <Field label="State">
              <Input
                value={form.state ?? ""}
                onChange={(e) => set("state", e.target.value || null)}
              />
            </Field>
            <Field label="Site address" className="md:col-span-2">
              <Textarea
                rows={2}
                value={form.site_address ?? ""}
                onChange={(e) => set("site_address", e.target.value || null)}
              />
            </Field>
          </QuickForm.QuickFill>

          <QuickForm.MoreDetails>
            <Field label="Architect">
              <Input
                value={form.architect_name ?? ""}
                onChange={(e) => set("architect_name", e.target.value || null)}
              />
            </Field>
            <Field label="Contractor">
              <Input
                value={form.contractor_name ?? ""}
                onChange={(e) => set("contractor_name", e.target.value || null)}
              />
            </Field>
            <Field label="Area (sq ft)">
              <Input
                type="number"
                value={form.area_sqft ?? ""}
                onChange={(e) =>
                  set("area_sqft", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </Field>
            <Field label="Target completion date">
              <Input
                type="date"
                value={form.expected_completion_date ?? ""}
                onChange={(e) => set("expected_completion_date", e.target.value || null)}
              />
            </Field>
          </QuickForm.MoreDetails>

          <QuickForm.Actions>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create project
            </Button>
          </QuickForm.Actions>
        </QuickForm>
      </DialogContent>
    </Dialog>
  );
}

function Info({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string | number | null | undefined;
  capitalize?: boolean;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={capitalize ? "capitalize" : undefined}>{value ?? "—"}</div>
    </div>
  );
}

function SendRfqDialog({
  open,
  onOpenChange,
  enquiryId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  enquiryId: string;
}) {
  const qc = useQueryClient();
  const vendors = useQuery({ queryKey: qk.vendors.list(""), queryFn: () => listVendorsForPicker() });
  const [selected, setSelected] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      sendRfq({
        enquiry_id: enquiryId,
        vendor_ids: selected,
        due_date: dueDate,
        notes: notes || null,
      }),
    onSuccess: () => {
      toast.success("RFQ sent");
      qc.invalidateQueries({ queryKey: qk.enquiries.byId(enquiryId) });
      qc.invalidateQueries({ queryKey: qk.rfqs.all });
      qc.invalidateQueries({ queryKey: qk.dashboard });
      onOpenChange(false);
      setSelected([]);
      setDueDate("");
      setNotes("");
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.length === 0) return toast.error("Select at least one vendor");
    if (!dueDate) return toast.error("Pick a due date");
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send RFQ</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Due date" required>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </Field>
          <Field label="Vendors" required hint={`${selected.length} selected`}>
            <div className="max-h-56 space-y-1 overflow-auto rounded-sm border border-border p-2">
              {vendors.isLoading ? (
                <p className="p-2 text-sm text-muted-foreground">Loading…</p>
              ) : (vendors.data ?? []).length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">No vendors — add one first.</p>
              ) : (
                (vendors.data ?? []).map((v) => (
                  <label
                    key={v.id}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-accent"
                  >
                    <Checkbox
                      checked={selected.includes(v.id)}
                      onCheckedChange={() => toggle(v.id)}
                    />
                    <span className="flex-1">{v.company_name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{v.vendor_code}</span>
                  </label>
                ))
              )}
            </div>
          </Field>
          <Field label="Notes">
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RfqsForEnquiry({ enquiryId }: { enquiryId: string }) {
  const rfqs = useQuery({
    queryKey: qk.rfqs.byEnquiry(enquiryId),
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("rfqs")
        .select("id, rfq_no, status, due_date, created_at, vendor_requests(id, response_status), vendor_quotes:vendor_requests(vendor_quotes(id, submitted_at, is_approved))")
        .eq("enquiry_id", enquiryId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  if (rfqs.isLoading || (rfqs.data ?? []).length === 0) return null;
  return (
    <Card className="shadow-1">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Send className="h-4 w-4 text-primary" /> RFQs sent
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="divide-y divide-border">
          {rfqs.data!.map((r) => {
            const requests = (r.vendor_requests ?? []) as Array<{ response_status: string }>;
            const submitted = requests.filter((x) => x.response_status === "submitted").length;
            return (
              <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-muted-foreground">{r.rfq_no}</div>
                  <div className="text-xs text-muted-foreground">
                    {requests.length} vendor{requests.length === 1 ? "" : "s"} · {submitted}{" "}
                    submitted{r.due_date ? ` · due ${r.due_date}` : ""}
                  </div>
                </div>
                <Link to="/rfqs/$rfqId" params={{ rfqId: r.id }}>
                  <Button size="sm" variant="outline">Compare quotes</Button>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

