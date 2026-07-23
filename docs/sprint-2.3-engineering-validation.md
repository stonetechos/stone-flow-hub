# Sprint 2.3 — Engineering Validation & Workflow Hardening

**Date:** 2026-07-23
**Branch:** `feature/vie-quotation`
**Objective:** Verify every assumption made in Sprint 2.2 with direct
evidence — not inference. This document reports findings only. It makes
**no code changes**: `git status --short` is clean before and after every
part of this audit (verified at the end of §1 and again in §12).

All ignore-rule toggles in §1 were applied via temporary edits, measured,
and reverted within the same investigation; each reversion is
independently confirmed against `git diff` before moving to the next
test. Timings in §5 and §7 were measured with `time` on this sandbox
(not a GitHub Actions runner) — they establish relative cost and
ballpark absolute cost, not GitHub Actions' exact wall-clock numbers.

---

## PART 1 — Generated-file exclusions, verified by removal

Method: for each of the 5 files Sprint 2.2 excluded, both its
`eslint.config.js` `ignores` entry and its `.prettierignore` entry were
temporarily commented out together, `npx eslint . -f json` was run, the
diff against a captured baseline was computed programmatically (not by
eye), and both entries were restored before testing the next file.
`routeTree.gen.ts` was tested differently (see below) since it isn't in
either ignore file.

**Baseline** (current, fully-excluded state): `npx eslint . -f json` →
639 files scanned, 16 files with issues, **0 errors, 18 warnings**.

| File | Both ignore layers removed | Errors contributed | Other files affected |
|---|---|---|---|
| `src/integrations/supabase/types.ts` | yes | **7,385** | none — diff showed exactly 1 new file vs. baseline |
| `src/routes/mcp.ts` | yes | **1** | none |
| `src/routes/[.mcp]/list-tools.ts` | yes | **1** | none |
| `src/routes/[.mcp]/invoke-tool/$tool.ts` | yes | **1** | none |
| `src/routes/[.well-known]/oauth-protected-resource.ts` | yes | **1** | none |
| `src/routeTree.gen.ts` (inline `/* eslint-disable */`, not config-based) | `--no-inline-config` flag, file untouched on disk | **158** | n/a (single-file run) |

Sum: **7,385 + 1 + 1 + 1 + 1 + 158 = 7,547** lint errors that would
appear in a full `eslint .` run if none of these exclusions existed —
consistent with, and explaining, `docs/CI_LINT_DEBT.md`'s original
7,391-error count (that count predates the `routeTree.gen.ts`
self-exclusion banner's scope and the mcp-js files' existence in their
current form, so the totals aren't expected to match exactly, but they
are the same order of magnitude from the same root cause).

