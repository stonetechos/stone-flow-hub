/**
 * Server functions for Workforce & Employee management.
 *
 * Runs on the server with supabaseAdmin (service role) to bypass client-side
 * RLS restrictions when creating/updating employees and assigning system roles.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { employeeSchema } from "./schema";
import type { Employee } from "./types";
import type { Database } from "@/integrations/supabase/types";

const employeeMutationInput = z.object({
  id: z.string().uuid().optional(),
  data: employeeSchema,
  systemRole: z.string().optional(),
});

export const saveEmployeeServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => employeeMutationInput.parse(raw))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, data: input, systemRole } = data;

    let targetUserId = input.user_id ?? null;

    // If an email is provided and no user_id is linked yet, check profiles / auth
    if (input.email?.trim() && !targetUserId) {
      const emailClean = input.email.trim().toLowerCase();
      try {
        const { data: prof } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", emailClean)
          .maybeSingle();
        if (prof?.id) {
          targetUserId = prof.id;
        }
      } catch {
        /* skip profile lookup error */
      }
    }

    // Prepare payload with backup of KRAs & KPAs inside bank_details for zero-migration failure risk
    const baseBankDetails =
      input.bank_details && typeof input.bank_details === "object" ? input.bank_details : {};
    const bankWithMeta = {
      ...baseBankDetails,
      _kras: input.kras ?? [],
      _kpas: input.kpas ?? [],
    };

    const rowPayload: Record<string, unknown> = {
      full_name: input.full_name,
      designation_id: input.designation_id || null,
      department: input.department || null,
      employment_type: input.employment_type,
      reporting_manager_id: input.reporting_manager_id || null,
      joining_date: input.joining_date || null,
      phone: input.phone || null,
      email: input.email ? input.email.trim().toLowerCase() : null,
      emergency_contact: input.emergency_contact || null,
      address: input.address || null,
      aadhaar: input.aadhaar || null,
      pan: input.pan || null,
      bank_details: bankWithMeta,
      salary_ctc: input.salary_ctc ?? null,
      skills: input.skills ?? [],
      kras: input.kras ?? [],
      kpas: input.kpas ?? [],
      employment_status: input.employment_status,
      photo_url: input.photo_url || null,
      remarks: input.remarks || null,
      user_id: targetUserId,
    };

    let savedEmployee: Employee | null = null;

    async function executeSave(payload: Record<string, unknown>): Promise<Employee> {
      if (id) {
        const { data: updated, error } = await supabaseAdmin
          .from("employees")
          .update(payload as unknown as Database["public"]["Tables"]["employees"]["Update"])
          .eq("id", id)
          .select("*")
          .single();
        if (error) throw error;
        return updated as unknown as Employee;
      } else {
        const insertPayload = {
          ...payload,
          employee_code: "",
        } as unknown as Database["public"]["Tables"]["employees"]["Insert"];
        const { data: created, error } = await supabaseAdmin
          .from("employees")
          .insert(insertPayload)
          .select("*")
          .single();
        if (error) throw error;
        return created as unknown as Employee;
      }
    }

    try {
      savedEmployee = await executeSave(rowPayload);
    } catch (err: unknown) {
      const dbErr = err as { code?: string; message?: string };
      // 42703 is Postgres undefined_column error if kras / kpas columns haven't been migrated yet
      if (dbErr.code === "42703" || dbErr.message?.includes('column "kras"')) {
        const fallbackPayload = { ...rowPayload };
        delete fallbackPayload.kras;
        delete fallbackPayload.kpas;
        savedEmployee = await executeSave(fallbackPayload);
      } else {
        throw new Error(dbErr.message || "Failed to save employee");
      }
    }

    // If a system role was specified and the employee has an associated user_id, assign role
    if (targetUserId && systemRole) {
      try {
        await supabaseAdmin.from("user_roles").upsert(
          {
            user_id: targetUserId,
            role: systemRole as Database["public"]["Enums"]["app_role"],
          },
          { onConflict: "user_id,role" },
        );
      } catch (roleErr) {
        console.warn("[workforce.functions] Failed to assign user role:", roleErr);
      }
    }

    return savedEmployee;
  });
