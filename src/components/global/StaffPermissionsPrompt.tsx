import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Mic,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  playNotificationSound,
  setSoundAlertEnabled,
  setVibrationAlertEnabled,
} from "@/lib/notifications/sound";

const STORAGE_KEY_DISMISSED = "stos_staff_permissions_dismissed_v1";

export interface PermissionStates {
  notification: PermissionState | "unsupported";
  mic: PermissionState | "unsupported";
  location: PermissionState | "unsupported";
}

export function StaffPermissionsPrompt() {
  const [open, setOpen] = useState(false);
  const [permissions, setPermissions] = useState<PermissionStates>({
    notification: "prompt",
    mic: "prompt",
    location: "prompt",
  });
  const [requesting, setRequesting] = useState(false);

  const checkPermissions = useCallback(async () => {
    if (typeof window === "undefined") return;

    let notifState: PermissionState | "unsupported" = "unsupported";
    if ("Notification" in window) {
      notifState =
        Notification.permission === "granted"
          ? "granted"
          : Notification.permission === "denied"
            ? "denied"
            : "prompt";
    }

    let micState: PermissionState | "unsupported" = "prompt";
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
        micState = status.state;
      } catch {
        // Fallback: browser may not support querying microphone directly
        micState = "prompt";
      }
    }

    let locState: PermissionState | "unsupported" = "prompt";
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
        locState = status.state;
      } catch {
        locState = "prompt";
      }
    }

    const current: PermissionStates = {
      notification: notifState,
      mic: micState,
      location: locState,
    };
    setPermissions(current);

    // If all essential permissions are granted, do not prompt
    if (
      current.notification === "granted" &&
      current.mic === "granted" &&
      current.location === "granted"
    ) {
      setOpen(false);
      return;
    }

    // Check if dismissed previously
    const dismissedUntil = localStorage.getItem(STORAGE_KEY_DISMISSED);
    if (dismissedUntil) {
      const ts = parseInt(dismissedUntil, 10);
      if (!isNaN(ts) && Date.now() < ts) {
        setOpen(false);
        return;
      }
    }

    // Open if not all granted and not dismissed
    setOpen(true);
  }, []);

  useEffect(() => {
    void checkPermissions();

    // Listen for manual trigger from settings or user actions
    const handleReopen = () => {
      localStorage.removeItem(STORAGE_KEY_DISMISSED);
      setOpen(true);
      void checkPermissions();
    };
    window.addEventListener("stos:open-permissions-prompt", handleReopen);
    return () => window.removeEventListener("stos:open-permissions-prompt", handleReopen);
  }, [checkPermissions]);

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      toast.info("Notifications are not supported by this browser.");
      return false;
    }
    try {
      const res = await Notification.requestPermission();
      setSoundAlertEnabled(true);
      setVibrationAlertEnabled(true);
      if (res === "granted") {
        playNotificationSound("important");
        toast.success("Notification sound & banners enabled!");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const requestMicPermission = async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.info("Microphone is not supported on this browser.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Release tracks immediately so mic does not stay active in tab bar
      stream.getTracks().forEach((track) => track.stop());
      toast.success("Microphone enabled for voice notes & StoneMan.");
      return true;
    } catch (err) {
      console.warn("[permissions] Mic access denied:", err);
      return false;
    }
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      toast.info("Location is not supported on this browser.");
      return false;
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          toast.success("Location enabled for site visits & dispatches.");
          resolve(true);
        },
        (err) => {
          console.warn("[permissions] Geolocation denied:", err);
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  };

  const handleGrantAll = async () => {
    setRequesting(true);
    try {
      await requestNotificationPermission();
      await requestMicPermission();
      await requestLocationPermission();
      await checkPermissions();
      toast.success("Device permissions activated for STOS!");
      // Automatically close if notifications are active
      if (Notification.permission === "granted") {
        setOpen(false);
      }
    } finally {
      setRequesting(false);
    }
  };

  const handleDismiss = () => {
    // Dismiss for 7 days
    const nextWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY_DISMISSED, String(nextWeek));
    setOpen(false);
  };

  if (!open) return null;

  return (
    <aside
      aria-label="Staff device permissions prompt"
      className="fixed bottom-16 sm:bottom-6 right-3 sm:right-6 z-50 max-w-md w-[calc(100vw-1.5rem)] rounded-xl border border-teal-300/80 bg-white/95 dark:bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Staff Device Permissions</span>
              <Badge
                variant="outline"
                className="text-[10px] bg-teal-50 text-teal-800 border-teal-200 py-0"
              >
                Action Required
              </Badge>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enable real-time notification chimes, mic &amp; location for seamless operations
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded p-1"
          aria-label="Dismiss permissions prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 space-y-2 text-xs">
        {/* Notification item */}
        <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" />
            <div>
              <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>Phone &amp; Laptop Chimes</span>
                <Volume2 className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="text-[11px] text-slate-500">
                New customers, quotes, payment alerts &amp; red flags
              </div>
            </div>
          </div>
          {permissions.notification === "granted" ? (
            <Badge className="bg-emerald-600 text-white text-[10px]">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs bg-white text-teal-700 border-teal-300 hover:bg-teal-50"
              onClick={() => void requestNotificationPermission().then(() => checkPermissions())}
            >
              Allow
            </Button>
          )}
        </div>

        {/* Microphone item */}
        <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-blue-500" />
            <div>
              <div className="font-medium text-slate-900 dark:text-slate-100">
                Microphone Access
              </div>
              <div className="text-[11px] text-slate-500">
                Voice notes, StoneMan copilot &amp; fast customer input
              </div>
            </div>
          </div>
          {permissions.mic === "granted" ? (
            <Badge className="bg-emerald-600 text-white text-[10px]">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs bg-white text-teal-700 border-teal-300 hover:bg-teal-50"
              onClick={() => void requestMicPermission().then(() => checkPermissions())}
            >
              Allow
            </Button>
          )}
        </div>

        {/* Location item */}
        <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-500" />
            <div>
              <div className="font-medium text-slate-900 dark:text-slate-100">
                GPS &amp; Geolocation
              </div>
              <div className="text-[11px] text-slate-500">
                Site measurements, delivery dispatches &amp; visits
              </div>
            </div>
          </div>
          {permissions.location === "granted" ? (
            <Badge className="bg-emerald-600 text-white text-[10px]">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs bg-white text-teal-700 border-teal-300 hover:bg-teal-50"
              onClick={() => void requestLocationPermission().then(() => checkPermissions())}
            >
              Allow
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-slate-500 hover:text-slate-800 h-8"
          onClick={handleDismiss}
        >
          Remind Later
        </Button>
        <Button
          size="sm"
          className="h-8 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
          onClick={handleGrantAll}
          disabled={requesting}
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          {requesting ? "Requesting..." : "Enable All in 1-Click"}
        </Button>
      </div>
    </aside>
  );
}
