/**
 * Platform Identity.
 *
 * Single source of truth for everything that identifies Vedora Vision, the
 * Platform Owner (see docs/authentication.md § Platform architecture for the
 * Platform Owner vs Tenant Company distinction — Part 3 of this sprint).
 * Every future Vedora product should reuse this exact module instead of
 * re-declaring these strings; nothing here should ever be duplicated at a
 * call site.
 *
 * This module is deliberately pure (no Supabase import, no I/O, no React) so
 * it can be imported from server functions, Vite config, and client
 * components alike without pulling in unrelated dependencies.
 *
 * Important: none of these values participate in *permission* decisions.
 * The Platform Super Admin's identity is resolved entirely through the
 * `super_admin` row in `public.user_roles` (see
 * `src/lib/admin/permissions.ts` and the `bootstrap_platform_super_admin`
 * migration) — never through `PLATFORM_SUPPORT_EMAIL` or any other string
 * here. Editing this file changes what is *displayed*; it can never change
 * who holds platform-owner permissions.
 *
 * Supersedes `src/lib/branding/platform.ts` (Sprint 1.7) — that module
 * conflated "platform vendor identity" with "this specific product's about
 * screen copy". This sprint splits those into this file (the Platform
 * Owner) and `./application.ts` (the Tenant-facing product, Stone Tech OS).
 */

/** The company that builds and operates Vedora Vision and its future
 * sibling products. Currently identical to the platform brand name —
 * Vedora Vision has no separate parent/holding company name at this time. */
export const PLATFORM_COMPANY_NAME = "Vedora Vision";

/** The platform brand shown in small, consistent places across every
 * Vedora product (login screen, Settings › About, a future product
 * switcher). */
export const PLATFORM_NAME = "Vedora Vision";

/**
 * No confirmed public Vedora Vision domain exists in any project document
 * as of this sprint (checked docs/authentication.md, the Sprint 1.7
 * completion report, and the Claude Project's stored docs — only an
 * inferred, unconfirmed domain-shaped string was found in the Android
 * package id, which isn't a confirmed website). Per the "do not fake
 * values" principle (Sprint 1.7.1 Part 4, applied here too), this stays
 * `null` — any screen displaying it must omit the row rather than invent a
 * URL. Set this the moment a real, confirmed domain exists.
 */
export const PLATFORM_WEBSITE: string | null = null;

/**
 * Contact address shown to end users for platform-level support. This is
 * plain display data, intentionally decoupled from platform-owner identity
 * (see the module-level note above) — changing this constant has no effect
 * on who holds the Platform Super Admin role.
 */
export const PLATFORM_SUPPORT_EMAIL = "info@stonetech.in";

/**
 * The Platform Owner's own version — the version of the shared platform
 * architecture (role hierarchy, this platform identity module, audit
 * plumbing) rather than any single product's release version. Intentionally
 * kept as a literal (not imported from `./application.ts`) to avoid a
 * circular module dependency between the two files; it mirrors
 * `APPLICATION_VERSION` there today because Stone Tech OS is presently the
 * only product built on this architecture. Update both together until a
 * second Vedora product ships and the two are free to diverge.
 */
export const PLATFORM_VERSION = "1.0.0";

/** Copyright line for the Platform Owner. Takes the year as a parameter
 * rather than calling `Date.now()`/`new Date()` internally, so callers in
 * every execution context (including ones that restrict ambient date
 * access) control exactly what year is shown. */
export function platformCopyrightLine(year: number): string {
  return `© ${year} ${PLATFORM_COMPANY_NAME}`;
}
