import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import {
  Smartphone,
  Download,
  Share,
  PlusSquare,
  X,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const STORAGE_KEY_DISMISSED = "stos_mobile_app_prompt_dismissed_until";

// Public download URL for the Stone Tech OS Android APK
const ANDROID_APK_DOWNLOAD_URL =
  "https://elqsdgjlrygwryukqwjo.supabase.co/storage/v1/object/public/files/apps/stonetechos.apk";

export function AppDownloadBanner() {
  const [platform, setPlatform] = useState<"android" | "ios" | "none">("none");
  const [visible, setVisible] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // NEVER show inside native Capacitor app
    if (Capacitor.isNativePlatform()) {
      setVisible(false);
      return;
    }

    // Check user agent
    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    const isIOS =
      /iPhone|iPad|iPod/i.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    // Only show on mobile browsers, never on desktop
    if (!isAndroid && !isIOS) {
      setPlatform("none");
      setVisible(false);
      return;
    }

    setPlatform(isAndroid ? "android" : "ios");

    // Check if dismissed in localStorage
    const dismissedUntil = localStorage.getItem(STORAGE_KEY_DISMISSED);
    if (dismissedUntil) {
      const ts = parseInt(dismissedUntil, 10);
      if (!isNaN(ts) && Date.now() < ts) {
        setVisible(false);
        return;
      }
    }

    // Check standalone mode (already installed as PWA on home screen)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setVisible(false);
      return;
    }

    setVisible(true);
  }, []);

  const handleDismiss = () => {
    // Dismiss for 7 days so it doesn't harass the employee on every single page load
    const nextWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY_DISMISSED, String(nextWeek));
    setVisible(false);
  };

  const handleAndroidDownload = () => {
    toast.success("Downloading Stone Tech OS Android APK...", {
      description: "Once downloaded, tap the notification to install the app.",
    });
    // Open download link directly
    window.location.href = ANDROID_APK_DOWNLOAD_URL;
  };

  if (!visible || platform === "none") return null;

  return (
    <>
      <aside
        aria-label="Staff mobile app install prompt"
        className="fixed top-2 sm:top-4 inset-x-3 sm:inset-x-auto sm:right-6 sm:max-w-md z-40 rounded-2xl border border-teal-500/40 bg-white/95 dark:bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 transition-all"
      >
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-xs">
              <Smartphone className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {platform === "android"
                    ? "Install Stone Tech OS App"
                    : "Add Stone Tech OS to Home Screen"}
                </h4>
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 border-teal-400 text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40"
                >
                  {platform === "android" ? "Android APK" : "iPhone / iPad"}
                </Badge>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                {platform === "android"
                  ? "Get instant operation alerts, site GPS tracking & offline order management."
                  : "Save to home screen for full-screen app experience and 1-tap fast access."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md p-1 shrink-0 cursor-pointer"
            aria-label="Cancel and dismiss prompt"
            title="Dismiss for 7 days"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-7 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            Later
          </Button>

          {platform === "android" ? (
            <Button
              type="button"
              size="sm"
              onClick={handleAndroidDownload}
              className="h-7 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download App (APK)</span>
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => setShowIosGuide(true)}
              className="h-7 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs gap-1.5"
            >
              <PlusSquare className="h-3.5 w-3.5" />
              <span>How to Add (1-Click)</span>
            </Button>
          )}
        </div>
      </aside>

      {/* iOS Add to Home Screen Step-by-Step Guide Modal */}
      <Dialog open={showIosGuide} onOpenChange={setShowIosGuide}>
        <DialogContent className="sm:max-w-md p-5 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Share className="h-4 w-4 text-teal-600" />
              <span>Add Stone Tech OS to iPhone / iPad</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Follow these 2 simple steps to use Stone Tech OS like a native app:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/60">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white font-bold text-xs">
                1
              </div>
              <div className="space-y-0.5">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <span>Tap the Share button</span>
                  <Share className="h-3.5 w-3.5 text-blue-500 inline" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  At the bottom bar of Safari (or top right in Chrome), tap the square Share icon
                  with an arrow pointing up.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/60">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white font-bold text-xs">
                2
              </div>
              <div className="space-y-0.5">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <span>Tap &quot;Add to Home Screen&quot;</span>
                  <PlusSquare className="h-3.5 w-3.5 text-emerald-500 inline" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Scroll down the share options, select <strong>Add to Home Screen</strong>, and tap{" "}
                  <strong>Add</strong> in the top right corner.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px] font-medium leading-tight">
                Stone Tech OS will now appear on your home screen with its official icon, launching
                instantly in full-screen mode!
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setShowIosGuide(false);
                handleDismiss();
              }}
              className="text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white"
            >
              Got it, thanks!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
