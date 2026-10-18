import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getCustomer } from "@/lib/customers/api";
import { getCustomerLedger, getCustomerLedgerSummary } from "@/lib/customer-ledger/api";
import { CustomerLedgerPanel } from "@/components/customer-ledger/CustomerLedgerPanel";
import { ShareStatementDialog } from "@/components/statements/ShareStatementDialog";
import { RecordWriteOffDialog } from "@/components/write-offs/RecordWriteOffDialog";
import {
  getCurrentStatementTimestamp,
  type AccountingStatementData,
} from "@/lib/statements/accounting-statement";

export const Route = createFileRoute("/_authenticated/ledger/$customerId")({
  ssr: false,
  component: LedgerPage,
});

const TYPE_LABEL: Record<string, string> = {
  invoice: "Invoice",
  receipt: "Receipt",
  credit_note: "Write-Off / Credit Note",
  debit_note: "Debit Note",
  refund: "Refund",
  delivery_challan: "Delivery Challan (Cash)",
  payment: "Payment",
};

function LedgerPage() {
  const { customerId } = Route.useParams();
  const [statementOpen, setStatementOpen] = useState(false);
  const [writeOffOpen, setWriteOffOpen] = useState(false);

  const cust = useQuery({
    queryKey: qk.customers.byId(customerId),
    queryFn: () => getCustomer(customerId),
  });

  const ledgerQ = useQuery({
    queryKey: qk.customerLedger.byCustomer(customerId),
    queryFn: () => getCustomerLedger(customerId),
  });

  const summaryQ = useQuery({
    queryKey: qk.customerLedger.summary(customerId),
    queryFn: () => getCustomerLedgerSummary(customerId),
  });

  if (cust.isLoading) return <LoadingBlock />;
  if (cust.error) return <ErrorBlock message={toUserMessage(cust.error)} />;

  const c = cust.data;

  // Build statement transactions with running balance
  let running = 0;
  const statementTransactions = (ledgerQ.data ?? []).map((r) => {
    running += Number(r.debit ?? 0) - Number(r.credit ?? 0);
    return {
      date: r.entry_date,
      type: TYPE_LABEL[r.entry_type] ?? r.entry_type,
      refNo: r.ref_no,
      debit: Number(r.debit) || 0,
      credit: Number(r.credit) || 0,
      runningBalance: running,
    };
  });

  const writeOffTotal = (ledgerQ.data ?? [])
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
    totalDebit: summaryQ.data?.totalDebit ?? 0,
    totalCredit: summaryQ.data?.totalCredit ?? 0,
    balance: summaryQ.data?.balance ?? 0,
    unallocatedAdvance: summaryQ.data?.unallocatedAdvance ?? 0,
    writeOffTotal,
    transactions: statementTransactions,
  };

  return (
    <div>
      <PageHeader
        title={`Ledger — ${c?.name ?? "Customer"}`}
        subtitle="Every invoice, receipt, delivery challan, write-off and refund with a real-time running balance."
        actions={
          c ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900/60 dark:text-red-300"
                onClick={() => setWriteOffOpen(true)}
              >
                <ShieldAlert className="h-4 w-4" />
                Record Write-Off
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs font-semibold"
                onClick={() => setStatementOpen(true)}
              >
                <MessageCircle className="h-4 w-4" />
                Share Statement (WhatsApp)
              </Button>
            </div>
          ) : undefined
        }
      />

      <CustomerLedgerPanel customerId={customerId} />

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
          summaryQ.data?.balance && summaryQ.data.balance > 0 ? summaryQ.data.balance : undefined
        }
      />
    </div>
  );
}
