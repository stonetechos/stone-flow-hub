/**
 * Detail-page keyboard shortcut convenience.
 *
 * Binds the standard Stone Tech OS detail-page shortcuts:
 *   • `e` — activate the primary Edit action
 *   • `b` — go back (Back button behaviour)
 *
 * Passing `undefined` for either handler disables just that binding. Both
 * bindings share the same typing-target / modifier guards as `useHotkey`
 * (they never fire while the user is typing in an input, textarea,
 * combobox, or a dialog input).
 *
 * `n` (Continue / next-step) is bound inside `GuidedNextStep` itself so it
 * only fires when the banner is visible — do not re-bind it here.
 */
import { useHotkey } from "./use-hotkey";

export function useDetailHotkeys(opts: {
  onEdit?: () => void;
  onBack?: () => void;
}): void {
  useHotkey("e", () => opts.onEdit?.(), !!opts.onEdit);
  useHotkey("b", () => opts.onBack?.(), !!opts.onBack);
}
