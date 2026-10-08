import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // 1. Force HTTPS redirect if accessed over unencrypted HTTP (Cloudflare proxy or direct)
    const proto =
      request.headers.get("x-forwarded-proto") ||
      (request.headers.get("cf-visitor")?.includes('"scheme":"http"')
        ? "http"
        : url.protocol.replace(":", ""));

    if (proto === "http" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      const httpsUrl = new URL(request.url);
      httpsUrl.protocol = "https:";
      return new Response(null, {
        status: 301,
        headers: {
          Location: httpsUrl.toString(),
          "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
        },
      });
    }

    try {
      const handler = await getServerEntry();
      const rawResponse = await handler.fetch(request, env, ctx);
      const response = await normalizeCatastrophicSsrResponse(rawResponse);

      // 2. Ensure HSTS and modern security headers
      const headers = new Headers(response.headers);
      if (url.protocol === "https:" || proto === "https") {
        headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
      }
      if (!headers.has("X-Content-Type-Options")) {
        headers.set("X-Content-Type-Options", "nosniff");
      }
      if (!headers.has("Referrer-Policy")) {
        headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
        },
      });
    }
  },
};
