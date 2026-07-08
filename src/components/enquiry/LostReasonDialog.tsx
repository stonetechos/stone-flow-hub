import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LOST_REASONS } from "@/lib/constants";
import type { LeadStage } from "@/lib/types";

/**
 * Captures a required reason (and optional notes) whenever a user moves an
 * enquiry into a terminal Lost or Cancelled state. Shared between the CRM
 * list and the lead detail so the capture rule is identical everywhere.
 */
export function LostReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  stage,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (reason: string, notes: string | null) => void;
  stage: LeadStage;
}) {
  const [reason, setReason] = useState<string>(LOST_REASONS[0]);
  const [notes, setNotes] = useState("");
  useEffect(() => {
    if (open) {
      setReason(LOST_REASONS[0]);
      setNotes("");
    }
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as {stage === "cancelled" ? "cancelled" : "lost"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Reason</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOST_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Notes (optional)
            </label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => onConfirm(reason, notes.trim() || null)}>Confirm</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
