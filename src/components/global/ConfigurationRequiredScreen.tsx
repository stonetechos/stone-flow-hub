/**
 * Sprint 1.7, Part 1 — global configuration screen.
 *
 * Rendered by the root route (`src/routes/__root.tsx`) in place of the
 * entire app when `getSupabaseConfigStatus()` reports missing environment
 * variables, instead of letting the failure surface later as a raw error
 * string inside whichever page happens to touch the Supabase client first
 * (previously the Users & Roles page). Visual language matches the root
 * route's existing `NotFoundComponent` / `ErrorComponent` (centered card,
 * `bg-background`, same button styles) — this is a new state for an
 * existing pattern, not a new design language.
 */
import { ServerCog } from "lucide-react";

export function ConfigurationRequiredScreen({ missing }: { missing: string[] }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-md bg-muted text-muted-foreground">
          <ServerCog className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Stone Tech OS isn't configured yet
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This deployment is missing the backend connection details it needs to start. Nothing is
          broken with your data — the application simply can't reach it until this is fixed.
        </p>

        {missing.length > 0 ? (
          <div className="mt-5 rounded-md border border-border bg-muted/40 px-4 py-3 text-left">
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

        <p className="mt-6 text-xs text-muted-foreground">
          Stone Tech OS · Powered by Vedora Vision
        </p>
      </div>
    </div>
  );
}
