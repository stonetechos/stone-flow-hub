import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/forms/Field";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getEnquiry, updateEnquiryStage, sendRfq } from "@/lib/enquiries/api";
import { listVendorsForPicker } from "@/lib/vendors/api";
import { LEAD_STAGES, LEAD_STAGE_LABEL } from "@/lib/constants";
import type { LeadStage } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/enquiries/$enquiryId")({
  ssr: false,
  component: EnquiryDetailPage,
});

function EnquiryDetailPage() {
  const { enquiryId } = Route.useParams();
  const qc = useQueryClient();
  const [rfqOpen, setRfqOpen] = useState(false);

  const query = useQuery({
    queryKey: qk.enquiries.byId(enquiryId),
    queryFn: () => getEnquiry(enquiryId),
  });

  const stageMut = useMutation({
    mutationFn: (stage: LeadStage) => updateEnquiryStage(enquiryId, stage),
    onSuccess: () => {
      toast.success("Stage updated");
      qc.invalidateQueries({ queryKey: qk.enquiries.byId(enquiryId) });
      qc.invalidateQueries({ queryKey: qk.enquiries.all });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  if (query.isLoading) return <LoadingBlock />;
  if (query.error) return <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />;
  if (!query.data) return <ErrorBlock message="Enquiry not found." />;

  const enq = query.data;

  return (
    <div>
      <div className="mb-2">
        <Link to="/enquiries" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to enquiries
        </Link>
      </div>

      <PageHeader
        title={enq.enquiry_no}
        subtitle={`${enq.project?.name ?? "—"} • ${enq.customer?.name ?? "—"}`}
        actions={
          <Button onClick={() => setRfqOpen(true)}>
            <Send className="mr-2 h-4 w-4" /> Send RFQ
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-1 md:col-span-2">
          <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Customer" value={enq.customer?.name} />
            <Info label="Project" value={enq.project?.name} />
            <Info label="City" value={enq.project?.city} />
            <Info label="Priority" value={enq.priority} capitalize />
            <Info label="Source" value={enq.source ?? "—"} />
            <Info label="Budget (INR)" value={enq.budget_inr != null ? enq.budget_inr.toLocaleString("en-IN") : "—"} />
            <Info label="Required by" value={enq.required_delivery_date ?? "—"} />
            <Info label="Notes" value={enq.notes ?? "—"} />
          </CardContent>
        </Card>

        <Card className="shadow-1">
          <CardHeader><CardTitle className="text-sm">Stage</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Badge variant="outline" className="text-sm">{LEAD_STAGE_LABEL[enq.stage]}</Badge>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Advance to</label>
              <Select
                value={enq.stage}
                onValueChange={(v) => stageMut.mutate(v as LeadStage)}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {stageMut.isPending && <p className="mt-1 text-xs text-muted-foreground">Saving…</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <SendRfqDialog open={rfqOpen} onOpenChange={setRfqOpen} enquiryId={enq.id} />
    </div>
  );
}

function Info({ label, value, capitalize }: { label: string; value: string | number | null | undefined; capitalize?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={capitalize ? "capitalize" : undefined}>{value ?? "—"}</div>
    </div>
  );
}

function SendRfqDialog({
  open, onOpenChange, enquiryId,
}: { open: boolean; onOpenChange: (o: boolean) => void; enquiryId: string }) {
  const qc = useQueryClient();
  const vendors = useQuery({ queryKey: qk.vendors.list(""), queryFn: listVendorsForPicker });
  const [selected, setSelected] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: () => sendRfq({ enquiry_id: enquiryId, vendor_ids: selected, due_date: dueDate, notes: notes || null }),
    onSuccess: () => {
      toast.success("RFQ sent");
      qc.invalidateQueries({ queryKey: qk.enquiries.byId(enquiryId) });
      qc.invalidateQueries({ queryKey: qk.rfqs.all });
      qc.invalidateQueries({ queryKey: qk.dashboard });
      onOpenChange(false);
      setSelected([]); setDueDate(""); setNotes("");
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
        <DialogHeader><DialogTitle>Send RFQ</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Due date" required>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </Field>
          <Field label="Vendors" required hint={`${selected.length} selected`}>
            <div className="max-h-56 space-y-1 overflow-auto rounded-sm border border-border p-2">
              {vendors.isLoading ? (
                <p className="p-2 text-sm text-muted-foreground">Loading…</p>
              ) : (vendors.data ?? []).length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">No vendors — add one first.</p>
              ) : (
                (vendors.data ?? []).map((v) => (
                  <label key={v.id} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-accent">
                    <Checkbox checked={selected.includes(v.id)} onCheckedChange={() => toggle(v.id)} />
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
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
