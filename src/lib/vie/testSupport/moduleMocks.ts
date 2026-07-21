/**
 * Centralized bun:test module-mock factories for VIE tests (Milestone 3 —
 * Validation & Coverage).
 *
 * Why this file exists — a real defect found while building out this
 * milestone's tests, not a hypothetical one: bun:test's `mock.module()`
 * replaces a module specifier for the ENTIRE test run, not just for the
 * file that calls it. Two of the pre-existing test files
 * (resolveCustomer.test.ts, resolveCustomerDuplicate.test.ts) each called
 * `mock.module("@/lib/customers/api", ...)` with a DIFFERENT partial shape
 * — one supplying only `listCustomers`, the other only
 * `findCustomerByPhone`. Each file passed in isolation (`bun test
 * path/to/one/file.test.ts`), but running the suite together
 * (`bun test`, i.e. what CI/`npm run test` actually does) failed with
 * "Export named 'listCustomers' not found in module ...", because
 * whichever file's mock.module call happened to register last became the
 * shared module state for BOTH files. This is a genuine cross-file test
 * pollution bug, verified by reproducing it directly, not inferred.
 *
 * Fix: every VIE test file that needs `@/lib/customers/api`,
 * `@/lib/products/api`, `@/lib/enquiries/api`, `@/lib/followups/api`,
 * `@/lib/app-settings/api`, or `@/lib/projects/api` mocked imports the SAME
 * shared, full-shape mock object from this file instead of registering its
 * own partial mock.module() call. Because every consumer shares the
 * identical mock object reference, load order stops mattering — there is
 * only ever one version of "the mock for this module" for the whole run.
 * Each test file still owns its own behavior by calling `.mockReset()` /
 * `.mockImplementation()` on the specific sub-mocks it actually exercises,
 * typically in its own `beforeEach`.
 *
 * `projectsApiMock` (added for create_quotation Milestone 1 —
 * resolveProject()) follows this pattern from its first line, per
 * VIE-CreateQuotation-Architecture-Review.md §11 risk #6: reusing this
 * shared-mock pattern from day one for a new module, rather than a fresh ad
 * hoc partial mock.module() call, is the specific, named lesson from the
 * @/lib/customers/api collision above.
 *
 * `aiGatewayMock` (added for create_quotation Milestone 3 — Expose to VIE)
 * mocks `@/lib/ai/gateway.server`'s `chatJson`, so `understand.test.ts` can
 * exercise `understand()`'s own classification/fallback logic (KNOWN_INTENTS
 * membership, language fallback, confidence clamping) without a real LLM
 * call — the same "shared, full-shape mock from day one" discipline as
 * every other module mocked here.
 *
 * `quotesApiMock` (added for create_quotation Milestone 4 — Action Handler)
 * mocks `@/lib/quotes/api`'s `createQuote`, so `createQuotation.test.ts` can
 * exercise the handler's own pre-validation (reusing the real, unmocked
 * `quoteCreateSchema` from `@/lib/quotes/schema`) and its call into the
 * write path without touching a database — same discipline, day one, again.
 *
 * REAL-MODULE PASSTHROUGH (found integrating this suite into the full
 * repository test run, not hypothetical): every `mock.module()` call below
 * replaces its target specifier for the ENTIRE `bun test` process, not just
 * for VIE's own test files — the same global-replacement behavior that
 * motivated this file in the first place, just with a larger blast radius
 * than originally scoped. `src/lib/ai/nl-search/resolve.test.ts` (nothing
 * to do with VIE) imports the real `@/lib/enquiries/api` and calls
 * `listEnquiries`. Once `enquiriesApiMock` — which only ever needed to
 * stub `createEnquiry` for VIE's own tests — replaced that module
 * process-wide, `resolve.test.ts` started failing with "Export named
 * 'listEnquiries' not found", purely from load-order coincidence within a
 * single `bun test` invocation. Each factory below now spreads the REAL
 * module's exports first, then overlays only the specific functions VIE
 * tests actually stub. Any export a VIE test doesn't care about keeps its
 * real implementation for whichever unrelated file happens to load it in
 * the same run; every export VIE tests DO stub is completely unaffected,
 * since the explicit override always wins over the spread.
 *
 * The real exports are captured via a plain top-level `import * as` at the
 * top of this file, NOT a dynamic `import()` inside the `mock.module()`
 * factory — tried that first and it broke every VIE test ("Export named
 * 'X' not found"), because a dynamic import of the same specifier from
 * inside its own mock factory resolves against the (still being
 * installed) mock rather than the real module. A static import at the top
 * of the file runs during this module's own evaluation, before any
 * `mock.module()` call below has taken effect, so it always captures the
 * genuine, unmocked implementation.
 */
import { mock } from "bun:test";
import * as customersApiActual from "@/lib/customers/api";
import * as productsApiActual from "@/lib/products/api";
import * as enquiriesApiActual from "@/lib/enquiries/api";
import * as followupsApiActual from "@/lib/followups/api";
import * as appSettingsApiActual from "@/lib/app-settings/api";
import * as projectsApiActual from "@/lib/projects/api";
import * as aiGatewayActual from "@/lib/ai/gateway.server";
import * as quotesApiActual from "@/lib/quotes/api";

