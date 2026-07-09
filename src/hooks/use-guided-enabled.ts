/**
 * User preference for the Guided Workflow Assistant.
 *
 * Persisted in localStorage (per browser, per user). When disabled, every
 * `<GuidedNextStep>` returns null and Stone Tech OS behaves exactly as it did
 * before the assistant was introduced — no other code path is affected.
 */
import { useCallback, useEffect, useState } from "react";

const KEY = "gwa:v1:enabled";

function safeRead(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(KEY);
    // Default on: users opt out, not in.
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

function safeWrite(value: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, value ? "1" : "0");
    // Broadcast so every mounted assistant card in the tab reacts immediately.
    window.dispatchEvent(new CustomEvent("gwa:enabled-changed", { detail: value }));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function useGuidedEnabled(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(() => safeRead());

  useEffect(() => {
    function onChange(e: Event) {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === "boolean") setEnabled(detail);
      else setEnabled(safeRead());
    }
    window.addEventListener("gwa:enabled-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("gwa:enabled-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const update = useCallback((v: boolean) => {
    safeWrite(v);
    setEnabled(v);
  }, []);

  return [enabled, update];
}
