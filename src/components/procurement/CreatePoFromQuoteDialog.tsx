/** Vendor Commitment dialog — create Purchase Order from an approved vendor quote.
 *  Pre-fills payment schedule (Stone Tech commercial rules), vendor delivery date
 *  (2 days before customer delivery by default), and blocks unless procurement
 *  lock is satisfied — with an administrator override that records a reason.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, Loader2, ShieldAlert, ShoppingCart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toUserMessage } from "@/lib/errors";
import { formatInr } from "@/lib/format";
import {
  checkProcurementLock,
  createPoFromVendorQuote,
  riskFor,
  type PaymentScheduleRow,
} from "@/lib/procurement/commitment";

export function CreatePoFromQuoteDialog({
  quoteId,
  open,
  onOpenChange,
}: {
  quoteId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const nav = useNavigate();

  const lock = useQuery({
    queryKey: ["procurement-lock", quoteId],
    queryFn: () => checkProcurementLock(quoteId!),
    enabled: !!quoteId && open,
  });

  const [vendorDelivery, setVendorDelivery] = useState<string>("");
  const [override, setOverride] = useState("");
  const [schedule, setSchedule] = useState<PaymentScheduleRow[]>([]);

  useEffect(() => {
    if (lock.data) {
      setVendorDelivery(lock.data.vendor_delivery_default ?? "");
      setSchedule(lock.data.payment_schedule ?? []);
      setOverride("");
    }
  }, [lock.data]);

  const risk = useMemo(
    () => riskFor(vendorDelivery || null, lock.data?.customer_delivery_date ?? null),
    [vendorDelivery, lock.data?.customer_delivery_date],
  );
  const totalPct = schedule.reduce((s, r) => s + Number(r.pct || 0), 0);
  const lockOk = lock.data?.ok ?? false;
  const needsOverride = !lockOk;
  const canSubmit = !needsOverride || override.trim().length > 3;

  const mut = useMutation({
    mutationFn: () =>
      createPoFromVendorQuote({
        quoteId: quoteId!,
        vendorDeliveryDate: vendorDelivery || null,
        overrideReason: needsOverride ? override.trim() : null,
        paymentSchedule: schedule,
      }),
    onSuccess: (poId) => {
      toast.success("Purchase order created");
      qc.invalidateQueries({ queryKey: ["rfq-compare"] });
      qc.invalidateQueries({ queryKey: ["purchase_orders"] });
      qc.invalidateQueries({ queryKey: ["dash", "procurement"] });
      onOpenChange(false);
      nav({ to: "/purchase-orders/$id", params: { id: poId } });
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> Create Purchase Order
          </DialogTitle>
          <DialogDescription>
            Links the PO to the approved vendor quote, RFQ, estimate, project and customer. Defaults
            the vendor delivery deadline to two days before the customer commitment.
          </DialogDescription>
        </DialogHeader>

        {lock.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking procurement lock…
          </div>
        ) : lock.error ? (
          <p className="text-sm text-destructive">{toUserMessage(lock.error)}</p>
        ) : lock.data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Project" value={lock.data.project_name ?? "—"} />
              <Field label="Estimate" value={lock.data.estimate_status ?? "no accepted estimate"} />
              <Field label="Estimate total" value={formatInr(lock.data.estimate_total)} />
              <Field label="Commercial scenario" value={lock.data.commercial_scenario ?? "—"} />
              <Field label="Advance required" value={formatInr(lock.data.advance_required)} />
              <Field
                label="Advance received"
                value={formatInr(lock.data.advance_received)}
                tone={lock.data.advance_gap > 0 ? "danger" : "ok"}
              />
            </div>

            {needsOverride && (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Procurement lock active</AlertTitle>
                <AlertDescription>
                  {lock.data.estimate_id
                    ? `Customer has paid ${formatInr(lock.data.advance_received)} of the ${formatInr(lock.data.advance_required)} minimum advance. `
                    : "No approved estimate exists for this project. "}
                  An administrator may override with a mandatory reason logged below.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Customer delivery</Label>
                <Input value={lock.data.customer_delivery_date ?? "—"} disabled />
              </div>
              <div>
                <Label>Vendor delivery deadline</Label>
                <Input
                  type="date"
                  value={vendorDelivery}
                  onChange={(e) => setVendorDelivery(e.target.value)}
                />
              </div>
            </div>

            {risk !== "ok" && (
              <Alert variant={risk === "critical" ? "destructive" : "default"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  Procurement risk:{" "}
                  {risk === "critical"
                    ? "vendor deadline exceeds customer commitment"
                    : "less than 2-day buffer"}
                </AlertTitle>
                <AlertDescription>
                  Vendor deadline {vendorDelivery} vs customer commitment{" "}
                  {lock.data.customer_delivery_date}.
                </AlertDescription>
              </Alert>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Committed payment schedule</Label>
                <Badge variant={Math.abs(totalPct - 100) < 0.01 ? "secondary" : "destructive"}>
                  Total {totalPct}%
                </Badge>
              </div>
              <div className="space-y-2">
                {schedule.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_120px_140px_auto] items-center gap-2">
                    <Input
                      value={row.label}
                      onChange={(e) =>
                        setSchedule((s) =>
                          s.map((r, idx) => (idx === i ? { ...r, label: e.target.value } : r)),
                        )
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={row.pct}
                      onChange={(e) =>
                        setSchedule((s) =>
                          s.map((r, idx) =>
                            idx === i ? { ...r, pct: Number(e.target.value) } : r,
                          ),
                        )
                      }
                    />
                    <Input
                      value={row.stage}
                      onChange={(e) =>
                        setSchedule((s) =>
                          s.map((r, idx) => (idx === i ? { ...r, stage: e.target.value } : r)),
                        )
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSchedule((s) => s.filter((_, idx) => idx !== i))}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setSchedule((s) => [
                      ...s,
                      { label: "Additional stage", pct: 0, stage: "custom" },
                    ])
                  }
                >
                  + Add stage
                </Button>
              </div>
            </div>

            {needsOverride && (
              <div>
                <Label>Override reason (admin) *</Label>
                <Textarea
                  rows={2}
                  value={override}
                  onChange={(e) => setOverride(e.target.value)}
                  placeholder="Reason will be logged in the procurement lock audit trail."
                />
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={!canSubmit || mut.isPending || Math.abs(totalPct - 100) > 0.01}
          >
            {mut.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="mr-1.5 h-4 w-4" />
            )}
            Create Purchase Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "ok" | "danger";
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={tone === "danger" ? "font-medium text-destructive" : "font-medium"}>
        {value}
      </div>
    </div>
  );
}
