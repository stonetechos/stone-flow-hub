
# Module 3 — Stone-Industry Redesign

Redesign Inventory / Manufacturing / Procurement for architectural natural stone instead of a generic stock ERP. Module 1 architecture (EntityPicker, centralized invalidation, design system, status system, progressive disclosure) is preserved.

## 1. Database — new masters

Every table follows the mandatory pattern: `CREATE TABLE` → `GRANT` → `ALTER … ENABLE RLS` → `CREATE POLICY`. All get `has_staff_access(auth.uid())` read/write policies unless noted. All get `created_at` / `updated_at` + `set_updated_at` trigger.

**Masters (new)**

| Table | Purpose | Key columns |
| --- | --- | --- |
| `stone_types` | Sandstone / Marble / Onyx / Flexible Stone / … | code, name, density_kg_m3, water_absorption_pct, mohs_hardness, indoor_ok, outdoor_ok, slip_rating, weather_resistance, uv_resistance, recommended_applications[], notes |
| `surface_finishes` | Polished, Honed, Bush Hammered, Leather, Antique, … | code, name, anti_slip, indoor_ok, outdoor_ok, cost_multiplier, lead_time_days_delta, applicable_stone_type_ids[] |
| `edge_finishes` | Straight, Bevel, Bullnose, Half Bullnose, Chamfer, Rockface, Hand Chiselled, Machine Cut, Mitred | code, name, cost_multiplier, machine_required |
| `product_families` | Stone Mosaic / Panel / Wall Cladding / Veneer / Slab / Custom / CNC Engraving / Mural / Inlay / Waterjet / Table Top / Stair / Countertop / Fountain / Sculpture / Architectural Feature | code, name, requires_artwork, requires_configurator, default_uom, icon |
| `manufacturing_stages` | Raw Stone → Cutting → Calibration → Surface Finishing → Edge Processing → CNC Engraving → Waterjet → Inlay → QC → Packing → Dispatch | code, name, sort_order, default_owner (`vendor`/`employee`), typical_days |

`stone_types`, `surface_finishes`, `edge_finishes`, `product_families`, `manufacturing_stages` are seeded in the same migration with the full lists from the spec.

## 2. Products — extend, don't replace

Extend `products` (do NOT create a parallel table) with columns nullable so existing rows are unaffected:

```
family_id, stone_type_id, surface_finish_id, edge_finish_id,
colour, origin, thickness_mm, size_length_mm, size_width_mm,
weight_kg_per_unit, technical_specs jsonb,
market_price_inr, last_purchase_price_inr, last_selling_price_inr,
ai_tags text[]
```

Existing `stone_type` / `finish` free-text columns are kept and back-filled from the new FK columns during migration; the app reads the FK first, falls back to the string.

Add child tables:
- `product_technical_docs` (product_id, file_object_id, kind: `datasheet|installation|care`)
- `product_similar` (product_id, similar_product_id, weight) — future AI similarity
- `product_price_history` (product_id, kind: `purchase|selling|market`, price_inr, currency, source_ref, captured_at)

## 3. Flexible Stone Veneer sub-profile

Rather than a separate table, a `product_veneer_specs` 1:1 child holds the veneer-only fields (sheet_size_length_mm, sheet_size_width_mm, backing_type, form `roll|sheet`, bend_radius_mm, fire_rating, weight_kg_m2, indoor_ok, outdoor_ok). Loaded eagerly when `family.code = 'STONE_VENEER'`.

## 4. Manufacturing workflow

Two tables layered on top of Sales Orders (the point where the shop floor starts producing):

- `production_orders` (id, code `MFG-####`, sales_order_id nullable, project_id, product_id, quantity, unit, status: `planned|in_progress|on_hold|completed|cancelled`, started_at, completed_at, notes)
- `production_stages` (production_order_id, stage_id → `manufacturing_stages`, sort_order, assigned_vendor_id, assigned_user_id, planned_date, actual_completed_at, delay_reason, notes, sort_order)
- `production_stage_files` (stage_id, file_object_id) — stage photos.

Trigger `next_code('MFG')`. Sales-order detail page gets a new "Production" tab that lists / creates production orders and stage timeline.

## 5. Procurement — vendor capabilities

New matrix tables so RFQ routing and future scoring can filter vendors by capability:

- `vendor_stone_types` (vendor_id, stone_type_id)
- `vendor_finishes` (vendor_id, surface_finish_id)
- `vendor_capabilities` (vendor_id, capability: enum `cnc|waterjet|inlay|flexible_stone|calibration|edge_processing|polishing`, notes)
- Extend `vendors`: max_slab_size_mm_length, max_slab_size_mm_width, daily_capacity, lead_time_days, moq, quality_rating (1–5).

Vendor detail page grows a Capabilities panel; RFQ create dialog filters vendor picker by `capability = 'cnc'` etc. when the enquiry has CNC items.

## 6. Artworks & murals

