import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { capacitorCorsMiddleware } from "@/lib/capacitor/cors-middleware";
import { CAPACITOR_APP_ORIGINS } from "@/lib/capacitor/server-origin-allowlist";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Server functions are same-origin RPC endpoints by default (see
// https://tanstack.com/start/latest/docs/framework/react/guide/server-functions#same-origin-requests).
// The packaged Capacitor Android app is the one legitimate cross-origin
// caller this deployment needs to accept — everything else (arbitrary
// third-party sites) must keep failing the default same-origin check.
//
// `Sec-Fetch-Site`, when present, is checked before `Origin`/`Referer` and
// short-circuits them entirely, so both matchers below need to independently
// allow the Capacitor origins — see src/lib/capacitor/server-origin-allowlist.ts.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
  secFetchSite: (value, ctx) => {
    if (value === "same-origin") return true;
    if (value !== "cross-site") return false;
    return CAPACITOR_APP_ORIGINS.has(ctx.request.headers.get("Origin") ?? "");
  },
  origin: (value) => CAPACITOR_APP_ORIGINS.has(value),
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  // Order matters: CORS must wrap CSRF/error handling so it can answer
  // preflight before either runs, and so its headers land on every
  // downstream response (success, CSRF rejection, or app error alike).
  requestMiddleware: [capacitorCorsMiddleware, csrfMiddleware, errorMiddleware],
}));
