/**
 * Auth-ready gate. Resolves once Supabase has restored (or failed to restore)
 * the session from storage. Use this before rendering anything that assumes a
 * signed-in user, and to gate protected queries via `enabled`.
 */
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthReadyState {
  isReady: boolean;
  user: User | null;
}

export function useAuthReady(): AuthReadyState {
  const [state, setState] = useState<AuthReadyState>({ isReady: false, user: null });

  useEffect(() => {
    let cancelled = false;

    // Safety timeout: Never leave the UI stuck in isReady: false for more than 2.5 seconds
    const timer = setTimeout(() => {
      if (cancelled) return;
      setState((prev) => (prev.isReady ? prev : { isReady: true, user: prev.user }));
    }, 2500);

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        clearTimeout(timer);
        setState({ isReady: true, user: data.session?.user ?? null });
      })
      .catch((err) => {
        console.warn("[useAuthReady] getSession failed, unblocking with null user:", err);
        if (cancelled) return;
        clearTimeout(timer);
        setState({ isReady: true, user: null });
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Do NOT await anything here — supabase-js serializes auth events and
      // awaiting a network call can deadlock the auth machine.
      if (cancelled) return;
      clearTimeout(timer);
      setState({ isReady: true, user: session?.user ?? null });
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
