import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Wallet, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { getVendor, getVendorPhone, getVendorContactName } from "@/lib/vendors/api";
import {
  listVendorLedger,
  routeForLedgerRow,
  sourceLabel,
  summariseLedger,
} from "@/lib/vendors/ledger";
import { formatInr } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import { ShareStatementDialog } from "@/components/statements/ShareStatementDialog";
import {
  getCurrentStatementTimestamp,
  type AccountingStatementData,
} from "@/lib/statements/accounting-statement";

export const Route = createFileRoute("/_authenticated/vendors/$vendorId/ledger")({
  ssr: false,
  component: VendorLedgerPage,
});

function VendorLedgerPage() {
  const { vendorId } = Route.useParams();
  const [statementOpen, setStatementOpen] = useState(false);

  const vendorQ = useQuery({
    queryKey: qk.vendors.byId(vendorId),
    queryFn: () => getVendor(vendorId),
  });
  const ledgerQ = useQuery({
    queryKey: qk.vendorLedger.byVendor(vendorId),
    queryFn: () => listVendorLedger(vendorId),
    staleTime: 30_000,
  });

  const summary = useMemo(() => summariseLedger(ledgerQ.data ?? []), [ledgerQ.data]);

  const vendorPhone = getVendorPhone(vendorQ.data);
  const vendorContact = getVendorContactName(vendorQ.data);

  const statementData: AccountingStatementData = {
    party: {
      partyType: "vendor",
      id: vendorId,
      name: vendorQ.data?.company_name || "Vendor",
      code: vendorQ.data?.vendor_code,
      phone: vendorPhone,
      whatsapp: vendorPhone,
      contactPerson: vendorContact,
      city: vendorQ.data?.city,
    },
    asOfTimestamp: getCurrentStatementTimestamp(),
    totalDebit: summary.totalDebit,
    totalCredit: summary.totalCredit,
    balance: summary.outstanding,
    transactions: (ledgerQ.data ?? []).map((r) => ({
      date: r.entry_date,
      type: sourceLabel(r.source_type),
      refNo: r.ref_no || "—",
      description: r.description,
      debit: r.debit,
      credit: r.credit,
      runningBalance: r.running_balance,
    })),
  };

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
        actions={
          vendorQ.data ? (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs font-semibold"
              onClick={() => setStatementOpen(true)}
            >
              <MessageCircle className="h-4 w-4" />
              Share Statement (WhatsApp)
            </Button>
          ) : undefined
        }
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

      <ShareStatementDialog
        open={statementOpen}
        onOpenChange={setStatementOpen}
        data={statementData}
      />
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
