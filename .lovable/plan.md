# Action-Oriented Detail Pages

This work was previously implemented. Re-issuing the same plan for confirmation — nothing new to add.

## Goal

Every major entity detail page shows the most common actions in a consistent Action Bar at the top, with secondary actions in a ⋮ overflow menu. No new modules, no business logic changes, no theme changes.

## Shared Component

`src/components/entity/DetailActionBar.tsx` — already exists. Renders:
- Inline **primary** buttons (visible always)
- Optional **pin** star (FavoriteButton)
- **Overflow** ⋮ dropdown for secondary items (supports `onSelect`, `href`, `destructive`, `separatorBefore`)

## Per-Entity Action Bars

| Entity | Primary (inline) | Overflow (⋮) |
|---|---|---|
| Customer | Edit, New Enquiry, New Project, New Quote | Call, WhatsApp, Email, Documents, Timeline |
| Project | Edit, New Quote, New SO, New PO, New Dispatch, New Invoice | Documents, Timeline |
| Vendor | Edit, New PO | Call, Email, Documents, Timeline |
| Product | Edit | Duplicate, Documents, Timeline |
| Enquiry | Edit, Convert to Project, Create Quote, Mark Won, Mark Lost | Documents, Timeline |
| Quote | Edit, Create Sales Order | Print, Share, Documents, Timeline |
| Sales Order | Edit, New Dispatch, New Invoice | Documents, Timeline |
| Purchase Order | Edit | Print, Documents, Timeline |
| Dispatch | Edit | Print, Documents, Timeline |
| Invoice | Edit, Record Payment | Print, Share, Documents, Timeline |
| Payment | Edit | Receipt, Timeline |

Pin star present on every entity via `FavoriteButton`.

## Interaction Details

- **Edit**: opens existing edit form immediately — either navigates to `$id/edit` route, or deep-links to index page with `?edit=<id>` search param which auto-opens the edit modal (via `useEffect` in each index route with `validateSearch` adding `edit: string`).
- **New X (from a hub)**: navigates to the target `/new` route with pre-filled context via search params (`?customer=...&project=...`).
- **Documents / Timeline (on hub pages)**: `Tabs` becomes controlled — action switches the active tab.
- **Documents / Timeline (on non-hub pages)**: sections get `id` anchors; action scrolls into view.
- **Print**: `window.print()`.
- **Share**: Web Share API with clipboard fallback.
- **Call / WhatsApp / Email**: `tel:`, `https://wa.me/<digits>`, `mailto:` links.

## Files Touched

- `src/components/entity/DetailActionBar.tsx` (shared component)
- Detail routes for all 11 entities under `src/routes/_authenticated/*`
- Index routes for Customers, Projects, Vendors, Products, Enquiries (add `edit` search param + auto-open)

## Verification

- `tsgo --noEmit` — zero errors
- Production build — succeeds
- Manual: every entity detail page shows action bar with correct primary/overflow split; Edit opens form immediately; workflow "New X" buttons pre-fill context.
