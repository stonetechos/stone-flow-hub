/**
 * Adds CORS response headers (and answers preflight) for server function
 * requests coming from the packaged Capacitor Android app's origin.
 *
 * Why this exists: the Capacitor app is a static bundle with no server of
 * its own, so calling `erp.stonetech.in/_serverFn/*` from inside the app is
 * a genuine cross-origin browser request. Two independent gates stand
 * between that request and a usable response:
 *   1. TanStack Start's CSRF middleware (see csrfMiddleware in start.ts) —
 *      rejects the request server-side unless its origin is allowlisted.
 *   2. The browser's own CORS enforcement — even once (1) passes and the
 *      server sends a real response, the browser silently discards it
 *      client-side unless that response carries a matching
 *      Access-Control-Allow-Origin header. For non-"simple" requests
 *      (JSON POST bodies, an Authorization header) the browser also sends
 *      an OPTIONS preflight first and requires a header-only response to it
 *      before it will send the real request at all.
 *
 * This middleware only ever reacts to requests whose Origin header is in
 * CAPACITOR_APP_ORIGINS. Ordinary same-origin traffic from the deployed web
 * app (Origin absent, or equal to erp.stonetech.in) passes through
 * untouched — this file changes nothing about the existing web deployment.
 *
 * Registered first in `requestMiddleware` (src/start.ts) so it wraps every
 * other middleware: preflight is answered before CSRF/error handling ever
 * run, and CORS headers land on every downstream response — success, CSRF
 * rejection, or app error alike — so the Capacitor app's JS can actually
 * read whichever one comes back instead of the browser swallowing it.
 */
import { createMiddleware } from "@tanstack/react-start";

import { isCapacitorAppOrigin } from "./server-origin-allowlist";

const ALLOWED_METHODS = "GET, POST, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Authorization";

export const capacitorCorsMiddleware = createMiddleware().server(async (ctx) => {
  const { request, next, handlerType } = ctx as typeof ctx & {
    request: Request;
    handlerType?: string;
  };

  if (handlerType !== "serverFn") return next();

  const origin = request.headers.get("Origin");
  if (!isCapacitorAppOrigin(origin)) return next();

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": ALLOWED_METHODS,
        "Access-Control-Allow-Headers": ALLOWED_HEADERS,
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      },
    });
  }

  const result = await next();
  const response = (result as { response?: Response })?.response;
  if (!response) return result;

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.append("Vary", "Origin");

  return {
    ...result,
    response: new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    }),
  };
});
