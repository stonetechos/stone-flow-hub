/**
 * Persistent "Skip for now" tracker for the Guided Workflow Assistant.
 *
 * Skips are stored per-entity in localStorage so they survive reloads but stay
 * private to the current browser. Since each skip key includes the source
 * entity's UUID (see `nextGuidedStep`), a skip only hides the banner for that
 * one entity — when the user later reaches the next stage naturally (for
 * example by opening a freshly-created project detail page), the assistant
 * automatically re-appears for that new entity.
 */
import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "gwa:v1:";

function safeGet(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key) === "1";
  } catch {
    return false;
  }
}

function safeSet(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(STORAGE_PREFIX + key, "1");
    else window.localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    /* quota / private mode — ignore */
  }
}

export function useGuidedSkip(skipKey: string | null | undefined) {
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (!skipKey) return;
    setSkipped(safeGet(skipKey));
  }, [skipKey]);

  const skip = useCallback(() => {
    if (!skipKey) return;
    safeSet(skipKey, true);
    setSkipped(true);
  }, [skipKey]);

  const reset = useCallback(() => {
    if (!skipKey) return;
    safeSet(skipKey, false);
    setSkipped(false);
  }, [skipKey]);

  return { skipped, skip, reset };
}
