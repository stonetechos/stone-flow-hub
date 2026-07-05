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

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setState({ isReady: true, user: data.session?.user ?? null });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Do NOT await anything here — supabase-js serializes auth events and
      // awaiting a network call can deadlock the auth machine.
      setState({ isReady: true, user: session?.user ?? null });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
