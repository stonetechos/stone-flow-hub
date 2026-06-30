
# Stone Tech OS Module 1 — Final Validation, Relationships, Execution Plan

The full specification (sections 1–6 of the prior plan: extension contract, Module 1 tables, Progressive Disclosure UI, build order, development constraints, code quality) is **frozen** and is the source of truth. This document validates it, summarizes relationships, lays out the execution plan, flags maintenance concerns, and then begins build.

---

## A. Final architecture validation

Checked against the spec end-to-end. Result: **internally consistent**, with five clarifications below that I'm locking in before code so they don't drift later.

1. **Project is the central business object** — every transactional table (`enquiries`, `enquiry_items`, `enquiry_stage_history`, `followups`, `rfqs`, `rfq_items`, `vendor_requests`, `vendor_quotes`, `vendor_quote_items`, `site_visits`, `project_notes`, `file_objects`, `activity_log`) carries `project_id` directly (denormalized FK where one hop away). This keeps the Project Hub a single indexed query per tab — no schema redesign when modules attach.
2. **Polymorphic spines are the only polymorphism we allow.** `activity_log(entity_type, entity_id)` and `file_objects(entity_type, entity_id, folder)`. Everything else uses real FKs. This avoids the classic ORM-polymorphism trap while still letting future modules attach with zero spine change.
3. **Stage is owned by `enquiries`, history is append-only.** `enquiries.stage` is the current value (denormalized for fast filtering / Kanban); `enquiry_stage_history` is the canonical log written by a trigger on every change. UI reads `enquiries.stage`; audits read the history.
4. **Reserved hooks on every transactional table.** `company_id uuid` (nullable), `currency_code text default 'INR'`, `external_ref jsonb`, `workflow_state jsonb`. Free now, painful to add later.
5. **Sequence-driven codes** (`CUS-`, `PRJ-`, `ENQ-`, `PRD-`, `VEN-`, `RFQ-`) via `entity_sequences` + `next_code()` triggers. Atomic, gap-tolerant, one place to add `PO-` / `INV-` / `DC-` later.

No part of the spec needs rewriting. Three concerns worth flagging before build (see section D).

---

## B. Database relationship summary

Cardinalities for every Module 1 relationship. Read `A ─< B` as "one A has many B".

**Identity**
- `auth.users 1─1 profiles` — auto-created on signup.
- `profiles 1─< user_roles` — multi-role per user. `app_role` enum: `admin`, `sales_manager`, `sales`, `purchase` (vendor/customer added when those portals ship).

**Customer master**
- `customers 1─< customer_contacts` — Owner, Architect, Purchase Manager, Site Engineer, Accounts, Procurement, Other.
- `customers 1─< projects`.
- `customers 1─< customer_tags >─ tags`.

**Project master (central hub)**
- `projects 1─< enquiries`.
- `projects 1─< site_visits`.
- `projects 1─< project_notes`.
- `projects 1─< file_objects` (`entity_type='project'`).
- `projects 1─< activity_log` (`project_id` denorm on every log row for fast project-timeline reads).
- `projects 1─< project_tags >─ tags`.
- `projects ?─ customer_contacts` — optional FKs `architect_contact_id`, `purchase_contact_id`.

**Product master**
- `product_categories 1─< product_categories` (self-FK for sub-categories).
- `product_categories 1─< products`.
- `products 1─< product_images`.
- `products 1─< enquiry_items`.
- `products 1─< vendor_products >─ vendors`.

**Vendor master**
- `vendors 1─< vendor_contacts`.
- `vendors 1─< vendor_product_categories >─ product_categories`.
- `vendors 1─< vendor_products >─ products`.
- `vendors 1─< vendor_requests`.
- `vendors 1─< vendor_tags >─ tags`.

**Enquiry & pipeline**
- `enquiries 1─< enquiry_items` — line items reference `products.id` (nullable for ad-hoc) + `product_name_snapshot` to survive product deletion.
- `enquiries 1─< enquiry_stage_history` — written by trigger on every `stage` change.
- `enquiries 1─< followups`.
- `enquiries 1─< rfqs`.
- `enquiries 1─< enquiry_tags >─ tags`.
- `enquiries ?─ customers` — denormalized FK for fast list filters; canonical chain is `enquiry → project → customer`.

