import * as React from "react";
import { render } from "@react-email/render";
import { Webhook, WebhookVerificationError } from "standardwebhooks";
import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { SignupEmail } from "@/lib/email-templates/signup";
import { InviteEmail } from "@/lib/email-templates/invite";
import { MagicLinkEmail } from "@/lib/email-templates/magic-link";
import { RecoveryEmail } from "@/lib/email-templates/recovery";
import { EmailChangeEmail } from "@/lib/email-templates/email-change";
import { ReauthenticationEmail } from "@/lib/email-templates/reauthentication";

/**
 * Auth email webhook — receives Supabase's NATIVE "Send Email" Auth Hook
 * directly (Authentication → Hooks in the Supabase dashboard), replacing
 * the old src/routes/lovable/email/auth/webhook.ts, which received a
 * Lovable-relayed, Lovable-signed, Lovable-enveloped version of the same
 * event (custom `x-lovable-signature` header, custom {version, type,
 * run_id, data: {...}} envelope — see that file's git history and
 * node_modules/@lovable.dev/webhooks-js's README if you need the old shape
 * for reference). This endpoint verifies Supabase's own Standard Webhooks
 * signature instead (https://www.standardwebhooks.com/, `standardwebhooks`
 * npm package) and parses Supabase's own native hook payload shape.
 *
 * IMPORTANT — this endpoint is not live until you manually repoint it:
 * Supabase dashboard → Authentication → Hooks → Send Email hook → change
 * the URL to this route and copy the secret it generates into
 * `SUPABASE_AUTH_HOOK_SECRET`. Before relying on it for real users, use
 * Supabase's own "Send test request" button (once per action type) and
 * confirm this returns 200 and a plausible-looking email renders via
 * `/api/public/hooks/email-preview`. The old Lovable-relay path keeps
 * running in parallel until you do this — see docs/DEPLOYMENT.md.
 *
 * One specific detail this sandbox could not verify against a live
 * Supabase project and that the test-request step above should confirm:
 * for `email_change`, which address Supabase expects the confirmation
 * link sent to (this implementation sends to `user.new_email`, per
 * Supabase's documented default single-confirmation flow — you're proving
 * ownership of the new address). If a real test-request payload disagrees,
 * this is the one line to change (see `recipientFor()` below).
 */

type SupabaseEmailActionType =
  "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "reauthentication";

