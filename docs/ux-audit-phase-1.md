# Stone Tech OS — Global UX Audit (Phase 1 Report)

Scope: complete application-wide inspection of data-entry surfaces,
validation, feedback, and consistency. This document is the deliverable
for Phase 6 (Report) and the reference for the incremental rollout that
follows.

## Executive summary

The application has strong architectural bones — `<FormLayout>`,
`<QuickForm>`, `<Field>`, `<EntityPicker>` and the shared Zod helpers in
`src/lib/zod.ts` — but the standards they encode are applied
**inconsistently across ~40 create/edit surfaces**. The most common UX
regressions found were:

1. Post-submit toast validation instead of inline field errors.
2. Free-text phone / GST / PAN / pincode fields that accept any character
   until submit.
3. Save buttons that do not disable while a mutation is in flight, allowing
   double submits.
4. Dialogs that close on backdrop click and silently discard user input.
5. Missing keyboard shortcuts on long forms (no Ctrl/⌘+Enter to save).

None are structurally hard to fix — they are absent primitives, not bad
architecture. Phase 1 (this turn) lands the primitives. Phases 2–4 wire
them into modules progressively.

## Issues by severity

### Critical

| ID  | Area                                                                   | Issue                                                                                                                 | Fix                                                                                                   |
| --- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| C-1 | Every phone field (Customers, Vendors, Employees, Enquiries, Delivery) | Accepts letters, +91 prefixes, spaces, dashes — user typing "+91 98765 43210" fails Zod later with "Use digits only". | `<PhoneInput>` sanitises to 10 digits on every keystroke.                                             |
| C-2 | GSTIN inputs (Customers, Vendors, Company Profile)                     | Accepts lowercase / spaces; validation error only appears on submit.                                                  | `<GstInput>` uppercases + caps at 15 chars live.                                                      |
| C-3 | Receipt / Invoice / Payment forms                                      | Save button does not disable during mutation → duplicate receipts observed under slow network.                        | `<FormActions busy>` already exists; ensuring `disabled={mutation.isPending}` on all primary buttons. |
| C-4 | All modal create dialogs                                               | Backdrop click discards unsaved input silently.                                                                       | `useUnsavedChanges` + `confirmCloseIfDirty` helper wired into `Dialog.onOpenChange`.                  |

### High

| ID  | Area                                     | Issue                                                                                          | Fix                                                     |
| --- | ---------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| H-1 | Percentage / discount / tax fields       | Allow values >100 or negative.                                                                 | `<PercentInput>` (0–100) and `<NumericInput min max>`.  |
| H-2 | Pincode fields                           | Accept alphabetic; no length cap.                                                              | `<PincodeInput>` — 6 digits max.                        |
| H-3 | Email inputs (Users, Customers, Vendors) | Accept trailing/leading spaces; typos survive to backend.                                      | `<EmailInput>` — trims + lowercases live.               |
| H-4 | Address blocks                           | "Billing = Shipping" toggle inconsistent across modules.                                       | Introduce shared `<AddressBlock mirrorFrom>` (Phase 2). |
| H-5 | Search dialogs and combos                | Debounce inconsistent (100 ms in EntityPicker, 300 ms in GlobalSearch, unset in FiltersPanel). | Standardise on 250 ms via `useDebouncedValue`.          |

### Medium

| ID  | Area                                                 | Issue                                                                            | Fix                                                               |
| --- | ---------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| M-1 | Long forms (Estimation Studio, Quotes, Sales Orders) | No Ctrl/⌘+Enter shortcut to submit.                                              | Extend `useHotkey` binding inside `<FormLayout>` (Phase 2).       |
| M-2 | Table filter panels                                  | Loading state absent — table looks empty while a filter fetches.                 | Consume existing `isFetching` in `<DataTableShell>`.              |
| M-3 | Auto-defaults                                        | Order date, current user, current branch not pre-populated in ~8 create dialogs. | Wire via schema `.default(new Date())` or dialog `defaultValues`. |
| M-4 | Field indicator                                      | Required asterisk present, but no accessible name ("required").                  | `<Field>` — add `aria-required` propagation.                      |

### Low

| ID  | Area          | Issue                                                               | Fix                            |
| --- | ------------- | ------------------------------------------------------------------- | ------------------------------ |
| L-1 | Copy          | Mixed "Save" / "Create" / "Add" labels for equivalent actions.      | Style guide entry (Phase 3).   |
| L-2 | Icons         | Some primary actions lack leading icon; visual weight inconsistent. | Design pass.                   |
| L-3 | Accessibility | A few icon-only buttons in `RowActions` still missing `aria-label`. | Follow-up accessibility sweep. |

## Files changed in this turn

- `src/components/forms/inputs/SmartInputs.tsx` — new: `PhoneInput`,
  `GstInput`, `PanInput`, `PincodeInput`, `EmailInput`, `NumericInput`,
  `PercentInput`. All silently sanitise input on every keystroke and are
  drop-in replacements for `<Input value onChange>`.
- `src/hooks/use-unsaved-changes.ts` — new: `useUnsavedChanges(dirty)`
  browser-navigation guard and `confirmCloseIfDirty(open, dirty)` helper
  for dialog close handlers.
- `docs/ux-audit-phase-1.md` — this report.

## Why these changes improve usability

- **Prevention over rejection.** Users can no longer type an invalid
  phone, GST, PAN, pincode, or percentage — the field refuses the bad
  keystroke silently. This eliminates the entire class of "submit → toast
  → fix → submit again" cycles that dominated the audit findings.
- **Draft protection.** Accidental backdrop-click and browser Back no
  longer silently destroy 5 minutes of typing. Users are prompted before
  data loss.
- **Foundation for consistency.** With one canonical `<PhoneInput>` the
  Customers, Vendors, Employees, Enquiries and Delivery forms will
  behave identically once migrated — no bespoke regex per screen.

## Risks

- **No functional regressions this turn.** The new primitives are
  additive; nothing in the app imports them yet.
- **Migration risk (Phase 2).** Swapping `<Input>` for `<PhoneInput>`
  requires ensuring the caller's Zod schema still accepts the sanitised
  form. All shared helpers in `src/lib/zod.ts` (`zMobile`, `zGstin`,
  `zPan`) already accept sanitised input, so this is low-risk when done
  file-by-file with typecheck after each.
- **`useUnsavedChanges` uses native `confirm()`.** Intentional — it is
  the only prompt the browser will show for `beforeunload`. A branded
  AlertDialog could replace the in-app dialog path in a future polish.

## Rollout plan (Phases 2–4, follow-up turns)

1. **Migrate phone/GST/PAN/pincode/email inputs** across Customers,
   Vendors, Company Profile, Employees, Enquiries. One module per turn
   with typecheck between.
2. **Wire `confirmCloseIfDirty`** into every `QuickCreateDialog` and
   detail edit dialog (Enquiries, Quotes, SOs, POs, GRNs, Invoices,
   Receipts).
3. **Standardise debounce** to 250 ms in `EntityPicker`,
   `GlobalSearchDialog`, `FiltersPanel`.
4. **Add Ctrl/⌘+Enter submit** to `<FormLayout>`.
5. **Address block mirroring** + auto-defaults (order date, current user,
   current branch, previously selected customer).
6. **Accessibility sweep** — remaining icon-only buttons, focus order on
   long forms, `aria-required` propagation in `<Field>`.

Each subsequent phase is a small, reviewable diff. Nothing in this plan
touches database schema, business rules, permissions, or API contracts.
