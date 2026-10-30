import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Check,
  Loader2,
  Sparkles,
  UserX,
  UserCheck,
  AlertTriangle,
  MessageCircle,
  CheckCircle2,
} from "lucide-react";
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
  getCustomerStatusNotificationInfo,
  type CustomerResponseStatus,
} from "@/lib/customers/crm-status";
import { updateCustomerCrmStatus } from "@/lib/customers/api";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { StatusWhatsappNotificationDialog } from "./StatusWhatsappNotificationDialog";

export interface CustomerResponseStatusSelectProps {
  customerId: string;
  customerName?: string;
  contactPerson?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  salesperson?: string | null;
  companyName?: string | null;
  isActive?: boolean;
  workflowState?: unknown;
  externalRef?: unknown;
  size?: "sm" | "default";
  variant?: "badge" | "button";
  showNotificationStatus?: boolean;
}

export function CustomerResponseStatusSelect({
  customerId,
  customerName,
  contactPerson,
  phone,
  whatsapp,
  salesperson,
  companyName,
  isActive = true,
  workflowState,
  externalRef,
  size = "sm",
  variant = "badge",
  showNotificationStatus = true,
}: CustomerResponseStatusSelectProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [waDialogOpen, setWaDialogOpen] = useState(false);

  const currentStatus = getCustomerResponseStatus({
    is_active: isActive,
    workflow_state: workflowState,
    external_ref: externalRef,
  });

  const [pendingStatus, setPendingStatus] = useState<CustomerResponseStatus>(currentStatus);

  const config = CUSTOMER_RESPONSE_STATUS_CONFIG[currentStatus];

  const notifInfo = getCustomerStatusNotificationInfo({
    is_active: isActive,
    workflow_state: workflowState,
    external_ref: externalRef,
  });

  const mutation = useMutation({
    mutationFn: (newStatus: CustomerResponseStatus) =>
      updateCustomerCrmStatus({
        customerId,
        response_status: newStatus,
      }),
    onSuccess: (updated, newStatus) => {
      const effStatus = getCustomerResponseStatus(updated);
      const newConfig = CUSTOMER_RESPONSE_STATUS_CONFIG[effStatus];
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

      // Open WhatsApp notification dialog to prompt staff to notify customer
      setPendingStatus(newStatus);
      setWaDialogOpen(true);
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
    <>
      <div className="inline-flex flex-col items-start gap-1 max-w-full">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            {variant === "badge" ? (
              <button
                type="button"
                disabled={mutation.isPending || toggleActiveMutation.isPending}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                className={cn(
                  "inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold shadow-2xs transition-all hover:opacity-90 hover:ring-2 hover:ring-teal-500/20 focus:outline-hidden touch-manipulation cursor-pointer",
                  config.badgeTone,
                  size === "sm" ? "h-6 text-[11px]" : "h-7 text-xs",
                )}
                title={`Customer status: ${config.label}. Click to change.`}
              >
                {mutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin text-current shrink-0" />
                ) : (
                  <span className={cn("h-2 w-2 rounded-full shrink-0", config.dotColor)} />
                )}
                <span className="truncate">{config.shortLabel || config.label}</span>
                <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
              </button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={mutation.isPending || toggleActiveMutation.isPending}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                className={cn(
                  "gap-1.5 font-semibold max-w-full touch-manipulation cursor-pointer",
                  config.tone,
                )}
                title={`Customer status: ${config.label}. Click to change.`}
              >
                {mutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                ) : (
                  <span className={cn("h-2 w-2 rounded-full shrink-0", config.dotColor)} />
                )}
                <span className="truncate">{config.shortLabel || config.label}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
              </Button>
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-64 p-1.5 z-50">
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
                    onSelect={() => mutation.mutate(statusKey)}
                    onClick={() => mutation.mutate(statusKey)}
                    className={cn(
                      "flex items-start gap-2.5 rounded-md p-2 text-xs cursor-pointer min-h-[38px] touch-manipulation",
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

            {/* Quick action to open WhatsApp dialog for current status */}
            <DropdownMenuItem
              onSelect={() => {
                setPendingStatus(currentStatus);
                setWaDialogOpen(true);
              }}
              onClick={() => {
                setPendingStatus(currentStatus);
                setWaDialogOpen(true);
              }}
              className="flex items-center gap-2 p-2 text-xs cursor-pointer min-h-[36px] touch-manipulation text-emerald-800 bg-emerald-50/60 font-medium"
            >
              <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
              <span>Send WhatsApp Status Update</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Account Directory Status
            </DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={() => toggleActiveMutation.mutate(!isActive)}
              onClick={() => toggleActiveMutation.mutate(!isActive)}
              className="flex items-center gap-2 p-2 text-xs cursor-pointer min-h-[36px] touch-manipulation"
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

        {/* WhatsApp Notification Indicator: Warns staff if customer is not updated with current status */}
        {showNotificationStatus && notifInfo.needsNotification && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setPendingStatus(currentStatus);
              setWaDialogOpen(true);
            }}
            className="inline-flex max-w-full items-center gap-1 rounded bg-amber-50 hover:bg-amber-100/90 border border-amber-300/90 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 transition-colors shadow-2xs cursor-pointer text-left"
            title="The customer is not updated with the current status. Click to send WhatsApp notification."
          >
            <AlertTriangle className="h-2.5 w-2.5 text-amber-600 shrink-0" />
            <span className="truncate">The customer is not updated with the current status</span>
            <MessageCircle className="h-2.5 w-2.5 text-emerald-600 shrink-0 ml-0.5" />
          </button>
        )}

        {showNotificationStatus && !notifInfo.needsNotification && notifInfo.sentAt && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setPendingStatus(currentStatus);
              setWaDialogOpen(true);
            }}
            className="inline-flex max-w-full items-center gap-1 text-[10px] text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer px-0.5"
            title={`Customer updated on WhatsApp (${new Date(notifInfo.sentAt).toLocaleDateString("en-IN")}). Click to re-send or edit message.`}
          >
            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
            <span className="truncate">Customer updated</span>
          </button>
        )}
      </div>

      <StatusWhatsappNotificationDialog
        open={waDialogOpen}
        onOpenChange={setWaDialogOpen}
        customerId={customerId}
        customerName={customerName}
        contactPerson={contactPerson}
        phone={phone}
        whatsapp={whatsapp}
        status={pendingStatus}
        salesperson={salesperson}
        companyName={companyName}
      />
    </>
  );
}
