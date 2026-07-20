# Stone Tech OS — Modules (v1.0)

Every business module currently implemented, grouped by lifecycle stage. Each
entry lists the primary route(s), the domain API folder under `src/lib/`, and
the main tables. Cross-cutting features (Activity, Comments, Attachments,
Notifications, Tasks, Favorites, Tags) are available on every entity and are
not repeated per module.

## CRM & Sales Pipeline

### Customers

- Routes: `/customers`, `/customers/$id`, `/customers/new`
- API: `src/lib/customers/`
- Tables: `customers`, `customer_contacts`, `customer_tags`

### Enquiries (Leads)

- Routes: `/enquiries`, `/enquiries/$id`, `/enquiries/new`
- API: `src/lib/enquiries/`, `src/lib/lead-analytics/`, `src/lib/lead-stage/`
- Tables: `enquiries`, `enquiry_items`, `enquiry_stage_history`, `enquiry_tags`

### Projects

- Routes: `/projects`, `/projects/$projectId`, `/projects/new`
- API: `src/lib/projects/`, `src/lib/milestones/`
- Tables: `projects`, `project_milestones`, `project_notes`, `project_tags`

### Follow-ups

- Routes: `/followups`
- API: `src/lib/followups/`
- Tables: `followups`

## Estimation & Quoting

### Estimates

- Routes: `/estimates`, `/estimates/$id`, `/estimates/new`
- API: `src/lib/estimates/` (calc, render, templates, schema)
- Tables: `estimates`, `estimate_items`, `estimate_cost_components`,
  `estimate_payment_schedules`, `estimate_documents`

### Quotations

- Routes: `/quotes`, `/quotes/$id`, `/quotes/new`
- API: `src/lib/quotes/` (+ `comparison.ts`)
- Tables: `quotes`, `quote_items`

### Applications (approvals workflow)

- Tables: `applications`, `artwork_approvals`, `product_artworks`

## Vendor & Procurement

### RFQs

- Routes: `/rfqs`, `/rfqs/$id`
- API: `src/lib/rfqs/`
- Tables: `rfqs`, `rfq_items`, `vendor_rfq_views`, `vendor_requests`, `stage_recommendations`

### Vendor Quotes

- API: `src/lib/vendors/`, `src/lib/vendor-portal/`
- Tables: `vendor_quotes`, `vendor_quote_items`

### Purchase Orders

- Routes: `/purchase-orders`, `/purchase-orders/$id`, `/purchase-orders/new`
- API: `src/lib/purchase-orders/`
- Tables: `purchase_orders`

### GRN (Goods Receipt Note)

- Routes: `/grns`
- API: `src/lib/grns/`
- Tables: `grns`, `grn_items`, `grn_inspections`

### Vendors

- Routes: `/vendors`, `/vendors/$id`
- Tables: `vendors`, `vendor_contacts`, `vendor_capabilities`,
  `vendor_products`, `vendor_product_categories`, `vendor_stone_types`,
  `vendor_finishes`, `vendor_service_categories`, `vendor_service_links`,
  `vendor_tags`, `vendor_users`, `vendor_performance_cache`,
  `vendor_ledger_entries`, `vendor_payments`

### Vendor Portal

- Routes: `/vendor/dashboard`, `/vendor/rfqs`, `/vendor/rfqs/$rfqId`,
  `/vendor/orders`, `/vendor/profile`
- API: `src/lib/vendor-portal/`

### Vendor Payments

- Routes: `/vendor-payments`
- API: `src/lib/vendor-payments/`

## Manufacturing & Inventory

### Manufacturing

- Routes: `/manufacturing`
- API: `src/lib/manufacturing/`
- Tables: `production_orders`, `production_stages`, `production_pieces`,
  `production_stage_files`, `manufacturing_stages`

### QC

- API: `src/lib/qc/`
- Tables: `qc_templates`, `qc_template_items`, `qc_results`

### Inventory

- Routes: `/inventory`
- API: `src/lib/inventory/` (+ `movements.ts`)
- Tables: `inventory_items`, `inventory_movements`

## Dispatch, Installation & Fulfilment

