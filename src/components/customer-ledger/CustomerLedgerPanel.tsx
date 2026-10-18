/**
 * Shared customer statement/ledger view — every invoice, receipt,
 * credit/debit note and refund with a running balance.
 *
 * Supports real-time statement export/sharing via WhatsApp and direct write-offs.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, MessageCircle, ShieldAlert } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingBlock, ErrorBlock, EmptyState } from "@/components/layout/States";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getCustomerLedger, getCustomerLedgerSummary } from "@/lib/customer-ledger/api";
import { getCustomer } from "@/lib/customers/api";
import { formatInr, formatDate } from "@/lib/format";
import { ShareStatementDialog } from "@/components/statements/ShareStatementDialog";
import { RecordWriteOffDialog } from "@/components/write-offs/RecordWriteOffDialog";
import {
  getCurrentStatementTimestamp,
  type AccountingStatementData,
} from "@/lib/statements/accounting-statement";

const TYPE_LABEL: Record<string, string> = {
  invoice: "Invoice",
  receipt: "Receipt",
  credit_note: "Write-Off / Credit Note",
  debit_note: "Debit Note",
  refund: "Refund",
  delivery_challan: "Delivery Challan (Cash)",
  payment: "Payment",
};

export function CustomerLedgerPanel({
  customerId,
  showActions = true,
}: {
  customerId: string;
  showActions?: boolean;
}) {
  const [statementOpen, setStatementOpen] = useState(false);
  const [writeOffOpen, setWriteOffOpen] = useState(false);

  const customerQ = useQuery({
    queryKey: qk.customers.byId(customerId),
    queryFn: () => getCustomer(customerId),
  });
  const ledger = useQuery({
    queryKey: qk.customerLedger.byCustomer(customerId),
    queryFn: () => getCustomerLedger(customerId),
  });
  const summary = useQuery({
    queryKey: qk.customerLedger.summary(customerId),
    queryFn: () => getCustomerLedgerSummary(customerId),
  });

  if (ledger.isLoading) return <LoadingBlock />;
  if (ledger.error) return <ErrorBlock message={toUserMessage(ledger.error)} />;

  let running = 0;
  const rows = (ledger.data ?? []).map((r) => {
    running += Number(r.debit ?? 0) - Number(r.credit ?? 0);
    return { ...r, running };
  });

  const c = customerQ.data;
  const writeOffTotal = (ledger.data ?? [])
    .filter((r) => r.entry_type === "credit_note")
    .reduce((s, r) => s + (Number(r.credit) || 0), 0);

  const statementData: AccountingStatementData = {
    party: {
      partyType: "customer",
      id: customerId,
      name: c?.name || "Customer",
      code: c?.customer_code,
      phone: c?.primary_phone,
      whatsapp: c?.whatsapp || c?.primary_phone,
      companyName: c?.company_name,
      contactPerson: c?.contact_person,
      city: c?.city,
    },
    asOfTimestamp: getCurrentStatementTimestamp(),
    totalDebit: summary.data?.totalDebit ?? 0,
    totalCredit: summary.data?.totalCredit ?? 0,
    balance: summary.data?.balance ?? 0,
    unallocatedAdvance: summary.data?.unallocatedAdvance ?? 0,
    writeOffTotal,
    transactions: rows.map((r) => ({
      date: r.entry_date,
      type: TYPE_LABEL[r.entry_type] ?? r.entry_type,
      refNo: r.ref_no,
      debit: Number(r.debit) || 0,
      credit: Number(r.credit) || 0,
      runningBalance: r.running,
    })),
  };

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-4 mb-4">
        <Kpi label="Total Debit" value={formatInr(summary.data?.totalDebit ?? 0)} />
        <Kpi label="Total Credit" value={formatInr(summary.data?.totalCredit ?? 0)} />
        <Kpi
          label="Outstanding"
          value={formatInr(summary.data?.balance ?? 0)}
          highlight={(summary.data?.balance ?? 0) > 0}
        />
        <Kpi label="Unallocated Advance" value={formatInr(summary.data?.unallocatedAdvance ?? 0)} />
      </div>

      <Card className="shadow-1">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold">Ledger entries</CardTitle>
          {showActions && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900/60 dark:text-red-300"
                onClick={() => setWriteOffOpen(true)}
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Write-Off / Concession
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs font-semibold"
                onClick={() => setStatementOpen(true)}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Share Statement (WhatsApp)
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-6 w-6" />}
              title="No entries yet"
              message="Ledger will populate as invoices, delivery challans, write-offs and receipts are recorded."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Running Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={`${r.entry_type}-${r.ref_id}`}>
                    <TableCell className="text-sm">{formatDate(r.entry_date)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          r.entry_type === "credit_note"
                            ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300"
                            : r.entry_type === "delivery_challan"
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                              : r.entry_type === "receipt" || r.entry_type === "payment"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : ""
                        }
                      >
                        {TYPE_LABEL[r.entry_type] ?? r.entry_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.entry_type === "invoice" ? (
                        <Link
                          to="/invoices/$invoiceId"
                          params={{ invoiceId: r.ref_id }}
                          className="hover:underline font-medium"
                        >
                          {r.ref_no}
                        </Link>
                      ) : r.entry_type === "receipt" ? (
                        <Link
                          to="/receipts/$receiptId"
                          params={{ receiptId: r.ref_id }}
                          className="hover:underline font-medium text-emerald-700"
                        >
                          {r.ref_no}
                        </Link>
                      ) : r.entry_type === "delivery_challan" ? (
                        <Link
                          to="/dispatch/$id"
                          params={{ id: r.ref_id }}
                          className="hover:underline text-primary font-medium"
                        >
                          {r.ref_no}
                        </Link>
                      ) : (
                        r.ref_no
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {r.debit > 0 ? formatInr(r.debit) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-emerald-600 font-medium">
                      {r.credit > 0 ? formatInr(r.credit) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatInr(r.running)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ShareStatementDialog
        open={statementOpen}
        onOpenChange={setStatementOpen}
        data={statementData}
      />

      <RecordWriteOffDialog
        open={writeOffOpen}
        onOpenChange={setWriteOffOpen}
        customerId={customerId}
        customerName={c?.name}
        defaultAmount={
          summary.data?.balance && summary.data.balance > 0 ? summary.data.balance : undefined
        }
      />
    </div>
  );
}

function Kpi({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className="shadow-1">
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={"text-lg font-semibold " + (highlight ? "text-destructive" : "")}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
