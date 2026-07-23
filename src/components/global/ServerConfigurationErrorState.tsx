/**
 * Sprint 1.9, Milestone 1 — inline counterpart to `ConfigurationRequiredScreen`.
 *
 * That component replaces the *entire app shell* when the client-side
 * Supabase env vars are missing (checked once at the root route, before
 * `<Outlet/>` ever renders — see `src/routes/__root.tsx`). This component
 * covers the gap that gate cannot see: the *server-side* env vars
 * (`SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY`,
 * read from `process.env` at request time in the deployed Worker) can be
 * missing independently of the client-side pair. The client bundle boots
 * fine in that case — the app shell, navigation, and every page that
 * doesn't call a `requireSupabaseAuth`-gated server function all work — and
 * the gap only surfaces the first time a page's data actually depends on
 * one of those functions, as a plain thrown `Error` with no dedicated UI.
 *
 * Renders in place of that raw error wherever a caller has already used
 * `parseMissingSupabaseEnvError()` (see `src/lib/errors.ts`) to confirm the
 * error is this specific, deployment-level failure — not a generic error
 * state, so it should never be used as a catch-all.
 */
import { ServerCog } from "lucide-react";

export function ServerConfigurationErrorState({ missing }: { missing: string[] }) {
  return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-md bg-muted text-muted-foreground">
        <ServerCog className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">
          This deployment's backend connection isn't fully configured
        </p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Nothing is wrong with your data — the app just can't reach the parts of Supabase this page
          needs until an administrator fixes the deployment's environment variables.
        </p>
      </div>
      {missing.length > 0 ? (
        <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-left">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            For your administrator
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Set the following environment variable{missing.length > 1 ? "s" : ""} and redeploy:
          </p>
          <ul className="mt-2 space-y-1 font-mono text-xs text-foreground">
            {missing.map((name) => (
              <li key={name} className="rounded bg-background px-2 py-1">
                {name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
