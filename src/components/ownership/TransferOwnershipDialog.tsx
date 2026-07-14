/**
 * Commercial Ownership Transfer wizard.
 *
 * A single reusable dialog launched from Customer / Enquiry / Quotation /
 * Sales Order / Project detail pages. Steps:
 *   1. Pick new customer (EntityPicker)
 *   2. Side-by-side identity compare
 *   3. Select what to transfer
 *   4. Validation + impact preview (server RPC)
 *   5. Confirm
 *
 * Never duplicates data. Existing finalised invoices are preserved for
 * accounting integrity. Role gating (admin / sales_manager) enforced both
 * client-side (hide) and server-side (RPC).
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, Loader2, ShieldAlert, UserCheck } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { EntityPicker } from "@/components/forms/EntityPicker";
import { getCustomer, type CustomerRow } from "@/lib/customers/api";
import {
  DEFAULT_SCOPE,
  previewOwnershipTransfer,
  transferCommercialOwnership,
  type TransferPreview,
  type TransferScope,
  type TransferSourceType,
} from "@/lib/ownership-transfer/api";
import { toUserMessage } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import {
  invalidateCustomer,
  invalidateEnquiry,
  invalidateInvoice,
  invalidateProject,
  invalidateQuote,
  invalidateSalesOrder,
} from "@/lib/query-invalidation";

type Step = "pick" | "compare" | "scope" | "preview" | "done";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sourceType: TransferSourceType;
  sourceId: string;
  sourceLabel: string;
  fromCustomerId: string | null;
}

const SCOPE_ITEMS: Array<{ key: keyof TransferScope; label: string; hint?: string }> = [
  { key: "enquiries", label: "Enquiries", hint: "Original enquiry stays visible either way." },
  { key: "quotes", label: "Quotations" },
  { key: "sales_orders", label: "Sales Orders" },
  { key: "projects", label: "Projects", hint: "Follow-ups, notes, files and site visits move with the project." },
  { key: "installations", label: "Installations" },
  { key: "payment_schedules", label: "Payment Schedules" },
  { key: "draft_invoices", label: "Draft Invoices", hint: "Finalised invoices are never modified." },
];

export function TransferOwnershipDialog({
  open,
  onOpenChange,
  sourceType,
  sourceId,
  sourceLabel,
  fromCustomerId,
}: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("pick");
  const [toId, setToId] = useState<string | null>(null);
  const [scope, setScope] = useState<TransferScope>(DEFAULT_SCOPE);

  const fromQ = useQuery({
    queryKey: fromCustomerId ? qk.customers.byId(fromCustomerId) : ["_none_from"],
    queryFn: () => (fromCustomerId ? getCustomer(fromCustomerId) : Promise.resolve(null)),
    enabled: !!fromCustomerId && open,
  });
  const toQ = useQuery({
    queryKey: toId ? qk.customers.byId(toId) : ["_none_to"],
    queryFn: () => (toId ? getCustomer(toId) : Promise.resolve(null)),
    enabled: !!toId && open,
  });

  const previewQ = useQuery({
    queryKey: ["ownership-preview", fromCustomerId, toId],
    queryFn: () => previewOwnershipTransfer(fromCustomerId!, toId!),
    enabled: !!fromCustomerId && !!toId && step === "preview",
  });

  const mut = useMutation({
    mutationFn: () =>
      transferCommercialOwnership({
        sourceType,
        sourceId,
        fromCustomerId: fromCustomerId!,
        toCustomerId: toId!,
        scope,
      }),
    onSuccess: () => {
      toast.success("Commercial ownership transferred");
      if (fromCustomerId) invalidateCustomer(qc, fromCustomerId);
      if (toId) invalidateCustomer(qc, toId);
      invalidateEnquiry(qc);
      invalidateQuote(qc);
      invalidateSalesOrder(qc);
      invalidateProject(qc);
      invalidateInvoice(qc);
      qc.invalidateQueries({ queryKey: qk.activity.recent });
      setStep("done");
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  useEffect(() => {
    if (!open) {
      setStep("pick");
      setToId(null);
      setScope(DEFAULT_SCOPE);
    }
  }, [open]);

  const finalisedCount = previewQ.data?.counts.invoices_finalised ?? 0;
  const preview = previewQ.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> Transfer Commercial Ownership — {sourceLabel}
          </DialogTitle>
          <DialogDescription>
            Move commercial ownership to a different customer. Enquiry history, existing
            documents and finalised invoices are preserved.
          </DialogDescription>
        </DialogHeader>

        <StepIndicator step={step} />

        {step === "pick" && (
          <div className="space-y-4 py-2">
            <FieldBlock label="Current customer">
              {fromQ.data ? `${fromQ.data.name} (${fromQ.data.customer_code})` : "—"}
            </FieldBlock>
            <FieldBlock label="New customer">
              <EntityPicker
                type="customer"
                value={toId}
                onChange={(id) => setToId(id)}
                allowCreate
                placeholder="Search by name, company, mobile, GST, email…"
              />
              {toId && toId === fromCustomerId && (
                <p className="mt-1 text-xs text-destructive">
                  New customer must differ from current.
                </p>
              )}
            </FieldBlock>
          </div>
        )}

        {step === "compare" && (
          <ComparePanel from={fromQ.data ?? null} to={toQ.data ?? null} />
        )}

        {step === "scope" && (
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Select which records should be transferred. Follow-ups, notes, files and site
              visits move automatically with their parent project. Existing receipts and
              finalised invoices always stay with the original customer.
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              {SCOPE_ITEMS.map((it) => (
                <label
                  key={it.key}
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-3 hover:bg-muted/40"
                >
                  <Checkbox
                    checked={scope[it.key]}
                    onCheckedChange={(v) => setScope((s) => ({ ...s, [it.key]: !!v }))}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-medium">{it.label}</div>
                    {it.hint && (
                      <div className="text-xs text-muted-foreground">{it.hint}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === "preview" && (
          <PreviewPanel query={previewQ} scope={scope} />
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="rounded-full bg-status-success-bg p-3 text-status-success-fg">
              <Check className="h-6 w-6" />
            </div>
            <div className="text-sm font-medium">Ownership transferred</div>
            <p className="text-xs text-muted-foreground">
              Future documents will be raised against the new customer.
              {finalisedCount > 0 && (
                <>
                  {" "}
                  {finalisedCount} finalised invoice(s) remain with the previous customer for
                  accounting integrity.
                </>
              )}
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "pick" && (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep("compare")}
                disabled={!toId || toId === fromCustomerId || !toQ.data}
              >
                Continue
              </Button>
            </>
          )}
          {step === "compare" && (
            <>
              <Button variant="ghost" onClick={() => setStep("pick")}>
                Back
              </Button>
              <Button onClick={() => setStep("scope")}>Continue</Button>
            </>
          )}
          {step === "scope" && (
            <>
              <Button variant="ghost" onClick={() => setStep("compare")}>
                Back
              </Button>
              <Button
                onClick={() => setStep("preview")}
                disabled={!Object.values(scope).some(Boolean)}
              >
                Continue
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="ghost" onClick={() => setStep("scope")} disabled={mut.isPending}>
                Back
              </Button>
              <Button
                onClick={() => mut.mutate()}
                disabled={mut.isPending || previewQ.isLoading || !!previewQ.error}
              >
                {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm transfer
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: Step[] = ["pick", "compare", "scope", "preview"];
  const idx = steps.indexOf(step);
  return (
    <div className="flex items-center gap-2 border-b border-border pb-3 text-xs text-muted-foreground">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
              i <= idx && step !== "done"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border"
            }`}
          >
            {i + 1}
          </span>
          <span className={i <= idx ? "text-foreground" : ""}>
            {s === "pick" ? "Search" : s === "compare" ? "Compare" : s === "scope" ? "Scope" : "Preview"}
          </span>
          {i < steps.length - 1 && <ArrowRight className="h-3 w-3" />}
        </div>
      ))}
    </div>
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <div className="rounded-md border border-border px-3 py-2 text-sm">{children}</div>
    </div>
  );
}

function ComparePanel({ from, to }: { from: CustomerRow | null; to: CustomerRow | null }) {
  const rows: Array<{ label: string; a?: string | null; b?: string | null }> = [
    { label: "Name", a: from?.name, b: to?.name },
    { label: "Code", a: from?.customer_code, b: to?.customer_code },
    { label: "Type", a: from?.customer_type, b: to?.customer_type },
    { label: "GST", a: from?.gst_number, b: to?.gst_number },
    { label: "Mobile", a: from?.primary_phone, b: to?.primary_phone },
    { label: "Email", a: from?.primary_email, b: to?.primary_email },
    { label: "Billing address", a: from?.billing_address, b: to?.billing_address },
    { label: "City", a: from?.city, b: to?.city },
    { label: "State", a: from?.state, b: to?.state },
  ];
  return (
    <div className="py-2">
      <div className="hidden gap-2 border-b border-border pb-1 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[130px_1fr_1fr]">
        <div>Field</div>
        <div>Current</div>
        <div className="flex items-center gap-1">
          <ArrowRight className="h-3 w-3" /> New
        </div>
      </div>
      <div className="max-h-[45vh] overflow-y-auto">
        {rows.map((r) => {
          const changed = (r.a ?? "") !== (r.b ?? "");
          return (
            <div
              key={r.label}
              className="grid grid-cols-1 gap-1 border-b border-border py-2 last:border-0 sm:grid-cols-[130px_1fr_1fr] sm:items-start sm:gap-2"
            >
              <div className="text-xs font-medium text-muted-foreground">{r.label}</div>
              <div className={`text-sm ${changed ? "text-muted-foreground line-through" : ""}`}>
                {r.a || "—"}
              </div>
              <div className={`text-sm ${changed ? "font-medium" : ""}`}>{r.b || "—"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PreviewPanel({
  query,
  scope,
}: {
  query: ReturnType<typeof useQuery<TransferPreview, Error>>;
  scope: TransferScope;
}) {
  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Analysing impact…
      </div>
    );
  }
  if (query.error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
        {toUserMessage(query.error)}
      </div>
    );
  }
  const p = query.data;
  if (!p) return null;
  const rows: Array<{ label: string; key: keyof TransferScope | "invoices_finalised" | "receipts" | "followups"; countKey: string; muted?: boolean }> = [
    { label: "Enquiries", key: "enquiries", countKey: "enquiries" },
    { label: "Quotations", key: "quotes", countKey: "quotes" },
    { label: "Sales Orders", key: "sales_orders", countKey: "sales_orders" },
    { label: "Projects", key: "projects", countKey: "projects" },
    { label: "Installations", key: "installations", countKey: "installations" },
    { label: "Payment schedules", key: "payment_schedules", countKey: "payment_schedules" },
    { label: "Draft invoices", key: "draft_invoices", countKey: "invoices_draft" },
    { label: "Finalised invoices (kept with original)", key: "invoices_finalised", countKey: "invoices_finalised", muted: true },
    { label: "Historical receipts (kept with original)", key: "receipts", countKey: "receipts", muted: true },
    { label: "Follow-ups on enquiries", key: "followups", countKey: "followups", muted: true },
  ];
  return (
    <div className="space-y-3 py-2">
      <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{p.from.name}</span>
          <ArrowRight className="h-3 w-3" />
          <span className="font-medium text-foreground">{p.to.name}</span>
        </div>
      </div>

      <div className="rounded-md border border-border">
        {rows.map((r) => {
          const willMove = r.key in scope ? (scope as unknown as Record<string, boolean>)[r.key] : false;
          const count = p.counts[r.countKey] ?? 0;
          return (
            <div
              key={r.label}
              className="flex items-center justify-between border-b border-border px-3 py-2 last:border-0 text-sm"
            >
              <span className={r.muted ? "text-muted-foreground" : ""}>{r.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{count}</span>
                {r.muted ? (
                  <Badge variant="outline" className="text-xs">preserved</Badge>
                ) : willMove ? (
                  <Badge variant="secondary" className="text-xs">will move</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">unchanged</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(p.warnings ?? []).map((w, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 rounded-md border p-3 text-xs ${
            w.level === "warning"
              ? "border-status-warning-border bg-status-warning-bg text-status-warning-fg"
              : "border-border bg-muted/30 text-muted-foreground"
          }`}
        >
          {w.level === "warning" ? (
            <AlertTriangle className="h-3.5 w-3.5" />
          ) : (
            <ShieldAlert className="h-3.5 w-3.5" />
          )}
          <span>{w.message}</span>
        </div>
      ))}
    </div>
  );
}
