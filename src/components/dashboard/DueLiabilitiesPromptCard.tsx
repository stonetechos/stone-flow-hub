import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  CreditCard,
  Building,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Plus,
  ArrowRight,
  Receipt,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { qk } from "@/lib/query-keys";
import { recordLiabilityPayment } from "@/lib/liabilities/api";
import type { LiabilityPaymentInput } from "@/lib/liabilities/schema";
import {
  useDueLiabilityPrompts,
  type DueLiabilityPromptItem,
} from "@/lib/liabilities/liability-prompts";

export function DueLiabilitiesPromptCard() {
  const qc = useQueryClient();
  const { items = [], isLoading } = useDueLiabilityPrompts();
  const [selectedItem, setSelectedItem] = useState<DueLiabilityPromptItem | null>(null);
  const [entryModalOpen, setEntryModalOpen] = useState(false);

  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState("Bank Transfer");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");

  const recordPaymentMut = useMutation({
    mutationFn: (input: LiabilityPaymentInput) => recordLiabilityPayment(input),
    onSuccess: (res) => {
      toast.success("Liability payment entry recorded successfully!");
      qc.invalidateQueries({ queryKey: qk.liabilities.payments() });
      qc.invalidateQueries({ queryKey: qk.liabilities.list() });
      setEntryModalOpen(false);
      setSelectedItem(null);
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Failed to record payment entry");
    },
  });

  if (isLoading || items.length === 0) {
    return null;
  }

  const handleOpenEntry = (item: DueLiabilityPromptItem) => {
    setSelectedItem(item);
    setAmount(String(item.amount));
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setReferenceNo("");
    setNotes(`Paid for ${item.monthName}`);
    setEntryModalOpen(true);
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    recordPaymentMut.mutate({
      liability_id: selectedItem.id,
      payment_date: paymentDate,
      amount: numAmount,
      payment_mode: paymentMode,
      reference_no: referenceNo || null,
      month_for: `${selectedItem.monthName} ${new Date().getFullYear()}`,
      notes: notes || null,
    });
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent p-3 sm:p-5 shadow-sm transition-all w-full max-w-full min-w-0">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-rose-500/15 blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 min-w-0">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              <CreditCard className="h-5 w-5 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground text-sm sm:text-base">
                  Liabilities & Loan EMIs Due This Month
                </h3>
                <Badge
                  variant="outline"
                  className="bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30 text-xs font-semibold px-2 py-0.5"
                >
                  Action Required
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 break-words">
                The rent and recurring liabilities of this month are now due. If you have already
                paid, kindly make the entry below to keep your ledger up to date.
              </p>
            </div>
          </div>

          <Link
            to="/liabilities"
            className="inline-flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-300 hover:underline font-semibold shrink-0 self-start sm:self-auto bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20"
          >
            <span>View All Liabilities</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Liabilities Due List */}
        <div className="grid gap-2.5">
          {items.map((item) => {
            const isDueToday = item.daysRemaining === 0 && item.dueDay !== null;
            const isOverdue = item.isOverdue;

            return (
              <div
                key={item.id}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-background/80 hover:bg-background transition-colors",
                  isOverdue
                    ? "border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10"
                    : isDueToday
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-border/70 hover:border-rose-500/50",
                )}
              >
                {/* Account Details */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                      {item.isRent ? (
                        <Building className="h-4 w-4 text-rose-600 shrink-0" />
                      ) : (
                        <CreditCard className="h-4 w-4 text-primary shrink-0" />
                      )}
                      {item.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono uppercase px-1.5 py-0 bg-slate-100 dark:bg-slate-800"
                    >
                      {item.isRent ? "Rent" : item.isLoan ? "Loan EMI" : "Liability"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="font-mono font-semibold text-foreground">
                      {formatInr(item.amount)}
                    </span>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                      Due: {item.dueDateText}
                    </span>
                    {item.notes && (
                      <>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="truncate max-w-[200px]">{item.notes}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status Badge & Make Entry Button */}
                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-semibold px-2 py-0.5",
                        isOverdue
                          ? "bg-rose-500/15 text-rose-700 border-rose-500/30 font-bold"
                          : isDueToday
                            ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                            : "bg-blue-500/10 text-blue-700 border-blue-500/30",
                      )}
                    >
                      {isOverdue
                        ? `Overdue (${Math.abs(item.daysRemaining)}d ago)`
                        : isDueToday
                          ? "Due Today"
                          : `Due in ${item.daysRemaining} days`}
                    </Badge>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleOpenEntry(item)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-8 px-3 shadow-xs"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    <span>Make Entry</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Record Payment Entry Dialog */}
      <Dialog open={entryModalOpen} onOpenChange={setEntryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              <span>Record Liability / Rent Payment</span>
            </DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <form onSubmit={handleSaveEntry} className="space-y-4">
              <DialogBody className="space-y-3 pt-2">
                <div className="rounded-lg bg-muted/50 p-3 border border-border/80">
                  <div className="text-xs text-muted-foreground uppercase font-medium">Account</div>
                  <div className="font-semibold text-foreground text-sm flex items-center justify-between mt-0.5">
                    <span>{selectedItem.name}</span>
                    <span className="font-mono text-emerald-600 font-bold">
                      {formatInr(selectedItem.amount)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Payment Date</Label>
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      required
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Amount (₹)</Label>
                    <Input
                      type="number"
                      step="any"
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="h-9 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Payment Mode</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</SelectItem>
                      <SelectItem value="UPI">UPI / Google Pay</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Auto Debit">Auto Debit / Bank Mandate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">UTR / Cheque / Reference No.</Label>
                  <Input
                    placeholder="e.g. UTR429182019283"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Notes / Remarks</Label>
                  <Textarea
                    rows={2}
                    placeholder="Paid from Bank of Baroda account..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </DialogBody>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEntryModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={recordPaymentMut.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{recordPaymentMut.isPending ? "Recording…" : "Save Entry"}</span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
