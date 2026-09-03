/**
 * Company Profile / Company Master.
 *
 * Single source of truth for "our own company" details, replacing the
 * disabled "Coming soon" stub that used to live in this tab. Every
 * document/print/email surface reads this same data through
 * lib/branding/loadBranding() -> lib/company/api.getActiveCompanyProfile()
 * — updating a field here is what Requirement 7 means by "automatically
 * reflect throughout the entire application."
 *
 * Read access: every signed-in user (RLS: `USING (true)` on SELECT).
 * Write access: admins only (RLS: `has_role(auth.uid(), 'admin')` on
 * INSERT/UPDATE/DELETE). This component mirrors that at the UI layer —
 * every field renders read-only with a "View only" badge for non-admins,
 * and the Save button never renders for them — but the real enforcement
 * is server-side RLS, exactly like every other admin-gated surface in
 * this app (see the file header comment in hooks/use-roles.tsx).
 */
import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Image as ImageIcon,
  PenTool,
  Stamp as StampIcon,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useRoles } from "@/hooks/use-roles";
import { useCompanyProfile, useUpdateCompanyProfile } from "@/lib/company/hooks";
import { uploadCompanyAsset, type CompanyAssetKind } from "@/lib/company/api";
import { companyProfileSchema, type CompanyProfileFormValues } from "@/lib/company/schema";
import { toUserMessage } from "@/lib/errors";
import { LoadingBlock } from "@/components/layout/States";

const FIELD_LABELS: Record<keyof CompanyProfileFormValues, string> = {
  company_name: "Company Name",
  gstin: "GSTIN",
  legal_business_name: "Legal Business Name",
  trade_name: "Trade Name",
  address_line1: "Address Line 1",
  address_line2: "Address Line 2",
  city: "City",
  state: "State",
  pincode: "PIN Code",
  country: "Country",
  phone: "Phone Number",
  mobile: "Mobile Number",
  email: "Email",
  website: "Website",
  logo_url: "Logo",
  pan: "PAN",
  cin: "CIN",
  bank_name: "Bank Name",
  bank_branch: "Branch",
  bank_account_number: "Account Number",
  bank_ifsc: "IFSC Code",
  upi_id: "UPI ID",
  authorized_signatory: "Authorized Signatory",
  signature_url: "Signature",
  stamp_url: "Company Stamp",
};

const EMPTY_FORM: CompanyProfileFormValues = {
  company_name: "",
  gstin: "",
  legal_business_name: "",
  trade_name: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  phone: "",
  mobile: "",
  email: "",
  website: "",
  logo_url: "",
  pan: "",
  cin: "",
  bank_name: "",
  bank_branch: "",
  bank_account_number: "",
  bank_ifsc: "",
  upi_id: "",
  authorized_signatory: "",
  signature_url: "",
  stamp_url: "",
};

