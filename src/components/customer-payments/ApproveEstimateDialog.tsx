import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { approveEstimate, type ScheduleMilestone } from "@/lib/customer-payments/schedule";
import { toUserMessage } from "@/lib/errors";
import { formatInr } from "@/lib/format";
import { invalidateEstimate } from "@/lib/query-invalidation";
import { confirmCloseIfDirty } from "@/hooks/use-unsaved-changes";

export interface ApproveEstimateDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  estimateId: string;
  estimateTotal: number;
  template: string;
  currentSchedule: { label: string; pct: number; due_offset_days: number }[];
  onApproved?: () => void;
}

function defaultFor(template: string, total: number): ScheduleMilestone[] {
  if (template === "material_install" || template === "custom_manufacturing") {
    if (total <= 75000)
      return [
        { label: "Advance", pct: 75, due_offset_days: 0 },
        { label: "On Completion", pct: 25, due_offset_days: 15 },
      ];
    if (total <= 300000)
      return [
        { label: "Advance", pct: 40, due_offset_days: 0 },
        { label: "On Delivery", pct: 40, due_offset_days: 15 },
        { label: "On Completion", pct: 20, due_offset_days: 30 },
      ];
    return [
      { label: "Advance", pct: 50, due_offset_days: 0 },
      { label: "On Completion", pct: 50, due_offset_days: 30 },
    ];
  }
  return [
    { label: "Advance", pct: 80, due_offset_days: 0 },
    { label: "Before Dispatch", pct: 20, due_offset_days: 20 },
  ];
}

export function ApproveEstimateDialog(props: ApproveEstimateDialogProps) {
  const { open, onOpenChange, estimateId, estimateTotal, template, currentSchedule, onApproved } =
    props;
  const qc = useQueryClient();
  const [rows, setRows] = useState<ScheduleMilestone[]>([]);

  // Snapshot for the unsaved-changes close guard.
  const initialSnapshot = useRef("");

  useEffect(() => {
    if (!open) return;
    const next = currentSchedule.length
      ? currentSchedule.map((s) => ({
          label: s.label,
          pct: Number(s.pct),
          due_offset_days: Number(s.due_offset_days),
        }))
      : defaultFor(template, estimateTotal);
    setRows(next);
    initialSnapshot.current = JSON.stringify(next);
  }, [open, currentSchedule, template, estimateTotal]);

  const dirty = open && initialSnapshot.current !== JSON.stringify(rows);

  const totalPct = rows.reduce((s, r) => s + Number(r.pct || 0), 0);
  const valid = Math.abs(totalPct - 100) < 0.01 && rows.every((r) => r.label.trim());

  const mut = useMutation({
    mutationFn: () => approveEstimate(estimateId, rows),
    onSuccess: () => {
      toast.success("Estimate approved. Payment schedule created.");
      invalidateEstimate(qc, estimateId);
      qc.invalidateQueries({ queryKey: ["customer-payments"] });
      onOpenChange(false);
      onApproved?.();
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const applyStoneTechDefault = () => setRows(defaultFor(template, estimateTotal));

  // Ctrl/Cmd+Enter submits, matching the shortcut
  // convention used across the other converted dialogs.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (!valid || mut.isPending) return;
        e.preventDefault();
        mut.mutate();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, valid, mut]);

  return (
    <Dialog open={open} onOpenChange={(o) => confirmCloseIfDirty(o, dirty) && onOpenChange(o)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Approve estimate &amp; create payment schedule</DialogTitle>
        </DialogHeader>
        <div className="text-xs text-muted-foreground">
          Total value:{" "}
          <span className="font-semibold text-foreground">{formatInr(estimateTotal)}</span>. Rows
          must add up to 100% — negotiate freely; the final split becomes the contractual schedule.
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Stone Tech policy is preloaded — edit as needed.
          </div>
          <Button variant="ghost" size="sm" onClick={applyStoneTechDefault}>
            Reset to policy default
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Milestone</TableHead>
              <TableHead className="text-right w-24">%</TableHead>
              <TableHead className="text-right w-32">Amount</TableHead>
              <TableHead className="text-right w-32">Due in (days)</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Input
                    value={r.label}
                    onChange={(e) =>
                      setRows((v) =>
                        v.map((row, idx) => (idx === i ? { ...row, label: e.target.value } : row)),
                      )
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    className="text-right"
                    value={r.pct}
                    onChange={(e) =>
                      setRows((v) =>
                        v.map((row, idx) =>
                          idx === i ? { ...row, pct: Number(e.target.value) } : row,
                        ),
                      )
                    }
                  />
                </TableCell>
                <TableCell className="text-right text-sm">
                  {formatInr((estimateTotal * (r.pct || 0)) / 100)}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    className="text-right"
                    value={r.due_offset_days}
                    onChange={(e) =>
                      setRows((v) =>
                        v.map((row, idx) =>
                          idx === i ? { ...row, due_offset_days: Number(e.target.value) } : row,
                        ),
                      )
                    }
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRows((v) => v.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRows((v) => [...v, { label: "", pct: 0, due_offset_days: 0 }])}
          >
            <Plus className="mr-2 h-4 w-4" /> Add milestone
          </Button>
          <div
            className={`text-sm ${Math.abs(totalPct - 100) < 0.01 ? "text-status-success-fg" : "text-destructive"}`}
          >
            Total: {totalPct.toFixed(2)}%
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => confirmCloseIfDirty(false, dirty) && onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={() => mut.mutate()} disabled={!valid || mut.isPending}>
            {mut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Approve estimate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
