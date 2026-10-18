import { useState } from "react";
import { toast } from "sonner";
import {
  MessageCircle,
  Copy,
  Printer,
  Check,
  Send,
  Building2,
  Phone,
  Calendar,
  Wallet,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/forms/Field";
import { formatInr } from "@/lib/format";
import {
  buildWhatsappAccountingStatement,
  type AccountingStatementData,
} from "@/lib/statements/accounting-statement";
import { openWhatsappToContact } from "@/lib/whatsapp";

export interface ShareStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AccountingStatementData;
}

export function ShareStatementDialog({ open, onOpenChange, data }: ShareStatementDialogProps) {
  const defaultPhone = data.party.whatsapp || data.party.phone || "";
  const [recipientPhone, setRecipientPhone] = useState(defaultPhone);
  const [copied, setCopied] = useState(false);

  const messageText = buildWhatsappAccountingStatement(data);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      toast.success("Complete accounting statement copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  };

  const handleSendWhatsapp = () => {
    if (!recipientPhone.trim()) {
      toast.error("Please enter a valid phone number for WhatsApp.");
      return;
    }
    const success = openWhatsappToContact(recipientPhone, messageText);
    if (success) {
      toast.success(`Opening WhatsApp to send real-time statement...`);
      onOpenChange(false);
    } else {
      toast.error("Could not open WhatsApp.");
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print the statement.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Statement of Account — ${data.party.name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.5; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
          .company-name { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #0f172a; }
          .title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-top: 4px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 13px; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; }
          .summary-card { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center; }
          .summary-val { font-size: 18px; font-weight: 800; font-family: monospace; }
          .due { color: #b91c1c; }
          .paid { color: #15803d; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th { background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; font-weight: 700; }
          td { border: 1px solid #e2e8f0; padding: 8px 10px; }
          .text-right { text-align: right; }
          .font-mono { font-family: monospace; }
          .footer { margin-top: 40px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">STONE TECH</div>
          <div class="title">Official Statement of Account (Real-Time Ledger)</div>
        </div>

        <div class="meta-grid">
          <div class="meta-box">
            <strong>Account Name:</strong> ${data.party.name}<br/>
            ${data.party.code ? `<strong>Party Code:</strong> ${data.party.code}<br/>` : ""}
            ${data.party.companyName ? `<strong>Firm:</strong> ${data.party.companyName}<br/>` : ""}
            ${data.party.phone ? `<strong>Contact:</strong> ${data.party.phone}<br/>` : ""}
          </div>
          <div class="meta-box">
            <strong>Statement Generated:</strong> ${data.asOfTimestamp}<br/>
            <strong>Transactions:</strong> ${data.transactions.length} record(s)<br/>
            <strong>Scope:</strong> Complete accounting history to present
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-grid">
            <div>
              <div style="font-size: 11px; color: #64748b;">Total Invoiced / Debits</div>
              <div class="summary-val">${formatInr(data.totalDebit)}</div>
            </div>
            <div>
              <div style="font-size: 11px; color: #64748b;">Total Received / Credits</div>
              <div class="summary-val paid">${formatInr(data.totalCredit)}</div>
            </div>
            <div>
              <div style="font-size: 11px; color: #64748b;">Net Outstanding Balance</div>
              <div class="summary-val ${data.balance > 0 ? "due" : ""}">${formatInr(data.balance)}</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 80px;">Date</th>
              <th>Type</th>
              <th>Reference</th>
              <th class="text-right">Debit</th>
              <th class="text-right">Credit</th>
              <th class="text-right">Running Balance</th>
            </tr>
          </thead>
          <tbody>
            ${data.transactions
              .map(
                (tx) => `
              <tr>
                <td>${tx.date}</td>
                <td><strong>${tx.type}</strong>${tx.description ? `<br/><small style="color: #64748b;">${tx.description}</small>` : ""}</td>
                <td class="font-mono">${tx.refNo}</td>
                <td class="text-right font-mono">${tx.debit > 0 ? formatInr(tx.debit) : "—"}</td>
                <td class="text-right font-mono">${tx.credit > 0 ? formatInr(tx.credit) : "—"}</td>
                <td class="text-right font-mono" style="font-weight: 700;">${formatInr(tx.runningBalance)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div class="footer">
          Generated automatically by Stone Tech OS Financial Accounting Engine · Validated up till transmission.
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-xs dark:bg-emerald-950/80 dark:text-emerald-300 ring-1 ring-emerald-500/30">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                WhatsApp Accounting Statement — {data.party.name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete, real-time ledger statement itemized up till this moment (
                {data.asOfTimestamp}).
              </p>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Summary Metric Chips */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-lg border bg-card p-2.5 text-center shadow-2xs">
              <div className="text-[11px] text-muted-foreground">Total Billed / Debits</div>
              <div className="font-mono font-bold text-sm text-foreground">
                {formatInr(data.totalDebit)}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-2.5 text-center shadow-2xs">
              <div className="text-[11px] text-muted-foreground">Total Paid / Credits</div>
              <div className="font-mono font-bold text-sm text-emerald-600">
                {formatInr(data.totalCredit)}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-2.5 text-center shadow-2xs">
              <div className="text-[11px] text-muted-foreground">Net Balance Due</div>
              <div
                className={`font-mono font-bold text-sm ${data.balance > 0 ? "text-amber-600 font-extrabold" : "text-foreground"}`}
              >
                {formatInr(data.balance)}
              </div>
            </div>
          </div>

          {/* Recipient Phone Field */}
          <Field label="Recipient WhatsApp / Phone Number" required>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="Enter 10-digit mobile (e.g. 9825012345)"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="pl-9 font-mono"
              />
            </div>
          </Field>

          {/* Formatted Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Real-Time Statement Message Preview ({data.transactions.length} records):</span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="h-7 px-2.5 text-xs gap-1"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy Text
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrint}
                  className="h-7 px-2.5 text-xs gap-1"
                >
                  <Printer className="h-3.5 w-3.5" /> Print / PDF
                </Button>
              </div>
            </div>

            <div className="relative rounded-lg border border-slate-200 bg-slate-900 text-slate-100 p-3.5 font-mono text-xs leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap select-text dark:border-slate-800">
              {messageText}
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="p-3 sm:px-5 border-t bg-muted/20 gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold shadow-xs"
            onClick={handleSendWhatsapp}
          >
            <MessageCircle className="h-4 w-4" />
            Send to WhatsApp Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
