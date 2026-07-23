# Sprint 2.1 — Integration Readiness: `feature/vie-quotation` → `main`

**Scope:** prepare this branch for review and merge. No code changed —
this is a review/merge-planning document only, built on the branch
divergence findings from the Sprint 1.8 audit and the conflict analysis
from Sprint 1.9 Milestone 5, refreshed and completed here.

Merge-base with `origin/main`: `24174f0` ("Added form primitives").
Branch head: `f3756c0`. 16 commits, 99 files changed, +12,140/-492 lines.

---

## 1. Complete commit list

Oldest to newest (the order they'd replay in a merge):

| Commit | Date | Subject |
|---|---|---|
| `7845a4b` | 2026-07-21 | Bring create_quotation Milestones 2-6 into version control |
| `547dc02` | 2026-07-22 | Sprint 1.7: Authentication Foundation, Super Admin architecture, platform branding |
| `db54d28` | 2026-07-22 | Sprint 1.7.1: Platform Hardening & Architecture Corrections |
| `169a159` | 2026-07-22 | Sprint 1.8: MasterListPage standardization |
| `dfc45b1` | 2026-07-22 | Add AI Copilot v2 (Vedora Intelligence Platform) architecture blueprint |
| `b45ecc7` | 2026-07-22 | Sprint AI-1: wire Copilot chat panel to VIE |
| `6843dab` | 2026-07-22 | Sprint AI-1.5: structured Planner blockers & UI rendering |
| `f8665e1` | 2026-07-22 | Sprint AI-1.6: generic Entity Resolution Framework |
| `e267c03` | 2026-07-23 | Sprint 1.8: platform stabilization audit (Git/Supabase/Cloudflare/Lovable) |
| `fbf5058` | 2026-07-23 | Sprint 1.9 Milestone 1: give the Users & Roles server-config error a real UI |
| `c1911e4` | 2026-07-23 | Sprint 1.9 Milestone 2: verify Supabase server integration (no defects found) |
| `15a620f` | 2026-07-23 | Sprint 1.9 Milestone 3: fix workforce-daily cron auth, align Cloudflare config |
| `6d91071` | 2026-07-23 | Sprint 1.9 Milestone 4: stop CI's known lint debt from masking real regressions |
| `8c0349c` | 2026-07-23 | Sprint 1.9 Milestone 5: corrected branch-conflict analysis, merge deliberately not attempted |
| `868c37d` | 2026-07-23 | Sprint 1.9 Milestone 6: source-of-truth checklist + final sprint report |
| `f3756c0` | 2026-07-23 | Sprint 2.0: trace Users & Roles production failure, add env-status diagnostic |

None of these 16 are pushed to `origin/feature/vie-quotation` (which sits
at `e50995d`, 22 commits behind — see Sprint 1.8 audit) or present on
`origin/main`.

---

## 2. Summary of every functional change

**`7845a4b` — create_quotation Milestones 2-6.** The base VIE
quotation-creation capability this whole branch builds on: entity
resolution scaffolding, planner wiring, and the underlying
`create_quotation` action. Predates this engagement's own sprint
numbering.

**`547dc02` — Sprint 1.7, Authentication Foundation.** Introduces the
`super_admin` role and Platform Super Admin concept, Admin/Super Admin
permission matrix (`src/lib/admin/permissions.ts`), server-side
`requireAdminOrSuperAdmin` helper, forced-password-change flow (invite
without email, admin-set passwords), audit logging for user/role/password
events, and the Vedora Vision (Platform) / Stone Tech OS (Product)
branding split. Largest single functional commit in the branch.

**`db54d28` — Sprint 1.7.1, Platform Hardening.** Corrections found in a
post-1.7 audit: Super Admin immutability (can't be deleted/deactivated/
stripped of role, enforced both in a DB trigger and in application code),
`has_role`/`has_any_role` extended so Super Admin inherits Admin checks
everywhere (fixing ~20+ RLS policies and call sites that previously locked
the Super Admin out), consolidated the duplicated admin-role-check logic
into one shared helper.

**`169a159` — Sprint 1.8, MasterListPage standardization.** Audited every
master-data screen, extracted duplicated search/pagination state
(`useListPageState`, `pageSlice`) into shared hooks, added `boolean` field
support and a `writeRoles` extension point to `MasterConfig`, fixed two
real UI/RLS permission mismatches (Installation Teams, Message Templates
were rendering write buttons for roles the database already rejected),
centralized two stray hardcoded brand strings.

**`dfc45b1` — AI Copilot v2 blueprint.** Documentation only — no code. An
architecture proposal for a future "Vedora Intelligence Platform" (voice,
multilingual, BI). Not implemented by this branch; informs later VIE work.

**`b45ecc7` — Sprint AI-1.** Wires the existing Copilot chat panel UI to
the VIE server functions (`understandAndStage`, `confirmVieAction`,
`completeDraftAction`) for the first time — previously the panel existed
but wasn't connected to the planner/executor pipeline. Adds
`VieActionCard.tsx` for rendering draft actions/blockers in-chat.

**`6843dab` — Sprint AI-1.5.** Converts every planner resolver's ad hoc
string/inline blockers into structured `PlannerBlocker` objects
(`type`, `field`, candidates, confidence) so the UI can render
type-specific affordances instead of parsing free text.

**`f8665e1` — Sprint AI-1.6.** Extracts the common entity-resolution
pattern (search, classify zero/one/many matches, build the right blocker
shape) duplicated across 5 resolvers into a shared framework
(`entityResolution.ts`); each resolver becomes a thin adapter. Verified
byte-identical `PlannerBlocker` output before/after via the full existing
test suite.

**`e267c03` — Sprint 1.8 platform audit.** Documentation only. Diagnosed
(did not fix) the git/Supabase/Cloudflare/Lovable divergence this
document is the eventual resolution of.

**`fbf5058` — Sprint 1.9 M1.** The one functional fix in Sprint 1.9:
`parseMissingSupabaseEnvError()` + `ServerConfigurationErrorState`
component, wired into `admin/users.tsx` so the reported production bug's
error surfaces as a real UI state instead of raw error text.

**`c1911e4` — Sprint 1.9 M2.** Verification only, no functional change.

**`15a620f` — Sprint 1.9 M3.** Functional fix: `workforce-daily.ts`'s
cron endpoint didn't implement its documented auth contract (accepted any
header value, never validated a secret, swallowed both write errors) —
rewritten to match `customer-payment-reminders.ts`'s correct pattern.
Both cron endpoints now accept either `CRON_SECRET` or
`CRON_SHARED_SECRET`. `wrangler.jsonc` gained the `nodejs_compat` flag.

