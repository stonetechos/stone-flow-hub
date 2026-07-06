
# Workflow Integration & Data Synchronization Pass

Goal: make Stone Tech OS behave like one connected ERP. No page refreshes, no duplicate records, no re-entering known context, no missing dropdown entries.

Nothing in this pass changes existing UI beyond replacing today's `<Select>` selectors with a richer picker of the same visual weight. No new modules. No security changes.

---

## 1. Shared `EntityPicker` (SmartSearch)

New primitive at `src/components/forms/EntityPicker.tsx`.

Public API (stable so Contacts / Tags can migrate later without changes):

```ts
<EntityPicker
  entity="customer" | "project" | "vendor" | "product"
  value={id | null}
  onChange={(id, row) => …}
  disabled?
  required?
  placeholder?
  filter?: (row) => boolean         // e.g. projects by customer_id
  allowClear?
  allowQuickCreate?                 // default true; hides if user lacks role
  quickCreateContext?: Partial<CreateInput>   // seed values for QuickCreate
/>
```

Behavior:
- Popover + `cmdk` command list (matches GlobalSearchDialog styling).
- Debounced remote search (250ms) via existing `listCustomers / listVendors / listProducts / listProjectsForPicker` — no new backend API.
- Search fields:
  - Customer: `name`, `email`, `phone`, `gst_number`, `customer_code`.
  - Vendor: `name`, `email`, `phone`, `gst_number`, `vendor_code`.
  - Project: `name`, `project_code`, `site_address`, customer name.
  - Product: `name`, `product_code`, `hsn_code`.
- Recently-used items (top 5) from `src/lib/recent/store.ts` filtered to the picker's entity type. New store method `listRecent(entityType)`.
- Full keyboard nav: Arrow up/down, Enter selects, Esc closes, `/` focuses filter, `Ctrl+N` triggers Quick Create.
- Empty state renders a `+ Create <entity> "query"` row that opens the inline QuickCreate dialog with the search string pre-filled as `name`.
- On successful create: dialog closes, `onChange(newRow.id, newRow)` fires, related list query gets `invalidateQueries`, parent form retains all other state (dialog is portalled, so the parent form does not remount).

Backend list queries need one column widening to support the extra search fields:

- `listCustomers(query)` → also `.or(...)` on `email`, `phone`, `gst_number`, `customer_code`.
- `listVendors(query)` → same.
- `listProducts(query)` → also `product_code`, `hsn_code`.
- `listProjectsForPicker(query, opts?)` → accept optional `customerId` filter and search `project_code`.

No RLS or schema changes — these are additional `ilike` filters only.

## 2. Inline QuickCreate

New primitive at `src/components/forms/QuickCreateDialog.tsx` used by `EntityPicker` and directly reusable:

```tsx
<QuickCreateDialog
  entity="customer" | "vendor" | "project" | "product"
  open onOpenChange
  defaults={{...}}
  onCreated={(row) => …}
/>
```

Under the hood it renders the smallest possible form for each entity (same `QuickForm.QuickFill` fields the "New …" pages use for their Quick Fill zone) and calls the existing `createCustomer / createVendor / createProject / createProduct`. On success it invalidates the entity's list keys and calls `onCreated`, which lets the picker auto-select the row.

Existing "New …" full pages continue to work unchanged for the "Advanced" flows.

## 3. Follow-ups → Polymorphic

Migration (schema only — the underlying `entity_type` / `entity_id` idea):

```sql
ALTER TABLE public.followups
  ADD COLUMN IF NOT EXISTS entity_type text
    CHECK (entity_type IN ('customer','project','enquiry','vendor','rfq','purchase_order','dispatch')),
  ADD COLUMN IF NOT EXISTS entity_id uuid;

-- Backfill existing rows (all today's rows belong to an enquiry)
UPDATE public.followups
   SET entity_type = 'enquiry', entity_id = enquiry_id
 WHERE entity_type IS NULL AND enquiry_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS followups_entity_idx
  ON public.followups (entity_type, entity_id, scheduled_at DESC);
```

`enquiry_id`, `project_id`, `customer_id` columns stay in place — new inserts keep them populated as **derived context** (denormalized for query performance / RLS) but the primary link is `entity_type`+`entity_id`. On insert, the API derives project/customer/vendor from the chosen entity so timelines can aggregate without extra joins.

- `followupCreateSchema` → replace `enquiry_id` with `entity_type` + `entity_id`; derivation happens in `createFollowup`.
- `listFollowups` gains an `entity?: { type, id }` filter used by Project Hub, Customer detail, Vendor detail, Enquiry detail timeline panels (which today read only enquiry-scoped follow-ups).
- Existing `listFollowupsForEnquiry` stays as a thin wrapper.

RLS: policy stays staff-only from the earlier hardening pass, no change needed.

## 4. Centralized query keys + surgical invalidation

New file `src/lib/query-invalidation.ts` exports one function per master entity:

```ts
export function invalidateCustomer(qc, id?: string) {
  qc.invalidateQueries({ queryKey: qk.customers.all });
  if (id) qc.invalidateQueries({ queryKey: qk.customers.byId(id) });
  // downstream selectors that filter by customer
  qc.invalidateQueries({ queryKey: ["projects", "byCustomer", id] }, { exact: false });
  qc.invalidateQueries({ queryKey: qk.search.global(""), }, { exact: false });
}
// invalidateProject, invalidateVendor, invalidateProduct, invalidateEnquiry,
// invalidateRfq, invalidatePurchaseOrder, invalidateQuote, invalidateFollowup, …
```

