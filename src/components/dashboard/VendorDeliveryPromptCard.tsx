import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Truck,
  MessageSquare,
  Clock,
  Building2,
  Package,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type VendorDeliveryPromptItem,
  useVendorDeliveryPrompts,
} from "@/lib/vendors/delivery-prompts";
import { VendorDeliveryPromptDialog } from "./VendorDeliveryPromptDialog";
import { cn } from "@/lib/utils";

export function VendorDeliveryPromptCard() {
  const { data: prompts = [], isLoading } = useVendorDeliveryPrompts();
  const [selectedItem, setSelectedItem] = useState<VendorDeliveryPromptItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (isLoading || prompts.length === 0) {
    return null;
  }

  const handleOpenPrompt = (item: VendorDeliveryPromptItem) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-3.5 sm:p-5 shadow-sm transition-all w-full max-w-full">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              <Truck className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-sm sm:text-base">
                  Vendor Deliveries Round the Corner
                </h3>
                <Badge
                  variant="outline"
                  className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-semibold px-2 py-0.5"
                >
                  Due within 5 Days
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {prompts.length}{" "}
                {prompts.length === 1
                  ? "order approaching deadline"
                  : "orders approaching deadline"}{" "}
                — tap below to verify fabrication status with assigned vendors using 1-day safety
                buffer.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            <span>1-Day Early Inquiries Active</span>
          </div>
        </div>

        {/* Prompts List */}
        <div className="grid gap-2.5">
          {prompts.map((item) => {
            const isDueToday = item.actualDaysRemaining === 0;
            const isDueTomorrow = item.actualDaysRemaining === 1;

            return (
              <div
                key={item.id}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-background/80 hover:bg-background transition-colors",
                  isDueToday
                    ? "border-red-500/40 bg-red-500/5 hover:bg-red-500/10"
                    : "border-border/70 hover:border-amber-500/50",
                )}
              >
                {/* Product & Order Details */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-primary shrink-0" />
                      {item.productName}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono uppercase px-1.5 py-0"
                    >
                      {item.orderNo}
                    </Badge>
                    {item.projectName && (
                      <span className="text-xs text-muted-foreground truncate">
                        ({item.projectName})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <strong className="text-foreground font-medium">{item.vendorName}</strong>
                    </span>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                      Due: {item.formattedDueDate}
                    </span>
                    {item.customerName && (
                      <>
                        <span className="text-muted-foreground/40">•</span>
                        <span>Client: {item.customerName}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Countdown & Action */}
                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-semibold px-2 py-0.5",
                        isDueToday
                          ? "bg-red-500/15 text-red-600 border-red-500/30 animate-pulse"
                          : isDueTomorrow
                            ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                            : "bg-blue-500/10 text-blue-600 border-blue-500/30",
                      )}
                    >
                      {isDueToday
                        ? "Due Today"
                        : isDueTomorrow
                          ? "Due Tomorrow (1d)"
                          : `${item.actualDaysRemaining} days left`}
                    </Badge>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Asking for: <strong className="text-foreground">{item.vendorDaysText}</strong>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleOpenPrompt(item)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-8 px-3 shadow-xs"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>WhatsApp</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* WhatsApp Message Preview Dialog */}
      <VendorDeliveryPromptDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        item={selectedItem}
      />
    </>
  );
}