export const customersApiMock = {
  listCustomers: mock(async (_query?: string): Promise<unknown[]> => []),
  findCustomerByPhone: mock(async (_mobile: string): Promise<unknown | null> => null),
  createCustomer: mock(async (_input: unknown): Promise<unknown> => {
    throw new Error("customersApiMock.createCustomer called without test configuration");
  }),
  getCustomer: mock(async (_id: string): Promise<unknown | null> => null),
  updateCustomer: mock(async (_id: string, _input: unknown): Promise<unknown> => {
    throw new Error("customersApiMock.updateCustomer called without test configuration");
  }),
  deleteCustomer: mock(async (_id: string): Promise<void> => {}),
};

export const productsApiMock = {
  listProducts: mock(async (_query?: string): Promise<unknown[]> => []),
};

export const enquiriesApiMock = {
  createEnquiry: mock(async (_input: unknown): Promise<unknown> => {
    throw new Error("enquiriesApiMock.createEnquiry called without test configuration");
  }),
};

export const followupsApiMock = {
  createFollowup: mock(async (_input: unknown): Promise<unknown> => {
    throw new Error("followupsApiMock.createFollowup called without test configuration");
  }),
};

export const appSettingsApiMock = {
  getAppSetting: mock(async (_key: string): Promise<unknown | null> => null),
};

export const projectsApiMock = {
  listProjectsByCustomer: mock(async (_customerId: string): Promise<unknown[]> => []),
  listProjectsForPicker: mock(async (_opts?: unknown): Promise<unknown[]> => []),
  listProjects: mock(async (_query?: string): Promise<unknown[]> => []),
  getProject: mock(async (_id: string): Promise<unknown | null> => null),
  createProject: mock(async (_input: unknown): Promise<unknown> => {
    throw new Error("projectsApiMock.createProject called without test configuration");
  }),
  updateProject: mock(async (_id: string, _input: unknown): Promise<unknown> => {
    throw new Error("projectsApiMock.updateProject called without test configuration");
  }),
  deleteProject: mock(async (_id: string): Promise<void> => {}),
};

export const aiGatewayMock = {
  chat: mock(async (): Promise<string> => ""),
  chatJson: mock(async (): Promise<unknown> => ({})),
};

export const quotesApiMock = {
  createQuote: mock(async (_input: unknown): Promise<unknown> => {
    throw new Error("quotesApiMock.createQuote called without test configuration");
  }),
};

mock.module("@/lib/customers/api", () => ({ ...customersApiActual, ...customersApiMock }));
mock.module("@/lib/products/api", () => ({ ...productsApiActual, ...productsApiMock }));
mock.module("@/lib/enquiries/api", () => ({ ...enquiriesApiActual, ...enquiriesApiMock }));
mock.module("@/lib/followups/api", () => ({ ...followupsApiActual, ...followupsApiMock }));
mock.module("@/lib/app-settings/api", () => ({
  ...appSettingsApiActual,
  ...appSettingsApiMock,
}));
mock.module("@/lib/projects/api", () => ({ ...projectsApiActual, ...projectsApiMock }));
mock.module("@/lib/ai/gateway.server", () => ({ ...aiGatewayActual, ...aiGatewayMock }));
mock.module("@/lib/quotes/api", () => ({ ...quotesApiActual, ...quotesApiMock }));

/** Resets every sub-mock's call history and restores its default
 *  implementation. Call from each test file's `beforeEach` so tests never
 *  leak configuration into one another regardless of run order. */
export function resetAllModuleMocks(): void {
  customersApiMock.listCustomers.mockReset();
  customersApiMock.listCustomers.mockImplementation(async () => []);
  customersApiMock.findCustomerByPhone.mockReset();
  customersApiMock.findCustomerByPhone.mockImplementation(async () => null);
  customersApiMock.createCustomer.mockReset();
  customersApiMock.createCustomer.mockImplementation(async () => {
    throw new Error("customersApiMock.createCustomer called without test configuration");
  });
  customersApiMock.getCustomer.mockReset();
  customersApiMock.getCustomer.mockImplementation(async () => null);

  productsApiMock.listProducts.mockReset();
  productsApiMock.listProducts.mockImplementation(async () => []);

  enquiriesApiMock.createEnquiry.mockReset();
  enquiriesApiMock.createEnquiry.mockImplementation(async () => {
    throw new Error("enquiriesApiMock.createEnquiry called without test configuration");
  });

  followupsApiMock.createFollowup.mockReset();
  followupsApiMock.createFollowup.mockImplementation(async () => {
    throw new Error("followupsApiMock.createFollowup called without test configuration");
  });

  appSettingsApiMock.getAppSetting.mockReset();
  appSettingsApiMock.getAppSetting.mockImplementation(async () => null);

  projectsApiMock.listProjectsByCustomer.mockReset();
  projectsApiMock.listProjectsByCustomer.mockImplementation(async () => []);
  projectsApiMock.listProjectsForPicker.mockReset();
  projectsApiMock.listProjectsForPicker.mockImplementation(async () => []);
  projectsApiMock.listProjects.mockReset();
  projectsApiMock.listProjects.mockImplementation(async () => []);
  projectsApiMock.getProject.mockReset();
  projectsApiMock.getProject.mockImplementation(async () => null);

  aiGatewayMock.chat.mockReset();
  aiGatewayMock.chat.mockImplementation(async () => "");
  aiGatewayMock.chatJson.mockReset();
  aiGatewayMock.chatJson.mockImplementation(async () => ({}));

  quotesApiMock.createQuote.mockReset();
  quotesApiMock.createQuote.mockImplementation(async () => {
    throw new Error("quotesApiMock.createQuote called without test configuration");
  });
}
