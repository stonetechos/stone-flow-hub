import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toUserMessage } from "@/lib/errors";
import { getVendor } from "@/lib/vendors/api";
import {
  listVendorLedger,
  routeForLedgerRow,
  sourceLabel,
  summariseLedger,
} from "@/lib/vendors/ledger";
import { formatInr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/vendors/$vendorId/ledger")({
  ssr: false,
  component: VendorLedgerPage,
});

function VendorLedgerPage() {
  const { vendorId } = Route.useParams();

  const vendorQ = useQuery({
    queryKey: ["vendor", vendorId, "row"],
    queryFn: () => getVendor(vendorId),
  });
  const ledgerQ = useQuery({
    queryKey: ["vendor", vendorId, "ledger"],
    queryFn: () => listVendorLedger(vendorId),
    staleTime: 30_000,
  });

  const summary = useMemo(() => summariseLedger(ledgerQ.data ?? []), [ledgerQ.data]);

  return (
    <div>
      <div className="mb-2">
        <Link
          to="/vendors/$vendorId"
          params={{ vendorId }}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to vendor
        </Link>
      </div>
      <PageHeader
        title={vendorQ.data ? `${vendorQ.data.company_name} · Ledger` : "Vendor Ledger"}
        subtitle="Every commitment, receipt, and payment posted to this vendor, in chronological order."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Total Debit" value={summary.totalDebit} tone="destructive" />
        <SummaryCard label="Total Credit" value={summary.totalCredit} tone="secondary" />
        <SummaryCard
          label="Outstanding"
          value={summary.outstanding}
          tone={summary.outstanding > 0 ? "default" : "secondary"}
        />
      </div>

      {ledgerQ.isLoading ? (
        <SkeletonTable rows={6} columns={7} />
      ) : ledgerQ.error ? (
        <ErrorBlock message={toUserMessage(ledgerQ.error)} onRetry={() => ledgerQ.refetch()} />
      ) : (ledgerQ.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-6 w-6" />}
          title="No ledger entries yet"
          message="Purchase orders, GRNs, payments and debit / credit notes will appear here as they are posted."
        />
      ) : (
        <Card className="shadow-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledgerQ.data!.map((row) => {
                const route = routeForLedgerRow(row);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="tabular-nums">{row.entry_date}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{sourceLabel(row.source_type)}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {route ? (
                        <Link to={route} className="hover:underline">
                          {row.ref_no ?? "—"}
                        </Link>
                      ) : (
                        (row.ref_no ?? "—")
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.description ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.debit ? formatInr(row.debit) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.credit ? formatInr(row.credit) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatInr(row.running_balance)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "secondary" | "destructive";
}) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <Badge variant={tone} className="tabular-nums text-sm">
            {formatInr(value)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
