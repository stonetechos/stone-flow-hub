/** Shared customer statement/ledger view — every invoice, receipt,
 *  credit/debit note and refund with a running balance.
 *
 * Extracted from the standalone /ledger/$customerId route (Phase G) so the
 * exact same statement can also be embedded as a "Statements" tab on the
 * Customer Hub (Sales dashboard work, 2026-09) without duplicating the
 * query/render logic — the route now just wraps this in its own
 * PageHeader.
 */
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { formatInr, formatDate } from "@/lib/format";

const TYPE_LABEL: Record<string, string> = {
  invoice: "Invoice",
  receipt: "Receipt",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
  refund: "Refund",
};

export function CustomerLedgerPanel({ customerId }: { customerId: string }) {
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
        <CardHeader>
          <CardTitle className="text-sm">Ledger entries</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-6 w-6" />}
              title="No entries yet"
              message="Ledger will populate as invoices and receipts are recorded."
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
                      <Badge variant="outline">{TYPE_LABEL[r.entry_type] ?? r.entry_type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.entry_type === "invoice" ? (
                        <Link
                          to="/invoices/$invoiceId"
                          params={{ invoiceId: r.ref_id }}
                          className="hover:underline"
                        >
                          {r.ref_no}
                        </Link>
                      ) : r.entry_type === "receipt" ? (
                        <Link
                          to="/receipts/$receiptId"
                          params={{ receiptId: r.ref_id }}
                          className="hover:underline"
                        >
                          {r.ref_no}
                        </Link>
                      ) : (
                        r.ref_no
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.debit > 0 ? formatInr(r.debit) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.credit > 0 ? formatInr(r.credit) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatInr(r.running)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
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