**RFQ flow**
- `rfqs 1─< rfq_items` — each line ties to one `enquiry_items` row (nullable) + `products.id`.
- `rfqs 1─< vendor_requests` — one row per (rfq, vendor); `UNIQUE(rfq_id, vendor_id)`.
- `vendor_requests 1─1 vendor_quotes` — one quote per request; `UNIQUE(vendor_request_id)`. Approval flips one quote's `is_approved=true` and closes the rest.
- `vendor_quotes 1─< vendor_quote_items` — per-line pricing tied to `rfq_items`.

**Files & audit (polymorphic spines)**
- `file_objects` keyed by `(entity_type, entity_id, folder)`. Folder enum reserves future values (`purchase_order`, `invoice`, `delivery_challan`, `transport_document`) so the enum never needs editing.
- `activity_log` keyed by `(entity_type, entity_id)` with denormalized `project_id` for project-timeline reads.

**Tags (polymorphic via dedicated join tables, not polymorphic FK)**
- `tags 1─< customer_tags / project_tags / enquiry_tags / vendor_tags` — explicit joins keep FKs real and cascading deletes safe.

A Mermaid ERD will be written to `/mnt/documents/StoneTechOS_Module1_ERD.mmd` in the first build turn.

---

## C. Business workflows (canonical, one source of truth each)

Each workflow lives in exactly one orchestrator server fn under `src/lib/<domain>/<domain>.functions.ts`. Single-responsibility leaf fns compose; orchestrators only orchestrate.

**Customer Created** (`createCustomer`)
1. `findDuplicateCustomers({phone, email, whatsapp})` — returns matches; client surfaces inline before submit.
2. Zod-parse input → 3. `next_code('CUS')` → 4. INSERT customer (+ contacts in same tx if provided) → 5. Activity log row (trigger) → 6. Return DTO.

**Project Created** (`createProject`) — same shape with `next_code('PRJ')`.

**Enquiry Created** (`createEnquiry`)
1. Resolve/create customer + project via `SmartCombobox` flows (each their own fn).
2. `next_code('ENQ')` → 3. INSERT enquiry + items in one tx → 4. Initial stage `new_lead` → 5. Optional initial followup → 6. Optional file uploads via `registerUpload` (`entity_type='enquiry'`, `folder='site_image'`) → 7. Activity log → 8. Return DTO.

**Stage Changed** (`changeEnquiryStage`)
1. Validate transition allowed (forward/backward both allowed; `lost`/`cancelled` require reason) → 2. UPDATE `enquiries.stage` → 3. Trigger writes `enquiry_stage_history` → 4. Activity log → 5. Return new stage.

**RFQ Sent** (`sendRfq`)
1. `next_code('RFQ')` → 2. INSERT `rfqs` (status `draft`) → 3. INSERT `rfq_items` mirrored from enquiry → 4. INSERT `vendor_requests` for selected vendors (status `pending`) → 5. UPDATE rfq status `sent`, enquiry stage `rfq_sent` → 6. Activity log (`rfq_sent`) per vendor → 7. Dashboard counters update automatically via views → 8. Notification stub: write activity rows tagged `notify=true` (future notifications module reads these — no extra table needed now).

**Vendor Quote Recorded** (`recordVendorQuote`)
1. INSERT `vendor_quotes` + items → 2. UPDATE vendor_request.response_status `submitted` → 3. If all vendor_requests for the rfq are submitted, UPDATE rfq.status `fully_received`, else `partially_received` → 4. UPDATE enquiry stage `vendor_quote_received` → 5. Activity log → 6. File link via `registerUpload` (`folder='quotation'`).

**Vendor Approved** (`approveVendorQuote`)
1. UPDATE selected `vendor_quotes.is_approved=true, approved_by, approved_at` → 2. Close competing quotes (`is_approved=false` already; set `vendor_request.response_status='closed_lost'`) → 3. UPDATE rfq.status `closed`, enquiry stage `vendor_approved` → 4. Activity log → 5. Return approved quote DTO. PO-ready handoff is just `vendor_quote_id` — Purchase Orders module reads it later.

**Follow-up Completed** (`completeFollowup`)
1. UPDATE followup status `done`, set `completed_at`, `outcome_notes` → 2. Optionally create next followup linked via `next_followup_id` → 3. Activity log → 4. Return both rows.

Every workflow is wrapped in a single Postgres transaction where multi-row writes occur; activity_log inserts come from triggers, not application code, so audit can never be skipped.

---

## D. Concerns flagged before build

Three small spots in the spec that I want to lock in explicitly so they don't cause maintenance pain later:

