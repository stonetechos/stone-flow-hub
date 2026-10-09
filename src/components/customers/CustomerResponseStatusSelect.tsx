import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Check, Loader2, Sparkles, UserX, UserCheck } from "lucide-react";
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
  CUSTOMER_RESPONSE_STATUS_CONFIG,
  getCustomerResponseStatus,
  type CustomerResponseStatus,
} from "@/lib/customers/crm-status";
import { updateCustomerCrmStatus } from "@/lib/customers/api";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

interface CustomerResponseStatusSelectProps {
  customerId: string;
  customerName?: string;
  isActive?: boolean;
  workflowState?: unknown;
  externalRef?: unknown;
  size?: "sm" | "default";
  variant?: "badge" | "button";
}

export function CustomerResponseStatusSelect({
  customerId,
  customerName,
  isActive = true,
  workflowState,
  externalRef,
  size = "sm",
  variant = "badge",
}: CustomerResponseStatusSelectProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const currentStatus = getCustomerResponseStatus({
    is_active: isActive,
    workflow_state: workflowState,
    external_ref: externalRef,
  });

  const config = CUSTOMER_RESPONSE_STATUS_CONFIG[currentStatus];

  const mutation = useMutation({
    mutationFn: (newStatus: CustomerResponseStatus) =>
      updateCustomerCrmStatus({
        customerId,
        response_status: newStatus,
      }),
    onSuccess: (updated) => {
      const newStatus = getCustomerResponseStatus(updated);
      const newConfig = CUSTOMER_RESPONSE_STATUS_CONFIG[newStatus];
      toast.success(
        customerName
          ? `${customerName} marked as "${newConfig.label}"`
          : `Status updated to "${newConfig.label}"`,
      );
      void qc.invalidateQueries({ queryKey: qk.customers.byId(customerId) });
      void qc.invalidateQueries({ queryKey: qk.customers.all });
      void qc.invalidateQueries({ queryKey: ["hub", "customer", customerId] });
      void qc.invalidateQueries({ queryKey: ["customer-pending-followups", customerId] });
      void qc.invalidateQueries({ queryKey: ["customer-followups-history", customerId] });
      void qc.invalidateQueries({ queryKey: ["followups"] });
      setOpen(false);
    },
    onError: (err) => {
      toast.error(toUserMessage(err));
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (newActive: boolean) =>
      updateCustomerCrmStatus({
        customerId,
        is_active: newActive,
        response_status: newActive ? "active_responsive" : "inactive_no_response",
      }),
    onSuccess: (updated) => {
      toast.success(
        updated.is_active
          ? `${customerName ?? "Customer"} marked Active`
          : `${customerName ?? "Customer"} marked Inactive`,
      );
      void qc.invalidateQueries({ queryKey: qk.customers.byId(customerId) });
      void qc.invalidateQueries({ queryKey: qk.customers.all });
      void qc.invalidateQueries({ queryKey: ["hub", "customer", customerId] });
    },
    onError: (err) => {
      toast.error(toUserMessage(err));
    },
  });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {variant === "badge" ? (
          <button
            type="button"
            disabled={mutation.isPending || toggleActiveMutation.isPending}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-2xs transition-all hover:opacity-90 hover:ring-2 hover:ring-teal-500/20 focus:outline-hidden",
              config.badgeTone,
              size === "sm" ? "h-6 text-[11px]" : "h-7 text-xs",
            )}
            title="Click to change customer response status"
          >
            {mutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin text-current" />
            ) : (
              <span className={cn("h-2 w-2 rounded-full", config.dotColor)} />
            )}
            <span>{config.label}</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={mutation.isPending || toggleActiveMutation.isPending}
            className={cn("gap-1.5 font-semibold", config.tone)}
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <span className={cn("h-2 w-2 rounded-full", config.dotColor)} />
            )}
            <span>{config.label}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64 p-1.5">
        <DropdownMenuLabel className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <span>Client Response Status</span>
          <Sparkles className="h-3 w-3 text-cyan-600" />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {(Object.keys(CUSTOMER_RESPONSE_STATUS_CONFIG) as CustomerResponseStatus[]).map(
          (statusKey) => {
            const item = CUSTOMER_RESPONSE_STATUS_CONFIG[statusKey];
            const isSelected = currentStatus === statusKey;
            return (
              <DropdownMenuItem
                key={statusKey}
                onClick={() => mutation.mutate(statusKey)}
                className={cn(
                  "flex items-start gap-2.5 rounded-md p-2 text-xs cursor-pointer",
                  isSelected && "bg-cyan-50/80 font-bold text-cyan-950",
                )}
              >
                <span className={cn("mt-1 h-2 w-2 rounded-full shrink-0", item.dotColor)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{item.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-cyan-700" />}
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground leading-snug font-normal">
                    {item.description}
                  </p>
                </div>
              </DropdownMenuItem>
            );
          },
        )}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Account Directory Status
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => toggleActiveMutation.mutate(!isActive)}
          className="flex items-center gap-2 p-2 text-xs cursor-pointer"
        >
          {isActive ? (
            <>
              <UserX className="h-3.5 w-3.5 text-amber-600" />
              <span>Mark Account Inactive (Archive response)</span>
            </>
          ) : (
            <>
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Reactivate Client Account</span>
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
