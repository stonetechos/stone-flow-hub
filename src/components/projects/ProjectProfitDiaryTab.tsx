import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Truck,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Save,
  Loader2,
  CheckCircle2,
  HelpCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field } from "@/components/forms/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getProjectFinancialRollup,
  saveProjectCostingDiary,
  type ProjectCostingDiary,
  type ProjectCostItemLog,
} from "@/lib/projects/costing-diary";
import { formatInr, formatDate } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

interface ProjectProfitDiaryTabProps {
  projectId: string;
}

export function ProjectProfitDiaryTab({ projectId }: ProjectProfitDiaryTabProps) {
  const qc = useQueryClient();

  // Query financial rollup & costing diary
  const rollupQ = useQuery({
    queryKey: ["project-profit-diary", projectId],
    queryFn: () => getProjectFinancialRollup(projectId),
    staleTime: 30_000,
  });

  const [diary, setDiary] = useState<ProjectCostingDiary>({});
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);

  // New Event Form State
  const [eventCategory, setEventCategory] = useState<ProjectCostItemLog["category"]>("carting");
  const [eventTitle, setEventTitle] = useState("");
  const [eventAmount, setEventAmount] = useState("");
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [eventNotes, setEventNotes] = useState("");

  // Sync state when data loads
  useEffect(() => {
    if (rollupQ.data?.costing) {
      setDiary(rollupQ.data.costing);
    }
  }, [rollupQ.data?.costing]);

  const saveMutation = useMutation({
    mutationFn: (updated: ProjectCostingDiary) => saveProjectCostingDiary(projectId, updated),
    onSuccess: () => {
      toast.success("Project profit diary & costing updated!");
      void qc.invalidateQueries({ queryKey: ["project-profit-diary", projectId] });
      void qc.invalidateQueries({ queryKey: ["project_360_finance", projectId] });
      void qc.invalidateQueries({ queryKey: ["exec", "profitability"] });
      void qc.invalidateQueries({ queryKey: ["salesperson-profitability"] });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const handleFieldChange = (field: keyof ProjectCostingDiary, val: string) => {
    const num = val === "" ? null : Number(val);
    setDiary((prev) => ({
      ...prev,
      [field]: num,
    }));
  };

  const handleSaveDiary = () => {
    saveMutation.mutate(diary);
  };

  const handleAddCostEvent = () => {
    if (!eventTitle.trim() || !eventAmount) {
      toast.error("Please enter a title and amount for this cost event");
      return;
    }

    const newLog: ProjectCostItemLog = {
      id: crypto.randomUUID(),
      date: eventDate,
      category: eventCategory,
      title: eventTitle.trim(),
      amount: Math.max(0, Number(eventAmount) || 0),
      notes: eventNotes.trim() || undefined,
    };

    const existingLogs = diary.cost_logs || [];
    const updatedLogs = [newLog, ...existingLogs];

    // Automatically accumulate into the parent category field
    const updatedDiary: ProjectCostingDiary = {
      ...diary,
      cost_logs: updatedLogs,
    };

    if (eventCategory === "carting") {
      updatedDiary.local_carting_cost = Number(diary.local_carting_cost || 0) + newLog.amount;
    } else if (eventCategory === "damage") {
      updatedDiary.damage_cost = Number(diary.damage_cost || 0) + newLog.amount;
    } else if (eventCategory === "writeoff") {
      updatedDiary.writeoff_discount = Number(diary.writeoff_discount || 0) + newLog.amount;
    } else if (eventCategory === "transport") {
      updatedDiary.transport_cost = Number(diary.transport_cost || 0) + newLog.amount;
    } else if (eventCategory === "purchase") {
      updatedDiary.purchase_cost = Number(diary.purchase_cost || 0) + newLog.amount;
    }

    setDiary(updatedDiary);
    saveMutation.mutate(updatedDiary);

    // Reset dialog
    setEventTitle("");
    setEventAmount("");
    setEventNotes("");
    setIsEventDialogOpen(false);
  };

  const handleDeleteCostLog = (logId: string) => {
    const updatedLogs = (diary.cost_logs || []).filter((l) => l.id !== logId);
    const updatedDiary = { ...diary, cost_logs: updatedLogs };
    setDiary(updatedDiary);
    saveMutation.mutate(updatedDiary);
  };

  if (rollupQ.isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-700" />
        <span>Loading project profit diary & cost ledger...</span>
      </div>
    );
  }

  const data = rollupQ.data;
  if (!data) return null;

  // Real-time calculations based on local diary inputs
  const currentPurchase = Number(diary.purchase_cost || 0);
  const currentTransport = Number(diary.transport_cost || 0);
  const currentCarting = Number(diary.local_carting_cost || 0);
  const currentAdhesive = Number(diary.adhesive_cost || 0);
  const currentSealer = Number(diary.sealer_cost || 0);
  const currentLabour = Number(diary.labour_cost || 0);
  const currentDamage = Number(diary.damage_cost || 0);
  const currentWriteoff = Number(diary.writeoff_discount || 0);
  const currentOther = Number(diary.other_cost || 0);

  const totalCalculatedCosts =
    currentPurchase +
    currentTransport +
    currentCarting +
    currentAdhesive +
    currentSealer +
    currentLabour +
    currentDamage +
    currentWriteoff +
    currentOther;

  const effectiveRevenue =
    data.moneyCollected > 0 ? data.moneyCollected : data.invoicedValue || data.quotedValue;

  const currentNetProfit = effectiveRevenue - totalCalculatedCosts;
  const currentMarginPct = effectiveRevenue > 0 ? (currentNetProfit / effectiveRevenue) * 100 : 0;
  const hasLeakage = currentDamage > 0 || currentWriteoff > 0;

  return (
    <div className="space-y-6">
      {/* 1. Header Profit & Realized Financials Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-cyan-700" />
              Quoted / Invoiced
            </span>
            <div className="text-xl font-bold text-slate-900">
              {formatInr(data.invoicedValue || data.quotedValue)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Quoted: {formatInr(data.quotedValue)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200/90 bg-emerald-50/40">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-emerald-600" />
              Money Collected (Cash)
            </span>
            <div className="text-xl font-bold text-emerald-950">
              {formatInr(data.moneyCollected)}
            </div>
            <p className="text-[11px] text-emerald-800">
              Balance Due: {formatInr(data.balanceDue)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200/90 bg-amber-50/40">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-amber-600" />
              Total Actual Costs
            </span>
            <div className="text-xl font-bold text-amber-950">
              {formatInr(totalCalculatedCosts)}
            </div>
            <p className="text-[11px] text-amber-800">Direct & transit expenses</p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "border shadow-xs",
            currentNetProfit >= 0
              ? "border-emerald-300 bg-emerald-500/10"
              : "border-rose-300 bg-rose-500/10",
          )}
        >
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
              Realized Net Profit
            </span>
            <div
              className={cn(
                "text-xl font-extrabold",
                currentNetProfit >= 0 ? "text-emerald-900" : "text-rose-900",
              )}
            >
              {formatInr(currentNetProfit)}
            </div>
            <p className="text-[11px] font-semibold text-slate-700">
              Margin: {currentMarginPct.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-indigo-200/90 bg-indigo-50/40">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-600" />
              Salesperson
            </span>
            <div className="text-base font-bold capitalize text-indigo-950">
              👤 {data.salesperson}
            </div>
            <p className="text-[11px] text-indigo-700">
              {data.dispatchCount} dispatches · {data.invoiceCount} invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Profit Leakage Alert (if Damage or Write-off exists) */}
      {hasLeakage && (
        <div className="rounded-xl border border-rose-300 bg-rose-50/70 p-3.5 flex flex-wrap items-start justify-between gap-3 text-rose-950">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold">
                Profit Leakage Alert: ₹{formatInr(currentDamage + currentWriteoff)} Lost to Damages
                / Delays
              </h4>
              <p className="text-xs text-rose-800 mt-0.5">
                {currentDamage > 0 && (
                  <span>
                    • Transit damage / replacement cost:{" "}
                    <strong>{formatInr(currentDamage)}</strong>{" "}
                  </span>
                )}
                {currentWriteoff > 0 && (
                  <span>
                    • Schedule delay / customer write-offs:{" "}
                    <strong>{formatInr(currentWriteoff)}</strong>
                  </span>
                )}
              </p>
            </div>
          </div>
          <Badge variant="destructive" className="font-mono text-xs">
            -
            {(currentDamage + currentWriteoff > 0 && effectiveRevenue > 0
              ? ((currentDamage + currentWriteoff) / effectiveRevenue) * 100
              : 0
            ).toFixed(1)}
            % Profit Drag
          </Badge>
        </div>
      )}

      {/* 3. The Project Costing Input Sheet (Blank Boxes with Easy Save) */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-cyan-700" />
              Project Costing & Realized Expenses Diary
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter the procurement prices and operational site costs to calculate exact net profit
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEventDialogOpen(true)}
              className="h-8 gap-1.5 text-xs text-slate-700 hover:bg-slate-100"
            >
              <Plus className="h-3.5 w-3.5" /> Log Delivery / Part Expense
            </Button>
            <Button
              size="sm"
              onClick={handleSaveDiary}
              disabled={saveMutation.isPending}
              className="h-8 gap-1.5 bg-cyan-700 text-white hover:bg-cyan-800 font-bold text-xs"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save Cost Sheet
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Stone Purchase Price */}
            <Field
              label="Stone Material Purchase Price (₹)"
              hint="Raw slab / stone procurement cost from quarry/vendor"
            >
              <Input
                type="number"
                placeholder="e.g. 150000"
                value={diary.purchase_cost ?? ""}
                onChange={(e) => handleFieldChange("purchase_cost", e.target.value)}
                className="bg-white font-mono"
              />
            </Field>

            {/* Main Transport / Freight */}
            <Field
              label="Main Transport / Freight (₹)"
              hint="Interstate freight from quarry/factory to yard"
            >
              <Input
                type="number"
                placeholder="e.g. 18000"
                value={diary.transport_cost ?? ""}
                onChange={(e) => handleFieldChange("transport_cost", e.target.value)}
                className="bg-white font-mono"
              />
            </Field>

            {/* Local Carting */}
            <Field
              label="Local Carting / Tempo to Site (₹)"
              hint="Delivery tempo trips to customer site"
            >
              <Input
                type="number"
                placeholder="e.g. 3500"
                value={diary.local_carting_cost ?? ""}
                onChange={(e) => handleFieldChange("local_carting_cost", e.target.value)}
                className="bg-white font-mono"
              />
            </Field>

            {/* Installation & Application Labour */}
            <Field
              label="Installation & Application Labour (₹)"
              hint="Contractor fitting / cladding / polishing labour"
            >
              <Input
                type="number"
                placeholder="e.g. 25000"
                value={diary.labour_cost ?? ""}
                onChange={(e) => handleFieldChange("labour_cost", e.target.value)}
                className="bg-white font-mono"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Adhesives Cost & Bags */}
            <Field
              label="Adhesive Chemicals Cost (₹)"
              hint={
                diary.adhesive_bags
                  ? `${diary.adhesive_bags} bags entered`
                  : "Chemical mortar / adhesive bags"
              }
            >
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="₹ Cost"
                  value={diary.adhesive_cost ?? ""}
                  onChange={(e) => handleFieldChange("adhesive_cost", e.target.value)}
                  className="bg-white font-mono"
                />
                <Input
                  type="number"
                  placeholder="Bags"
                  value={diary.adhesive_bags ?? ""}
                  onChange={(e) => handleFieldChange("adhesive_bags", e.target.value)}
                  className="w-20 bg-white text-xs"
                  title="Bag count"
                />
              </div>
            </Field>

            {/* Sealers Cost & Litres */}
            <Field
              label="Chemical Sealers & Impregnators (₹)"
              hint={
                diary.sealer_litres
                  ? `${diary.sealer_litres} L / cans entered`
                  : "Protection chemical sealer cans"
              }
            >
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="₹ Cost"
                  value={diary.sealer_cost ?? ""}
                  onChange={(e) => handleFieldChange("sealer_cost", e.target.value)}
                  className="bg-white font-mono"
                />
                <Input
                  type="number"
                  placeholder="Ltrs"
                  value={diary.sealer_litres ?? ""}
                  onChange={(e) => handleFieldChange("sealer_litres", e.target.value)}
                  className="w-20 bg-white text-xs"
                  title="Litres / Cans"
                />
              </div>
            </Field>

            {/* Transit Damage & Replacement Slabs */}
            <Field
              label="Transit Damage & Replacements (₹)"
              hint="Loss from broken slabs & replacement delivery"
            >
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={diary.damage_cost ?? ""}
                onChange={(e) => handleFieldChange("damage_cost", e.target.value)}
                className="bg-white font-mono text-rose-900 border-rose-200"
              />
            </Field>

            {/* Late Delivery Write-offs / Deductions */}
            <Field
              label="Late Schedule Write-offs / Deductions (₹)"
              hint="Amounts lost / settled due to delayed schedule"
            >
              <Input
                type="number"
                placeholder="e.g. 4000"
                value={diary.writeoff_discount ?? ""}
                onChange={(e) => handleFieldChange("writeoff_discount", e.target.value)}
                className="bg-white font-mono text-rose-900 border-rose-200"
              />
            </Field>
          </div>

          {/* Diary Notes */}
          <Field
            label="Project Costing & Delivery Notes"
            hint="Record remarks on split deliveries, quarry delays, damaged lot handling, or extra site expenses"
          >
            <Textarea
              rows={2}
              placeholder="e.g. Received material in 3 parts from Makrana quarry. 2nd delivery had 3 broken slabs replaced at cost of ₹4,200. Client deducted ₹5,000 for delay."
              value={diary.notes ?? ""}
              onChange={(e) =>
                setDiary((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              className="bg-white text-sm"
            />
          </Field>
        </CardContent>
      </Card>

      {/* 4. Split Delivery & Incident Log ("Project Incident & Cost Diary") */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-700" />
              Delivery Parts & Incident Diary Log
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Specific events logged for partial deliveries, freight payments, replacements, and
              write-offs
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEventDialogOpen(true)}
            className="h-8 gap-1.5 text-xs text-slate-700"
          >
            <Plus className="h-3.5 w-3.5" /> Log Event
          </Button>
        </CardHeader>

        <CardContent>
          {(diary.cost_logs || []).length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-muted-foreground">
              No specific delivery or cost incidents logged yet. Click <strong>"Log Event"</strong>{" "}
              to record partial shipments, extra carting, or damaged slab replacements.
            </div>
          ) : (
            <div className="space-y-2">
              {(diary.cost_logs || []).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "uppercase text-[10px] font-mono",
                          log.category === "damage" || log.category === "writeoff"
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : "bg-slate-100 text-slate-800",
                        )}
                      >
                        {log.category}
                      </Badge>
                      <span className="font-semibold text-slate-900 text-sm">{log.title}</span>
                      <span className="text-muted-foreground text-[11px]">
                        · {formatDate(log.date)}
                      </span>
                    </div>
                    {log.notes && <p className="text-slate-600 pl-1">{log.notes}</p>}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {formatInr(log.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCostLog(log.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Delete entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog for Logging Event */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Delivery Part or Cost Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Event Category" required>
              <Select
                value={eventCategory}
                onValueChange={(v) => setEventCategory(v as ProjectCostItemLog["category"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="carting">🛻 Local Carting (Tempo)</SelectItem>
                  <SelectItem value="damage">⚠️ Transit Damage / Replacement</SelectItem>
                  <SelectItem value="writeoff">📉 Delay Write-off / Deduction</SelectItem>
                  <SelectItem value="transport">🚛 Main Freight / Transport</SelectItem>
                  <SelectItem value="purchase">🏷️ Stone Material Purchase</SelectItem>
                  <SelectItem value="adhesive">🧪 Adhesives</SelectItem>
                  <SelectItem value="sealer">🪣 Chemical Sealers</SelectItem>
                  <SelectItem value="labour">👷 Labour</SelectItem>
                  <SelectItem value="other">📦 Other Site Expense</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Event Title / Description *" required>
              <Input
                placeholder="e.g. 2nd Part Delivery: 3 Broken Slabs Replacement"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Amount (₹) *" required>
                <Input
                  type="number"
                  placeholder="e.g. 4200"
                  value={eventAmount}
                  onChange={(e) => setEventAmount(e.target.value)}
                />
              </Field>

              <Field label="Date">
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Notes / Reason">
              <Textarea
                rows={2}
                placeholder="Details of what happened, vehicle number, or client agreed discount"
                value={eventNotes}
                onChange={(e) => setEventNotes(e.target.value)}
              />
            </Field>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEventDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddCostEvent}
              className="bg-cyan-700 text-white hover:bg-cyan-800 font-bold"
            >
              Add to Diary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
