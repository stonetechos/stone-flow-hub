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
import { DEFAULT_DESIGNATIONS, DEFAULT_DESIGNATION_IDS, type Employee } from "./types";
import type { Database } from "@/integrations/supabase/types";

const employeeMutationInput = z.object({
  id: z.string().uuid().optional(),
  data: employeeSchema,
  systemRole: z.string().optional(),
});

export const saveEmployeeServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => employeeMutationInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, data: input, systemRole } = data;

    // 1. Resolve and sanitize user_id
    let targetUserId = input.user_id ?? null;
    if (targetUserId) {
      try {
        const { data: userRow } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
        if (!userRow?.user) {
          targetUserId = null;
        } else {
          // Check if already linked to a different employee
          const { data: existingEmp } = await supabaseAdmin
            .from("employees")
            .select("id")
            .eq("user_id", targetUserId)
            .maybeSingle();
          if (existingEmp && existingEmp.id !== id) {
            targetUserId = null;
          }
        }
      } catch {
        targetUserId = null;
      }
    } else if (input.email?.trim()) {
      const emailClean = input.email.trim().toLowerCase();
      try {
        const { data: prof } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", emailClean)
          .maybeSingle();
        if (prof?.id) {
          const { data: existingEmp } = await supabaseAdmin
            .from("employees")
            .select("id")
            .eq("user_id", prof.id)
            .maybeSingle();
          if (!existingEmp || existingEmp.id === id) {
            targetUserId = prof.id;
          }
        }
      } catch {
        /* skip profile lookup error */
      }
    }

    // 2. Resolve designation IDs (ensure foreign keys are valid in DB)
    const rawDesignationIds =
      input.designation_ids && input.designation_ids.length > 0
        ? input.designation_ids
        : input.designation_id
          ? [input.designation_id]
          : [];

    const validDesignationIds: string[] = [];

    for (const dId of rawDesignationIds) {
      try {
        const { data: desigRow } = await supabaseAdmin
          .from("designations")
          .select("id")
          .eq("id", dId)
          .maybeSingle();

        if (desigRow?.id) {
          validDesignationIds.push(desigRow.id);
        } else {
          // Check fallback match by ID or index
          const fallbackEntry = Object.entries(DEFAULT_DESIGNATION_IDS).find(
            ([, idVal]) => idVal === dId,
          );
          const fallbackMatch = fallbackEntry
            ? DEFAULT_DESIGNATIONS.find((d) => d.code === fallbackEntry[0])
            : DEFAULT_DESIGNATIONS.find(
                (d, idx) => `00000000-0000-0000-0000-${String(idx + 1).padStart(12, "0")}` === dId,
              );

          if (fallbackMatch) {
            const { data: upserted } = await supabaseAdmin
              .from("designations")
              .upsert(
                {
                  id: dId,
                  code: fallbackMatch.code,
                  name: fallbackMatch.name,
                  purpose: fallbackMatch.purpose,
                  responsibilities: fallbackMatch.responsibilities,
                  expected_outcomes: fallbackMatch.expected_outcomes,
                  level: fallbackMatch.level,
                  active: fallbackMatch.active,
                },
                { onConflict: "code" },
              )
              .select("id")
              .maybeSingle();

            if (upserted?.id) {
              validDesignationIds.push(upserted.id);
            }
          }
        }
      } catch (desigErr) {
        console.warn("[workforce.functions] Designation check failed for ID:", dId, desigErr);
      }
    }

    const validPrimaryDesignationId = validDesignationIds[0] ?? null;

    // 3. Resolve reporting_manager_id
    let validManagerId: string | null = null;
    if (input.reporting_manager_id) {
      try {
        const { data: mgrRow } = await supabaseAdmin
          .from("employees")
          .select("id")
          .eq("id", input.reporting_manager_id)
          .maybeSingle();
        if (mgrRow?.id && mgrRow.id !== id) {
          validManagerId = mgrRow.id;
        }
      } catch {
        /* skip */
      }
    }

    // 4. Prepare payload with KRAs, KPAs & multiple designation IDs safely stored inside bank_details
    const baseBankDetails =
      input.bank_details && typeof input.bank_details === "object" ? input.bank_details : {};
    const bankWithMeta = {
      ...baseBankDetails,
      _kras: input.kras ?? [],
      _kpas: input.kpas ?? [],
      _designation_ids: validDesignationIds,
    };

    // Only standard schema-verified columns are included in rowPayload
    // (Never kras, kpas, or designation_ids at the top level, preventing PGRST204 errors)
    const rowPayload: Record<string, unknown> = {
      full_name: input.full_name.trim(),
      designation_id: validPrimaryDesignationId,
      department: input.department?.trim() || null,
      employment_type: input.employment_type || "full_time",
      reporting_manager_id: validManagerId,
      joining_date: input.joining_date?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email ? input.email.trim().toLowerCase() : null,
      emergency_contact: input.emergency_contact?.trim() || null,
      address: input.address?.trim() || null,
      aadhaar: input.aadhaar?.trim() || null,
      pan: input.pan?.trim() ? input.pan.trim().toUpperCase() : null,
      bank_details: bankWithMeta,
      salary_ctc: input.salary_ctc ?? null,
      skills: Array.isArray(input.skills) ? input.skills : [],
      employment_status: input.employment_status || "active",
      photo_url: input.photo_url?.trim() || null,
      remarks: input.remarks?.trim() || null,
      user_id: targetUserId,
    };

    let savedEmployee: Employee | null = null;

    if (id) {
      const { data: updated, error } = await supabaseAdmin
        .from("employees")
        .update(rowPayload as unknown as Database["public"]["Tables"]["employees"]["Update"])
        .eq("id", id)
        .select("*")
        .single();
      if (error) {
        console.error("[workforce.functions] Update employee failed:", error);
        throw new Error(error.message || "Failed to update employee");
      }
      savedEmployee = updated as unknown as Employee;
    } else {
      // First attempt with employee_code: "" to let trigger set_employee_code generate sequence
      const res1 = await supabaseAdmin
        .from("employees")
        .insert({
          ...rowPayload,
          employee_code: "",
        } as unknown as Database["public"]["Tables"]["employees"]["Insert"])
        .select("*")
        .single();

      let created = res1.data;
      let err = res1.error;

      // If "" failed for trigger or sequence issue, generate a fallback unique code
      if (err && (err.message?.includes("employee_code") || err.code === "23502")) {
        const fallbackCode = `EMP-${Date.now().toString().slice(-5)}`;
        const res2 = await supabaseAdmin
          .from("employees")
          .insert({
            ...rowPayload,
            employee_code: fallbackCode,
          } as unknown as Database["public"]["Tables"]["employees"]["Insert"])
          .select("*")
          .single();
        created = res2.data;
        err = res2.error;
      }

      if (err) {
        console.error("[workforce.functions] Insert employee failed:", err);
        throw new Error(err.message || "Failed to create employee");
      }
      savedEmployee = created as unknown as Employee;
    }

    // 5. Assign system role if user_id linked and role specified
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

    return {
      ...savedEmployee,
      designation_ids: validDesignationIds,
      kras: input.kras ?? [],
      kpas: input.kpas ?? [],
    } as unknown as Employee;
  });

