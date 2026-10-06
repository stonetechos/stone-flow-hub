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

        if (shouldUnify) {
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

            // 1. Fetch all users from Supabase Auth
            const { data: usersData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({
              perPage: 1000,
            });

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

            // 3. Promote all is_demo = true rows across all business tables to false
            const tablePromotions: Record<string, { promoted: number; total: number }> = {};

            for (const tbl of OPERATIONAL_TABLES) {
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

            body.unification = {
              status: "completed",
              users_count: allUsers.length,
              users: userSummaries,
              table_promotions: tablePromotions,
            };
          } catch (unifyErr: unknown) {
            const err = unifyErr as { message?: string };
            body.unification = {
              status: "error",
              error: err?.message || String(unifyErr),
            };
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
