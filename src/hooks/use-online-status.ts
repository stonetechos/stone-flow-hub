import { useEffect, useState } from "react";

export type ConnectivityState = "online" | "offline" | "reconnected";

/**
 * Tracks browser connectivity for the sync indicator (Phase G.10A).
 * Emits a transient "reconnected" state for a few seconds after coming
 * back online so the UI can show a brief confirmation instead of
 * jumping straight back to a silent "online" look.
 */
export function useOnlineStatus(): ConnectivityState {
  const [state, setState] = useState<ConnectivityState>(() =>
    typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online",
  );

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const handleOnline = (): void => {
      setState("reconnected");
      reconnectTimer = setTimeout(() => setState("online"), 4000);
    };
    const handleOffline = (): void => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      setState("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  return state;
}
