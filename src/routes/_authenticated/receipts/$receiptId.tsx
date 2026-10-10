import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { GuidedNextStep } from "@/components/guided-workflow/GuidedNextStep";
import { Button } from "@/components/ui/button";
import { DocumentToolbar } from "@/components/documents/DocumentToolbar";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { EditReceiptDialog } from "@/components/receipts/EditReceiptDialog";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
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
import { getReceipt, getReceiptAllocations, voidReceipt, deleteReceipt } from "@/lib/receipts/api";
import { invalidateReceipt } from "@/lib/query-invalidation";
import { formatInr, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/receipts/$receiptId")({
  ssr: false,
  component: ReceiptDetailPage,
});

function ReceiptDetailPage() {
  const { t } = useTranslation();
  const { receiptId } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: qk.receipts.byId(receiptId),
    queryFn: () => getReceipt(receiptId),
  });
  const allocs = useQuery({
    queryKey: qk.receipts.allocations(receiptId),
    queryFn: () => getReceiptAllocations(receiptId),
  });

  const [editOpen, setEditOpen] = useState(false);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const voidMut = useMutation({
    mutationFn: () => voidReceipt(receiptId),
    onSuccess: () => {
      toast.success("Receipt voided — allocated invoices have been recalculated");
      setConfirmVoid(false);
      invalidateReceipt(qc, receiptId, query.data?.customer_id);
      query.refetch();
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const delMut = useMutation({
    mutationFn: () => deleteReceipt(receiptId),
    onSuccess: () => {
      toast.success("Receipt deleted successfully");
      invalidateReceipt(qc, receiptId, query.data?.customer_id);
      void qc.invalidateQueries({ queryKey: qk.paymentRegister.all });
      void qc.invalidateQueries({ queryKey: ["customer-ledger-summaries"] });
      void qc.invalidateQueries({ queryKey: qk.customers.all });
      nav({ to: "/payments", search: { tab: "customer" } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (query.isLoading) return <LoadingBlock />;
  if (query.error) return <ErrorBlock message={toUserMessage(query.error)} />;
  if (!query.data) return <ErrorBlock message={t("receipts.notFound", "Receipt not found")} />;
  const r = query.data;

  return (
    <div>
      <PageHeader
        title={`${t("receipts.receipt", "Receipt")} ${r.receipt_no}`}
        subtitle={
          r.customer?.name ? (
            <span className="flex items-center gap-2">
              <Link
                to="/customers/$customerId"
                params={{ customerId: r.customer_id }}
                className="hover:underline font-medium text-foreground"
              >
                {r.customer.name}
              </Link>
              {(r.customer.whatsapp || r.customer.primary_phone) && (
                <span className="text-muted-foreground text-xs font-mono">
                  · {r.customer.whatsapp || r.customer.primary_phone}
                </span>
              )}
            </span>
          ) : (
            "—"
          )
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => nav({ to: "/receipts" })}>
              <ArrowLeft className="mr-2 h-4 w-4" /> {t("common.back", "Back")}
            </Button>
            <DocumentToolbar entity="receipt" entityId={receiptId} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              className="bg-white hover:bg-slate-50"
            >
              <Pencil className="mr-2 h-4 w-4 text-slate-600" />
              {t("common.edit", "Edit")}
            </Button>
            {r.status !== "void" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmVoid(true)}
                disabled={voidMut.isPending}
                className="text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                <Ban className="mr-2 h-4 w-4" /> {t("receipts.void", "Void")}
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={delMut.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" /> {t("common.delete", "Delete")}
            </Button>
          </div>
        }
      />

      <EditReceiptDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        receipt={r}
        customerName={r.customer?.name}
        onSuccess={() => {
          query.refetch();
          allocs.refetch();
        }}
      />

      <ConfirmDialog
        open={confirmVoid}
        onOpenChange={setConfirmVoid}
        tone="danger"
        title={t("receipts.voidTitle", "Void receipt {{no}}?", { no: r.receipt_no })}
        description={t(
          "receipts.voidDescription",
          "Voiding removes this receipt from the customer ledger. Every invoice it was allocated to will be recalculated and may go back to unpaid or partially paid. This cannot be undone from here.",
        )}
        confirmLabel={t("receipts.voidReceipt", "Void receipt")}
        busy={voidMut.isPending}
        onConfirm={() => voidMut.mutate()}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        tone="danger"
        title={`Permanently delete receipt ${r.receipt_no}?`}
        description="Deleting this receipt will remove it completely from the system and customer ledger. Any linked invoices will have their balances recalculated. This action cannot be undone."
        confirmLabel="Delete receipt"
        busy={delMut.isPending}
        onConfirm={() => delMut.mutate()}
      />

      <GuidedNextStep entity="receipt" entityId={receiptId} ctx={{ customer_id: r.customer_id }} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">{t("common.details", "Details")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <Field k={t("receipts.receivedOn", "Received on")} v={formatDate(r.received_at)} />
            <Field k={t("receipts.method", "Method")} v={r.method.toUpperCase()} />
            <Field k={t("receipts.bank", "Bank")} v={r.bank_name ?? "—"} />
            <Field k={t("receipts.account", "Account")} v={r.account_used ?? "—"} />
            <Field k={t("receipts.utrRef", "UTR / Ref")} v={r.reference_no ?? "—"} />
            <Field k={t("receipts.chequeNo", "Cheque #")} v={r.cheque_no ?? "—"} />
            <Field
              k={t("receipts.chequeDate", "Cheque date")}
              v={r.cheque_date ? formatDate(r.cheque_date) : "—"}
            />
            <Field
              k={t("common.status", "Status")}
              v={
                <Badge
                  variant={r.status === "void" ? "destructive" : "outline"}
                  className="capitalize"
                >
                  {r.status}
                </Badge>
              }
            />
            <Field k={t("common.remarks", "Remarks")} v={r.remarks ?? "—"} full />
          </CardContent>
        </Card>

        <Card className="shadow-1">
          <CardHeader>
            <CardTitle className="text-sm">{t("common.amounts", "Amounts")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Line k={t("receipts.gross", "Gross")} v={formatInr(r.amount)} />
            <Line k={t("receipts.tds", "TDS")} v={formatInr(-Number(r.tds_amount))} />
            <Line
              k={t("receipts.bankCharges", "Bank charges")}
              v={formatInr(-Number(r.bank_charges))}
            />
            <Line k={t("receipts.net", "Net")} v={formatInr(r.net_amount)} bold />
            <hr className="my-2 border-border" />
            <Line k={t("receipts.allocated", "Allocated")} v={formatInr(r.allocated_amount)} />
            <Line
              k={t("receipts.unallocated", "Unallocated")}
              v={formatInr(r.unallocated_amount)}
              bold
            />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 shadow-1">
        <CardHeader>
          <CardTitle className="text-sm">{t("receipts.allocations", "Allocations")}</CardTitle>
        </CardHeader>
        <CardContent>
          {allocs.isLoading ? (
            <LoadingBlock />
          ) : (allocs.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t(
                "receipts.unallocatedAdvanceNote",
                "Unallocated advance — apply to invoices from the customer ledger.",
              )}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("invoices.invoiceNo", "Invoice #")}</TableHead>
                  <TableHead>{t("common.date", "Date")}</TableHead>
                  <TableHead className="text-right">
                    {t("invoices.invoiceTotal", "Invoice total")}
                  </TableHead>
                  <TableHead className="text-right">{t("receipts.applied", "Applied")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(allocs.data ?? []).map((a) => {
                  const inv = (
                    a as {
                      invoice: {
                        id: string;
                        invoice_no: string;
                        total: number;
                        issue_date: string;
                      } | null;
                    }
                  ).invoice;
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        {inv ? (
                          <Link
                            to="/invoices/$invoiceId"
                            params={{ invoiceId: inv.id }}
                            className="hover:underline font-mono text-xs"
                          >
                            {inv.invoice_no}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {inv ? formatDate(inv.issue_date) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {inv ? formatInr(inv.total) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatInr(a.amount)}
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

function Field({ k, v, full }: { k: string; v: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <div className="text-xs text-muted-foreground">{k}</div>
      <div>{v}</div>
    </div>
  );
}
function Line({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className={bold ? "font-semibold" : ""}>{v}</span>
    </div>
  );
}
