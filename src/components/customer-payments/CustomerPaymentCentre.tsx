import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CircleDollarSign, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { LoadingBlock } from "@/components/layout/States";
import { formatInr } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";
import {
  listSchedulesForCustomer,
  recordSchedulePayment,
  type PaymentScheduleDashboardRow,
} from "@/lib/customer-payments/schedule";
import { PaymentRequestDialog } from "./PaymentRequestDialog";

const BUCKET_STYLE: Record<string, string> = {
  overdue: "bg-destructive/10 text-destructive",
  due_today: "bg-status-warning-bg text-status-warning-fg",
  due_week: "bg-status-info-bg text-status-info-fg",
  upcoming: "bg-muted text-foreground",
  paid: "bg-status-success-bg text-status-success-fg",
  unscheduled: "bg-muted text-muted-foreground",
};

export function CustomerPaymentCentre(props: {
  customerId: string;
  defaultTo?: { email?: string | null; whatsapp?: string | null };
}) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["customer-payments", "customer", props.customerId],
    queryFn: () => listSchedulesForCustomer(props.customerId),
  });
  const [requestFor, setRequestFor] = useState<PaymentScheduleDashboardRow | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<string>("");

  const payMut = useMutation({
    mutationFn: (row: PaymentScheduleDashboardRow) =>
      recordSchedulePayment(row.id, Number(payAmount)),
    onSuccess: () => {
      toast.success("Payment recorded");
      qc.invalidateQueries({ queryKey: ["customer-payments"] });
      setPayingId(null);
      setPayAmount("");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (query.isLoading) return <LoadingBlock />;
  const rows = query.data ?? [];

  const outstanding = rows
    .filter((r) => r.status !== "paid")
    .reduce((s, r) => s + r.balance_due, 0);
  const overdue = rows.filter((r) => r.bucket === "overdue").reduce((s, r) => s + r.balance_due, 0);
  const upcoming = rows
    .filter((r) => r.bucket === "upcoming" || r.bucket === "due_week" || r.bucket === "due_today")
    .reduce((s, r) => s + r.balance_due, 0);
  const paid = rows.reduce((s, r) => s + Number(r.paid_amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Outstanding" value={outstanding} tone="text-foreground" />
        <Kpi label="Overdue" value={overdue} tone="text-destructive" />
        <Kpi label="Upcoming (14 d)" value={upcoming} tone="text-teal-700" />
        <Kpi label="Paid to date" value={paid} tone="text-emerald-600" />
      </div>

      <Card className="shadow-1">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4" /> Payment schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No contractual schedules yet. Approve an estimate to auto-generate one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      <div className="font-medium">{r.project_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.estimate_no ?? ""}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      #{r.milestone_no} · {r.label}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.due_date ?? "—"}
                      {r.days_to_due != null && r.status !== "paid" && (
                        <div className="text-[11px] text-muted-foreground">
                          {r.days_to_due < 0
                            ? `${Math.abs(r.days_to_due)} d late`
                            : `in ${r.days_to_due} d`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatInr(r.amount)}</TableCell>
                    <TableCell className="text-right">{formatInr(r.paid_amount)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatInr(r.balance_due)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`capitalize ${BUCKET_STYLE[r.bucket] ?? ""}`}
                      >
                        {r.bucket.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status !== "paid" && (
                        <div className="flex justify-end gap-2">
                          {payingId === r.id ? (
                            <>
                              <Input
                                type="number"
                                step="0.01"
                                className="w-28 h-8 text-right"
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value)}
                                autoFocus
                                placeholder={String(r.balance_due)}
                              />
                              <Button
                                size="sm"
                                onClick={() => payMut.mutate(r)}
                                disabled={payMut.isPending || !payAmount}
                              >
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setPayingId(null)}>
                                ×
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setPayingId(r.id);
                                  setPayAmount(String(r.balance_due));
                                }}
                              >
                                Record payment
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setRequestFor(r)}>
                                <Send className="mr-1 h-3 w-3" /> Request
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {requestFor && (
        <PaymentRequestDialog
          open={!!requestFor}
          onOpenChange={(v) => !v && setRequestFor(null)}
          row={requestFor}
          defaultTo={props.defaultTo}
        />
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="shadow-1">
      <CardContent className="p-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`text-xl font-semibold ${tone}`}>{formatInr(value)}</div>
      </CardContent>
    </Card>
  );
}
