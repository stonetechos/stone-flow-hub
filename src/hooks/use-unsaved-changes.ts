/**
 * useUnsavedChanges — warns the user before navigating away from a form
 * that contains unsaved edits. Handles both browser navigation
 * (`beforeunload`) and in-app navigation triggered by SPA links.
 *
 * The SPA-side guard uses a simple `window.confirm()` prompt when the user
 * attempts to close a dialog or press the browser Back button while
 * `dirty` is true. Individual routes may pass `enabled: false` to opt out
 * (e.g. after a successful submit, before redirecting).
 */
import { useEffect } from "react";

const DEFAULT_MESSAGE = "You have unsaved changes. Leave without saving?";

export function useUnsavedChanges(dirty: boolean, message: string = DEFAULT_MESSAGE) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore the string but require preventDefault + returnValue.
      e.returnValue = message;
      return message;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, message]);
}

/**
 * Helper for dialog close handlers — call inside `onOpenChange`:
 *   onOpenChange={(open) => confirmCloseIfDirty(open, dirty) && setOpen(open)}
 */
export function confirmCloseIfDirty(
  nextOpen: boolean,
  dirty: boolean,
  message: string = DEFAULT_MESSAGE,
): boolean {
  if (nextOpen) return true; // opening — always allow
  if (!dirty) return true;
  return window.confirm(message);
}
