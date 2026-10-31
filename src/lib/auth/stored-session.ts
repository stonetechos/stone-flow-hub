/**
 * Fast synchronous reader for Supabase auth session in browser localStorage.
 * Avoids asynchronous navigator.locks deadlocks and eliminates 2-3s delay on page loads.
 */

export interface StoredSessionUser {
  id: string;
  email?: string;
  role?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

export interface StoredSession {
  user: StoredSessionUser;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

export function getStoredAuthSessionSync(): StoredSession | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed?.user?.id) {
          return {
            user: parsed.user,
            access_token: parsed.access_token,
            refresh_token: parsed.refresh_token,
            expires_at: parsed.expires_at,
          };
        }
        if (parsed?.currentSession?.user?.id) {
          return {
            user: parsed.currentSession.user,
            access_token: parsed.currentSession.access_token,
            refresh_token: parsed.currentSession.refresh_token,
            expires_at: parsed.currentSession.expires_at,
          };
        }
      }
    }
  } catch {
    // ignore parsing errors
  }
  return null;
}

export function isStoredSessionValid(session: StoredSession | null): boolean {
  if (!session?.user?.id) return false;
  if (!session.expires_at) return true;
  const now = Math.floor(Date.now() / 1000);
  return session.expires_at > now;
}
