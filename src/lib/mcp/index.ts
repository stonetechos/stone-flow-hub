/**
 * STOS MCP server.
 *
 * External AI clients (ChatGPT, Claude, Codex, etc.) connect over OAuth 2.1
 * against this app's Supabase issuer. Every tool runs as the authenticated
 * app user under RLS — see src/lib/mcp/util.ts.
 *
 * Tool set is deliberately small and read-mostly for v1. Add new tools by
 * dropping a file under ./tools/ and importing it below.
 */
import { auth, defineMcp } from "@lovable.dev/mcp-js";

import whoami from "./tools/whoami";
import listCustomers from "./tools/list-customers";
import getCustomer from "./tools/get-customer";
import listEnquiries from "./tools/list-enquiries";
import listQuotes from "./tools/list-quotes";
import listInvoices from "./tools/list-invoices";
import listTasks from "./tools/list-tasks";
import dashboard from "./tools/dashboard";

// SUPABASE_URL is rewritten to the .lovable.cloud proxy on publish, which
// mcp-js rejects as an issuer mismatch. Use the direct supabase.co host built
// from the immutable project ref; the fallback sentinel keeps the URL well
// formed if the literal is unset during manifest extraction.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "stos-mcp",
  title: "STOS",
  version: "1.0.0",
  instructions:
    "Read-mostly access to STOS — the operating system for natural-stone businesses. " +
    "Use `whoami` to confirm the signed-in staff account, then `list_customers`, `get_customer`, " +
    "`list_enquiries`, `list_quotes`, `list_invoices`, `list_my_tasks` or `get_dashboard_snapshot` " +
    "to answer questions about the business. Every tool respects the signed-in user's row-level " +
    "security — you can only see rows the current user is allowed to see.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    whoami,
    listCustomers,
    getCustomer,
    listEnquiries,
    listQuotes,
    listInvoices,
    listTasks,
    dashboard,
  ],
});