export const deleteEmployeeServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("employees").delete().eq("id", data.id);
    if (error) {
      console.error("[workforce.functions] Delete employee failed:", error);
      throw new Error(error.message || "Failed to delete employee");
    }
    return { success: true };
  });

export const getEmployeeServerFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: emp, error } = await supabaseAdmin
      .from("employees")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) {
      console.error("[workforce.functions] getEmployeeServerFn failed:", error);
      throw new Error(error.message || "Failed to fetch employee");
    }
    if (!emp) return null;

    const bankObj =
      emp.bank_details && typeof emp.bank_details === "object"
        ? (emp.bank_details as Record<string, unknown>)
        : {};
    const kras =
      (emp as unknown as { kras?: unknown }).kras ?? (bankObj as { _kras?: unknown })._kras ?? [];
    const kpas =
      (emp as unknown as { kpas?: unknown }).kpas ?? (bankObj as { _kpas?: unknown })._kpas ?? [];
    const rawDesigIds = (bankObj as { _designation_ids?: unknown })._designation_ids;
    const designationIds: string[] = Array.isArray(rawDesigIds)
      ? (rawDesigIds as string[])
      : emp.designation_id
        ? [emp.designation_id]
        : [];

    return {
      ...emp,
      designation_ids: designationIds,
      kras: Array.isArray(kras) ? kras : [],
      kpas: Array.isArray(kpas) ? kpas : [],
      skills: Array.isArray(emp.skills) ? emp.skills : [],
    } as unknown as Employee;
  });

export const listEmployeesServerFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ q: z.string().optional() }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("employees")
      .select("*")
      .order("full_name", { ascending: true })
      .limit(500);
    if (data.q?.trim()) {
      const s = data.q.trim();
      query = query.or(
        [
          `full_name.ilike.%${s}%`,
          `employee_code.ilike.%${s}%`,
          `email.ilike.%${s}%`,
          `phone.ilike.%${s}%`,
        ].join(","),
      );
    }
    const { data: emps, error } = await query;
    if (error) {
      console.error("[workforce.functions] listEmployeesServerFn failed:", error);
      throw new Error(error.message || "Failed to list employees");
    }
    return (emps ?? []).map((e) => {
      const bankObj =
        e.bank_details && typeof e.bank_details === "object"
          ? (e.bank_details as Record<string, unknown>)
          : {};
      const rawDesigIds = (bankObj as { _designation_ids?: unknown })._designation_ids;
      const designationIds: string[] = Array.isArray(rawDesigIds)
        ? (rawDesigIds as string[])
        : e.designation_id
          ? [e.designation_id]
          : [];

      return {
        ...e,
        designation_ids: designationIds,
        skills: Array.isArray(e.skills) ? e.skills : [],
      };
    }) as unknown as Employee[];
  });

export const listDesignationsServerFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Ensure all standard designations exist in DB so foreign keys succeed
    for (const d of DEFAULT_DESIGNATIONS) {
      const fixedId = DEFAULT_DESIGNATION_IDS[d.code];
      try {
        await supabaseAdmin.from("designations").upsert(
          {
            id: fixedId,
            code: d.code,
            name: d.name,
            purpose: d.purpose,
            responsibilities: d.responsibilities,
            expected_outcomes: d.expected_outcomes,
            level: d.level,
            active: d.active,
          },
          { onConflict: "code" },
        );
      } catch (err) {
        console.warn("[workforce.functions] Upserting default designation failed:", d.code, err);
      }
    }

    const { data, error } = await supabaseAdmin
      .from("designations")
      .select("*")
      .order("level", { ascending: false });

    if (error) {
      console.warn("[workforce.functions] listDesignationsServerFn failed:", error);
    }
    return data ?? [];
  });
