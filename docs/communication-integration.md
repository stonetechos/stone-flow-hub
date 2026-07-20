# Communication Layer — Production Integration

## Database changes

Migration `…_communication_mode_and_indexes.sql`:

- Seeds singleton `app_settings.communication.mode` = `{ mode: "test", test_email: "", test_phone: "" }`.
- `idx_message_queue_status_next` — supports the dispatcher's `WHERE status IN ('queued','retrying') AND next_retry_at <= now()` pick loop.
- `idx_message_queue_channel_status_created` — supports Communication Centre filters.

No new tables. `message_queue` and `message_delivery_events` already existed and are reused.

## New routes

| Route                                             | Purpose                                                                                              |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `/_authenticated/notification-settings` (updated) | Provider config, TEST/LIVE toggle, connection status, Send-Test buttons                              |
| `/_authenticated/communication` (new)             | Communication Centre — filter/inspect every outbound message, retry/cancel, run dispatcher on demand |
| `/api/public/hooks/dispatch-queue` (new)          | External-scheduler endpoint, admin-token gated                                                       |

## Server functions (`src/lib/notifications/dispatch.functions.ts`)

All admin-gated inside the handler (double-check on top of `requireSupabaseAuth`).

- `checkProviderStatus({channel})` → `{ ok, reason? }` — pings Resend `/domains` or Meta Graph phone-number endpoint.
- `sendTestMessage({channel, to?, subject?, body?})` — one-shot send that honours TEST mode (redirects to `test_email` / `test_phone` when in TEST).
- `dispatchQueueNow({batchSize})` — synchronously processes one batch (for admin "Run now" button).

## Provider layer (`src/lib/notifications/dispatch.server.ts`)

- `sendEmailViaResend` — POST `https://api.resend.com/emails`, `Authorization: Bearer $RESEND_API_KEY`.
- `sendWhatsappViaMeta` — POST `https://graph.facebook.com/v20.0/{phone_number_id}/messages` with permanent access token.
- `dispatchQueueBatch(supabase, size)` — pick → mark `sending` → call provider → on success mark `sent` + insert `message_delivery_events{event:'sent'}`; on failure mark `retrying` (exponential backoff up to 1 h, 5 attempts max) or `failed` after `max_attempts`, and emit `retry_scheduled` / `failed` events.
- Honours `communication.mode`: in TEST every recipient is replaced with `test_email` / `test_phone`, so no customer ever receives a message.

## Settings pages

`Settings → Communication` (rebadged existing notification-settings) has 5 cards:

1. **Global mode** (TEST/LIVE switch + test recipient email/phone).
2. **Email** — provider (Resend default), API-key secret name, Sender name, Sender email, Reply-To, live connection badge (Connected / Invalid key / Disconnected), Send-test button.
3. **WhatsApp** — Business Account ID, Phone Number ID, Webhook Verify Token, permanent access-token secret name, live status badge, Send-test button.
4. **SMS** — provider chooser (unchanged plumbing).
5. **Templates** — link to `/message-templates`.

## Provider configuration (secrets)

Store in Backend → Secrets (names are customisable via the "secret name" field in each card):

- `RESEND_API_KEY` — Resend
- `WHATSAPP_ACCESS_TOKEN` — Meta permanent token (System User recommended)

Absent secrets do **not** break the app: `checkProviderStatus` returns `{ ok:false, reason }` and dispatched messages fail cleanly into the `failed` bucket where they can be inspected.

## Message queue status model (unchanged schema, richer semantics)

`queued → sending → sent | retrying → sent | failed | cancelled`. Every transition is recorded in `message_delivery_events` with `provider`, `provider_ref` (Resend `id` or Meta `messages[0].id`), `payload` (raw provider response) and `occurred_at`. `attempts`, `last_error`, `failed_reason`, `next_retry_at`, `provider_message_id`, `sent_at` all populated by the dispatcher.

## Communication Centre

Filters: Channel, Status, Related entity (customer/vendor/project/estimate/quote/invoice/reminder), Date range, Free-text search over message_no / to / subject. Status count chips. Per-row actions: **Retry** (failed/cancelled) and **Cancel** (queued/retrying/failed). "Run dispatcher now" button for admins to flush the queue immediately without waiting for the scheduler.

## Testing safety

- Test buttons in Settings never send to a customer — they always resolve the recipient via TEST mode first.
- The Communication Centre never triggers sends from row interactions; the only send path is the dispatcher which itself respects TEST mode.
- **No automatic scheduled sends** happen inside the sandbox — cron is external. Until you point a scheduler at `/api/public/hooks/dispatch-queue`, the queue only drains when an admin clicks **Run dispatcher now**.

## External scheduling (recommended)

Point Cloudflare Cron / GitHub Actions / cron-job.org at
`POST https://project--{project-id}.lovable.app/api/public/hooks/dispatch-queue`
with header `Authorization: Bearer <admin-user-access-token>` every 60 s.

## Production readiness

- Typecheck: **clean**.
- Security linter: **17 WARN** (unchanged from RC-2, all accepted).
- Data-loss risk: **none** — every outbound is queued first, dispatched separately, and TEST mode is the default (safe by construction).
- Rollback: safe — the migration only seeds one row and adds two indexes; the dispatcher is opt-in (scheduler must be configured).
- **Recommendation: READY FOR PRODUCTION** once `RESEND_API_KEY` and/or `WHATSAPP_ACCESS_TOKEN` secrets are set. Leaving the mode on `TEST` is a valid production posture for the first 24 h of go-live.
