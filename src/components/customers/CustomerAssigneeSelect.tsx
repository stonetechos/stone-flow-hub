import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Check, Loader2, UserCheck, UserPlus, X } from "lucide-react";
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
  CUSTOMER_SALESPEOPLE,
  getCustomerSalesperson,
  type CustomerSalespersonKey,
} from "@/lib/customers/crm-status";
import { updateCustomerSalesperson } from "@/lib/customers/api";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

interface CustomerAssigneeSelectProps {
  customerId: string;
  customerName?: string;
  workflowState?: unknown;
  externalRef?: unknown;
  size?: "sm" | "default";
  variant?: "badge" | "button";
}

export function CustomerAssigneeSelect({
  customerId,
  customerName,
  workflowState,
  externalRef,
  size = "sm",
  variant = "badge",
}: CustomerAssigneeSelectProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const currentSalesperson = getCustomerSalesperson({
    workflow_state: workflowState,
    external_ref: externalRef,
  });

  const config = currentSalesperson ? CUSTOMER_SALESPEOPLE[currentSalesperson] : null;

  const mutation = useMutation({
    mutationFn: (newSalesperson: CustomerSalespersonKey | null) =>
      updateCustomerSalesperson({
        customerId,
        salesperson: newSalesperson,
      }),
    onSuccess: (_, newSalesperson) => {
      const assignedLabel = newSalesperson ? CUSTOMER_SALESPEOPLE[newSalesperson].label : null;
      toast.success(
        assignedLabel
          ? `${customerName ?? "Customer"} assigned to ${assignedLabel}`
          : `${customerName ?? "Customer"} unassigned`,
      );
      void qc.invalidateQueries({ queryKey: qk.customers.byId(customerId) });
      void qc.invalidateQueries({ queryKey: qk.customers.all });
      void qc.invalidateQueries({ queryKey: ["hub", "customer", customerId] });
      setOpen(false);
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
            disabled={mutation.isPending}
            className={cn(
              "inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold shadow-2xs transition-all hover:opacity-90 hover:ring-2 hover:ring-cyan-500/20 focus:outline-hidden",
              config
                ? config.badgeTone
                : "border-dashed border-slate-300 bg-slate-50/80 text-slate-500 hover:border-slate-400 hover:text-slate-800",
              size === "sm" ? "h-6 text-[11px]" : "h-7 text-xs",
            )}
            title={
              config
                ? `Assigned to ${config.label}. Click to reassign.`
                : "Unassigned. Click to assign to Rishi or Raman."
            }
          >
            {mutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin text-current shrink-0" />
            ) : config ? (
              <span
                className={cn(
                  "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white",
                  config.avatarTone,
                )}
              >
                {config.shortName[0]}
              </span>
            ) : (
              <UserPlus className="h-3 w-3 shrink-0 text-slate-400" />
            )}
            <span className="truncate">{config ? config.shortName || config.label : "Assign"}</span>
            <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
          </button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={mutation.isPending}
            className={cn(
              "gap-1.5 font-semibold max-w-full",
              config ? config.badgeTone : "text-slate-600",
            )}
            title={
              config
                ? `Assigned to ${config.label}. Click to reassign.`
                : "Unassigned. Click to assign to Rishi or Raman."
            }
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
            ) : (
              <UserCheck className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">{config ? config.shortName || config.label : "Assign"}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56 p-1.5">
        <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Assign Salesperson
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {(Object.keys(CUSTOMER_SALESPEOPLE) as CustomerSalespersonKey[]).map((key) => {
          const person = CUSTOMER_SALESPEOPLE[key];
          const isSelected = currentSalesperson === key;
          return (
            <DropdownMenuItem
              key={key}
              onClick={() => mutation.mutate(key)}
              className={cn(
                "flex items-center justify-between rounded-md p-2 text-xs cursor-pointer",
                isSelected && "bg-cyan-50/90 font-bold text-cyan-950",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white",
                    person.avatarTone,
                  )}
                >
                  {person.shortName[0]}
                </span>
                <div>
                  <div className="font-semibold text-slate-900">{person.label}</div>
                  <div className="text-[10px] text-muted-foreground">{person.email}</div>
                </div>
              </div>
              {isSelected && <Check className="h-4 w-4 text-cyan-700 shrink-0" />}
            </DropdownMenuItem>
          );
        })}

        {currentSalesperson && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => mutation.mutate(null)}
              className="flex items-center gap-2 rounded-md p-2 text-xs text-rose-600 hover:bg-rose-50 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Unassign customer</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