**`6d91071` — Sprint 1.9 M4.** CI-only change: `continue-on-error` on the
Lint step so pre-existing lint debt stops blocking Typecheck/Test/Build
from ever running.

**`8c0349c` — Sprint 1.9 M5.** Documentation only — the conflict analysis
this document (§4/§5) builds on and completes.

**`868c37d` — Sprint 1.9 M6.** Documentation only.

**`f3756c0` — Sprint 2.0.** Adds
`/api/public/diagnostics/env-status`, an unauthenticated read-only
endpoint reporting boolean presence (never values) of the server-side
Supabase/cron/AI-gateway env vars, for diagnosing the Users & Roles
production failure without dashboard access.

---

## 3. Files changed by category

99 files total (+12,140/-492).

| Category | Count | Notable paths |
|---|---:|---|
| VIE / AI planner & actions (`src/lib/vie/**`) | 33 | `planner/entityResolution.ts` (new framework), `planner/index.ts`, `types.ts`, `prompts.ts`, `understand.ts`, `vie.functions.ts`, `actions/createQuotation.ts`, plus matching `*.test.ts` for each |
| Docs (`docs/**`) | 15 | All new — completion reports and architecture docs for every sprint in this list |
| Routes (`src/routes/**`) | 12 | `admin/users.tsx`, `__root.tsx`, `route.tsx`, `settings.tsx`, `auth.tsx`, `installation-teams/index.tsx`, `message-templates.tsx`, `products/index.tsx`, 4 `api/public/**` hook/diagnostic routes, `routeTree.gen.ts` (generated) |
| Components (`src/components/**`) | 10 | `AppShell.tsx`, `Copilot.tsx`, `MasterListPage.tsx`, `VieActionCard.tsx` (new), `ConfigurationRequiredScreen.tsx` (new), `ServerConfigurationErrorState.tsx` (new), 4 dialog components with minor edits |
| Migrations (`supabase/migrations/**`) | 6 | All new — Sprint 1.7/1.7.1's Super Admin role, bootstrap, protection trigger, `has_role` inheritance, audit columns |
| Admin/permissions (`src/lib/admin/**`) | 6 | `permissions.ts` (new), `server-auth.ts` (new), `users.functions.ts`, `users.ts`, plus tests |
| Platform/env (`src/lib/platform/**`, `src/lib/env/**`) | 4 | `application.ts`, `platform.ts` (new — branding constants), `config-status.ts` (new), plus test |
| Other `src/lib/**` (masters, notifications, lists, audit, errors) | 9 | `masters/config.ts`, `notifications/dispatch.functions.ts`, `lists/paginate.ts` (new), `audit/user-agent.ts` (new), `errors.ts` |
| Integrations (`src/integrations/supabase/**`) | 2 | `client.ts`, `types.ts` |
| Hooks (`src/hooks/**`) | 2 | `use-list-page-state.ts` (new), `use-roles.tsx` |
| Config/tooling | 4 | `.github/workflows/ci.yml`, `wrangler.jsonc`, `vite.config.ts`, `routeTree.gen.ts` |

