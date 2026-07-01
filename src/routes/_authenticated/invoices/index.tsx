import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { listInvoices } from "@/lib/invoices/api";
import { formatInr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/invoices/")({
  ssr: false,
  component: InvoicesPage,
});

function InvoicesPage() {
  const [q, setQ] = useState("");
  const query = useQuery({ queryKey: qk.invoices.list(q), queryFn: () => listInvoices(q) });

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Collect payments — Razorpay links or manual entries."
      />
      <div className="mb-3 flex items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by invoice no…" className="max-w-md" />
      </div>

      {query.isLoading ? (
        <LoadingBlock />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-6 w-6" />}
          title="No invoices yet"
          message="Convert an accepted quote to create your first invoice."
        />
      ) : (
        <div className="rounded-md border border-border bg-card shadow-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data!.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">
                    <Link to="/invoices/$invoiceId" params={{ invoiceId: r.id }} className="text-primary hover:underline">
                      {r.invoice_no}
                    </Link>
                  </TableCell>
                  <TableCell>{r.customer?.name ?? "—"}</TableCell>
                  <TableCell>{r.project?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{r.status}</Badge></TableCell>
                  <TableCell className="text-right">{formatInr(r.total)}</TableCell>
                  <TableCell className="text-right font-medium">{formatInr(r.balance_due)}</TableCell>
                  <TableCell>{r.due_date ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
