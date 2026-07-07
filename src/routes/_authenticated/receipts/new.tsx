import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EntityPicker } from "@/components/forms/EntityPicker";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { createReceipt, listOpenInvoicesForCustomer } from "@/lib/receipts/api";
import { RECEIPT_METHODS } from "@/lib/receipts/schema";
import { invalidateReceipt } from "@/lib/query-invalidation";
import { formatInr, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/receipts/new")({
  ssr: false,
  component: NewReceiptPage,
});

type AllocRow = { invoice_id: string; amount: number; invoice_no: string; balance_due: number };

function NewReceiptPage() {
  const nav = useNavigate();
  const qc = useQueryClient();

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [receivedAt, setReceivedAt] = useState<string>(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<(typeof RECEIPT_METHODS)[number]>("bank_transfer");
  const [bankName, setBankName] = useState("");
  const [accountUsed, setAccountUsed] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [tds, setTds] = useState<number>(0);
  const [charges, setCharges] = useState<number>(0);
  const [remarks, setRemarks] = useState("");
  const [allocations, setAllocations] = useState<AllocRow[]>([]);

  const invoicesQuery = useQuery({
    queryKey: customerId ? qk.receipts.openInvoices(customerId) : ["receipts", "openInvoices", "none"],
    queryFn: () => listOpenInvoicesForCustomer(customerId!),
    enabled: !!customerId,
  });

  const net = Math.max(0, amount - tds - charges);
  const alloc = useMemo(() => allocations.reduce((s, a) => s + Number(a.amount || 0), 0), [allocations]);
  const unallocated = net - alloc;

  const mut = useMutation({
    mutationFn: () =>
      createReceipt({
        customer_id: customerId!,
        received_at: receivedAt,
        amount,
        method,
        bank_name: bankName || null,
        account_used: accountUsed || null,
        reference_no: referenceNo || null,
        cheque_no: chequeNo || null,
        cheque_date: chequeDate || null,
        tds_amount: tds,
        bank_charges: charges,
        remarks: remarks || null,
        allocations: allocations.map((a) => ({ invoice_id: a.invoice_id, amount: a.amount })).filter((a) => a.amount > 0),
      }),
    onSuccess: (r) => {
      toast.success(`Receipt ${r.receipt_no} created`);
      invalidateReceipt(qc, r.id, customerId ?? undefined);
      nav({ to: "/receipts/$receiptId", params: { receiptId: r.id } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  function toggleInvoice(inv: { id: string; invoice_no: string; balance_due: number }) {
    setAllocations((prev) => {
      if (prev.some((p) => p.invoice_id === inv.id)) return prev.filter((p) => p.invoice_id !== inv.id);
      const remaining = Math.max(0, net - prev.reduce((s, a) => s + a.amount, 0));
      const suggested = Math.min(Number(inv.balance_due), remaining);
      return [...prev, { invoice_id: inv.id, amount: suggested, invoice_no: inv.invoice_no, balance_due: Number(inv.balance_due) }];
    });
  }

  const canSave = !!customerId && amount > 0 && alloc <= net + 0.01 && !!method && !!receivedAt;

  return (
    <div>
      <PageHeader
        title="New Receipt"
        subtitle="Record a customer receipt. Leave allocations empty to keep it as an unallocated advance."
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => nav({ to: "/receipts" })}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button size="sm" disabled={!canSave || mut.isPending} onClick={() => mut.mutate()}>
              <Save className="mr-2 h-4 w-4" /> Save receipt
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-1 md:col-span-2">
          <CardHeader><CardTitle className="text-sm">Receipt details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Customer *</Label>
                <EntityPicker type="customer" value={customerId} onChange={(id) => { setCustomerId(id); setAllocations([]); }} />
              </div>
              <div className="space-y-1.5">
                <Label>Received on *</Label>
                <Input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount *</Label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Method *</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RECEIPT_METHODS.map((m) => (
                      <SelectItem key={m} value={m} className="uppercase">{m.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bank name</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. HDFC Bank" />
              </div>
              <div className="space-y-1.5">
                <Label>Account used</Label>
                <Input value={accountUsed} onChange={(e) => setAccountUsed(e.target.value)} placeholder="e.g. Current A/c 12345" />
              </div>
              <div className="space-y-1.5">
                <Label>UTR / Transaction #</Label>
                <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Cheque #</Label>
                <Input value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Cheque date</Label>
                <Input type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>TDS deducted</Label>
                <Input type="number" step="0.01" value={tds} onChange={(e) => setTds(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Bank charges</Label>
                <Input type="number" step="0.01" value={charges} onChange={(e) => setCharges(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Remarks</Label>
                <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-1">
          <CardHeader><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row k="Gross amount" v={formatInr(amount)} />
            <Row k="Less: TDS" v={formatInr(-tds)} />
            <Row k="Less: Bank charges" v={formatInr(-charges)} />
            <Row k="Net" v={formatInr(net)} bold />
            <hr className="my-2 border-border" />
            <Row k="Allocated" v={formatInr(alloc)} />
            <Row k="Unallocated advance" v={formatInr(unallocated)} bold={unallocated > 0} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 shadow-1">
        <CardHeader>
          <CardTitle className="text-sm">Allocate to open invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {!customerId ? (
            <p className="text-sm text-muted-foreground">Select a customer first.</p>
          ) : invoicesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading open invoices…</p>
          ) : (invoicesQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No open invoices — this receipt will be saved as an unallocated advance.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Allocate</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoicesQuery.data ?? []).map((inv) => {
                  const row = allocations.find((a) => a.invoice_id === inv.id);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs">{inv.invoice_no}</TableCell>
                      <TableCell className="text-sm">{formatDate(inv.issue_date)}</TableCell>
                      <TableCell className="text-right">{formatInr(inv.total)}</TableCell>
                      <TableCell className="text-right">{formatInr(inv.balance_due)}</TableCell>
                      <TableCell className="text-right">
                        {row ? (
                          <Input
                            type="number" step="0.01" className="w-32 ml-auto text-right"
                            value={row.amount}
                            onChange={(e) =>
                              setAllocations((prev) => prev.map((p) =>
                                p.invoice_id === inv.id ? { ...p, amount: Number(e.target.value) } : p))
                            }
                          />
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => toggleInvoice(inv as never)}>
                            Allocate
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {row && (
                          <Button variant="ghost" size="icon" onClick={() => toggleInvoice(inv as never)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className={bold ? "font-semibold" : ""}>{v}</span>
    </div>
  );
}