1. **`enquiry.customer_id` denormalization** — kept for fast filters/joins, but enforced by trigger to equal `projects.customer_id`. If a project is ever reassigned to a different customer (rare), the trigger updates child enquiries in the same tx. Stops the "two sources of truth" bug.
2. **Stage backflow** — UI allows moving an enquiry backward (e.g. `vendor_quote_received → negotiation`). History records the reverse transition. `lost` and `cancelled` are terminal in the UI (re-opening requires a deliberate action that writes a new history row). This matches real stone-industry behavior; locking it now avoids a UX retrofit.
3. **`product_name_snapshot` on `enquiry_items`** — kept so enquiries remain readable if a product master row is later soft-deleted. Products use `is_active=false` for retirement, never hard-delete; the snapshot is belt-and-suspenders for historical reads.

No other parts of the spec need adjustment. Building as specified.

---

## E. Development execution plan

Single-iteration build. Each numbered step is a discrete commit-sized unit; later steps depend only on earlier ones.

1. **Enable Lovable Cloud.**
2. **Schema migration (one file)** — enums (`app_role`, `lead_stage`, `followup_status`, `file_folder` with reserved future values), `entity_sequences` + `next_code()`, `has_role()` SECURITY DEFINER, all Module 1 tables from §2 of the spec with reserved hooks, triggers (sequence codes, `enquiry_stage_history`, `enquiry.customer_id` sync, `updated_at`, generic `activity_log` insert/update/delete on tracked tables), RLS policies, explicit GRANTs to `authenticated` + `service_role`.
3. **Seed migration** — 11 tags (Builder, Architect, Interior Designer, Commercial, Residential, Luxury Villa, Hotel, Hospital, Urgent, High Value, Repeat Customer), baseline product categories (Marble, Granite, Quartz, Sandstone, Limestone, Travertine, Onyx, Slate, Engineered), sequence prefix rows.
4. **Auth** — first-user-auto-admin trigger + `profiles` auto-insert trigger + bearer middleware in `src/start.ts` + `/auth` public route (email + password; password reset page; `/_authenticated/` integration-managed gate untouched).
5. **App shell** — theme tokens (Granite & Teal: `#F9FAFB` bg, `#14B8A6` primary teal, granite gray border, Material elevation, 4px radius), Roboto + Roboto Slab via `<link>` in `__root.tsx`, left rail, top bar with ⌘K global search trigger, Quick Add menu, notifications bell (count placeholder), profile menu.
6. **Form primitives** — `<QuickForm>`, `<StarLabel>`, `<SmartCombobox>`, `<QuickAddModal>`, `<FilePicker>` (dropzone wired to `requestUploadUrl` + `registerUpload`).
7. **Customers** — list + Quick Add modal + full page with three zones + inline dup detection on Mobile/Email.
8. **Products & categories** — list + Quick Add + image upload.
9. **Vendors** — list + Quick Add + full page (contacts + category/product mapping in More Details).
10. **Projects + Project Hub** — list + Quick Add + Project Hub tabs (Overview, Enquiries, Followups, Site Visits, RFQs, Quotes, Files, Notes, Timeline).
11. **Enquiries** — Quick Add, full page with line items, **Pipeline Kanban board** across 16 stages with drag-to-change (writes history + activity log via `changeEnquiryStage`).
12. **Follow-ups + Dashboard** — six action tiles (Today, Overdue, Pending RFQs, Vendor Quotes Pending, Orders Awaiting Approval, Revenue Pipeline) + combined Today/Overdue feed with inline Done / Snooze / Reschedule.
13. **RFQ** — Quick Fill send flow (vendor multi-select pre-filtered by enquiry's product categories, due date, send), comparison matrix screen, **Approve Vendor** action.
14. **Files panel** — chronological + folder filter, reused on Project Hub and Enquiry detail.
15. **Activity timeline views** — on Project, Enquiry, Customer, Vendor (single `<TimelineFeed>` reading `activity_log`).
16. **Cross-cutting hardening** — every route has `errorComponent` + `notFoundComponent`; every list has empty/loading/error states; every mutation surfaces sonner toasts; permission errors route to friendly "You don't have access" panels; auth failures bounce to `/auth`; ⌘K global search wired (Postgres `tsvector` + trigram indexes on phone/whatsapp/codes).

Mermaid ERD written to `/mnt/documents/StoneTechOS_Module1_ERD.mmd` in step 2.

---

Approve and I switch to build mode and begin at step 1.
