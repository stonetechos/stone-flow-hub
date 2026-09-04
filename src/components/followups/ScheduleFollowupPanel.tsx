/** Small, focused "Schedule follow-up" control for a detail page that
 *  already knows its own entity (a Quote awaiting approval, say). Unlike
 *  the generic Follow-ups module's form, this skips the entity-type and
 *  entity picker — both are already known — and just asks when, how, and
 *  any notes. Shows the next pending follow-up (if any) alongside it,
 *  reusing NextFollowupChip so it looks the same as everywhere else this
 *  is already surfaced (Customer Hub, Enquiry list). */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/forms/Field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { createFollowup, listFollowups } from "@/lib/followups/api";
import { FOLLOWUP_CHANNELS, type FollowupEntityType } from "@/lib/followups/schema";
import { invalidateFollowup } from "@/lib/query-invalidation";
import { NextFollowupChip } from "@/components/enquiry/NextFollowupChip";

type Channel = (typeof FOLLOWUP_CHANNELS)[number]["value"];

export function ScheduleFollowupPanel({
  entityType,
  entityId,
}: {
  entityType: FollowupEntityType;
  entityId: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [channel, setChannel] = useState<Channel>("call");
  const [notes, setNotes] = useState("");

  const nextQ = useQuery({
    queryKey: qk.followups.byEntity(entityType, entityId),
    queryFn: () => listFollowups({ entityType, entityId, scope: "pending", limit: 1 }),
  });
  const next = (nextQ.data ?? [])[0] ?? null;

  const mut = useMutation({
    mutationFn: () =>
      createFollowup({
        entity_type: entityType,
        entity_id: entityId,
        scheduled_at: scheduledAt,
        channel,
        notes: notes || null,
      }),
    onSuccess: () => {
      toast.success("Follow-up scheduled");
      invalidateFollowup(qc, { entityType, entityId });
      setOpen(false);
      setScheduledAt("");
      setChannel("call");
      setNotes("");
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {next ? (
        <NextFollowupChip
          next={{
            id: next.id,
            scheduled_at: next.scheduled_at,
            assigned_to: null,
            channel: next.channel,
          }}
        />
      ) : (
        <span className="text-xs text-muted-foreground">No follow-up scheduled</span>
      )}
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <CalendarClock className="mr-1.5 h-3.5 w-3.5" /> Schedule follow-up
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Schedule follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="When" required>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </Field>
            <Field label="Channel">
              <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
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
            <Field label="Notes">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </Field>
            <Button
              type="button"
              className="w-full"
              disabled={!scheduledAt || mut.isPending}
              onClick={() => mut.mutate()}
            >
              {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
