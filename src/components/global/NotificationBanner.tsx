import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  X,
  UserPlus,
  FileCheck,
  Building2,
  Truck,
  IndianRupee,
  CheckCircle2,
  Bell,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/use-roles";
import { onNotificationBanner, type BroadcastPayload } from "@/lib/notifications/broadcast";
import { openProjectCompletionWhatsapp } from "@/lib/projects/projectCompletionWhatsapp";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActiveBanner extends BroadcastPayload {
  id: string;
  createdAt: string;
}

export function NotificationBanner() {
  const [activeBanner, setActiveBanner] = useState<ActiveBanner | null>(null);
  const { isAdmin, isSuperAdmin } = useRoles();
  const nav = useNavigate();

  useEffect(() => {
    // 1. Listen to local in-memory event bus (for instant zero-latency pop on caller's app)
    const unsubLocal = onNotificationBanner((payload) => {
      if (payload.targetRole === "admin" && !isAdmin && !isSuperAdmin) {
        return;
      }
      setActiveBanner(payload);
    });

    // 2. Listen to Supabase Realtime broadcast (for other team members' devices)
    const channel = supabase
      .channel("notifications_feed")
      .on("broadcast", { event: "stos_banner" }, (evt: { payload: ActiveBanner }) => {
        if (!evt?.payload) return;
        if (evt.payload.targetRole === "admin" && !isAdmin && !isSuperAdmin) {
          return;
        }
        setActiveBanner(evt.payload);
      })
      .subscribe();

    return () => {
      unsubLocal();
      void supabase.removeChannel(channel);
    };
  }, [isAdmin, isSuperAdmin]);

  // Auto-dismiss after 7 seconds
  useEffect(() => {
    if (!activeBanner) return;
    const timer = setTimeout(() => {
      setActiveBanner(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [activeBanner]);

  if (!activeBanner) return null;

  const getIcon = () => {
    switch (activeBanner.entityType) {
      case "customer":
        return <UserPlus className="h-5 w-5 text-emerald-500" />;
      case "quote":
        return <FileCheck className="h-5 w-5 text-blue-500" />;
      case "rfq":
        return <Building2 className="h-5 w-5 text-indigo-500" />;
      case "dispatch":
        return <Truck className="h-5 w-5 text-amber-500" />;
      case "receipt":
        return <IndianRupee className="h-5 w-5 text-emerald-600" />;
      case "project":
        return <CheckCircle2 className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeBanner.actionType === "notify_customer_whatsapp" && activeBanner.actionData) {
      const d = activeBanner.actionData as {
        customerName?: string;
        customerPhone?: string;
        customerWhatsapp?: string;
        projectName?: string;
        projectCode?: string;
        totalInvoiced?: number;
        totalReceived?: number;
        balanceDue?: number;
      };
      openProjectCompletionWhatsapp({
        customerName: d.customerName || "Customer",
        customerPhone: d.customerPhone,
        customerWhatsapp: d.customerWhatsapp,
        projectName: d.projectName || "Project",
        projectCode: d.projectCode,
        totalInvoiced: d.totalInvoiced,
        totalReceived: d.totalReceived,
        balanceDue: d.balanceDue,
      });
      setActiveBanner(null);
      return;
    }

    if (activeBanner.linkPath) {
      void nav({ to: activeBanner.linkPath as never });
      setActiveBanner(null);
    }
  };

  const handleBannerClick = () => {
    if (activeBanner.linkPath) {
      void nav({ to: activeBanner.linkPath as never });
      setActiveBanner(null);
    }
  };

  return (
    <div className="fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 z-[9999] w-[94%] max-w-lg transition-all duration-300 animate-in slide-in-from-top-4 fade-in">
      <div
        onClick={handleBannerClick}
        className={cn(
          "relative overflow-hidden rounded-xl border bg-background/95 p-3.5 sm:p-4 shadow-2xl backdrop-blur-md cursor-pointer",
          "hover:border-primary/40 transition-colors",
          activeBanner.tier === "critical"
            ? "border-rose-500/30 ring-1 ring-rose-500/20"
            : "border-border ring-1 ring-black/5 dark:ring-white/10",
        )}
      >
        {/* Animated Accent Bar */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-1",
            activeBanner.tier === "critical"
              ? "bg-rose-500"
              : activeBanner.tier === "important"
                ? "bg-amber-500"
                : "bg-primary",
          )}
        />

        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted/80 p-2 shrink-0">{getIcon()}</div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {activeBanner.targetRole === "admin" ? "Admin Alert" : "STOS Notification"}
                </span>
                <span className="text-[10px] text-muted-foreground/80">• Just now</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveBanner(null);
                }}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h4 className="mt-0.5 text-sm font-semibold text-foreground leading-snug">
              {activeBanner.title}
            </h4>

            {activeBanner.body && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {activeBanner.body}
              </p>
            )}

            {/* Interactive Actions */}
            <div className="mt-2.5 flex items-center gap-2">
              {activeBanner.actionType === "notify_customer_whatsapp" ? (
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleAction}
                  className="h-8 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Notify Customer via WhatsApp
                </Button>
              ) : activeBanner.linkPath ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAction}
                  className="h-7 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
                >
                  View Details <ExternalLink className="h-3 w-3" />
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