**Two-layer redundancy finding (not previously documented):**
`eslint.config.js`'s `ignores` array is independently sufficient to
bring each file's contribution to 0, regardless of `.prettierignore`
(tested directly: restoring only `eslint.config.js`'s `types.ts` entry
while `.prettierignore`'s entry stayed removed → 0 errors). Conversely,
`.prettierignore` alone (with `eslint.config.js`'s entry removed) was
also independently sufficient (0 errors) — `eslint-plugin-prettier`
consults `.prettierignore` on its own before running Prettier's check.
The two files are not strictly redundant, though: `eslint.config.js`
governs `eslint .` / `eslint --fix` (what CI's Lint step and any future
lint-staged rule run); `.prettierignore` governs the standalone
`prettier --write .` / `prettier --check .` CLI (the `format` npm
script, and any future lint-staged Prettier rule invoked directly rather
than through ESLint). Both are required to protect both entry points.

**Hand-written files caught by the exclusions: none.** Each of the 5
individual removal tests reported exactly one newly-affected file — the
target file itself — with **zero** change to any other file's error or
warning count, in every test. This was verified programmatically (a
Python diff against the captured baseline JSON, not manual inspection)
for every one of the 6 tests above. No stop-and-report condition was
triggered.

**Restoration verified:** after all 6 tests, `git diff --stat
eslint.config.js .prettierignore` returned empty, and a fresh `eslint .
-f json` run was byte-for-byte identical (`diff` of sorted JSON, 0
lines) to the pre-test baseline capture. `src/routeTree.gen.ts` was
never written to (`git diff --stat src/routeTree.gen.ts` empty
throughout — its test used `--no-inline-config`, which does not touch
the file).

**Verdict: correct as implemented. No change required.**

---

## PART 2 — CI toolchain consistency

| Tool | `package.json` range | `bun.lock` resolved | Satisfies range? |
|---|---|---|---|
| `typescript` | `^5.8.3` | `5.9.3` | yes |
| `eslint` | `^9.32.0` | `9.39.4` | yes |
| `eslint-config-prettier` | `^10.1.1` | `10.1.8` | yes |
| `eslint-plugin-prettier` | `^5.2.6` | `5.5.5` | yes |
| `eslint-plugin-react-hooks` | `^5.2.0` | `5.2.0` | yes |
| `eslint-plugin-react-refresh` | `^0.4.20` | `0.4.26` | yes |
| `typescript-eslint` | `^8.56.1` | `8.59.0` | yes |
| `prettier` | `^3.7.3` | `3.8.3` | yes |
| `@eslint/js` | `^9.32.0` | `9.39.4` | yes |
| `globals` | `^15.15.0` | `15.15.0` | yes |

No mismatches. `bun.lock`'s resolved versions were extracted with a
script (`re.search` against each package's lock entry), not read by
eye, and every one satisfies its `package.json` semver range.

**Does CI install the exact versions expected?** `.github/workflows/ci.yml`
line 32: `bun install --frozen-lockfile`. Frozen-lockfile mode refuses to
proceed if `package.json` and `bun.lock` disagree, so as long as that
step succeeds, the versions above are exactly what's installed — this
is a property of the flag, not something that needs separate proof
per run.

**Node / Bun version pinning:** `.github/workflows/ci.yml` lines 22-29
pin `bun-version: 1.3.14` and `node-version: 22`. `package.json`'s
`devDependencies["@types/bun"]` is `^1.3.14` — the type package's floor
matches CI's exact Bun version, which is the correct pattern (evidence
this wasn't left to drift). This sandbox's own Bun (`1.3.13`) and Node
(`v22.22.2`) differ slightly from CI's pin — that's expected and
harmless: this is a local dev/audit environment, not a CI runner, and
every version-sensitive verification in this document and in Sprint
2.2 was done by explicitly installing the exact `bun.lock`-pinned tool
versions first (see Sprint 2.2 §4's account of the `prettier@3.9.5` vs.
`3.8.3` false-positive it caused before that correction).

**Multiple package managers — why:** three are present in this repo in
some form:
- **Bun** — the only one that touches the registry. `bun install
  --frozen-lockfile` populates `node_modules`; `bun test` runs the
  suite directly. This is the canonical installer.
- **npm** — used as a task-runner only. `.github/workflows/ci.yml` runs
  `npm run typecheck:tests`, `npm run lint`, `npm run
  verify:auth-context`, `npm run build` — these invocations read
  `package.json`'s `"scripts"` block and execute the listed shell
  command using whatever's already in `node_modules/.bin` (populated by
  Bun in the prior step); they do not re-resolve dependencies or touch
  `package-lock.json`. `npx tsc --noEmit` (the plain "Typecheck" step)
  is the same mechanism, invoked directly rather than through `npm
  run`. There is no discoverable reason documented anywhere in the repo
  for mixing `npm run` invocations into an otherwise Bun-installed
  pipeline — it reads as incidental (most likely carried over from the
  project's Lovable-generated scaffolding, which defaults to npm
  script syntax) rather than a deliberate decision. It is harmless
  (confirmed: no registry access, no lockfile writes) but is a real,
  if cosmetic, inconsistency — see §7 for whether it's worth changing.
- **pnpm** — referenced only as an inert `"pnpm": { "overrides": {
  "entities": "4.5.0" } }` key in `package.json` (line 107-110). No
  `pnpm-lock.yaml`, no `pnpm-workspace.yaml`, no `.npmrc`, nothing in
  `.github/` invokes `pnpm`. `grep -rln "pnpm"` across the repo (json/
  yml/yaml/md) returns only `package.json` itself and this sprint's own
  and Sprint 2.2's docs referencing it. This key does nothing today —
  it is boilerplate, most likely from the same scaffolding origin as
  the mixed npm/bun scripts, present to hedge for whichever package
  manager a template consumer might pick. It costs nothing (unused
  keys in `package.json` aren't read by Bun or npm) but is dead
  configuration.

**Verdict:** toolchain versions are internally consistent and correctly
pinned — no mismatch to report. The npm/bun mixing and the inert `pnpm`
key are real but low-severity findings, carried into the Part 10
scorecard as Yellow, not Red (nothing is broken; it's a clarity/
consistency issue).

---

## PART 3 — `package-lock.json`

Per instruction, this file was **not modified or deleted**. Findings,
each backed by a search:

- **Referenced by content anywhere in `.github/`, `docs/`, `scripts/`,
  `package.json`, or deployment config?** No. `grep -rn
  "package-lock.json" .github/ docs/ scripts/ package.json
  vite.config.ts wrangler.jsonc capacitor.config.ts` returns only this
  document's own text and Sprint 2.2's doc (which already flagged this
  exact question as a recommendation) — no operational reference
  anywhere.
- **Is `npm ci` or `npm install` (the commands that actually consume a
  lockfile) used anywhere?** No. `grep -rn "npm ci\b|npm install\b"
  .github/ docs/ scripts/ package.json` returns nothing. `.github/workflows/ci.yml`'s
  only install step is `bun install --frozen-lockfile` (line 32); every
  other step is `npm run <script>` / `npx <bin>` / `bun test`, none of
  which read `package-lock.json`.
- **Is Lovable using npm?** The only Lovable-specific config in the repo
  is `.lovable/project.json` (template metadata only — `schemaVersion`,
  `template`, `revision`, no install/package-manager directive) and
  `.lovable/mcp/manifest.json` (an MCP tool manifest, unrelated to
  package management). Neither references npm, package-lock.json, or
  any install command.
- **Does GitHub Actions ever use npm to install?** No — confirmed above;
  its only npm usage is `npm run`/`npx` as a script-runner post-install,
  never `npm install`/`npm ci`.
- **Does Vercel, Cloudflare, or any deployment process rely on it?**
  `wrangler.jsonc` has no install-command override (`grep -in
  "install|npm|bun|build" wrangler.jsonc` returns nothing on those
  terms). `vite.config.ts`'s own comments (lines 1-13) state the
  production deploy path is Lovable's build pipeline generating
  `.output/server/wrangler.json` at build time via `vite build` — no
  install step is specified there either; whatever installs
  dependencies for that pipeline is external to this repo (Lovable's
  own infrastructure), and nothing in-repo shows it choosing npm over
  Bun. No `vercel.json` or `netlify.toml` exists in the repo (`find`
  confirmed).
- **Is it stale/inconsistent with `package.json`?** No signs of that
  specifically — `lockfileVersion: 3`, `name: "tanstack_start_ts"`
  matches `package.json`'s name, 724 top-level package entries. It
  parses and its `name` field is in sync; whether every resolved
  version matches `bun.lock`'s was not tested (irrelevant, since
  nothing reads it).
- **Is it gitignored (i.e., committed by accident)?** No —
  `.gitignore` has no lockfile entries at all, so it's intentionally
  tracked, not an accidental leak. `git log` shows it was touched in 3
  commits, most recently `9212e11` "Apply Prettier formatting" and
  `81ba431` "Fix Bun lockfile for Cloudflare deployment" — the latter's
  message is specifically about `bun.lock`, and `package-lock.json`
  appears to have been updated as a side effect of whoever made that
  fix also having run `npm install` locally, not because the fix
  required it.

**Verdict:** `package-lock.json` has no discoverable purpose anywhere in
this repository's build, test, lint, or deployment path — every install
path this audit could find goes through `bun.lock`. It is not deleted
per instruction. This matches and reconfirms, with direct search
evidence this time rather than assertion, Sprint 2.2 §8's existing
recommendation #3 (document or remove it as a deliberate decision).

---

## PART 4 — Husky installation safety (not installed)

Three things were tested directly in throwaway `/tmp` scaffolds using
this sandbox's Bun (not this repo, and not committed — cleaned up
immediately after each test):

**1. Does `bun install` run the root project's own `prepare` script?**
Yes — confirmed with a scratch `package.json` whose `"prepare"` script
wrote a marker file; `bun install` produced the marker.

**2. Does `bun install --frozen-lockfile` (CI's exact command) also run
it?** Yes — same test repeated with `--frozen-lockfile` specifically;
marker file was produced.

**3. What happens if `"prepare": "husky"` exists but `husky` isn't a
resolvable dependency (the exact risk Sprint 2.2 flagged)?**
```
$ bun install --frozen-lockfile
bun install v1.3.13 (bf2e2cec)
$ husky
/usr/bin/bash: line 1: husky: command not found
error: prepare script from "bun-prepare-fail" exited with 127
```
Exit code **127**, and `bun install` itself fails (non-zero exit). This
is direct, reproduced proof — not inference — that committing the
`husky`/`lint-staged` `package.json` changes without a matching
`bun.lock` update would fail CI's Install step, on every push, before
Typecheck/Lint/Test/Build ever run. This confirms Sprint 2.2's decision
not to commit that change was correct, with a concrete failure mode now
on record.

**Cross-platform (Windows / macOS / Linux):** this sandbox is Linux
only — Windows/macOS behavior could not be directly executed here. Per
Husky's own documentation (typicode.github.io/husky, fetched
2026-07-23): hook scripts are recommended to stay POSIX-compliant
"since not everyone has `bash`"; Husky documents a Windows-specific
workaround (wrapping Bash-only syntax in a `bash << EOF` heredoc) for
teams that need non-POSIX hook logic; and Husky sources
`~/.config/husky/init.sh` before running hooks specifically to let
version managers initialize correctly in GUI git clients on Windows and
elsewhere. Husky's official docs also list `bun add --dev husky` as one
of its supported install commands alongside npm/pnpm/yarn — Bun is an
officially supported package manager for Husky, not an unsupported
combination. The planned hook content (`npx lint-staged`, no
Bash-specific syntax) is POSIX-compliant per that guidance. This part
of the finding is sourced from Husky's documentation, not independently
re-executed on Windows/macOS from this sandbox — flagged explicitly so
the distinction between "directly tested" and "documented" evidence is
clear.

**CI behavior:** a correctly-installed Husky does not, by itself, run
hooks in CI (CI doesn't make git commits), so there's no CI-time cost
from Husky itself beyond the `prepare` script executing once per
`bun install --frozen-lockfile` (fast — it just writes `.husky/_/`
helper files locally; no network call). The community-documented
`HUSKY=0` environment variable (confirmed via search, e.g. discussed in
typicode/husky issues #920, #1464, #206, and independently referenced
by third parties as a CI-time-saver) can disable Husky's install-time
setup in CI if ever desired, though nothing in this repo's CI needs
that today since CI never runs `git commit`.

**Developer onboarding:** once correctly installed (see Sprint 2.2 §4
for the exact commands, blocked only on registry access), the hook
activates automatically on every contributor's first `bun install` —
no manual step, consistent with the `prepare`-script pattern's intended
purpose.

**Exact commands required** (unchanged from Sprint 2.2 §4, reconfirmed
correct by the empirical tests above):
```bash
bun add -d husky lint-staged
bunx husky init
# replace .husky/pre-commit content with: npx lint-staged
# add the "lint-staged" block to package.json (see §5 below for the
# recommended, timing-verified task list)
```

**Verdict:** safe to introduce, with the single hard requirement
already identified in Sprint 2.2 — `package.json` and `bun.lock` must
be updated together, from an environment with registry access, never
partially. Not installed in this sprint (per instruction).

---

## PART 5 — `lint-staged` configuration, measured

Full-repo baselines (this sandbox, `bun.lock`-pinned toolchain):

| Command | Scope | Wall time |
|---|---|---|
| `npx tsc --noEmit` | whole program (639 files) | **50.8s** |
| `npx eslint .` | whole repo | **23.1s** |
| `npx prettier --check .` | whole repo (incl. `docs/`) | **14.2s** |

Targeted (5 representative already-tracked source files, simulating a
typical commit's staged-file count):

| Command | Files | Wall time |
|---|---|---|
| `npx eslint --fix <5 files>` | 5 | **2.3s** |
| `npx prettier --write <5 files>` | 5 | **1.1s** |

**Recommendation: `eslint --fix` + `prettier --write`, scoped to staged
files only. Do not run `typecheck` in the pre-commit hook.**

Reasoning, evidenced:
- `eslint --fix` and `prettier --write`, run only against staged files
  (what `lint-staged` does — it builds the file list from `git diff
  --cached`, not the whole repo), measured at **~3.4s combined** for a
  5-file commit. That's within normal pre-commit-hook latency
  expectations (sub-5s).
- `tsc --noEmit` **cannot be meaningfully scoped to staged files.**
  TypeScript type-checks the whole program graph — cross-file type
  inference means checking "just the changed files" isn't how the tool
  works; the only correct invocation is the full 50.8s run, which
  would run on every single commit. That's a bad trade: CI already runs
  full typecheck as a blocking gate before merge, so duplicating it at
  commit time buys, at best, a few-minutes-earlier failure signal at
  the cost of a ~51s tax on every commit, forever. Not recommended.

**Secondary finding, relevant to scoping the Prettier rule:**
`npx prettier --check .` (whole repo) currently reports **20** files
out of compliance — all 18 are `docs/**/*.md` (including this sprint's
own docs), one is `.lovable/mcp/manifest.json`, and none are `src/**`
files (confirmed by listing every flagged path). If a future
`lint-staged` config uses a broad `*.md` glob, committing an edit to
any of those already-non-compliant docs would silently reformat the
whole file as a side effect of an unrelated content change — worth
scoping the Prettier rule to `src/**/*.{ts,tsx}` plus whichever
non-source globs are actually meant to be enforced, rather than a bare
`*.{js,jsx,json,css,md}` that reaches into `docs/`.

Recommended config (updates Sprint 2.2 §4's draft with this finding):
```json
"lint-staged": {
  "src/**/*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{js,jsx,json,css}": ["prettier --write"]
}
```
(Markdown intentionally omitted until the existing 18-file docs debt is
addressed as its own decision — see Sprint 2.2 §8 recommendation #2's
sibling concern; adding `*.md` today would make the *first* commit
touching any of those 18 files silently reformat it.)

Not implemented this sprint — `lint-staged` is not installed (§4).

---

## PART 6 — Every remaining ESLint warning, individually classified

All 18 are warnings (not errors); `eslint .` exits 0 with them present.
None were auto-fixed. Two families:

### `react-refresh/only-export-components` (11 occurrences)

| File:Line | Export shape (confirmed by reading the file) |
|---|---|
| `src/components/ui/alert.tsx:61` | `export { Alert, AlertTitle, AlertDescription, alertVariants }` |
| `src/components/ui/badge.tsx:51` | `export { Badge, badgeVariants }` |
| `src/components/ui/button.tsx:80` | `export { Button, buttonVariants }` |
| `src/components/ui/card.tsx:88` | `export { Card, ..., cardVariants }` |
| `src/components/ui/form.tsx:163` | `export { ... }` (component + helpers) |
| `src/components/ui/navigation-menu.tsx:111` | `export { ... }` (component + helpers) |
| `src/components/ui/sidebar.tsx:743` | `export { ... }` (component + helpers) |
| `src/components/ui/toggle.tsx:42` | `export { Toggle, toggleVariants }` |
| `src/components/dashboard/ChartCards.tsx:27,191` | components + `CHART_COLORS` const + `moneyShort()` fn |
| `src/components/data/ConfirmDialog.tsx:121` | dialog component + `useConfirm()` hook |
| `src/hooks/use-roles.tsx:50` | `useRoles()` hook + `RolesState` type re-export shape |
| `src/lib/demo/context.tsx:80` | provider component + `useDemoMode()` hook |

**Classification: Safe to ignore — Intentional.** All 8 `src/components/ui/*`
files are unmodified shadcn/ui primitives following shadcn's own
standard `export { Component, componentVariants }` pattern (component
plus its CVA variant-generator function) — the canonical trigger for
this rule, present in essentially every shadcn/ui-based codebase. The
remaining 4 follow the same shape: one file exporting both a
component/provider and a co-located hook or helper. The rule exists
purely for Vite's Fast Refresh (HMR) granularity — a mixed-export file
still works correctly at runtime and in production; the only effect is
that editing one of these files during `vite dev` triggers a full page
reload instead of a hot-swap. Fixing it means splitting each file into
a component-only file plus a separate helpers file — 12 file splits,
which is cosmetic refactoring and explicitly out of this sprint's
scope (and arguably not worth doing for the shadcn primitives at all,
since they're vendored, not hand-authored application logic).

### `react-hooks/exhaustive-deps` (5 occurrences, individually reviewed)

**`src/components/global/NotificationsBell.tsx:40`** —
`const now = useMemo(() => new Date(), [items]);`. `new Date()` doesn't
read `items`, so the dependency is technically unnecessary by the
rule's static analysis. But removing it changes behavior: `now` would
then be computed exactly once, at first render, forever — currently it
re-computes whenever `items` changes, which looks like a deliberate
(if fragile) heuristic to keep "today/yesterday/earlier" bucketing
reasonably fresh without a real timer. Neither "leave as-is" nor "drop
the dependency" is obviously correct without knowing whether this view
is ever left open across a day boundary without `items` changing.
**Classification: Needs engineering review** — a real product-behavior
question, not a mechanical fix.

**`src/hooks/use-roles.tsx:59`**, **`src/routes/_authenticated/communication.tsx:141`**,
**`src/routes/_authenticated/estimates/index.tsx:60`** — all three share
one pattern, confirmed by reading each: `const roles = q.data ?? [];` /
`const rows = query.data ?? [];`, then a `useMemo(..., [roles])` /
`useMemo(..., [rows])` below it. `?? []` constructs a brand-new array
literal on every render in which the query hasn't resolved data yet, so
the "same" logical value is a different reference each such render,
defeating memoization (the memo recomputes on every render instead of
only when the underlying data changes). This is a well-known,
mechanically fixable React pattern (memoize the default, e.g. `const
roles = useMemo(() => q.data ?? [], [q.data])`, or hoist a single
shared stable empty-array constant). **Classification: Should be
fixed** — safe, well-understood, low-risk — but not fixed in this
sprint per the "do not automatically fix" instruction; flagging as a
concrete follow-up list (3 files, same fix shape) rather than three
unrelated investigations.

**`src/routes/_authenticated/calendar.tsx:59`** — the closing
`}, [query.data]);` of a `useMemo` whose callback also contains two
TypeScript **type-level** references, `typeof query.data extends
undefined ? never : NonNullable<typeof query.data>` (lines 50 and 54).
`query.data` is the correct, narrowest runtime dependency here — depending
on the full `query` object instead (what the rule's message suggests)
would be strictly worse for memoization stability, since TanStack
Query's returned query object does not have a stable reference across
renders the way `query.data` does. The `typeof query.data` type
annotations are compile-time-only constructs, not runtime reads, but
share the identifier `query` with the real dependency; this is a
plausible, evidence-consistent explanation for why the rule's static
analysis flags an already-correct dependency array as "missing" — the
code's actual runtime dependency footprint is exactly `query.data`, no
more. **Classification: False positive** (reasoned from direct reading
of the code, not from an ESLint-internals citation — noted as best
available analysis rather than a guaranteed root cause).

**Verdict:** 11 warnings intentional/safe-to-ignore, 3 should-be-fixed
(same underlying pattern, not fixed this sprint), 1 needs product-level
engineering review, 1 false positive. None fixed; none suppressed.

---

## PART 7 — GitHub Actions workflow audit

Only one workflow file exists: `.github/workflows/ci.yml` (single job,
`verify`, `ubuntu-latest`, 9 sequential steps).

**Already correct — verified, no change required:**
- **Concurrency control** (lines 8-10): `cancel-in-progress: true`
  keyed on `${{ github.workflow }}-${{ github.ref }}` — superseded runs
  on rapid pushes to the same ref are cancelled automatically. This is
  the standard, correct pattern; nothing to add.
- **`tsconfig.json` vs. `tsconfig.test.json` are not duplicate work.**
  Read both files directly: the production config's `exclude` (`src/**/*.test.ts`,
  `src/**/*.test.tsx`, `src/**/testSupport/**`) and the test config's
  `include` (exactly those same three globs) are deliberately
  complementary, not overlapping — confirmed by the test config's own
  extensive header comment explaining why the two type contexts must
  stay separate (preventing Bun's global type declarations from leaking
  into production code that runs in the browser/on Cloudflare Workers).
  The "Typecheck" and "Typecheck tests" CI steps check disjoint file
  sets. **Verified. No change required.**
- **No matrix / multi-OS testing exists, and none is evidently needed** —
  this is a single-target web app (Cloudflare Workers via Nitro), not a
  cross-platform library; a Node/Bun-version or OS matrix would add CI
  time without a corresponding correctness benefit that this audit
  could identify.

**Real, measurable gap — dependency caching:**
`oven-sh/setup-bun@v2`, per its own documentation (fetched 2026-07-23),
has no built-in dependency-caching feature — its only cache-related
input (`no-cache`) caches the Bun *binary* itself, not installed
packages. `actions/setup-node@v4`'s built-in `cache` input doesn't
support `bun` as a package-manager value either way, and isn't
configured here regardless. Net effect: `bun install --frozen-lockfile`
(837 packages, per `bun.lock`) runs fully uncached on every single CI
run, with no `actions/cache` step anywhere in the workflow (confirmed:
`grep -rn "actions/cache" .github/` — no matches). This is the single
most measurable, evidence-backed opportunity in this workflow: adding
an `actions/cache` step for Bun's install cache directory
(`~/.bun/install/cache`), keyed on `hashFiles('bun.lock')`, is a
standard, low-risk pattern that would let unchanged dependencies be
restored from cache instead of re-fetched on every run. Not
implemented in this sprint (Part 7 asks for verification and
measurable recommendations, not implementation) — flagged as the one
concrete, evidenced follow-up.

**Minor, non-measurable observation:** the "Typecheck" step runs `npx
tsc --noEmit` directly, while every other step (Typecheck tests, Lint,
Verify auth context, Build) goes through `npm run <script>`, and Test
goes through `bun test` directly. All three invocation styles are
functionally identical here (package.json's own `"typecheck"` script
is the literal string `"tsc --noEmit"`), so there is no measurable
performance or correctness difference — this is purely a naming/style
inconsistency, consistent with the broader npm/bun mixing noted in
§2. Not raised as an actionable recommendation since "recommend
improvements only if measurable" — there's nothing to measure here.

**No duplicate work, no unnecessary installs, no missing verification
step identified** beyond the caching gap above. `docs/**/*.md` remains
outside any CI check (no `prettier --check` step exists, and Lint
doesn't cover `.md`) — noted here as a fact, not a defect, since
markdown formatting has never been part of this pipeline's contract and
introducing one is a scope decision, not a bug fix.

---

## PART 8 — Prettier as the sole formatting authority

| Candidate competing/complementary config | Present? |
|---|---|
| `.editorconfig` | No |
| `.vscode/settings.json` | No |
| `.vscode/extensions.json` | No |
| `biome.json` / `biome.jsonc` | No |
| `rome.json` | No |
| `.stylelintrc` | No |
| Alternate formatter devDependency (`biome`, `rome`, `standard`, `xo`, `dprint`) | No — scanned `package.json`'s full dependency list |
| `.prettierrc` | **Yes** — `{"printWidth": 100, "semi": true, "singleQuote": false, "trailingComma": "all"}` |

`eslint.config.js`'s final entry in the config array is
`eslintPluginPrettier` (`eslint-plugin-prettier/recommended`, which
bundles both `eslint-plugin-prettier` — runs Prettier as an ESLint rule
— and `eslint-config-prettier` — disables ESLint's own stylistic rules
that could conflict with Prettier's opinion). Being last in the array
is the correct, officially-recommended ordering: it ensures any
Prettier-conflicting stylistic rule turned on by earlier entries
(`js.configs.recommended`, `tseslint.configs.recommended`) gets turned
back off.

**Verdict: Prettier is the sole, unambiguous formatting authority for
this repo — no competing config exists at any layer (editor, linter, or
standalone formatter). Verified. No change required.**

(The *absence* of `.editorconfig` / `.vscode/*` isn't a competing-authority
problem — nothing conflicts with Prettier — but it is an onboarding gap;
carried into §9.)

---

## PART 9 — Editor / onboarding experience

Can a developer clone this repo and start working with zero manual
setup? Checked directly:

| Item | Present? | Effect if missing |
|---|---|---|
| `README.md` | **No** (`find` at repo root: none) | No written guidance on which package manager to use, how to run the app, or how to run checks — a new contributor has to infer from `package.json` alone, and would plausibly reach for `npm install` given `package-lock.json` sits right next to `bun.lock` (§3). |
| `CONTRIBUTING.md` | **No** | No documented contribution/checks workflow. |
| `.vscode/extensions.json` | **No** | VS Code never prompts to install the ESLint or Prettier extensions — a contributor without them already installed gets no inline lint/format feedback at all. |
| `.vscode/settings.json` | **No** | No workspace-level `editor.formatOnSave`, no `editor.defaultFormatter` pin, no `typescript.tsdk` pointer to the workspace TypeScript version. |
| `.editorconfig` | **No** | No baseline indent-style/charset/EOL enforcement for editors or contexts that don't run Prettier (e.g., quick edits through GitHub's web UI). |
| `package.json` `"engines"` field | **No** | A contributor on an incompatible Node/Bun version gets no early warning — the first symptom would be a confusing install or type error, not a clear version message. |

**Verdict: a fresh clone does *not* have a zero-manual-setup path
today.** Nothing here is incorrect or broken — the app runs fine once a
developer correctly guesses to run `bun install` — but every one of the
6 items above is a real, evidenced gap, and the missing
`.vscode/extensions.json` + `.vscode/settings.json` pair is the most
consequential one: it's the mechanism that would otherwise guarantee
format-on-save and inline linting work out of the box, which is
directly in scope for "so future commits consistently pass CI" (this
sprint's original, standing mandate). Not implemented this sprint
(scaffolding editor config is arguably not "new features" but is
adjacent to "cosmetic" — flagged as a recommendation rather than
executed, consistent with this sprint's verification-only mandate).

---

## PART 10 — Final engineering scorecard

| Area | Status | Basis |
|---|---|---|
| Formatting | 🟢 Green | Single authority (Prettier, §8); `.prettierrc`/`.prettierignore` correctly scoped; generated files correctly excluded and verified by direct removal (§1). |
| Lint | 🟢 Green | `eslint .` exits 0 errors (§1 baseline); every remaining warning individually reviewed and classified, none blocking (§6). |
| CI | 🟡 Yellow | Correct and passing today (§7); no dependency caching (measurable, evidenced gap, §7); npm/bun invocation mixing is cosmetic (§2, §7). |
| Testing | 🟢 Green | `bun test`: 323 pass, 0 fail (re-confirmed this sprint, §5 timing run). |
| Build | 🟢 Green | `npm run build` succeeds; 27.7s measured this sprint. |
| Deployment | 🟡 Yellow | No in-repo deployment config references `package-lock.json` or npm (§3) — consistent with prior sprints' finding that the actual production deploy path (Lovable's pipeline) is outside this repo's direct control/verification. |
| Developer Experience | 🟡 Yellow | No `README`, no `.vscode/*`, no `.editorconfig`, no `engines` field (§9) — real onboarding gaps, nothing broken. |
| Git workflow | 🟢 Green | `.gitignore` correct for build output; no stray generated/build artifacts tracked (verified via `git status --ignored` in Sprint 2.2 and reconfirmed clean here). |
| Package management | 🟡 Yellow | `bun.lock` is authoritative and fully consistent (§2); `package-lock.json` has no discoverable purpose (§3, not deleted per instruction); inert `pnpm` key (§2). |
| Generated code | 🟢 Green | All known generated-code sources (`routeTree.gen.ts`, `types.ts`, 4 mcp-js routes) correctly excluded from both linters, verified by individually removing each exclusion and measuring the exact contribution (§1). |
| Branch readiness | 🟢 Green | Zero code changes this sprint (`git status` clean throughout, §12); nothing in this audit found a defect requiring a code fix — every finding is either already-correct (stated explicitly per-part) or a documented, unexecuted recommendation. |
| Merge readiness | 🟢 Green | No new files touch Sprint 2.1's 19-file conflict list (this sprint wrote zero files to `src/` or any tracked file — verification only). |
| Production readiness | 🟡 Yellow | Everything this sandbox can verify is green; production-specific unknowns from earlier sprints (Sprint 2.0's Supabase-secrets hypothesis, the unpushed-commits situation) are unchanged and outside this sprint's scope. |

**Explicit "Verified. No change required." statements**, per the
sprint's own instruction to state this plainly wherever true:

- Generated-file exclusions (§1) — correct, evidenced by removal-testing.
- Toolchain version pinning (§2) — no mismatches.
- `tsconfig.json` / `tsconfig.test.json` split (§7) — deliberate, not
  duplicate work.
- CI concurrency/cancellation config (§7) — already correct.
- Prettier as sole formatting authority (§8) — no competing config at
  any layer.

**Recommendations carried forward (none executed this sprint):**
1. Decide `package-lock.json`'s fate — remove or document why it's
   kept (§3; also Sprint 2.2 §8 rec. #3).
2. Add `actions/cache` for Bun's install cache, keyed on
   `hashFiles('bun.lock')` (§7 — the one measurable CI improvement
   found).
3. Fix the 3 `?? []` unstable-default `useMemo` dependencies once a
   human reviews them (§6): `src/hooks/use-roles.tsx:59`,
   `src/routes/_authenticated/communication.tsx:141`,
   `src/routes/_authenticated/estimates/index.tsx:60`.
4. Review `NotificationsBell.tsx:40`'s `useMemo(() => new Date(),
   [items])` for intended staleness behavior (§6) — a product
   decision, not a mechanical fix.
5. Add `.vscode/extensions.json` + `.vscode/settings.json` +
   `.editorconfig` + a minimal `README.md` setup section +
   `package.json`'s `"engines"` field to close the onboarding gaps in
   §9.
6. Finish the Husky + lint-staged installation per Sprint 2.2 §4's
   exact commands (now additionally verified safe by direct
   reproduction in §4 of this document) and the refined `lint-staged`
   config in §5 (scoped to `src/**/*.{ts,tsx}` rather than a bare
   `*.md` glob, given the 18 non-compliant docs found in §5).

---

## §12 — Final state confirmation

```
$ git status --short
(empty)
$ git diff --stat
(empty)
```

No files were created, modified, or deleted in the working tree by this
sprint's investigation, other than this document itself. Every
temporary ignore-rule toggle used in §1 was reverted and independently
re-verified against both `git diff` and a fresh, byte-identical
`eslint .` output before the investigation moved on to its next
question.
