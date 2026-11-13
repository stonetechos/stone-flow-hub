import { useEffect, useState } from "react";

export type ConnectivityState = "online" | "offline" | "reconnected";

/**
 * Tracks browser connectivity with transient reconnected state.
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
