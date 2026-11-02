import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import { dispatchSystemNotification } from "@/lib/notifications/systemNotifications.functions";
import {
  jobApplicationInputSchema,
  type JobApplicationInput,
  type JobApplicationStatus,
} from "./types";
import type { DbTable } from "@/lib/types";

export type JobApplicationRow = DbTable<"job_applications">;

/**
 * Public server function allowing candidates to apply directly from website/social media
 * without requiring user auth.
 */
export const submitJobApplicationServerFn = createServerFn({ method: "POST" })
  .inputValidator((raw) => jobApplicationInputSchema.parse(raw))
  .handler(
    async ({ data: input }): Promise<{ success: boolean; application_no: string; id: string }> => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // 1. Generate clean serial application number: APP-YYYY-RANDOM
      const yr = new Date().getFullYear();
      const rand = Math.floor(1000 + Math.random() * 9000);
      const appNo = `APP-${yr}-${rand}`;

      const cleanPhone = input.phone.trim();
      const cleanWhatsapp = input.whatsapp ? input.whatsapp.trim() : cleanPhone;

      // 2. Insert into job_applications table
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("job_applications")
        .insert({
          application_no: appNo,
          job_id: input.job_id,
          job_title: input.job_title,
          full_name: input.full_name,
          phone: cleanPhone,
          whatsapp: cleanWhatsapp,
          email: input.email ? input.email.trim().toLowerCase() : null,
          current_city: input.current_city,
          current_area: input.current_area,
          total_experience: input.total_experience,
          current_salary: input.current_salary || null,
          expected_salary: input.expected_salary,
          highest_qualification: input.highest_qualification,
          notice_period: input.notice_period || "Immediate",
          has_two_wheeler: Boolean(input.has_two_wheeler),
          has_driving_license: Boolean(input.has_driving_license),
          key_skills: input.key_skills || [],
          ai_tools_experience: input.ai_tools_experience || null,
          languages_known: input.languages_known || [],
          resume_url: input.resume_url || null,
          resume_file_name: input.resume_file_name || null,
          cover_note: input.cover_note || null,
          source: input.source || "website",
          status: "new",
        })
        .select("id, application_no")
        .single();

      if (insertErr) {
        console.error("[submitJobApplication] Insert failed:", insertErr);
        throw new AppError(mapDbError(insertErr));
      }

      // 3. Dispatch system notification to HR & management team inside software
      try {
        await dispatchSystemNotification({
          title: `New Job Application: ${input.full_name}`,
          scope: "admin",
          tier: "important",
          body: `Applied for ${input.job_title} · ${input.current_area}, ${input.current_city} · Exp: ${input.total_experience}${
            input.has_two_wheeler ? " · Has 2-Wheeler" : ""
          }`,
          entityType: "candidate",
          entityId: inserted.id,
          linkPath: "/hr/applications",
        });
      } catch (notifErr) {
        console.warn("[submitJobApplication] Notification dispatch warning:", notifErr);
      }

      return {
        success: true,
        application_no: inserted.application_no,
        id: inserted.id,
      };
    },
  );

/**
 * List job applications for HR / management portal with filters
 */
export async function listJobApplications(filters?: {
  status?: string;
  job_id?: string;
  search?: string;
}): Promise<JobApplicationRow[]> {
  let q = getDb().from("job_applications").select("*").order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    q = q.eq("status", filters.status);
  }
  if (filters?.job_id && filters.job_id !== "all") {
    q = q.eq("job_id", filters.job_id);
  }
  if (filters?.search && filters.search.trim()) {
    const s = filters.search.trim();
    q = q.or(
      `full_name.ilike.%${s}%,phone.ilike.%${s}%,current_area.ilike.%${s}%,job_title.ilike.%${s}%`,
    );
  }

  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as JobApplicationRow[];
}

/**
 * Update candidate status, notes, rating, and interview date
 */
export async function updateJobApplication(
  id: string,
  patch: {
    status?: JobApplicationStatus;
    interview_date?: string | null;
    interview_notes?: string | null;
    rating?: number | null;
  },
): Promise<void> {
  const { error } = await getDb()
    .from("job_applications")
    .update({
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.interview_date !== undefined ? { interview_date: patch.interview_date } : {}),
      ...(patch.interview_notes !== undefined ? { interview_notes: patch.interview_notes } : {}),
      ...(patch.rating !== undefined ? { rating: patch.rating } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new AppError(mapDbError(error));
}

/**
 * Delete / Archive a job application
 */
export async function deleteJobApplication(id: string): Promise<void> {
  const { error } = await getDb().from("job_applications").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}