---

## 4. High-risk merge conflicts

A non-destructive `git merge-tree` analysis (recomputed fresh for this
report — unchanged from Sprint 1.9 Milestone 5's finding, confirming
Milestones 6 and Sprint 2.0's later commits didn't touch any additional
shared files) finds **19 files** with real overlapping changes between
this branch and `origin/main`. Grouped by what actually makes each one
risky, with the evidence behind each grouping:

### Group A — One product decision away from trivial (6 files)

`AppShell.tsx`, `Copilot.tsx`, `route.tsx`, `settings.tsx`, `__root.tsx`,
`auth.tsx`. All 6 conflicts in this group trace to the same single cause:
`origin/main` carries a "STOS + Vedora Vision" rebrand (hardcoded
"Stone Tech OS" → "STOS", new SEO meta description/title mentioning
"Vedora Vision") that this branch doesn't have, while this branch's own
Sprint 1.7/1.8 work centralized the equivalent strings onto an
`APPLICATION_NAME`/`POWERED_BY_LINE` constant pair instead. Sampled 4 of
the 6 directly (`AppShell.tsx`, `Copilot.tsx`, `__root.tsx`, `auth.tsx`)
and confirmed: in every one, the branding-text lines and this branch's own
functional changes sit on **different, non-overlapping lines** — a real
3-way merge is very likely to apply both cleanly at the text level. What
isn't trivial is the *content* decision: is the product now called "STOS"
(as already shipped in 4+ places on `main`), or does the
`APPLICATION_NAME` constant need updating to match? That has to be decided
once, explicitly, and applied consistently — not resolved file-by-file
during a merge, or the result ships an inconsistent brand name across the
app. `AppShell.tsx` additionally carries **real, independent bug fixes
this branch doesn't have at all** and must not lose: a mobile
double-scroll-region fix (`NavList`'s `scrollable` prop) and an `h-dvh` →
`h-screen` fallback fix with a documented production bug
("footer/banner merged with page content" on browsers that drop the whole
`height` value when they don't recognize `dvh`).

### Group B — VIE planner internals, likely low risk but unverified per-file (7 files)

`planner/index.ts`, `planner/index.test.ts`, `types.ts`, `prompts.ts`,
`resolveProject.ts`, `resolveProject.test.ts`, plus 3 more resolver test
files (`resolveCustomer.test.ts`, `resolveCustomerDuplicate.test.ts`,
`resolveFollowupTarget.test.ts`). Sampled `resolveProject.ts` and
`planner/index.ts` directly: `origin/main`'s versions are not independent
implementations — they're provably **earlier snapshots of this branch's
own work** (same function set, same docstrings, `resolveProject.ts`'s
`origin/main` version still uses the pre-Sprint-AI-1.5 inline
`blocker: string | null` shape this branch replaced with structured
`PlannerBlocker`s). Consistent with the Sprint 1.8 audit's separate
finding of a byte-identical commit shared by both lineages via an
`import/vie-foundation` PR — `main` imported a pre-AI-1.5/1.6 snapshot of
this same VIE work and never received this branch's later refinement.
**This branch's version is the very likely correct choice for this whole
group**, but only 2 of the 7 files were read in enough depth to confirm
that hypothesis directly — the other 5 (`types.ts`, `prompts.ts`, and 3
test files) should each get a quick confirming read before assuming the
same pattern holds, rather than taking it on faith.

### Group C — Genuinely unresolved, needs dedicated review (3 files)

`admin/users.tsx`, `installation-teams/index.tsx`,
`message-templates.tsx`. `admin/users.tsx` was sampled directly for this
report: `origin/main`'s version is a real, independent UI refactor
(converts the invite form and loading/empty states to shared
`QuickForm`/`Field`/`LoadingBlock`/`EmptyState` components this branch
doesn't use there) that lands on **lines immediately adjacent to** this
branch's own Sprint 1.9 M1 fix (the `error ? (...) : ...` ternary chain —
`origin/main` changes the `isLoading`/empty-state branches around it,
this branch inserts a new branch right at the `error ?` line). Adjacent-line
edits in the same conditional chain are exactly the shape of conflict a
line-based 3-way merge handles worst — expect a real, textual merge
conflict here, not a clean auto-resolve, and the reconciliation needs to
keep both: `origin/main`'s `QuickForm`/`LoadingBlock` refactor *and* this
branch's `ServerConfigurationErrorState` branch. `installation-teams/index.tsx`
and `message-templates.tsx` were not sampled in this pass (both show
substantial changes on both sides per Sprint 1.9 M5's diff-size check —
34-61 lines changed on this branch's side, 55-72 on `main`'s) — flagged as
needing the same kind of direct read `admin/users.tsx` got before this
group can be resolved.

### Group D — Small, additive, non-overlapping (1 file)

`MasterListPage.tsx`. `origin/main`'s side is a 4-line addition
(wraps the search query through a new `sanitizeSearch()` before building
the filter) that doesn't touch any line this branch's own Sprint 1.8
standardization work touched. Genuinely low risk — included in the
high-risk list only because `git merge-tree` flagged it as "changed in
both," not because sampling found anything concerning.

---

## 5. Low-risk automatic merges

**80 of the 99 changed files have zero overlap with anything `origin/main`
changed** — every VIE action/resolver file not listed in §4, every new
file (`entityResolution.ts`, `permissions.ts`, `server-auth.ts`,
`config-status.ts`, `platform.ts`/`application.ts`,
`use-list-page-state.ts`, `paginate.ts`, `user-agent.ts`,
`VieActionCard.tsx`, `env-status.ts`, all 6 migrations, all 15 docs, every
test file not tied to a Group B/C conflict), and every file this branch
modified that `main` never touched at all (`errors.ts`,
`dispatch.functions.ts`, `masters/config.ts`, `use-roles.tsx`,
`client.ts`, `types.ts` in `integrations/supabase`, the 4 dialog
components, `products/index.tsx`, `dispatch-queue.ts`,
`customer-payment-reminders.ts`). These merge cleanly by construction — a
standard `git merge` will apply them with no conflict markers, since
`main`'s tree has no competing change to reconcile against.

Separately, `origin/main` itself has **9 files this branch doesn't have at
all** (net-new on `main`'s side) and **2 files `main` removed** that this
branch still has — neither is a conflict, both just need the merge to
bring `main`'s side across untouched.

---

## 6. Rollback strategy

Three independent layers, since a bad merge could surface at the code
level, the deployment level, or the database level:

**Git level.** Merge via a single merge commit (not a fast-forward, not a
squash) so the entire integration is one revertible unit:
`git revert -m 1 <merge-commit-sha>` cleanly undoes it if a regression
surfaces post-merge, without needing to reconstruct which of the 16
original commits caused it. Do this *before* attempting any conflict
resolution by rebase — a rebase rewrites the 16 commits' hashes, which
would invalidate every commit reference in this document and in the three
prior sprint reports that cite them by hash.

**Deployment level.** Per `docs/DEPLOYMENT.md`'s Rollback section:
Lovable's Backend → Deployments → previous build → **Rollback** reverts
the live Worker to the pre-merge build independently of what's on GitHub
— the fastest path to stop user-facing impact while the git-level revert
is prepared, if the two are done out of order.

**Database level.** All 6 new migrations in this branch (Sprint 1.7/1.7.1
— Super Admin role, bootstrap, protection trigger, `has_role` inheritance,
audit columns) are additive per this project's forward-only migration
policy — none of them are destructive (no dropped columns/tables), so a
code-level rollback does not strand the database in a broken state; the
new `super_admin` role and its supporting columns/trigger simply go
unused if the code that exercises them is rolled back. No down-migration
is needed or provided, consistent with existing project policy. The one
thing to verify *before* merging (not after) is whether `origin/main`'s
one migration (found in the Sprint 1.8 audit, an RLS policy fix this
branch doesn't have) needs to run before or after this branch's 6 —
migration *order* matters even when none of them are individually
destructive.

---

## 7. Pull request description

```markdown
## Summary

Merges `feature/vie-quotation` into `main` — 16 commits spanning
Authentication Foundation (Super Admin role + permission matrix), the VIE
quotation-creation planner and its Entity Resolution Framework, Copilot
wiring, MasterListPage standardization, and three platform-stabilization
sprints (1.8 audit, 1.9 fixes, 2.0 production-recovery diagnostics).

Full commit-by-commit summary, file-by-file conflict risk assessment, and
rollback plan: `docs/sprint-2.1-integration-readiness.md`.

## What this branch fixes that's currently broken on `main`

- Production bug: Users & Roles fails with a raw "Missing Supabase
  environment variable(s)" error instead of a real UI state (root-caused
  and partially fixed — the remaining piece is a Lovable Cloud secrets
  configuration, not code: see `docs/sprint-2.0-production-recovery.md`).
- `workforce-daily`'s cron endpoint never implemented its own documented
  auth contract and silently discarded write errors — likely never ran
  successfully in production.
- CI has been unable to reach its Test/Build steps on any commit since
  2026-07-18 because pre-existing lint debt blocked the pipeline before
  it got there.

## Merge conflicts to expect

19 files show real overlapping changes with `main` — **not** a
fast-forward or trivial merge. Full risk breakdown in
`docs/sprint-2.1-integration-readiness.md` §4-5. Headline items:

- A branding decision needs to be made once before merging 6 files
  (`AppShell.tsx`, `Copilot.tsx`, `__root.tsx`, `auth.tsx`, `route.tsx`,
  `settings.tsx`): is the product "STOS" (already shipped on `main`) or
  does this branch's `APPLICATION_NAME` constant need updating to match?
- `AppShell.tsx` also carries real bug fixes from `main` (mobile
  double-scroll-region, `h-dvh` fallback) that must be kept, not
  discarded in favor of this branch's version.
- `admin/users.tsx` has adjacent-line changes on both sides in the same
  conditional chain — expect a real textual conflict, not an auto-resolve.
- 7 VIE planner files are very likely safe to resolve in this branch's
  favor (evidence: `main`'s side is a provably earlier snapshot of the
  same work) but each should get a quick confirming read first.

## Database migrations

6 new migrations (Super Admin role, bootstrap, protection trigger, role
inheritance, audit columns) — all additive, no destructive changes.
Confirm ordering against `main`'s 1 migration (an RLS policy fix) before
merging; see §6.

## Testing

323 tests passing on this branch as of `f3756c0`. Full
typecheck/typecheck:tests/eslint/build all green on every commit in this
branch (each Sprint 1.9/2.0 milestone commit includes its own
verification run). Post-merge, re-run the full suite against the merged
tree — neither lineage's tests were written with the other's changes in
mind, so a clean merge does not guarantee the *combination* is correct;
see the verification checklist below.

## Rollback

See `docs/sprint-2.1-integration-readiness.md` §6 — git revert of the
merge commit, Lovable's deployment Rollback, and confirmation that all 6
new migrations are additive-only (no down-migration needed).
```

---

## 8. Post-merge verification checklist

**Immediately after merging, before publishing:**

- [ ] `npm run typecheck` — clean
- [ ] `npm run typecheck:tests` — clean
- [ ] `npm run lint` — compare against the pre-merge 7,409-issue baseline
      (`docs/CI_LINT_DEBT.md`); confirm no *new* issues beyond whatever
      `origin/main`'s own pre-existing debt contributes
- [ ] `bun test` — full suite passes; specifically re-check every test
      file in Group B (§4) since those are the files most likely to have
      test expectations that shifted during conflict resolution
- [ ] `npm run build` — succeeds; confirm the generated
      `.output/server/wrangler.json` still includes `nodejs_compat`
      (Sprint 1.9 M3) and that `/api/public/diagnostics/env-status`
      appears in the built route manifest (Sprint 2.0)
- [ ] Manual read of the resolved `AppShell.tsx` — confirm the mobile
      scroll-region fix and `h-dvh` fallback from `main` both survived,
      and that the branding text is consistent with whatever the STOS
      decision (§4 Group A) landed on
- [ ] Manual read of the resolved `admin/users.tsx` — confirm the
      `ServerConfigurationErrorState` branch and the `QuickForm`/
      `LoadingBlock`/`EmptyState` refactor both survived

**Before/during the Supabase migration step:**

- [ ] Confirm migration ordering between `main`'s 1 migration and this
      branch's 6 (§6) — apply in an order that doesn't assume a
      column/table exists before its own migration creates it
- [ ] Run `verify:auth-context` (`npm run verify:auth-context`) — confirms
      every data-access module uses the authenticated-aware client, not
      the anon singleton, post-merge

**Post-publish, in production:**

- [ ] `curl https://erp.stonetech.in/api/public/diagnostics/env-status` —
      per Sprint 2.0, this is the fastest way to confirm the deploy
      actually went out and to check the still-open Users & Roles secrets
      question in one request
- [ ] Sign in as Admin and as the Platform Super Admin (if provisioned) —
      confirm Users & Roles loads, "Add user" works, and the Super Admin
      protection rules (can't be deleted/deactivated/stripped) hold
- [ ] Exercise one `requireSupabaseAuth`-gated feature outside Users &
      Roles (Copilot chat, or create a quotation via VIE) — per Sprint
      2.0's root-cause analysis, if the underlying secrets gap is still
      unresolved, this should fail identically; if it succeeds while
      Users & Roles still fails, that's new information contradicting
      Sprint 2.0's hypothesis and needs its own investigation
- [ ] Confirm the two cron endpoints (`customer-payment-reminders`,
      `workforce-daily`) are configured with the shared secret
      (`CRON_SECRET` or `CRON_SHARED_SECRET`) and return `200` on a
      manual trigger, not `401`
- [ ] Watch GitHub Actions on the merge commit — confirm `Typecheck`,
      `Typecheck tests`, `Verify auth context`, `Run tests`, and `Build`
      all report (Lint is expected to still show its pre-existing debt,
      non-blocking per Sprint 1.9 M4)
- [ ] Re-run the Sprint 1.8-style platform audit's git section (branch/
      divergence check) once more — confirm `main` and this work are now
      a single lineage, not two, closing out the original premise of this
      whole sprint sequence
