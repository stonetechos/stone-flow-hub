/**
 * Sprint 1.7, Part 9 — Vedora Vision platform branding.
 *
 * This is deliberately separate from `src/lib/branding/index.ts`, which is
 * per-tenant Company Profile branding (a customer's own logo/colors used on
 * generated documents like quotations and POs). This module is the opposite
 * layer: it identifies the *platform vendor* that builds and operates Stone
 * Tech OS, shown in small, consistent places (login screen, Settings ›
 * About) without replacing any Stone Tech product branding.
 *
 * Architecture note: Stone Tech OS is the first of what Vedora Vision
 * intends to be a family of products (Vedora CRM, Vedora Finance, Vedora HR,
 * Vedora Manufacturing, etc). Keeping the platform identity in one small,
 * dependency-free module — rather than inlining the company name as string
 * literals at each call site — means a future sibling product can reuse
 * this exact module, and a future "product switcher" UI has one place to
 * read the platform name from.
 */

/** The company that builds and operates this platform and its siblings. */
export const PLATFORM_NAME = "Vedora Vision";

/** This specific product. Never replaced by the platform name — Stone Tech
 * OS keeps its own identity everywhere; Vedora Vision is attributed, not
 * substituted. */
export const PRODUCT_NAME = "Stone Tech OS";

/** Short category line for Settings › About. */
export const PRODUCT_CATEGORY = "Enterprise ERP Platform";

/** Login screen / footer-style attribution. */
export const POWERED_BY_LINE = `${PRODUCT_NAME} · Powered by ${PLATFORM_NAME}`;

/** Settings › About "built by" line. */
export const BUILT_BY_LINE = `Built by ${PLATFORM_NAME}`;

/** Copyright line. Takes the year as a parameter since Date.now()-style
 * calls are avoided in some execution contexts (e.g. workflow scripts) —
 * callers pass the current year explicitly. */
export function copyrightLine(year: number): string {
  return `© ${year} ${PLATFORM_NAME}`;
}
