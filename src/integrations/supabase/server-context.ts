/**
 * Request-scoped Supabase client for server-side AI / NL Search resolvers.
 *
 * The problem this exists to solve: every data-access function under
 * src/lib/**\/api.ts (listCustomers, listInvoices, getBusinessTimeline,
 * globalSearch, ...) is called from two very different places — the
 * browser (where the module-level `supabase` singleton in
 * integrations/supabase/client.ts carries the real signed-in user's
 * session, persisted in localStorage) and TanStack Start server functions
 * like `nlSearch` (Copilot's NL Search), where that exact same singleton
 * is re-created fresh on the server with `auth.storage: undefined` — no
 * session, no bearer token. That client authenticates as Postgres role
 * `anon`. Every RLS policy in this schema that matters is scoped `TO
 * authenticated`, so an anon-role query against, say, `customers` doesn't
 * evaluate the policy's USING clause at all — it just returns zero rows,
 * silently, no error. That is the entire root cause of Copilot's "no
 * matching records" bug: not the resolver logic, not the classifier, not
 * the intent shape — the data layer was quietly running unauthenticated
 * every single time it was invoked from a server function.
 *
 * `requireSupabaseAuth`'s middleware already does the right thing: it
 * builds a client with the caller's real bearer token attached and hands
 * it to the handler as `context.supabase`. This module is how that
 * client reaches the data layer several calls deep — resolveIntent ->
 * resolveCustomer -> listCustomers, or resolveIntent ->
 * resolveTimelineIntent -> getBusinessTimeline -> getCustomerTimeline,
 * or through an Insight Provider's own further-nested list call —
 * without changing any of those ~20 functions' public signatures.
 *
 * AsyncLocalStorage, not a threaded parameter, is the deliberate choice.
 * Adding a client argument to every function in that call graph would
 * mean rewriting ~20 functions' signatures across 18 files, and every
 * one of their hundreds of existing browser call sites, to pass a value
 * those callers would never use — the opposite of "preserve backward
 * compatibility" and "don't duplicate query logic". AsyncLocalStorage
 * scopes the override to exactly the request that opts in
 * (withAuthenticatedClient), with zero change to any call site's
 * arguments and zero change to any function's public signature. It is
 * natively supported on this project's deployment target (Cloudflare
 * Workers with the `nodejs_compat` compatibility flag, already set in
 * wrangler.json) and is the same mechanism frameworks like Next.js use
 * for request-scoped server context for exactly this reason.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { AsyncLocalStorage } from "node:async_hooks";
import { supabase as anonSingleton } from "./client";
import type { Database } from "./types";

type Db = SupabaseClient<Database>;

// AsyncLocalStorage is a Node built-in with no browser equivalent. These
// data-access modules (customers/api.ts and friends) are shared between
// browser code and server functions, so this file ends up in both
// bundles — Vite externalizes `node:async_hooks` to an empty stub for the
// browser build, meaning the import above resolves to `undefined` there.
// That's harmless as long as nothing ever tries to construct it
// client-side: `withAuthenticatedClient()` is only ever called from a
// server function's handler (nl-search.functions.ts), never from browser
// code, so the instance below is only created — and only used — when
// `typeof window === "undefined"` (true in both Node and, per
// wrangler.json's `nodejs_compat` flag, this project's actual Cloudflare
// Workers deploy target; false in every browser).
const authenticatedClientStorage: AsyncLocalStorage<Db> | undefined =
  typeof window === "undefined" ? new AsyncLocalStorage<Db>() : undefined;

/**
 * Runs `fn` with `client` as the Supabase client every `getDb()` call
 * inside it — however deeply nested — resolves to. Call this exactly
 * once, at the very top of a server function's handler, immediately
 * with the authenticated client `requireSupabaseAuth` already produced
 * (`context.supabase`). Never pass a service-role or anonymous client
 * here — doing so would defeat the RLS scoping this module exists to
 * preserve.
 */
export function withAuthenticatedClient<T>(client: Db, fn: () => Promise<T>): Promise<T> {
  if (!authenticatedClientStorage) {
    // Only reachable if this were ever called from browser code, which
    // nothing in this codebase does — fail loudly rather than silently
    // executing outside the authenticated scope the caller asked for.
    throw new Error("withAuthenticatedClient() must only be called from a server function handler");
  }
  return authenticatedClientStorage.run(client, fn);
}

/**
 * The Supabase client every data-access module under src/lib should
 * call to obtain its client, instead of importing the `supabase`
 * singleton directly. Inside a `withAuthenticatedClient()` scope (i.e.
 * inside an AI / NL Search server function that has opted in) this
 * returns that request's real authenticated client, so RLS evaluates as
 * the actual calling user — never anon, never service role. Outside any
 * such scope — the ordinary browser/UI case, and any server function
 * that hasn't opted in — it falls back to the existing module-level
 * singleton, completely unchanged from before this module existed.
 */
export function getDb(): Db {
  return authenticatedClientStorage?.getStore() ?? anonSingleton;
}
