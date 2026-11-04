/**
 * Sound & Vibration Engine for STOS Notifications.
 *
 * Provides Web Audio API synthesized alert chimes and device vibration
 * (navigator.vibrate + Capacitor) with ZERO external audio asset dependencies,
 * zero latency, and zero CORS/network failure modes.
 *
 * Designed to replicate real-time mobile app alerts (like WhatsApp / Slack)
 * on staff laptops, desktop browsers, Android WebViews, and phones.
 */
import type { NotificationTier } from "./tiers";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

const STORAGE_KEY_SOUND = "stos_sound_alerts_enabled";
const STORAGE_KEY_VIBRATE = "stos_vibration_alerts_enabled";

let memorySoundEnabled = true;
let memoryVibrationEnabled = true;

export function isSoundAlertEnabled(): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return memorySoundEnabled;
  }
  const val = localStorage.getItem(STORAGE_KEY_SOUND);
  // Default to true
  return val === null ? true : val === "true";
}

export function setSoundAlertEnabled(enabled: boolean): void {
  memorySoundEnabled = enabled;
  if (typeof window === "undefined" || !window.localStorage) return;
  localStorage.setItem(STORAGE_KEY_SOUND, String(enabled));
}

export function isVibrationAlertEnabled(): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return memoryVibrationEnabled;
  }
  const val = localStorage.getItem(STORAGE_KEY_VIBRATE);
  // Default to true
  return val === null ? true : val === "true";
}

export function setVibrationAlertEnabled(enabled: boolean): void {
  memoryVibrationEnabled = enabled;
  if (typeof window === "undefined" || !window.localStorage) return;
  localStorage.setItem(STORAGE_KEY_VIBRATE, String(enabled));
}

/**
 * Synthesizes a clean, melodic notification chime matching the alert tier.
 * Info: Soft single tone (880Hz / A5)
 * Important: WhatsApp-style bright double-tone (784Hz -> 1046Hz / G5 -> C6)
 * Critical / Red Flag: Urgent triple-tone chime (880Hz -> 1174Hz -> 1396Hz)
 */
export function playNotificationSound(tier: NotificationTier = "info"): void {
  if (!isSoundAlertEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    if (tier === "critical") {
      // Urgent triple pulse for Red Flags and Major Payments
      playTone(ctx, 880, now, 0.12, "triangle", 0.4);
      playTone(ctx, 1174, now + 0.12, 0.12, "triangle", 0.45);
      playTone(ctx, 1396, now + 0.24, 0.28, "sine", 0.5);
    } else if (tier === "important") {
      // WhatsApp-style bright double ping (G5 to C6)
      playTone(ctx, 784, now, 0.1, "sine", 0.35);
      playTone(ctx, 1046.5, now + 0.1, 0.22, "sine", 0.4);
    } else {
      // Gentle soft single chime
      playTone(ctx, 880, now, 0.18, "sine", 0.25);
    }
  } catch (err) {
    console.warn("[notifications/sound] Failed to play synthesized chime:", err);
  }
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.3,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  // Smooth attack and exponential decay to prevent audio pops
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/**
 * Triggers device vibration pattern.
 * Critical: 300ms on, 100ms off, 300ms on, 100ms off, 450ms on
 * Important: 200ms on, 100ms off, 200ms on (classic WhatsApp pulse)
 * Info: 150ms single pulse
 */
export function triggerNotificationVibration(tier: NotificationTier = "info"): void {
  if (!isVibrationAlertEnabled()) return;
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;

  try {
    if (tier === "critical") {
      navigator.vibrate([300, 100, 300, 100, 450]);
    } else if (tier === "important") {
      navigator.vibrate([200, 100, 200]);
    } else {
      navigator.vibrate([150]);
    }
  } catch {
    // Vibration ignored if blocked by system/battery-saver
  }
}

/**
 * One-click helper: Unlocks Web Audio autoplay, requests browser notification
 * permissions, and triggers a sample chime + vibration so user immediately verifies it works.
 */
export async function enableAndTestAlerts(): Promise<{
  permission: NotificationPermission | "unsupported";
  sound: boolean;
  vibration: boolean;
}> {
  setSoundAlertEnabled(true);
  setVibrationAlertEnabled(true);

  // Resume Web Audio context
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // Ignore
    }
  }

  // Play test chime and vibrate
  playNotificationSound("important");
  triggerNotificationVibration("important");

  // Request browser Notification permission
  let permission: NotificationPermission | "unsupported" = "unsupported";
  if (typeof window !== "undefined" && "Notification" in window) {
    try {
      permission = await Notification.requestPermission();
      if (permission === "granted") {
        new Notification("Stone Tech OS Alerts Enabled", {
          body: "Notifications will now ring and vibrate on this device for new customers, red flags, payments, and quotations.",
          icon: "/favicon.ico",
        });
      }
    } catch (err) {
      console.warn("[enableAndTestAlerts] Notification requestPermission error:", err);
    }
  }

  return {
    permission,
    sound: true,
    vibration: typeof navigator !== "undefined" && "vibrate" in navigator,
  };
}
