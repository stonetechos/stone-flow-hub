import { useEffect } from "react";

type Handler = (e: KeyboardEvent) => void;

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (t.isContentEditable) return true;
  // Radix combobox / cmdk
  if (t.getAttribute("role") === "combobox") return true;
  return false;
}

/**
 * Register a single-key global keyboard shortcut. Ignored while the user is
 * typing in an input, textarea, contenteditable, or combobox. Modifier keys
 * (Ctrl/Cmd/Alt) are also ignored so this only fires on bare keys.
 *
 * Pass an array of keys to bind multiple aliases to one handler.
 */
export function useHotkey(keys: string | string[], handler: Handler, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const targets = (Array.isArray(keys) ? keys : [keys]).map((k) => k.toLowerCase());
    const onKey = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (!targets.includes(e.key.toLowerCase())) return;
      handler(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keys, handler, enabled]);
}
