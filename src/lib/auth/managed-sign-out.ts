/**
 * Lets a route that signs the user out itself keep control of where they
 * land afterwards.
 *
 * The root shell listens for `SIGNED_OUT` and hard-navigates to `/auth`
 * with `window.location.replace`, which is right for the ordinary case: a
 * user pressing "Sign out", or a token revoked in another tab. It is wrong
 * for `_authenticated`'s expired-session path, which clears the dead token
 * on purpose and then throws its own redirect to `/auth?flow=expired`. Both
 * fire, the full-page replace wins the race, and the user arrives at a
 * plain sign-in form with no explanation — and, because the reload restarts
 * the router from scratch, a token that keeps failing validation can put
 * the browser through that cycle repeatedly, entirely outside the router's
 * redirect limiter.
 *
 * A route about to sign out and redirect on its own calls
 * `beginManagedSignOut()` first; the root listener calls
 * `consumeManagedSignOut()` and, if it returns true, stands down for that
 * one event. The flag self-clears on a short timer so a sign-out that never
 * arrives (the call threw, the redirect was cancelled) cannot leave the
 * global safety net disarmed.
 */

let managed = false;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Claim the next `SIGNED_OUT` event: the caller is handling the redirect. */
export function beginManagedSignOut(): void {
  managed = true;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    managed = false;
    timer = undefined;
  }, 5000);
}

/** True once if a managed sign-out is in flight; clears the claim. */
export function consumeManagedSignOut(): boolean {
  if (!managed) return false;
  managed = false;
  if (timer) clearTimeout(timer);
  timer = undefined;
  return true;
}

/** Test-only: drop any outstanding claim between cases. */
export function __resetManagedSignOutForTests(): void {
  managed = false;
  if (timer) clearTimeout(timer);
  timer = undefined;
}
