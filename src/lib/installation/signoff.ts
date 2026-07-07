/** Installation customer sign-off. Signature is stored as a file_object attachment. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { uploadAttachment } from "@/lib/attachments/api";
import { z } from "zod";

export type Signoff = {
  id: string;
  installation_id: string;
  signed_at: string;
  customer_name: string | null;
  customer_rating: number | null;
  remarks: string | null;
  signature_file_id: string | null;
  signed_by: string | null;
  created_at: string;
};

export const signoffSchema = z.object({
  installation_id: z.string().uuid(),
  customer_name: z.string().nullable().optional(),
  customer_rating: z.number().int().min(1).max(5).nullable().optional(),
  remarks: z.string().nullable().optional(),
  signature_data_url: z.string().nullable().optional(), // canvas signature or photo
});
export type SignoffInput = z.infer<typeof signoffSchema>;

export async function getSignoff(installationId: string): Promise<Signoff | null> {
  const { data, error } = await supabase
    .from("installation_signoffs" as never)
    .select("*")
    .eq("installation_id", installationId)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data ?? null) as unknown as Signoff | null;
}

export async function createSignoff(input: SignoffInput): Promise<Signoff> {
  const p = signoffSchema.parse(input);

  let signatureFileId: string | null = null;
  if (p.signature_data_url) {
    const blob = dataUrlToBlob(p.signature_data_url);
    const file = new File([blob], `signature_${Date.now()}.png`, { type: "image/png" });
    const row = await uploadAttachment({
      entityType: "installation",
      entityId: p.installation_id,
      folder: "other",
      file,
    });
    signatureFileId = row.id;
  }

  const user = (await supabase.auth.getUser()).data.user;
  const { data, error } = await supabase
    .from("installation_signoffs" as never)
    .insert({
      installation_id: p.installation_id,
      customer_name: p.customer_name ?? null,
      customer_rating: p.customer_rating ?? null,
      remarks: p.remarks ?? null,
      signature_file_id: signatureFileId,
      signed_by: user?.id ?? null,
    } as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as Signoff;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(",");
  const mime = /data:(.*?);/.exec(header ?? "")?.[1] ?? "image/png";
  const bin = atob(b64 ?? "");
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
