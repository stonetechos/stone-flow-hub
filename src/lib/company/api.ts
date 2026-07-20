/**
 * Company Profile / Company Master — API layer.
 *
 * `company_profiles` isn't in the generated Supabase types yet (no live DB
 * connection in this sandbox to regenerate them against — same situation
 * as `insight_states`/`payment_register` elsewhere in this codebase), so
 * table and storage access go through `as never` casts here, following
 * that exact precedent.
 *
 * Only one row has `is_active = true` at a time (enforced by a partial
 * unique index in the migration) — `getActiveCompanyProfile()` is the
 * single read path every consumer (settings page, lib/branding, any
 * future caller) should use, so there is exactly one source of truth for
 * "our own company" details across the app (Requirement 12).
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export interface CompanyProfileRow {
  id: string;
  is_active: boolean;
  company_name: string;
  gstin: string | null;
  legal_business_name: string | null;
  trade_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  pan: string | null;
  cin: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  upi_id: string | null;
  authorized_signatory: string | null;
  signature_url: string | null;
  stamp_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

/** Partial on purpose — `updateCompanyProfile` patches whatever subset of
 *  columns the caller has (a single asset upload patches one URL column;
 *  the settings form patches the full validated set). `company_name` is
 *  required at the Zod layer (companyProfileSchema) for a full form save,
 *  not here, since a full-row requirement would break single-field
 *  patches like the upload handlers. */
export type CompanyProfileInput = Partial<
  Omit<
    CompanyProfileRow,
    "id" | "is_active" | "created_at" | "updated_at" | "created_by" | "updated_by"
  >
>;

const TABLE = "company_profiles" as never;
const BUCKET = "company-assets";

/** The single active company profile, or null if none has been created
 *  yet (fresh install before the seed migration runs, or all rows were
 *  somehow deactivated). Every consumer — the settings page and every
 *  document/print/email surface via lib/branding — reads through here. */
export async function getActiveCompanyProfile(): Promise<CompanyProfileRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as unknown as CompanyProfileRow | null) ?? null;
}

/** Updates the active company profile in place (Requirement 6 — "save
 *  permanently"; Requirement 8 — one active profile by default). RLS
 *  restricts this to admins; `updated_by` is stamped for audit purposes. */
export async function updateCompanyProfile(
  id: string,
  patch: CompanyProfileInput,
): Promise<CompanyProfileRow> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...patch, updated_by: auth.user?.id ?? null } as never)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as CompanyProfileRow;
}

export type CompanyAssetKind = "logo" | "signature" | "stamp";

/** Uploads a logo/signature/stamp image to the public company-assets
 *  bucket and returns its durable public URL — these need to render
 *  inside generated PDFs and emails sent to recipients who are never
 *  authenticated Supabase users, so a public URL is used instead of the
 *  short-lived signed URLs the private stonetech-files bucket returns
 *  (lib/attachments/api.ts). RLS on storage.objects still restricts
 *  writes to admins; reads are public by bucket policy. */
export async function uploadCompanyAsset(
  companyId: string,
  kind: CompanyAssetKind,
  file: File,
): Promise<string> {
  const path = `${companyId}/${kind}_${Date.now()}_${file.name}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: true,
  });
  if (up.error) throw new AppError(up.error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(up.data.path);
  return data.publicUrl;
}