export function CompanyProfileTab() {
  const roles = useRoles();
  const isAdmin = roles.isAdmin;
  const q = useCompanyProfile();
  const update = useUpdateCompanyProfile();
  const [form, setForm] = useState<CompanyProfileFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof CompanyProfileFormValues, string>>>({});
  const [uploading, setUploading] = useState<CompanyAssetKind | null>(null);

  useEffect(() => {
    if (!q.data) return;
    setForm({
      company_name: q.data.company_name ?? "",
      gstin: q.data.gstin ?? "",
      legal_business_name: q.data.legal_business_name ?? "",
      trade_name: q.data.trade_name ?? "",
      address_line1: q.data.address_line1 ?? "",
      address_line2: q.data.address_line2 ?? "",
      city: q.data.city ?? "",
      state: q.data.state ?? "",
      pincode: q.data.pincode ?? "",
      country: q.data.country ?? "India",
      phone: q.data.phone ?? "",
      mobile: q.data.mobile ?? "",
      email: q.data.email ?? "",
      website: q.data.website ?? "",
      logo_url: q.data.logo_url ?? "",
      pan: q.data.pan ?? "",
      cin: q.data.cin ?? "",
      bank_name: q.data.bank_name ?? "",
      bank_branch: q.data.bank_branch ?? "",
      bank_account_number: q.data.bank_account_number ?? "",
      bank_ifsc: q.data.bank_ifsc ?? "",
      upi_id: q.data.upi_id ?? "",
      authorized_signatory: q.data.authorized_signatory ?? "",
      signature_url: q.data.signature_url ?? "",
      stamp_url: q.data.stamp_url ?? "",
    });
  }, [q.data]);

  function set<K extends keyof CompanyProfileFormValues>(
    key: K,
    value: CompanyProfileFormValues[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleUpload(kind: CompanyAssetKind, file: File) {
    if (!q.data) return;
    setUploading(kind);
    try {
      const url = await uploadCompanyAsset(q.data.id, kind, file);
      const field =
        kind === "logo" ? "logo_url" : kind === "signature" ? "signature_url" : "stamp_url";
      set(field, url);
      // Uploads save immediately — the field still shows in the form for
      // context, but there's no reason to make an admin re-click "Save
      // changes" just to persist an image they already picked.
      await update.mutateAsync({ id: q.data.id, patch: { [field]: url } });
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setUploading(null);
    }
  }

  function handleSave() {
    const parsed = companyProfileSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof CompanyProfileFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof CompanyProfileFormValues;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Fix the highlighted fields before saving");
      return;
    }
    setErrors({});
    if (!q.data) return;
    // zod's preprocess normalizes "" -> null and uppercases GSTIN/PAN/IFSC;
    // parsed.data already reflects that, so it — not the raw form — is what
    // gets saved (Requirement 6: save permanently, Requirement 9: validated).
    update.mutate({ id: q.data.id, patch: parsed.data });
  }

  if (q.isLoading || !q.data) return <LoadingBlock label="Loading company profile…" />;

  const field = (
    key: keyof CompanyProfileFormValues,
    opts?: { placeholder?: string; required?: boolean },
  ) => (
    <div className="space-y-1.5">
      <Label>
        {FIELD_LABELS[key]}
        {opts?.required && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        value={form[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
        placeholder={opts?.placeholder}
        disabled={!isAdmin || update.isPending}
        readOnly={!isAdmin}
        className={errors[key] ? "border-destructive" : undefined}
      />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <Card className="shadow-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          Company Profile
          {!isAdmin && (
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3" /> View only
            </Badge>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          These details appear on every quotation, estimate, invoice, purchase order, delivery
          challan, report, PDF, and email sent from STOS.
          {!isAdmin && " Only admins can make changes here."}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Basic Details
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {field("company_name", { required: true, placeholder: "Stone Tech" })}
            {field("gstin", { placeholder: "24BJEPR8383P1ZB" })}
            {field("legal_business_name", { placeholder: "As per incorporation documents" })}
            {field("trade_name", { placeholder: "As shown to customers" })}
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Address
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {field("address_line1")}
            {field("address_line2")}
            {field("city")}
            {field("state")}
            {field("pincode")}
            {field("country", { required: true })}
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Contact
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {field("phone")}
            {field("mobile")}
            {field("email", { placeholder: "accounts@stonetech.example" })}
            {field("website", { placeholder: "https://" })}
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Legal &amp; Tax IDs
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {field("pan")}
            {field("cin", { placeholder: "Optional" })}
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bank Details
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {field("bank_name")}
            {field("bank_branch")}
            {field("bank_account_number")}
            {field("bank_ifsc", { placeholder: "SBIN0001234" })}
            {field("upi_id", { placeholder: "stonetech@upi" })}
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Signatory &amp; Branding
          </h3>
          <div className="grid gap-4 md:grid-cols-2">{field("authorized_signatory")}</div>
          <div className="grid gap-4 sm:grid-cols-3">
            <AssetUploadField
              label="Logo"
              icon={ImageIcon}
              url={form.logo_url}
              isAdmin={isAdmin}
              uploading={uploading === "logo"}
              onUpload={(f) => handleUpload("logo", f)}
            />
            <AssetUploadField
              label="Signature"
              icon={PenTool}
              url={form.signature_url}
              isAdmin={isAdmin}
              uploading={uploading === "signature"}
              onUpload={(f) => handleUpload("signature", f)}
            />
            <AssetUploadField
              label="Company Stamp"
              icon={StampIcon}
              url={form.stamp_url}
              isAdmin={isAdmin}
              uploading={uploading === "stamp"}
              onUpload={(f) => handleUpload("stamp", f)}
            />
          </div>
        </section>

        {isAdmin && (
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function AssetUploadField({
  label,
  icon: Icon,
  url,
  isAdmin,
  uploading,
  onUpload,
}: {
  label: string;
  icon: typeof ImageIcon;
  url: string | null | undefined;
  isAdmin: boolean;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-3">
        {url ? (
          <img src={url} alt={label} className="h-16 w-full object-contain" />
        ) : (
          <div className="flex h-16 w-full items-center justify-center text-muted-foreground">
            <Icon className="h-6 w-6" />
          </div>
        )}
        {isAdmin && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                e.target.value = "";
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
              {url ? "Replace" : "Upload"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
