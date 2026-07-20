import * as React from "react";
import { render } from "@react-email/render";
import { createFileRoute } from "@tanstack/react-router";
import { SignupEmail } from "@/lib/email-templates/signup";
import { InviteEmail } from "@/lib/email-templates/invite";
import { MagicLinkEmail } from "@/lib/email-templates/magic-link";
import { RecoveryEmail } from "@/lib/email-templates/recovery";
import { EmailChangeEmail } from "@/lib/email-templates/email-change";
import { ReauthenticationEmail } from "@/lib/email-templates/reauthentication";

type EmailRenderer = (data: Record<string, unknown>) => React.ReactElement;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

const EMAIL_TEMPLATES: Record<string, EmailRenderer> = {
  signup: (d) =>
    React.createElement(SignupEmail, {
      siteName: str(d.siteName),
      siteUrl: str(d.siteUrl),
      recipient: str(d.recipient),
      confirmationUrl: str(d.confirmationUrl),
    }),
  invite: (d) =>
    React.createElement(InviteEmail, {
      siteName: str(d.siteName),
      siteUrl: str(d.siteUrl),
      confirmationUrl: str(d.confirmationUrl),
    }),
  magiclink: (d) =>
    React.createElement(MagicLinkEmail, {
      siteName: str(d.siteName),
      confirmationUrl: str(d.confirmationUrl),
    }),
  recovery: (d) =>
    React.createElement(RecoveryEmail, {
      siteName: str(d.siteName),
      confirmationUrl: str(d.confirmationUrl),
    }),
  email_change: (d) =>
    React.createElement(EmailChangeEmail, {
      siteName: str(d.siteName),
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

// Configuration
const SITE_NAME = "stone-flow-hub";
const ROOT_DOMAIN = "erp.stonetech.in";

// Sample data for preview mode ONLY (not used in actual email sending).
// URLs are baked in at scaffold time from the project's real data.
// The sample email uses a fixed placeholder (RFC 6761 .test TLD) so the Go backend
// can always find-and-replace it with the actual recipient when sending test emails,
// even if the project's domain has changed since the template was scaffolded.
const SAMPLE_PROJECT_URL = "https://stone-flow-hub.lovable.app";
const SAMPLE_EMAIL = "user@example.test";
const SAMPLE_DATA: Record<string, Record<string, unknown>> = {
  signup: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    recipient: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  magiclink: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  recovery: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  invite: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  email_change: {
    siteName: SITE_NAME,
    oldEmail: SAMPLE_EMAIL,
    email: SAMPLE_EMAIL,
    newEmail: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  reauthentication: {
    token: "123456",
  },
};

export const Route = createFileRoute("/lovable/email/auth/preview")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;

        if (!apiKey) {
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }

        // Verify the caller is authorized with LOVABLE_API_KEY
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
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