Every mutation in the app (audited during this pass) uses these helpers instead of ad-hoc `invalidateQueries`. This gives us one place to add a downstream key when a new selector uses one.

Add missing keys to `qk`:
- `qk.followups.byEntity(type, id)`
- `qk.followups.list(filters)` (replaces the current three-scope helper; keep old helper as a wrapper for one release)
- `qk.recent(entityType)` (client-only, for EntityPicker recents)

## 5. Cross-form context propagation

Every `_authenticated/*/new.tsx` route already accepts URL search params. Standardize the propagation using `validateSearch` + Zod so the target form pre-selects the known entity and locks it read-only (with a "change" affordance):

| From                    | To                       | Passed params                                    |
| ----------------------- | ------------------------ | ------------------------------------------------ |
| Customer detail         | `/projects/new`          | `customerId`                                     |
| Customer detail         | `/enquiries/new`         | `customerId`                                     |
| Project detail          | `/enquiries/new`         | `projectId`, `customerId`                        |
| Project detail          | `/quotes/new`            | `projectId`, `customerId`                        |
| Enquiry detail          | `/rfqs/…` (existing)     | already handled                                  |
| Enquiry detail          | `/quotes/new`            | `enquiryId`, `projectId`, `customerId`           |
| RFQ / vendor quote      | `/purchase-orders/new`   | `vendorId`, `vendorQuoteId`, `projectId`, `enquiryId` |
| PO detail               | `/dispatch/new`          | `poId`, `vendorId`, `projectId`                  |
| Dispatch detail         | `/invoices/new`          | `dispatchId`, `salesOrderId`, `projectId`, `customerId` |
| Quote detail (approved) | `/invoices/new`          | `quoteId`, `projectId`, `customerId`             |
| Sales order detail      | `/dispatch/new`          | `salesOrderId`, `projectId`, `customerId`        |

Only wire up the ones missing today; the ones already implemented from Milestones 3/4 stay.

## 6. Selectors migrated in this pass (Option 2)

High-traffic forms only:

- `enquiries/index.tsx` – customer, project filters
- `enquiries/$enquiryId.tsx` – project change
- `projects/index.tsx` – customer filter + new-project customer
- `projects/$projectId.tsx` – customer change
- `quotes/new.tsx` + `quotes/$quoteId.edit.tsx` – customer, project
- `sales-orders/new.tsx` + edit – customer, project
- `purchase-orders/new.tsx` + edit + `index.tsx` – vendor, project
- `invoices/new.tsx` + edit + `index.tsx` – customer, project
- `dispatch/new.tsx` + edit + `index.tsx` – sales-order, vendor
- `payments/new.tsx` + edit – invoice, customer
- `followups/index.tsx` – entity picker (new polymorphic UI)
- `inventory/new.tsx` + edit – product

Leave alone in this pass (open as needed):
- Admin Users role selector (`<Select>` is fine — fixed enum).
- Documents filter selects (enum filters).
- Status / priority / channel selects across the app (enums).

## 7. Verification workflow

Playwright script that runs end-to-end using the injected admin session:

1. Create Customer → confirm shows in Customers list without reload.
2. From that customer, click "New project" → customer pre-selected & locked.
3. From that project, "New enquiry" → project + customer pre-selected.
4. From enquiry, send RFQ to a vendor → RFQ visible on Enquiry.
5. As vendor (fresh context, seeded vendor user) submit a vendor quote → visible in Quote Comparison.
6. Approve vendor quote → convert to PO from that vendor quote → vendor + project + quote pre-selected.
7. Return to first customer detail → see the whole chain in the timeline.

Screenshots at each step land under `/tmp/browser/workflow/`.

---

## Technical layout

```text
src/
  components/
    forms/
      EntityPicker.tsx            (new)
      QuickCreateDialog.tsx       (new)
      pickers/
        CustomerPicker.tsx        (thin wrapper)
        ProjectPicker.tsx
        VendorPicker.tsx
        ProductPicker.tsx
  lib/
    query-keys.ts                 (extended)
    query-invalidation.ts         (new)
    recent/store.ts               (add entityType filter)
    followups/
      api.ts                      (polymorphic filters + create derivation)
      schema.ts                   (entity_type/entity_id fields)
    customers/api.ts              (widen listCustomers search columns)
    vendors/api.ts                (widen listVendors search columns)
    products/api.ts               (widen listProducts search columns)
    projects/api.ts               (add search + customerId opts)
supabase/migrations/
  <ts>_followups_polymorphic.sql  (only schema change in this pass)
```

## Non-goals for this pass

- No Milestone 5 work. Vendor Performance & Analytics stays queued.
- No new tables besides the two nullable columns on `followups`.
- No auth/RLS changes; picker only queries what the caller can already see.
- No visual redesign — picker uses today's `Popover`/`Command` primitives.
- No global search rewrite; the picker uses the existing list APIs, not `globalSearch`.

## Completion report will include

- Workflow fixes completed
- Cache invalidations added (per entity)
- Components standardized (list of migrated selectors)
- Remaining issues discovered
- Verification results (Playwright screenshots referenced)