interface SendEmailHookPayload {
  user: {
    email?: string;
    new_email?: string;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: SupabaseEmailActionType;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

const EMAIL_SUBJECTS: Record<SupabaseEmailActionType, string> = {
  signup: "Confirm your email",
  invite: "You've been invited",
  magiclink: "Your login link",
  recovery: "Reset your password",
  email_change: "Confirm your new email",
  reauthentication: "Your verification code",
};

type EmailRenderer = (data: {
  confirmationUrl: string;
  recipient: string;
  oldEmail: string;
  newEmail: string;
  token: string;
}) => React.ReactElement;

const SITE_NAME = "stone-flow-hub";

const EMAIL_TEMPLATES: Record<SupabaseEmailActionType, EmailRenderer> = {
  signup: (d) =>
    React.createElement(SignupEmail, {
      siteName: SITE_NAME,
      siteUrl: d.confirmationUrl,
      recipient: d.recipient,
      confirmationUrl: d.confirmationUrl,
    }),
  invite: (d) =>
    React.createElement(InviteEmail, {
      siteName: SITE_NAME,
      siteUrl: d.confirmationUrl,
      confirmationUrl: d.confirmationUrl,
    }),
  magiclink: (d) =>
    React.createElement(MagicLinkEmail, {
      siteName: SITE_NAME,
      confirmationUrl: d.confirmationUrl,
    }),
  recovery: (d) =>
    React.createElement(RecoveryEmail, {
      siteName: SITE_NAME,
      confirmationUrl: d.confirmationUrl,
    }),
  email_change: (d) =>
    React.createElement(EmailChangeEmail, {
      siteName: SITE_NAME,
      oldEmail: d.oldEmail,
      email: d.recipient,
      newEmail: d.newEmail,
      confirmationUrl: d.confirmationUrl,
    }),
  reauthentication: (d) =>
    React.createElement(ReauthenticationEmail, {
      token: d.token,
    }),
};

function redactEmail(email: string | null | undefined): string {
  if (!email) return "***";
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "***";
  return `${localPart[0]}***@${domain}`;
}

/** See the file header comment — this is the one address-selection detail
 * to confirm against a real Supabase test-request payload. */
function recipientFor(payload: SendEmailHookPayload): string {
  if (payload.email_data.email_action_type === "email_change" && payload.user.new_email) {
    return payload.user.new_email;
  }
  return payload.user.email ?? "";
}

function confirmationUrlFor(payload: SendEmailHookPayload, supabaseUrl: string): string {
  const { token_hash, email_action_type, redirect_to } = payload.email_data;
  const url = new URL("/auth/v1/verify", supabaseUrl);
  url.searchParams.set("token", token_hash);
  url.searchParams.set("type", email_action_type);
  if (redirect_to) url.searchParams.set("redirect_to", redirect_to);
  return url.toString();
}

export const Route = createFileRoute("/api/public/hooks/auth-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const hookSecretRaw = process.env.SUPABASE_AUTH_HOOK_SECRET;
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!hookSecretRaw || !supabaseUrl || !supabaseServiceKey) {
          console.error("auth-email: missing required environment variables");
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }

        const body = await request.text();

        let payload: SendEmailHookPayload;
        try {
          // Supabase's dashboard may show the secret as "v1,whsec_..." —
          // strip a leading "v1," if present; the library itself strips
          // the "whsec_" prefix.
          const hookSecret = hookSecretRaw.startsWith("v1,")
            ? hookSecretRaw.slice(3)
            : hookSecretRaw;
          const wh = new Webhook(hookSecret);
          const headers: Record<string, string> = {
            "webhook-id": request.headers.get("webhook-id") ?? "",
            "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
            "webhook-signature": request.headers.get("webhook-signature") ?? "",
          };
          payload = wh.verify(body, headers) as SendEmailHookPayload;
        } catch (error) {
          if (error instanceof WebhookVerificationError) {
            console.error("auth-email: signature verification failed", { error: error.message });
            return Response.json({ error: "Invalid signature" }, { status: 401 });
          }
          console.error("auth-email: invalid payload", { error });
          return Response.json({ error: "Invalid webhook payload" }, { status: 400 });
        }

        const emailType = payload.email_data?.email_action_type;
        const EmailTemplate = emailType ? EMAIL_TEMPLATES[emailType] : undefined;
        if (!emailType || !EmailTemplate) {
          console.error("auth-email: unknown or missing email_action_type", { emailType });
          return Response.json(
            { error: `Unknown email type: ${String(emailType)}` },
            { status: 400 },
          );
        }

        const recipient = recipientFor(payload);
        if (!recipient) {
          console.error("auth-email: could not determine recipient", { emailType });
          return Response.json({ error: "Missing recipient" }, { status: 400 });
        }

        console.log("auth-email: received", { emailType, email_redacted: redactEmail(recipient) });

        const confirmationUrl = confirmationUrlFor(payload, supabaseUrl);
        const element = EmailTemplate({
          confirmationUrl,
          recipient,
          oldEmail: payload.user.email ?? "",
          newEmail: payload.user.new_email ?? "",
          token: payload.email_data.token ?? "",
        });
        const html = await render(element);
        const text = await render(element, { plainText: true });

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const messageId = crypto.randomUUID();
        const fromDomain = "erp.stonetech.in"; // Resend-verified sending domain

        await supabase.from("email_send_log").insert({
          message_id: messageId,
          template_name: emailType,
          recipient_email: recipient,
          status: "pending",
        });

        const { error: enqueueError } = await supabase.rpc("enqueue_email", {
          queue_name: "auth_emails",
          payload: {
            message_id: messageId,
            to: recipient,
            from: `${SITE_NAME} <noreply@${fromDomain}>`,
            subject: EMAIL_SUBJECTS[emailType],
            html,
            text,
            purpose: "transactional",
            label: emailType,
            queued_at: new Date().toISOString(),
          },
        });

        if (enqueueError) {
          console.error("auth-email: failed to enqueue", { error: enqueueError, emailType });
          await supabase.from("email_send_log").insert({
            message_id: messageId,
            template_name: emailType,
            recipient_email: recipient,
            status: "failed",
            error_message: "Failed to enqueue email",
          });
          return Response.json({ error: "Failed to enqueue email" }, { status: 500 });
        }

        console.log("auth-email: enqueued", { emailType, email_redacted: redactEmail(recipient) });
        return Response.json({ success: true, queued: true });
      },
    },
  },
});
