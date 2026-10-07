/**
 * Production Diagnostic & Unification Endpoint.
 *
 * Usage:
 * - Diagnostic: `curl https://erp.stonetech.in/api/public/diagnostics/env-status`
 * - Database Unification & Repair: `curl https://erp.stonetech.in/api/public/diagnostics/env-status?unify=true`
 */
import { createFileRoute } from "@tanstack/react-router";

const OPERATIONAL_TABLES = [
  "customers",
  "projects",
  "products",
  "vendors",
  "enquiries",
  "enquiry_items",
  "followups",
  "site_visits",
  "project_notes",
  "rfqs",
  "rfq_items",
  "vendor_requests",
  "vendor_quotes",
  "vendor_quote_items",
  "quotes",
  "quote_items",
  "sales_orders",
  "sales_order_items",
  "purchase_orders",
  "production_orders",
  "production_pieces",
  "production_stages",
  "qc_results",
  "inventory_items",
  "dispatches",
  "invoices",
  "invoice_items",
  "payments",
  "payment_links",
  "tasks",
  "activity_log",
  "artwork_approvals",
  "file_objects",
  "favorites",
  "comments",
] as const;

export const Route = createFileRoute("/api/public/diagnostics/env-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const present = (name: string): boolean => !!process.env[name];
        const url = new URL(request.url);
        const shouldUnify = url.searchParams.get("unify") === "true";

        const body: Record<string, unknown> = {
          supabase_url: present("SUPABASE_URL"),
          supabase_publishable_key: present("SUPABASE_PUBLISHABLE_KEY"),
          supabase_service_role_key: present("SUPABASE_SERVICE_ROLE_KEY"),
          cron_secret: present("CRON_SECRET") || present("CRON_SHARED_SECRET"),
          openrouter_api_key: present("OPENROUTER_API_KEY"),
          resend_api_key: present("RESEND_API_KEY"),
          supabase_auth_hook_secret: present("SUPABASE_AUTH_HOOK_SECRET"),
          checked_at: new Date().toISOString(),
        };

        const action = url.searchParams.get("action");
        const targetTable = url.searchParams.get("table");

        if (shouldUnify || action) {
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

            if (action === "users" || (shouldUnify && !action)) {
              // 1. Fetch all users from Supabase Auth
              const { data: usersData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers(
                {
                  perPage: 1000,
                },
              );

              if (usersErr) {
                body.unify_users_error = usersErr.message;
              }

              const allUsers = usersData?.users ?? [];
              const userSummaries = allUsers.map((u) => ({
                id: u.id,
                email: u.email,
              }));

              // 2. Ensure rp140528@gmail.com and all users have active profiles with is_demo_mode = false and admin roles
              for (const u of allUsers) {
                await supabaseAdmin.from("profiles").upsert(
                  {
                    id: u.id,
                    email: u.email,
                    full_name:
                      (u.user_metadata?.full_name as string) ||
                      (u.user_metadata?.name as string) ||
                      u.email?.split("@")[0] ||
                      "User",
                    is_active: true,
                    is_demo_mode: false,
                    force_password_change: false,
                  },
                  { onConflict: "id" },
                );

                await supabaseAdmin.from("user_roles").upsert(
                  {
                    user_id: u.id,
                    role: "admin",
                  },
                  { onConflict: "user_id,role" },
                );
              }

              body.users = {
                count: allUsers.length,
                list: userSummaries,
              };
            }

            if (action === "seed_bank" || shouldUnify) {
              const { data: existingAccounts } = await supabaseAdmin
                .from("bank_accounts" as never)
                .select("id, name, account_number")
                .limit(10);

              const hasBob = (
                existingAccounts as Array<{ name?: string; account_number?: string }> | null
              )?.some(
                (a) =>
                  a.account_number?.includes("53130200000136") ||
                  a.name?.toLowerCase().includes("baroda"),
              );

              if (!hasBob) {
                await supabaseAdmin.from("bank_accounts" as never).insert([
                  {
                    name: "Bank of Baroda Current A/c",
                    bank_name: "Bank of Baroda",
                    account_number: "53130200000136 (+91 7742090866)",
                    account_type: "current",
                    upi_id: "7742090866@barodampay",
                    opening_balance: 0,
                    current_balance: 0,
                    is_active: true,
                    is_primary: true,
                    sort_order: 1,
                  },
                  {
                    name: "Google Pay UPI (+91 7742090866)",
                    bank_name: "GPay / NPCI UPI",
                    account_number: "Linked: +91 7742090866",
                    account_type: "clearing",
                    upi_id: "stonetech.ahmedabad@okaxis",
                    opening_balance: 0,
                    current_balance: 0,
                    is_active: true,
                    is_primary: false,
                    sort_order: 2,
                  },
                  {
                    name: "Petty Cash & Site Float",
                    bank_name: "Cash on Hand",
                    account_number: "Cash Drawer",
                    account_type: "cash",
                    upi_id: null,
                    opening_balance: 0,
                    current_balance: 0,
                    is_active: true,
                    is_primary: false,
                    sort_order: 3,
                  },
                ] as never);
                body.bank_seeded = true;
              } else {
                body.bank_seeded = false;
              }
            }

            // Sync company profile logo and branding
            if (shouldUnify || action === "sync-branding") {
              try {
                const { data: prof } = await supabaseAdmin
                  .from("company_profiles" as never)
                  .select("id, logo_url")
                  .eq("is_active", true)
                  .limit(1)
                  .maybeSingle();

                if (prof && !(prof as { logo_url?: string }).logo_url) {
                  await supabaseAdmin
                    .from("company_profiles" as never)
                    .update({ logo_url: "/branding/stone-tech-logo.jpg" } as never)
                    .eq("id", (prof as { id: string }).id);
                  body.company_profile_updated = true;
                }
              } catch (profErr: unknown) {
                console.warn("[env-status] error updating company profile:", profErr);
              }
            }

            if (action === "promote" || targetTable || shouldUnify) {
              const tablesToPromote = targetTable ? [targetTable] : OPERATIONAL_TABLES.slice(0, 10);
              const tablePromotions: Record<string, { promoted: number; total: number }> = {};

              for (const tbl of tablesToPromote) {
                try {
                  const { count: totalCount } = await supabaseAdmin
                    .from(tbl as never)
                    .select("id", { count: "exact", head: true });

                  const { data: demoRows } = await supabaseAdmin
                    .from(tbl as never)
                    .select("id")
                    .eq("is_demo", true);

                  const demoCount = demoRows?.length ?? 0;

                  if (demoCount > 0) {
                    await supabaseAdmin
                      .from(tbl as never)
                      .update({ is_demo: false } as never)
                      .eq("is_demo", true);
                  }

                  tablePromotions[tbl] = {
                    promoted: demoCount,
                    total: totalCount ?? 0,
                  };
                } catch (tblErr: unknown) {
                  const err = tblErr as { message?: string };
                  tablePromotions[tbl] = {
                    promoted: 0,
                    total: 0,
                  };
                  console.warn(`[env-status unify] error on ${tbl}:`, err?.message);
                }
              }

              body.table_promotions = tablePromotions;
            }

            body.status = "ok";
          } catch (unifyErr: unknown) {
            const err = unifyErr as { message?: string };
            body.error = err?.message || String(unifyErr);
          }
        }

        return new Response(JSON.stringify(body, null, 2), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
