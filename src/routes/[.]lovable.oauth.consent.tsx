/**
 * OAuth 2.1 consent screen for external clients (ChatGPT, Claude, etc.)
 * connecting to this app's MCP server.
 *
 * Supabase redirects here with `?authorization_id=...` after a client hits
 * `/authorize`. We look up the authorization details, show the signed-in
 * user + client name, and post approve/deny back to Supabase.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// The @supabase/supabase-js OAuth namespace is beta and not always in the
// generated types. Keep a small typed wrapper local to this route.
type OAuthClient = { name?: string; client_id?: string; redirect_uri?: string };
type AuthorizationDetails = {
  client?: OAuthClient;
  redirect_url?: string;
  redirect_to?: string;
  scope?: string;
};
type OAuthApi = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};
function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({
        to: "/auth",
        search: { flow: "signin", redirect: next } as never,
      });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate } as never);
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="mb-2 text-xl font-semibold text-text-primary">
        Could not load this authorization request
      </h1>
      <p className="text-sm text-text-secondary">{String((error as Error)?.message ?? error)}</p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setError(null);
    setBusy(approve ? "approve" : "deny");
    const { data, error } = approve
      ? await oauthApi().approveAuthorization(authorization_id)
      : await oauthApi().denyAuthorization(authorization_id);
    if (error) {
      setBusy(null);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(null);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an external application";
  const redirectUri = details?.client?.redirect_uri;
  const scope = details?.scope;

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto grid min-h-dvh max-w-lg place-items-center px-4 py-10">
        <div className="w-full rounded-xl border border-border-subtle bg-surface-card p-6 shadow-e1 sm:p-8">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-intent-primary/10 text-intent-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
                Authorize access
              </div>
              <h1 className="font-display text-xl font-medium tracking-tight text-text-primary">
                Connect {clientName} to Stone Tech OS
              </h1>
            </div>
          </div>

          <p className="mb-4 text-sm leading-relaxed text-text-secondary">
            <strong className="font-medium text-text-primary">{clientName}</strong> will be able to
            use Stone Tech OS as you. It can read customers, enquiries, quotes, invoices and other
            business data that you can already see in the app, and act on tools you invoke — always
            respecting your permissions.
          </p>

          <ul className="mb-6 space-y-2 rounded-md border border-border-subtle bg-surface-muted p-3 text-[13px]">
            <li>
              <span className="text-text-muted">Signed in as</span>{" "}
              <span className="font-medium text-text-primary">your Stone Tech OS account</span>
            </li>
            {redirectUri && (
              <li className="truncate">
                <span className="text-text-muted">Redirects to</span>{" "}
                <span className="font-mono text-[12px] text-text-primary">{redirectUri}</span>
              </li>
            )}
            {scope && (
              <li>
                <span className="text-text-muted">Requested scope</span>{" "}
                <span className="font-mono text-[12px] text-text-primary">{scope}</span>
              </li>
            )}
          </ul>

          <p className="mb-6 text-[12.5px] leading-relaxed text-text-muted">
            This does not bypass Stone Tech OS permissions or row-level security. You can revoke
            access at any time from your account.
          </p>

          {error && (
            <p
              role="alert"
              className="mb-4 rounded-md border border-status-danger-border bg-status-danger-bg p-3 text-sm text-status-danger-fg"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={() => decide(false)}
              className="gap-2"
            >
              {busy === "deny" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldOff className="h-4 w-4" />
              )}
              Deny
            </Button>
            <Button
              type="button"
              disabled={busy !== null}
              onClick={() => decide(true)}
              className="gap-2"
            >
              {busy === "approve" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Approve
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