- `product_artworks` (product_id or production_order_id, file_object_id, kind: `stl|dxf|cad|ai|pdf|toolpath|render`, revision int, is_approved, approved_by, approved_at, notes)
- `artwork_approvals` (artwork_id, customer_id, status: `pending|approved|rejected`, feedback, decided_at)

Uses existing `file_objects` bucket — no new storage bucket.

## 7. Custom Product Builder

Single new route `src/routes/_authenticated/products/configure.tsx`. Stepper: Family → Stone → Finish → Edge → Thickness → Size → Engraving/Inlay (conditional on family) → Quantity → Packing → Price.

On submit calls a new `configureProduct` server-fn that:
1. Computes a canonical hash of the config
2. If a product with that hash already exists (`products.config_hash`) → returns it
3. Else inserts a new product with `family_id`, all FK columns filled, `is_custom = true`, `config_hash`, computed price = base × finish.cost_multiplier × edge.cost_multiplier × quantity.

New column: `products.is_custom`, `products.config_hash`, `products.config_json`.

Then `seedPickerCache(qc, "product", row)` + `invalidateProduct` so the new custom SKU is instantly available in Quote / SO line-item pickers.

## 8. Inventory — stone-aware

Extend `inventory_items` (already exists):
- `lot_no`, `slab_no`, `block_no` (natural-stone traceability)
- `size_length_mm`, `size_width_mm`, `thickness_mm`
- `bundle_qty`, `bundle_uom`
- `origin_country`, `arrival_date`

New sub-list on Inventory detail: "Slab register" grouping items by lot.

## 9. Routes added

- `/masters/stone-types` (list + create/edit dialog)
- `/masters/surface-finishes`
- `/masters/edge-finishes`
- `/masters/product-families`
- `/masters/manufacturing-stages`
- `/products/configure` — configurator
- `/manufacturing` — production order list + Kanban by stage
- `/manufacturing/$id` — production order detail w/ stage timeline
- New tab on `/vendors/$id` — Capabilities
- New tab on `/sales-orders/$id` — Production
- New tab on `/products/$id` — Artworks, Price history, Similar

All routes share `PageHeader`, `EmptyState`, `StatusPill`, `RowActions`, `EntityPicker`, `<Can>`.

## 10. Components added

- `<StoneTypePicker>`, `<SurfaceFinishPicker>`, `<EdgeFinishPicker>`, `<ProductFamilyPicker>` — thin wrappers around a new generic `<MasterPicker type="stone_type|...">` (extends EntityPicker registry instead of duplicating).
- `<ProductionStageTimeline>` (reused on SO detail + Production detail).
- `<CapabilityChips>` (vendor cards + RFQ picker).
- `<ProductConfigurator>` (multi-step; reuses `QuickForm`).
- `<ArtworkUploader>` + `<ArtworkRevisionList>` (reuses attachments panel).

No duplicate pickers — the existing `EntityPicker` gains new registry entries; only routes that need master CRUD get their own list view.

## 11. Centralized invalidation

Add helpers to `src/lib/query-invalidation.ts`:
`invalidateStoneType`, `invalidateSurfaceFinish`, `invalidateEdgeFinish`, `invalidateProductFamily`, `invalidateManufacturingStage`, `invalidateProductionOrder`, `invalidateVendorCapability`. Each also calls `bumpPickers` where relevant. New picker keys added to `bumpPickers`.

## 12. Status system

Register in `src/lib/status-transitions.ts`:
- `production_order`: `planned → in_progress → completed`, `* → on_hold → in_progress`, `* → cancelled`
- `artwork_approval`: `pending → approved | rejected`

UI reuses `<StatusPill>`.

## 13. AI foundation (data only)

Columns added, no logic: `products.ai_tags text[]`, `product_similar`, `product_price_history`, `vendor_performance_cache` already exists. Populated by future workers.

## Technical notes

- Two migrations to keep review manageable:
  1. Masters + product FK columns + seeds
  2. Manufacturing + procurement matrices + artwork + configurator columns
- After each migration, TS types regenerate and dependent code lands in a follow-up code batch.
- All new tables are `has_staff_access`-gated. Vendors do NOT see manufacturing internals (no vendor-portal policies added).
- No new storage bucket — reuse `stonetech-files`.
- No changes to sales / invoicing / payments / dashboards.

## Deliverables at completion

- Updated ERD (mermaid diagram)
- New tables listed above
- Masters listed above
- Manufacturing workflow doc (stages + who owns)
- Procurement workflow doc (capability-filtered RFQ)
- Inventory workflow (lot/slab register)
- Components list
- Routes list
- Production readiness bump target: 74% → ~80% overall (Module 3 rewritten, still no notifications worker / vendor invitations)

## Sequencing

1. Migration 1 (masters + seeds + product FKs)
2. Wire master pickers into product form and existing pickers
3. Migration 2 (production + procurement matrices + artwork + configurator hash)
4. Build manufacturing routes and production tab
5. Build configurator route
6. Build vendor capabilities tab + RFQ filtering
7. Extend inventory schema + slab register
8. Verify: `tsgo --noEmit`, spot-check key flows
