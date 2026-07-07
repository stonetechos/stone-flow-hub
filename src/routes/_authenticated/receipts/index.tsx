import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { listReceipts } from "@/lib/receipts/api";
import { formatInr, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/receipts/")({
  ssr: false,
  component: ReceiptsListPage,
});

function ReceiptsListPage() {
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const query = useQuery({
    queryKey: qk.receipts.list(dq),
    queryFn: () => listReceipts(dq),
  });
  const rows = query.data ?? [];
  const totalReceived = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const totalUnalloc = rows.reduce((s, r) => s + Number(r.unallocated_amount ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Customer Receipts"
        subtitle="Advance receipts, invoice payments, TDS, bank charges, and refunds — with full allocation history."
        actions={
          <Button size="sm" asChild>
            <Link to="/receipts/new"><Plus className="mr-2 h-4 w-4" /> New receipt</Link>
          </Button>
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search receipt #, UTR, cheque…" className="max-w-sm" />
        <span className="ml-auto text-xs text-muted-foreground">
          {rows.length} shown • Received {formatInr(totalReceived)} • Unallocated advance {formatInr(totalUnalloc)}
        </span>
      </div>

      {query.isLoading ? (
        <SkeletonTable />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-6 w-6" />}
          title="No receipts yet"
          message="Record your first customer receipt to start tracking payments and ledger balances."
        />
      ) : (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Unallocated</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link to="/receipts/$receiptId" params={{ receiptId: r.id }} className="font-medium hover:underline">
                      {r.receipt_no}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(r.received_at)}</TableCell>
                  <TableCell className="text-sm">{r.customer?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm uppercase">{r.method}</TableCell>
                  <TableCell className="text-sm">{r.reference_no ?? r.cheque_no ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatInr(r.amount)}</TableCell>
                  <TableCell className="text-right">{formatInr(r.unallocated_amount)}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "void" ? "destructive" : "outline"} className="capitalize">
                      {r.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
