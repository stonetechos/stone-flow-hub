# Stone Tech OS — Administrator Guide

## 1 · Access

- Sign in at `/auth`. First user is granted `admin` via the `handle_new_user` trigger only when the `user_roles` table is empty.
- Add/remove roles from `/settings/users` (admin only). Roles: `admin`, `sales_manager`, `sales`, `purchase`, `production`, `installation`, `accounts`, `vendor`, `viewer`. Stored in `public.user_roles`, checked by `public.has_role()` (SECURITY DEFINER).

## 2 · Configuration surface

| Setting                                 | Where                             | Notes                                           |
| --------------------------------------- | --------------------------------- | ----------------------------------------------- |
| Company profile, currency, tax defaults | `app_settings` (singleton)        | Edit from `/settings/company`                   |
| Email / WhatsApp templates              | `message_templates`               | `/settings/templates`                           |
| Payment provider                        | `app_settings.payments_provider`  | `razorpay`, `stripe`, or `manual`               |
| Feature flags                           | `app_settings.feature_flags` JSON | Toggle demo mode, AI copilot                    |
| Numbering prefixes                      | `entity_sequences`                | Do not edit directly; use `/settings/numbering` |

## 3 · Secrets required for full production

Set via Backend → Secrets:

- `LOVABLE_API_KEY` — **present** (AI Gateway)
- `RAZORPAY_WEBHOOK_SECRET` — required if payments enabled
- `RESEND_API_KEY` / SMTP creds — required for email delivery
- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` — required for WhatsApp delivery

Absence of a provider secret leaves the corresponding delivery step in the `notification_queue` in `pending` state indefinitely — the ERP continues to function.

## 4 · Scheduled jobs

The endpoints are ready; they must be invoked externally (Lovable projects do not have `pg_cron` installed):

| Purpose                    | URL                                                 | Recommended schedule |
| -------------------------- | --------------------------------------------------- | -------------------- |
| Daily digest email         | `POST /api/public/hooks/daily-digest`               | 07:00 local          |
| Customer payment reminders | `POST /api/public/hooks/customer-payment-reminders` | 09:00 local          |
| Razorpay webhook           | `POST /api/public/webhooks/razorpay`                | event-driven         |

Point your scheduler (GitHub Actions / cron-job.org / Cloudflare Cron) at the stable URL `project--{project-id}.lovable.app`.

## 5 · Backups

Lovable Cloud runs daily Postgres backups (retained 7 days). Storage bucket `stonetech-files` is redundantly stored by the platform. Manual export: `/settings/export` (CSV per entity).

## 6 · Demo mode

`is_demo=true` on seeded rows. Reset with the `public.reset_demo_data()` RPC (admin only). Real data has `is_demo=false` and is never touched.
