import * as React from "react";
import { render } from "@react-email/render";
import { createFileRoute } from "@tanstack/react-router";
import { SignupEmail } from "@/lib/email-templates/signup";
import { InviteEmail } from "@/lib/email-templates/invite";
import { MagicLinkEmail } from "@/lib/email-templates/magic-link";
import { RecoveryEmail } from "@/lib/email-templates/recovery";
import { EmailChangeEmail } from "@/lib/email-templates/email-change";
import { ReauthenticationEmail } from "@/lib/email-templates/reauthentication";

/**
 * Renders a sample of one of the 6 auth email templates, for eyeballing
 * layout/copy without triggering a real Supabase auth event. Replaces
 * src/routes/lovable/email/auth/preview.ts. Gated by CRON_SECRET (reusing
 * the same internal-operations secret every cron/webhook endpoint already
 * has, rather than introducing a dedicated one) — send it as
 * `Authorization: Bearer $CRON_SECRET`.
 */

type EmailRenderer = (data: Record<string, unknown>) => React.ReactElement;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

const SITE_NAME = "stone-flow-hub";
const SAMPLE_URL = "https://erp.stonetech.in/auth/v1/verify?token=sample&type=signup";
const SAMPLE_EMAIL = "user@example.test";

const EMAIL_TEMPLATES: Record<string, EmailRenderer> = {
  signup: (d) =>
    React.createElement(SignupEmail, {
      siteName: SITE_NAME,
      siteUrl: str(d.siteUrl),
      recipient: str(d.recipient),
      confirmationUrl: str(d.confirmationUrl),
    }),
  invite: (d) =>
    React.createElement(InviteEmail, {
      siteName: SITE_NAME,
      siteUrl: str(d.siteUrl),
      confirmationUrl: str(d.confirmationUrl),
    }),
  magiclink: (d) =>
    React.createElement(MagicLinkEmail, {
      siteName: SITE_NAME,
      confirmationUrl: str(d.confirmationUrl),
    }),
  recovery: (d) =>
    React.createElement(RecoveryEmail, {
      siteName: SITE_NAME,
      confirmationUrl: str(d.confirmationUrl),
    }),
  email_change: (d) =>
    React.createElement(EmailChangeEmail, {
      siteName: SITE_NAME,
      oldEmail: str(d.oldEmail),
      email: str(d.email),
      newEmail: str(d.newEmail),
      confirmationUrl: str(d.confirmationUrl),
    }),
  reauthentication: (d) =>
    React.createElement(ReauthenticationEmail, {
      token: str(d.token),
    }),
};

const SAMPLE_DATA: Record<string, Record<string, unknown>> = {
  signup: { siteUrl: SAMPLE_URL, recipient: SAMPLE_EMAIL, confirmationUrl: SAMPLE_URL },
  magiclink: { confirmationUrl: SAMPLE_URL },
  recovery: { confirmationUrl: SAMPLE_URL },
  invite: { siteUrl: SAMPLE_URL, confirmationUrl: SAMPLE_URL },
  email_change: {
    oldEmail: SAMPLE_EMAIL,
    email: SAMPLE_EMAIL,
    newEmail: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_URL,
  },
  reauthentication: { token: "123456" },
};

export const Route = createFileRoute("/api/public/hooks/email-preview")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = process.env.CRON_SECRET || process.env.CRON_SHARED_SECRET;
        if (!cronSecret) {
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }

        const authHeader = request.headers.get("Authorization");
        if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        let type: string;
        try {
          const body = await request.json();
          type = body.type;
        } catch {
          return Response.json({ error: "Invalid JSON in request body" }, { status: 400 });
        }

        const EmailTemplate = EMAIL_TEMPLATES[type];
        if (!EmailTemplate) {
          return Response.json({ error: `Unknown email type: ${type}` }, { status: 400 });
        }

        const sampleData = SAMPLE_DATA[type] || {};
        const html = await render(EmailTemplate(sampleData));

        return new Response(html, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      },
    },
  },
});
