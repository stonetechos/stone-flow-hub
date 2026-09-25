/**
 * Transaction Message Reader & Ingestion Modal.
 *
 * Reads and reconciles SMS / UPI transaction notifications from:
 * Paytm, Google Pay, PhonePe, and Banks (SBI, HDFC, ICICI, Axis, etc.).
 */
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Landmark,
  MessageSquareText,
  ClipboardPaste,
  CheckCircle2,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Building,
  User,
  CreditCard,
  Hash,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseMultipleTransactionMessages, type ParsedTransaction } from "@/lib/banking/sms-parser";
import {
  listBankAccounts,
  recordBankTransaction,
  type BankAccountRow,
} from "@/lib/banking/banking";
import { listCustomers } from "@/lib/customers/api";
import { formatInr } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAccountId?: string;
  onSuccess?: () => void;
}

export function TransactionMessageReaderModal({
  open,
  onOpenChange,
  defaultAccountId,
  onSuccess,
}: Props) {
  const qc = useQueryClient();
  const [inputText, setInputText] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccountId || "");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [notes, setNotes] = useState("");

  const accountsQuery = useQuery({
    queryKey: ["banking", "accounts"],
    queryFn: listBankAccounts,
  });

  const customersQuery = useQuery({
    queryKey: ["customers", "lookup"],
    queryFn: () => listCustomers(""),
  });

  // Effective account
  const accounts = useMemo(() => accountsQuery.data || [], [accountsQuery.data]);
  const currentAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  }, [accounts, selectedAccountId]);

  // Parse messages live
  const parsedItems = useMemo(() => {
    return parseMultipleTransactionMessages(inputText);
  }, [inputText]);

  // Read clipboard
  const handlePasteClipboard = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const clip = await navigator.clipboard.readText();
        if (clip) {
          setInputText(clip);
          toast.success("Message pasted from clipboard");
          return;
        }
      }
      toast.info("Please paste the message into the box manually");
    } catch {
      toast.info("Clipboard access blocked. Please paste directly into the box.");
    }
  };

  // Mutation to record transaction
  const recordMutation = useMutation({
    mutationFn: async (item: ParsedTransaction) => {
      const accId = currentAccount?.id;
      return recordBankTransaction({
        bank_account_id: accId,
        source: item.source,
        transaction_type: item.transaction_type,
        amount: item.amount,
        utr_number: item.utr_number,
        counterparty_name: item.counterparty_name,
        raw_message: item.raw,
        status: "reconciled",
        customer_id:
          selectedCustomerId && selectedCustomerId !== "none" ? selectedCustomerId : null,
        notes: notes || `Auto-ingested from ${item.source.toUpperCase()} message`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banking"] });
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Transaction recorded & balance updated");
      setInputText("");
      setNotes("");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to record transaction");
    },
  });

  const handleRecordAll = async () => {
    for (const item of parsedItems) {
      await recordMutation.mutateAsync(item);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 shadow-xs dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400">
              <MessageSquareText className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-foreground font-display">
                Read Bank, Paytm &amp; UPI Message
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Paste SMS, Paytm, Google Pay, PhonePe, or Bank transaction notifications to
                auto-reconcile.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Paste Input Container */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="sms-input" className="text-xs font-semibold text-foreground">
                Transaction SMS / Notification Text
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5"
                onClick={handlePasteClipboard}
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                Paste from Clipboard
              </Button>
            </div>
            <Textarea
              id="sms-input"
              rows={4}
              placeholder="e.g. 'Dear SBI User, your A/C ending 4912 Credited by INR 45,000.00 on 25Sep26 by UPI/32847291823/John Doe' or 'Google Pay: You received ₹25,000 from Anita Sharma'..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="font-mono text-xs leading-relaxed resize-none"
            />
          </div>

          {/* Parsed Result Card */}
          {parsedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Detected {parsedItems.length} Transaction{parsedItems.length > 1 ? "s" : ""}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Confidence: {Math.round((parsedItems[0].confidence || 0.8) * 100)}%
                </span>
              </div>

              {parsedItems.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={item.transaction_type === "credit" ? "default" : "destructive"}
                        className={
                          item.transaction_type === "credit"
                            ? "bg-emerald-600 hover:bg-emerald-600 text-white gap-1 uppercase font-mono text-[10px]"
                            : "gap-1 uppercase font-mono text-[10px]"
                        }
                      >
                        {item.transaction_type === "credit" ? (
                          <ArrowDownLeft className="h-3 w-3" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        {item.transaction_type === "credit" ? "Credit (Received)" : "Debit (Paid)"}
                      </Badge>

                      <Badge variant="outline" className="font-mono text-[10px] uppercase">
                        {item.source}
                      </Badge>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black font-display tabular-nums text-foreground">
                        {formatInr(item.amount)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {item.counterparty_name && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-foreground truncate">
                          {item.counterparty_name}
                        </span>
                      </div>
                    )}

                    {item.utr_number && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Hash className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-[11px] text-foreground truncate">
                          UTR: {item.utr_number}
                        </span>
                      </div>
                    )}

                    {item.account_last4 && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <CreditCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-[11px] text-foreground">
                          A/C •••• {item.account_last4}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Target Account & Linking Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Deposit into Bank Account</Label>
                  <Select
                    value={selectedAccountId || currentAccount?.id || ""}
                    onValueChange={setSelectedAccountId}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id} className="text-xs">
                          {acc.name} ({acc.account_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Match to Customer (Optional)</Label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs text-muted-foreground">
                        -- Direct Ledger Inflow (No customer link) --
                      </SelectItem>
                      {(customersQuery.data || []).map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.name} {c.customer_code ? `(${c.customer_code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="tx-notes" className="text-xs font-semibold">
                  Reference Note
                </Label>
                <Input
                  id="tx-notes"
                  placeholder="e.g. Token advance for Villa elevation, GPay transfer"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={parsedItems.length === 0 || recordMutation.isPending}
            onClick={handleRecordAll}
            className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {recordMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Recording…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Record &amp; Update Ledger
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
