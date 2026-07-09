/**
 * Customer Reassignment dialog for a quotation.
 *
 * Flow: Search customer → Review diff → Confirm transfer.
 *
 * Ownership only — does NOT duplicate the quotation, its items, its project,
 * or its enquiry history. The original enquiry continues to show who first
 * approached Stone Tech; this dialog changes only the billing/commercial
 * customer. Server-side RPC enforces role + finalised-invoice guards and
 * writes the audit trail.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Loader2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EntityPicker } from "@/components/forms/EntityPicker";
import { getCustomer } from "@/lib/customers/api";
import { reassignQuoteCustomer } from "@/lib/quotes/api";
import { toUserMessage } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import { invalidateQuote, invalidateInvoice, invalidateCustomer } from "@/lib/query-invalidation";
import type { CustomerRow } from "@/lib/customers/api";

type Step = "pick" | "review";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quoteId: string;
  quoteNo: string;
  currentCustomerId: string | null;
}

function DiffRow({
  label,
  before,
  after,
}: {
  label: string;
  before: string | null | undefined;
  after: string | null | undefined;
}) {
  const changed = (before ?? "") !== (after ?? "");
  return (
    <div className="grid grid-cols-[140px_1fr_1fr] items-start gap-2 border-b border-border py-2 last:border-0">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`text-sm ${changed ? "text-muted-foreground line-through" : ""}`}>
        {before || "—"}
      </div>
      <div className={`text-sm ${changed ? "font-medium text-foreground" : ""}`}>
        {after || "—"}
      </div>
    </div>
  );
}

export function ReassignCustomerDialog({
  open,
  onOpenChange,
  quoteId,
  quoteNo,
  currentCustomerId,
}: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("pick");
  const [newCustomerId, setNewCustomerId] = useState<string | null>(null);

  const currentQ = useQuery({
    queryKey: currentCustomerId ? qk.customers.byId(currentCustomerId) : ["_none"],
    queryFn: () => (currentCustomerId ? getCustomer(currentCustomerId) : Promise.resolve(null)),
    enabled: !!currentCustomerId && open,
  });
  const nextQ = useQuery({
    queryKey: newCustomerId ? qk.customers.byId(newCustomerId) : ["_none_new"],
    queryFn: () => (newCustomerId ? getCustomer(newCustomerId) : Promise.resolve(null)),
    enabled: !!newCustomerId && open,
  });

  const current = currentQ.data ?? null;
  const next = nextQ.data ?? null;

  const mut = useMutation({
    mutationFn: () => reassignQuoteCustomer(quoteId, newCustomerId!),
    onSuccess: () => {
      toast.success("Customer reassigned");
      invalidateQuote(qc, quoteId);
      invalidateInvoice(qc);
      if (currentCustomerId) invalidateCustomer(qc, currentCustomerId);
      if (newCustomerId) invalidateCustomer(qc, newCustomerId);
      handleClose(false);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const rows = useMemo(
    () => diffRows(current, next),
    [current, next],
  );

  function handleClose(v: boolean) {
    if (!v) {
      setStep("pick");
      setNewCustomerId(null);
    }
    onOpenChange(v);
  }

  const invalid =
    !newCustomerId ||
    newCustomerId === currentCustomerId ||
    !next;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> Change customer — {quoteNo}
          </DialogTitle>
          <DialogDescription>
            Move commercial ownership of this quotation. Enquiry history and the original quotation
            are preserved.
          </DialogDescription>
        </DialogHeader>

        {step === "pick" && (
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              Search by customer name, company, mobile, GST or email. The original enquiry customer
              will remain on record — only future documents (sales orders, tax invoice, receipts,
              delivery) will use the new customer.
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Current customer
              </label>
              <div className="rounded-md border border-border px-3 py-2 text-sm">
                {current ? `${current.name} (${current.customer_code})` : "—"}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                New customer
              </label>
              <EntityPicker
                type="customer"
                value={newCustomerId}
                onChange={(id) => setNewCustomerId(id)}
                allowCreate
                placeholder="Search existing customer…"
              />
              {newCustomerId && newCustomerId === currentCustomerId && (
                <p className="mt-1 text-xs text-destructive">
                  This customer already owns the quotation.
                </p>
              )}
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-3 py-2">
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" /> Review the changes
              </div>
              <p className="mt-1">
                Future sales orders, tax invoices, receipts and delivery documents will be raised
                against the new customer. Existing finalised invoices (if any) will block this
                action.
              </p>
            </div>

            <div className="grid grid-cols-[140px_1fr_1fr] gap-2 border-b border-border pb-1 text-xs font-medium text-muted-foreground">
              <div>Field</div>
              <div>Current</div>
              <div className="flex items-center gap-1">
                <ArrowRight className="h-3 w-3" /> New
              </div>
            </div>
            <div className="max-h-[45vh] overflow-y-auto pr-1">
              {rows.map((r) => (
                <DiffRow key={r.label} label={r.label} before={r.before} after={r.after} />
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "pick" ? (
            <>
              <Button variant="ghost" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep("review")} disabled={invalid}>
                Continue
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep("pick")} disabled={mut.isPending}>
                Back
              </Button>
              <Button onClick={() => mut.mutate()} disabled={mut.isPending || invalid}>
                {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm transfer
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function diffRows(a: CustomerRow | null, b: CustomerRow | null) {
  return [
    { label: "Customer name", before: a?.name, after: b?.name },
    { label: "Customer code", before: a?.customer_code, after: b?.customer_code },
    { label: "Customer type", before: a?.customer_type, after: b?.customer_type },
    { label: "GST number", before: a?.gst_number, after: b?.gst_number },
    { label: "Mobile", before: a?.primary_phone, after: b?.primary_phone },
    { label: "WhatsApp", before: a?.whatsapp, after: b?.whatsapp },
    { label: "Email", before: a?.primary_email, after: b?.primary_email },
    { label: "Billing address", before: a?.billing_address, after: b?.billing_address },
    { label: "City", before: a?.city, after: b?.city },
    { label: "State", before: a?.state, after: b?.state },
    { label: "Pincode", before: a?.pincode, after: b?.pincode },
  ];
}