### Sales Orders

- Routes: `/sales-orders`, `/sales-orders/$id`, `/sales-orders/new`
- API: `src/lib/sales-orders/`
- Tables: `sales_orders`, `sales_order_items`

### Delivery Challans (Dispatch)

- Routes: `/dispatch`
- API: `src/lib/dispatch/`
- Tables: `dispatches`, `dispatch_items`

### Installations

- Routes: `/installations`, `/installations/$id`, `/installation-teams`
- API: `src/lib/installation/` (dashboard, orders, progress, materials,
  signoff, teams, certificate, site-ai)
- Tables: `installations`, `installation_progress`, `installation_materials`,
  `installation_signoffs`, `installation_teams`, `site_visits`

## Billing & Money

### Invoices

- Routes: `/invoices`, `/invoices/$invoiceId`, `/invoices/new`
- API: `src/lib/invoices/`
- Tables: `invoices`, `invoice_items`

### Receipts

- Routes: `/receipts`, `/receipts/$receiptId`
- API: `src/lib/receipts/`, `src/lib/customer-ledger/`
- Tables: `receipts`, `receipt_allocations`

### Customer Payments

- Routes: `/payments`, `/pay/$linkId` (public)
- API: `src/lib/customer-payments/` (collection, request, schedule),
  `src/lib/payment-links/`, `src/lib/payments/`
- Tables: `payments`, `payment_links`, `customer_payment_schedules`

### Credit / Debit Notes & Refunds

- Tables: `credit_notes`, `debit_notes`, `refunds`

### Ledger

- Routes: `/ledger/$customerId`
- API: `src/lib/customer-ledger/`, `src/lib/vendors/ledger.ts`

## Executive Intelligence

### Executive Command Centre

- Routes: `/dashboards/*`
- API: `src/lib/executive/` (command-center, kpis, forecast, timeseries,
  customer-intel, vendor-intel, profitability)

### AI Copilot

- Components: `src/components/copilot/*`
- API: `src/lib/ai/` (gateway.server, services, copilot.functions)
- Provider: Lovable AI Gateway

### Business Intelligence

- API: `src/lib/intelligence/` (business-health, risk, score, actions)

## Workforce Intelligence

- Routes: `/workforce-intelligence`, `/workforce-intelligence/employees`
- API: `src/lib/workforce/` (owner-intel, scoring, schema, types)
- Tables: `employees`, `employee_documents`, `designations`, `kras`,
  `workload_capacities`, `workforce_tasks`, `workforce_rule_assignments`,
  `workforce_score_snapshots`

## Masters (MDM)

- Route: `/masters/*`
- API: `src/lib/masters/`, `src/lib/mdm/`
- Tables: `stone_types`, `stone_colours`, `stone_origins`, `thicknesses`,
  `surface_finishes`, `edge_finishes`, `quality_grades`, `packaging_types`,
  `uoms`, `product_categories`, `product_families`, `products`,
  `product_images`, `product_similar`, `product_technical_docs`,
  `product_veneer_specs`, `product_price_history`

## Communications

- Routes: `/communication`, `/messages`, `/message-templates`,
  `/notifications`, `/notification-settings`
- API: `src/lib/notifications/` (queue, dispatch.server, providers,
  templates, render, document-context)
- Tables: `message_queue`, `message_templates`, `message_delivery_events`,
  `notification_deliveries`, `notification_events`, `email_send_log`,
  `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails`

## Cross-Cutting

- **Activity**: `/activity`, `activity_log`
- **Tasks**: `/tasks`, `tasks`
- **Documents / Lineage**: `/documents`, `document_lineage`, `file_objects`
- **Comments**: `comments`
- **Tags**: `tags` + per-entity join tables
- **Favorites**: `favorites`
- **Ownership Transfer**: `ownership_transfers`, `owner_notes`
- **Bulk Imports**: `bulk_imports`
- **Global Search**: Ctrl+K, `src/lib/search/api.ts`
- **App Settings**: `app_settings` (singleton), `src/lib/app-settings/`
- **Admin**: `/admin/*`, `user_roles`, role-based access via `has_role()`
