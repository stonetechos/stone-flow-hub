/**
 * Cross-domain type primitives.
 * Domain-specific types live in src/lib/<domain>/types.ts.
 */
import type { Database } from "@/integrations/supabase/types";

export type DbTable<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type DbInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type DbUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type DbEnum<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];

export type AppRole = DbEnum<"app_role">;
export type LeadStage = DbEnum<"lead_stage">;
export type FollowupStatus = DbEnum<"followup_status">;
export type FileFolder = DbEnum<"file_folder">;
