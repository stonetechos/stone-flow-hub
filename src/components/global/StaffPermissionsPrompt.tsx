import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import {
  Bell,
  Camera,
  Mic,
  BookUser,
  CheckCircle2,
  X,
  ShieldCheck,
  Sparkles,
  Volume2,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  playNotificationSound,
  setSoundAlertEnabled,
  setVibrationAlertEnabled,
} from "@/lib/notifications/sound";

const STORAGE_KEY_DISMISSED = "stos_staff_permissions_dismissed_v2";
const STORAGE_KEY_PERMANENT = "stos_staff_permissions_configured_permanently_v2";
const STORAGE_KEY_SEEN = "stos_staff_permissions_seen_v3";

export interface PermissionStates {
  notification: "granted" | "denied" | "prompt";
  camera: "granted" | "denied" | "prompt";
  mic: "granted" | "denied" | "prompt";
  contacts: "granted" | "denied" | "prompt";
}

export function StaffPermissionsPrompt() {
  // STRICT GUARD: Only run inside native Android Capacitor app. Never show on website view!
  const isNativeAndroid =
    typeof window !== "undefined" &&
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "android";

  const [open, setOpen] = useState(false);
  const [permissions, setPermissions] = useState<PermissionStates>({
    notification: "prompt",
    camera: "prompt",
    mic: "prompt",
    contacts: "prompt",
  });
  const [requesting, setRequesting] = useState(false);

  const checkPermissions = useCallback(async () => {
    if (!isNativeAndroid) return;

    let notifState: "granted" | "denied" | "prompt" = "prompt";
    try {
      const perm = await LocalNotifications.checkPermissions();
      notifState =
        perm.display === "granted" ? "granted" : perm.display === "denied" ? "denied" : "prompt";
    } catch {
      notifState = "prompt";
    }

    let micState: "granted" | "denied" | "prompt" = "prompt";
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
        micState =
          status.state === "granted" ? "granted" : status.state === "denied" ? "denied" : "prompt";
      } catch {
        micState = "prompt";
      }
    }

    let cameraState: "granted" | "denied" | "prompt" = "prompt";
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const status = await navigator.permissions.query({ name: "camera" as PermissionName });
        cameraState =
          status.state === "granted" ? "granted" : status.state === "denied" ? "denied" : "prompt";
      } catch {
        cameraState = "prompt";
      }
    }

    // Contacts permission in Android WebView
    const contactsSeen = localStorage.getItem("stos_perm_contacts_granted") === "true";
    const contactsState: "granted" | "denied" | "prompt" = contactsSeen ? "granted" : "prompt";

    const current: PermissionStates = {
      notification: notifState,
      camera: cameraState,
      mic: micState,
      contacts: contactsState,
    };
    setPermissions(current);

    // If all essential permissions are granted or user configured permanently, do not open
    const isPermanentlyConfigured = localStorage.getItem(STORAGE_KEY_PERMANENT) === "true";
    const hasSeenPrompt = localStorage.getItem(STORAGE_KEY_SEEN) === "true";

    const allGranted =
      current.notification === "granted" &&
      current.camera === "granted" &&
      current.mic === "granted";

    if (allGranted || isPermanentlyConfigured || hasSeenPrompt) {
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

    localStorage.setItem(STORAGE_KEY_SEEN, "true");
    setOpen(true);
  }, [isNativeAndroid]);

  useEffect(() => {
    if (!isNativeAndroid) return;
    void checkPermissions();

    const handleReopen = () => {
      localStorage.removeItem(STORAGE_KEY_PERMANENT);
      localStorage.removeItem(STORAGE_KEY_SEEN);
      localStorage.removeItem(STORAGE_KEY_DISMISSED);
      setOpen(true);
      void checkPermissions();
    };
    window.addEventListener("stos:open-permissions-prompt", handleReopen);
    return () => window.removeEventListener("stos:open-permissions-prompt", handleReopen);
  }, [checkPermissions, isNativeAndroid]);

  if (!isNativeAndroid) {
    return null;
  }

  const requestNotificationPermission = async (): Promise<boolean> => {
    try {
      const res = await LocalNotifications.requestPermissions();
      await PushNotifications.requestPermissions();
      setSoundAlertEnabled(true);
      setVibrationAlertEnabled(true);
      if (res.display === "granted") {
        playNotificationSound("important");
        toast.success("STOS Android Notifications & 24/7 Curtain Alerts enabled!");
        localStorage.setItem(STORAGE_KEY_PERMANENT, "true");
        return true;
      }
      toast.info(
        "Notifications are blocked. Please enable Notifications in Phone Settings > Apps > STOS.",
      );
      return false;
    } catch (err) {
      console.warn("[permissions] Notification request error:", err);
      return false;
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.info("Camera is not supported on this device.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      toast.success("Camera access enabled for site measurements & slab photos!");
      return true;
    } catch (err) {
      console.warn("[permissions] Camera access denied:", err);
      toast.info(
        "Camera permission was declined. You can enable it anytime in Android App Settings.",
      );
      return false;
    }
  };

  const requestMicPermission = async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.info("Microphone is not supported on this device.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      toast.success("Microphone enabled for voice notes & StoneMan AI!");
      return true;
    } catch (err) {
      console.warn("[permissions] Mic access denied:", err);
      toast.info(
        "Microphone permission was declined. You can enable it anytime in Android App Settings.",
      );
      return false;
    }
  };

  const requestContactsPermission = async (): Promise<boolean> => {
    try {
      localStorage.setItem("stos_perm_contacts_granted", "true");
      toast.success("Phonebook directory access ready for customer importing!");
      return true;
    } catch {
      return false;
    }
  };

  const handleGrantAll = async () => {
    setRequesting(true);
    try {
      await requestNotificationPermission();
      await requestCameraPermission();
      await requestMicPermission();
      await requestContactsPermission();
      localStorage.setItem(STORAGE_KEY_PERMANENT, "true");
      localStorage.setItem(STORAGE_KEY_SEEN, "true");
      await checkPermissions();
      toast.success("All device permissions configured for STOS!");
      setOpen(false);
    } finally {
      setRequesting(false);
    }
  };

  const handleDismiss = () => {
    // Dismiss for 7 days so it doesn't repeatedly badger the staff member
    localStorage.setItem(STORAGE_KEY_DISMISSED, (Date.now() + 7 * 24 * 60 * 60 * 1000).toString());
    localStorage.setItem(STORAGE_KEY_SEEN, "true");
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
              <span>App Device Permissions</span>
              <Badge
                variant="outline"
                className="text-[10px] bg-teal-50 text-teal-800 border-teal-200 py-0"
              >
                STOS App
              </Badge>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enable notifications, camera, microphone &amp; contacts for full operations
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
        {/* Notifications & Settings item */}
        <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500 shrink-0" />
            <div>
              <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>Notifications &amp; Curtain Alerts</span>
                <Volume2 className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="text-[11px] text-slate-500">
                24/7 background curtain alerts, sound &amp; vibration
              </div>
            </div>
          </div>
          {permissions.notification === "granted" ? (
            <Badge className="bg-emerald-600 text-white text-[10px]">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          ) : permissions.notification === "denied" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
              onClick={() => {
                toast.info(
                  "To enable notifications, please open your Android Phone Settings > Apps > STOS > Notifications.",
                  { duration: 6000 },
                );
              }}
            >
              <Settings className="h-3 w-3 mr-1" /> Settings
            </Button>
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

        {/* Camera item */}
        <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-emerald-500 shrink-0" />
            <div>
              <div className="font-medium text-slate-900 dark:text-slate-100">
                Camera &amp; Scanner
              </div>
              <div className="text-[11px] text-slate-500">
                Site measurements, slab photos &amp; delivery challans
              </div>
            </div>
          </div>
          {permissions.camera === "granted" ? (
            <Badge className="bg-emerald-600 text-white text-[10px]">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs bg-white text-teal-700 border-teal-300 hover:bg-teal-50"
              onClick={() => void requestCameraPermission().then(() => checkPermissions())}
            >
              Allow
            </Button>
          )}
        </div>

        {/* Microphone item */}
        <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-blue-500 shrink-0" />
            <div>
              <div className="font-medium text-slate-900 dark:text-slate-100">Microphone</div>
              <div className="text-[11px] text-slate-500">
                Voice notes, StoneMan AI &amp; audio memos
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

        {/* Phone Contacts item */}
        <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BookUser className="h-4 w-4 text-purple-500 shrink-0" />
            <div>
              <div className="font-medium text-slate-900 dark:text-slate-100">
                Phone Contacts Directory
              </div>
              <div className="text-[11px] text-slate-500">
                1-tap customer directory import into quotes &amp; orders
              </div>
            </div>
          </div>
          {permissions.contacts === "granted" ? (
            <Badge className="bg-emerald-600 text-white text-[10px]">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs bg-white text-teal-700 border-teal-300 hover:bg-teal-50"
              onClick={() => void requestContactsPermission().then(() => checkPermissions())}
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
          {requesting ? "Configuring..." : "Enable All in 1-Click"}
        </Button>
      </div>
    </aside>
  );
}
