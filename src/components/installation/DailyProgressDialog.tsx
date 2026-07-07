/** Daily site progress dialog. */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { createProgress } from "@/lib/installation/progress";
import { invalidateInstallation } from "@/lib/query-invalidation";
import { toUserMessage } from "@/lib/errors";

export function DailyProgressDialog({ installationId }: { installationId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    report_date: new Date().toISOString().slice(0, 10),
    work_completed: "",
    area_completed_sqft: "",
    balance_work: "",
    labour_present: "",
    material_consumed: "",
    material_shortage: "",
    safety_observations: "",
    customer_remarks: "",
    supervisor_remarks: "",
    progress_pct: "",
  });

  const mut = useMutation({
    mutationFn: () =>
      createProgress({
        installation_id: installationId,
        report_date: form.report_date,
        work_completed: form.work_completed || null,
        area_completed_sqft: form.area_completed_sqft ? Number(form.area_completed_sqft) : null,
        balance_work: form.balance_work || null,
        labour_present: form.labour_present ? Number(form.labour_present) : null,
        material_consumed: form.material_consumed || null,
        material_shortage: form.material_shortage || null,
        safety_observations: form.safety_observations || null,
        customer_remarks: form.customer_remarks || null,
        supervisor_remarks: form.supervisor_remarks || null,
        progress_pct: form.progress_pct ? Number(form.progress_pct) : null,
      }),
    onSuccess: () => {
      toast.success("Progress reported");
      invalidateInstallation(qc, installationId);
      setOpen(false);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Daily report</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Daily site progress</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Date</Label>
            <Input type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Progress %</Label>
            <Input type="number" min={0} max={100} value={form.progress_pct} onChange={(e) => setForm({ ...form, progress_pct: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Area completed (sqft)</Label>
            <Input type="number" step="0.01" value={form.area_completed_sqft} onChange={(e) => setForm({ ...form, area_completed_sqft: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Labour present</Label>
            <Input type="number" value={form.labour_present} onChange={(e) => setForm({ ...form, labour_present: e.target.value })} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Work completed</Label>
            <Textarea rows={2} value={form.work_completed} onChange={(e) => setForm({ ...form, work_completed: e.target.value })} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Balance work</Label>
            <Textarea rows={2} value={form.balance_work} onChange={(e) => setForm({ ...form, balance_work: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Material consumed</Label>
            <Textarea rows={2} value={form.material_consumed} onChange={(e) => setForm({ ...form, material_consumed: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Material shortage</Label>
            <Textarea rows={2} value={form.material_shortage} onChange={(e) => setForm({ ...form, material_shortage: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Safety observations</Label>
            <Textarea rows={2} value={form.safety_observations} onChange={(e) => setForm({ ...form, safety_observations: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Customer remarks</Label>
            <Textarea rows={2} value={form.customer_remarks} onChange={(e) => setForm({ ...form, customer_remarks: e.target.value })} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Supervisor remarks</Label>
            <Textarea rows={2} value={form.supervisor_remarks} onChange={(e) => setForm({ ...form, supervisor_remarks: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
