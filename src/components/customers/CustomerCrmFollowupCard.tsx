import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PhoneCall,
  Calendar,
  Clock,
  MessageCircle,
  Phone,
  CheckCircle2,
  CalendarClock,
  Plus,
  Send,
  Loader2,
  History,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field } from "@/components/forms/Field";
import { CustomerResponseStatusSelect } from "./CustomerResponseStatusSelect";
import {
  CALL_OUTCOMES,
  CUSTOMER_RESPONSE_STATUS_CONFIG,
  getCustomerCrmState,
  getCustomerResponseStatus,
  type CustomerResponseStatus,
} from "@/lib/customers/crm-status";
import { updateCustomerCrmStatus, type CustomerRow } from "@/lib/customers/api";
import { listFollowups, completeFollowup, type FollowupWithEnquiry } from "@/lib/followups/api";
import { FOLLOWUP_CHANNELS } from "@/lib/followups/schema";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface CustomerCrmFollowupCardProps {
  customer: CustomerRow;
}

export function CustomerCrmFollowupCard({ customer }: CustomerCrmFollowupCardProps) {
  const qc = useQueryClient();
  const customerId = customer.id;

  const [isLoggingCall, setIsLoggingCall] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedPendingFollowup, setSelectedPendingFollowup] =
    useState<FollowupWithEnquiry | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Form State for Quick Call Logger
  const [callNote, setCallNote] = useState("");
  const [callOutcome, setCallOutcome] = useState<string>("positive_proceeding");
  const [responseStatus, setResponseStatus] = useState<CustomerResponseStatus>(
    getCustomerResponseStatus(customer),
  );
  const [scheduleNextCall, setScheduleNextCall] = useState(true);
  const [nextCallAt, setNextCallAt] = useState("");
  const [nextCallChannel, setNextCallChannel] = useState<"call" | "whatsapp" | "meeting">("call");
  const [nextCallAgenda, setNextCallAgenda] = useState("");

  // Outcome dialog state
  const [completionNotes, setCompletionNotes] = useState("");

  const crmState = getCustomerCrmState(customer);
  const phone = customer.primary_phone ?? "";
  const wa = customer.whatsapp ?? customer.primary_phone ?? "";
  const waDigits = wa.replace(/[^0-9]/g, "");

  // Query pending follow-up
  const pendingFollowupsQ = useQuery({
    queryKey: ["customer-pending-followups", customerId],
    queryFn: () => listFollowups({ customerId, scope: "pending", limit: 5 }),
    staleTime: 15_000,
  });

  // Query all follow-up history
  const historyQ = useQuery({
    queryKey: ["customer-followups-history", customerId],
    queryFn: () => listFollowups({ customerId, scope: "all", limit: 20 }),
    staleTime: 30_000,
  });

  const nextPendingFollowup = (pendingFollowupsQ.data ?? [])[0] ?? null;

  // Mutation to log current call and optionally schedule next follow-up
  const logCallMutation = useMutation({
    mutationFn: async () => {
      const outcomeObj = CALL_OUTCOMES.find((o) => o.value === callOutcome);
      const outcomeLabel = outcomeObj?.label ?? callOutcome;

      return updateCustomerCrmStatus({
        customerId,
        response_status: responseStatus,
        call_note: callNote.trim() || undefined,
        call_outcome: outcomeLabel,
        next_call_at: scheduleNextCall && nextCallAt ? nextCallAt : undefined,
        next_call_channel: nextCallChannel,
        next_call_agenda: nextCallAgenda.trim() || undefined,
        complete_pending_followup_id: nextPendingFollowup?.id,
      });
    },
    onSuccess: () => {
      toast.success("Call update saved & follow-up updated");
      void qc.invalidateQueries({ queryKey: qk.customers.byId(customerId) });
      void qc.invalidateQueries({ queryKey: ["customer-pending-followups", customerId] });
      void qc.invalidateQueries({ queryKey: ["customer-followups-history", customerId] });
      void qc.invalidateQueries({ queryKey: qk.followups.all });
      void qc.invalidateQueries({ queryKey: qk.dashboard });
      // Reset form
      setCallNote("");
      setNextCallAgenda("");
      setNextCallAt("");
      setIsLoggingCall(false);
    },
    onError: (err) => {
      toast.error(toUserMessage(err));
    },
  });

  // Mutation to mark a pending follow-up completed
  const completeMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      return completeFollowup({ id, outcome_notes: notes });
    },
    onSuccess: () => {
      toast.success("Follow-up marked as completed");
      void qc.invalidateQueries({ queryKey: ["customer-pending-followups", customerId] });
      void qc.invalidateQueries({ queryKey: ["customer-followups-history", customerId] });
      void qc.invalidateQueries({ queryKey: qk.followups.all });
      void qc.invalidateQueries({ queryKey: qk.dashboard });
      setCompleteDialogOpen(false);
      setCompletionNotes("");
      setSelectedPendingFollowup(null);
    },
    onError: (err) => {
      toast.error(toUserMessage(err));
    },
  });

  // Helper for quick date presets
  const applyPresetDate = (daysAhead: number, targetHour = 10, targetMinute = 30) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setHours(targetHour, targetMinute, 0, 0);

    // Format for datetime-local: YYYY-MM-DDTHH:mm
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    setNextCallAt(`${year}-${month}-${day}T${hours}:${minutes}`);
    setScheduleNextCall(true);
  };

  // Compute countdown / urgency for next pending call
  const renderFollowupCountdown = (isoDate: string) => {
    const target = new Date(isoDate).getTime();
    const now = Date.now();
    const diffHours = (target - now) / (1000 * 60 * 60);

    if (diffHours < 0) {
      const overdueDays = Math.abs(Math.floor(diffHours / 24));
      return (
        <Badge variant="destructive" className="gap-1 animate-pulse font-mono text-[10px]">
          <AlertCircle className="h-3 w-3" /> Overdue{" "}
          {overdueDays > 0 ? `${overdueDays}d` : "today"}
        </Badge>
      );
    }
    if (diffHours <= 24) {
      return (
        <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-mono text-[10px]">
          <Clock className="h-3 w-3 mr-1" /> Due Today / Tomorrow
        </Badge>
      );
    }
    const days = Math.ceil(diffHours / 24);
    return (
      <Badge variant="outline" className="text-slate-600 border-slate-300 font-mono text-[10px]">
        <Calendar className="h-3 w-3 mr-1" /> In {days} days
      </Badge>
    );
  };

  return (
    <Card className="shadow-sm border-teal-800/20 bg-gradient-to-b from-white to-slate-50/50">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-700 text-white shadow-xs">
            <PhoneCall className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              CRM Call Log & Client Follow-up
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Manage client engagement response, call updates, and next reminders
            </p>
          </div>
        </div>

        {/* 1-Click Interactive Client Response Status */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 hidden sm:inline">
            Response Status:
          </span>
          <CustomerResponseStatusSelect
            customerId={customerId}
            customerName={customer.name}
            isActive={customer.is_active}
            workflowState={customer.workflow_state}
            externalRef={customer.external_ref}
            variant="badge"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Next Scheduled Follow-up Banner */}
        {nextPendingFollowup ? (
          <div className="rounded-xl border border-amber-200/90 bg-amber-50/40 p-3.5 shadow-2xs">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-900">
                    <CalendarClock className="h-3.5 w-3.5 text-amber-700" />
                  </span>
                  <span className="font-display text-sm font-bold text-amber-950">
                    Next Reminder:{" "}
                    {new Date(nextPendingFollowup.scheduled_at).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {renderFollowupCountdown(nextPendingFollowup.scheduled_at)}
                </div>

                <div className="pl-8 text-xs text-slate-700">
                  <span className="font-semibold capitalize text-amber-900">
                    {nextPendingFollowup.channel} Agenda:
                  </span>{" "}
                  {nextPendingFollowup.notes || "Call follow-up to check client status"}
                </div>
              </div>

              {/* Direct Call & WhatsApp Actions */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">
                {phone && (
                  <Button
                    asChild
                    size="sm"
                    className="h-8 gap-1.5 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold"
                  >
                    <a href={`tel:${phone}`}>
                      <Phone className="h-3.5 w-3.5 fill-current" /> Call Now
                    </a>
                  </Button>
                )}
                {waDigits && (
                  <Button
                    asChild
                    size="sm"
                    className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                  >
                    <a
                      href={`https://wa.me/${waDigits}?text=${encodeURIComponent(
                        `Hello ${customer.name}! Following up regarding your stone project inquiry with Stone Tech.`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-3.5 w-3.5 fill-current" /> WhatsApp
                    </a>
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedPendingFollowup(nextPendingFollowup);
                    setCompleteDialogOpen(true);
                  }}
                  className="h-8 gap-1 text-xs border-amber-300 text-amber-900 hover:bg-amber-100"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Done
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsLoggingCall(!isLoggingCall)}
                  className="h-8 gap-1 text-xs text-slate-700"
                >
                  <Plus className="h-3.5 w-3.5" /> Log Call / Note
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3.5">
            <div className="flex items-center gap-2.5 text-xs text-slate-600">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>
                No upcoming follow-up scheduled. Set a reminder so you don't miss following up with{" "}
                <strong className="text-slate-800">{customer.name}</strong>.
              </span>
            </div>
            <div className="flex items-center gap-2">
              {phone && (
                <Button asChild size="sm" variant="outline" className="h-8 gap-1 text-xs">
                  <a href={`tel:${phone}`}>
                    <Phone className="h-3.5 w-3.5" /> Call
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => setIsLoggingCall(true)}
                className="h-8 gap-1.5 bg-cyan-700 text-white hover:bg-cyan-800 text-xs font-bold"
              >
                <CalendarClock className="h-3.5 w-3.5" /> Schedule Call / Log Note
              </Button>
            </div>
          </div>
        )}

        {/* Last Call Summary Pill if recorded */}
        {crmState.last_call_at && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-100/80 px-3 py-2 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">Last Call Update:</span>
            <span>
              {formatDate(crmState.last_call_at)} ·{" "}
              {crmState.last_call_outcome && (
                <span className="font-medium text-cyan-800">[{crmState.last_call_outcome}] </span>
              )}
              {crmState.last_call_notes || "Discussion recorded"}
            </span>
          </div>
        )}

        {/* Quick Call & CRM Note Logger Form (collapsible or expanded) */}
        {isLoggingCall && (
          <div className="rounded-xl border border-cyan-200/90 bg-cyan-50/20 p-4 shadow-xs space-y-4 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between border-b border-cyan-100 pb-2">
              <h4 className="font-display text-sm font-bold text-cyan-950 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-cyan-700" />
                Log Current Call & Schedule Next Reminder
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsLoggingCall(false)}
                className="h-7 text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Call Outcome */}
              <Field label="Call Outcome / Client Sentiment" required>
                <Select value={callOutcome} onValueChange={setCallOutcome}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    {CALL_OUTCOMES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* Client Response Status Update */}
              <Field label="Update Client Response Status">
                <Select
                  value={responseStatus}
                  onValueChange={(val) => {
                    const nextVal = val as CustomerResponseStatus;
                    setResponseStatus(nextVal);
                    if (nextVal === "order_placed" || nextVal === "do_not_contact") {
                      setScheduleNextCall(false);
                    }
                  }}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CUSTOMER_RESPONSE_STATUS_CONFIG) as CustomerResponseStatus[]).map(
                      (statusKey) => {
                        const item = CUSTOMER_RESPONSE_STATUS_CONFIG[statusKey];
                        return (
                          <SelectItem key={statusKey} value={statusKey}>
                            <span className="flex items-center gap-2">
                              <span
                                className={cn("h-2 w-2 rounded-full shrink-0", item.dotColor)}
                              />
                              <span>{item.label}</span>
                            </span>
                          </SelectItem>
                        );
                      },
                    )}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* Current Call Discussion Note */}
            <Field
              label="Discussion Notes / Client Update on this Call"
              hint="Record what the client said, quantities, stone choices, or timeline"
              required
            >
              <Textarea
                rows={3}
                placeholder="e.g. Discussed pricing for Beige Travertine 1200 sq.ft. Client likes the vein-cut sample, requested formal quotation with delivery by Friday."
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
                className="bg-white text-sm"
              />
            </Field>

            {/* Next Call Reminder Scheduling */}
            <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 text-cyan-700" />
                  When to Call / Follow Up Next?
                </label>
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <span>Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => applyPresetDate(1, 10, 30)}
                    className="rounded bg-slate-100 hover:bg-cyan-100 hover:text-cyan-900 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetDate(2, 11, 0)}
                    className="rounded bg-slate-100 hover:bg-cyan-100 hover:text-cyan-900 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700"
                  >
                    In 2 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetDate(5, 11, 30)}
                    className="rounded bg-slate-100 hover:bg-cyan-100 hover:text-cyan-900 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700"
                  >
                    Next Week
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Next Follow-up Date & Time">
                  <Input
                    type="datetime-local"
                    value={nextCallAt}
                    onChange={(e) => setNextCallAt(e.target.value)}
                  />
                </Field>

                <Field label="Contact Channel">
                  <Select
                    value={nextCallChannel}
                    onValueChange={(val) =>
                      setNextCallChannel(val as "call" | "whatsapp" | "meeting")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FOLLOWUP_CHANNELS.map((ch) => (
                        <SelectItem key={ch.value} value={ch.value}>
                          {ch.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Agenda for Next Call / Reminder Reason">
                <Input
                  placeholder="e.g. Call to finalize order confirmation and review quotation"
                  value={nextCallAgenda}
                  onChange={(e) => setNextCallAgenda(e.target.value)}
                />
              </Field>
            </div>

            {/* Action Button */}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLoggingCall(false)}
                disabled={logCallMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => logCallMutation.mutate()}
                disabled={(!callNote.trim() && !nextCallAt) || logCallMutation.isPending}
                className="gap-1.5 bg-cyan-700 text-white hover:bg-cyan-800 font-bold"
              >
                {logCallMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Save Call Note & Set Reminder
              </Button>
            </div>
          </div>
        )}

        {/* History / Previous Calls Toggle */}
        <div className="border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-cyan-800 transition-colors"
          >
            <History className="h-3.5 w-3.5" />
            <span>Previous Call Logs & Follow-up History</span>
            {showHistory ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {showHistory && (
            <div className="mt-2.5 space-y-2 max-h-60 overflow-y-auto pr-1">
              {historyQ.isLoading ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  Loading history...
                </div>
              ) : (historyQ.data ?? []).length === 0 ? (
                <div className="rounded-lg bg-slate-50 p-3 text-center text-xs text-muted-foreground">
                  No previous call records logged yet for this client.
                </div>
              ) : (
                (historyQ.data ?? []).map((h) => {
                  const isDone = h.status === "done";
                  return (
                    <div
                      key={h.id}
                      className={cn(
                        "rounded-lg border p-2.5 text-xs space-y-1 transition-colors",
                        isDone ? "border-slate-200 bg-white" : "border-amber-200 bg-amber-50/30",
                      )}
                    >
                      <div className="flex items-center justify-between text-slate-500">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span className="capitalize font-bold text-slate-800">{h.channel}</span>
                          <span>·</span>
                          <span>{formatDate(h.scheduled_at)}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] uppercase font-mono",
                            isDone
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-amber-50 text-amber-800 border-amber-200",
                          )}
                        >
                          {h.status}
                        </Badge>
                      </div>

                      {h.notes && (
                        <p className="text-slate-700">
                          <span className="font-semibold text-slate-500">Agenda:</span> {h.notes}
                        </p>
                      )}

                      {h.outcome_notes && (
                        <p className="rounded bg-slate-50 px-2 py-1 text-slate-800 font-medium">
                          <span className="font-semibold text-cyan-800">Outcome:</span>{" "}
                          {h.outcome_notes}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </CardContent>

      {/* Dialog for completing follow-up with outcome note */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Follow-up Call</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              What was the client's update on this call? Record their response to keep the CRM
              updated.
            </p>
            <Field label="Call Outcome & Client Response Note" required>
              <Textarea
                rows={3}
                placeholder="e.g. Client agreed on tile specs. Will visit the showroom on Monday."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
              />
            </Field>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setCompleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-700 text-white hover:bg-emerald-800 font-bold"
              disabled={completeMutation.isPending}
              onClick={() => {
                if (!selectedPendingFollowup) return;
                completeMutation.mutate({
                  id: selectedPendingFollowup.id,
                  notes: completionNotes.trim() || undefined,
                });
              }}
            >
              {completeMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Confirm Completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
