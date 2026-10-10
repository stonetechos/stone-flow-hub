import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Check, Loader2, Coins, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CUSTOMER_PAYMENT_STATUS_CONFIG,
  getCustomerPaymentStatus,
  updateCustomerPaymentStatus,
  type CustomerPaymentStatus,
} from "@/lib/customers/payment-status";
import type { CustomerLedgerOverviewItem } from "@/lib/customer-ledger/api";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { formatInr } from "@/lib/format";

interface CustomerPaymentStatusSelectProps {
  customerId: string;
  customerName?: string;
  workflowState?: unknown;
  externalRef?: unknown;
  ledgerSummary?: CustomerLedgerOverviewItem | null;
  size?: "sm" | "default";
  disabled?: boolean;
}

export function CustomerPaymentStatusSelect({
  customerId,
  customerName,
  workflowState,
  externalRef,
  ledgerSummary,
  size = "sm",
  disabled = false,
}: CustomerPaymentStatusSelectProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const currentStatus = getCustomerPaymentStatus(
    { workflow_state: workflowState, external_ref: externalRef },
    ledgerSummary,
  );

  const config = CUSTOMER_PAYMENT_STATUS_CONFIG[currentStatus];

  const mutation = useMutation({
    mutationFn: (newStatus: CustomerPaymentStatus) =>
      updateCustomerPaymentStatus({
        customerId,
        payment_status: newStatus,
      }),
    onSuccess: (updated) => {
      const newStatus = getCustomerPaymentStatus(updated, ledgerSummary);
      const newConfig = CUSTOMER_PAYMENT_STATUS_CONFIG[newStatus];
      toast.success(
        customerName
          ? `${customerName} marked as "${newConfig.label}"`
          : `Payment status updated to "${newConfig.label}"`,
      );
      void qc.invalidateQueries({ queryKey: qk.customers.byId(customerId) });
      void qc.invalidateQueries({ queryKey: qk.customers.all });
      void qc.invalidateQueries({ queryKey: ["customer-ledger-summaries"] });
      void qc.invalidateQueries({ queryKey: ["customer-order-pipeline"] });
      setOpen(false);
    },
    onError: (err) => {
      toast.error(toUserMessage(err));
    },
  });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled || mutation.isPending}>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-6 px-2 text-[11px] font-semibold gap-1.5 transition-all shadow-2xs border rounded-full justify-between",
            config.badgeTone,
            mutation.isPending && "opacity-70 cursor-wait",
          )}
        >
          <span className="flex items-center gap-1.5 min-w-0 truncate">
            {mutation.isPending ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dotColor)} />
            )}
            <span className="truncate">{config.label}</span>
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64 p-1.5">
        <DropdownMenuLabel className="px-2 py-1 text-[11px] font-medium text-muted-foreground flex items-center justify-between">
          <span>Set Payment Status</span>
          {ledgerSummary && (
            <span className="font-mono text-[10px] text-slate-500">
              Paid: {formatInr(ledgerSummary.totalCredit)}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />

        {(Object.keys(CUSTOMER_PAYMENT_STATUS_CONFIG) as CustomerPaymentStatus[]).map((key) => {
          const itemConfig = CUSTOMER_PAYMENT_STATUS_CONFIG[key];
          const isSelected = key === currentStatus;

          return (
            <DropdownMenuItem
              key={key}
              onClick={() => {
                if (key !== currentStatus) {
                  mutation.mutate(key);
                }
              }}
              className={cn(
                "flex items-start gap-2.5 px-2 py-1.5 cursor-pointer rounded-md text-xs",
                isSelected && "bg-slate-100/90 font-medium",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full shrink-0 mt-1", itemConfig.dotColor)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{itemConfig.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                  {itemConfig.description}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}

        {ledgerSummary && (
          <>
            <DropdownMenuSeparator className="my-1" />
            <div className="px-2 py-1.5 bg-slate-50 rounded-md text-[11px] flex flex-col gap-0.5 font-mono">
              <div className="flex justify-between text-muted-foreground">
                <span>Invoiced (Debit):</span>
                <span>{formatInr(ledgerSummary.totalDebit)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Received (Credit):</span>
                <span>{formatInr(ledgerSummary.totalCredit)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold border-t pt-0.5">
                <span>Balance Due:</span>
                <span>{formatInr(ledgerSummary.balance)}</span>
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
