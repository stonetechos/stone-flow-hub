import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User, Building2, Palette, Shield, Bell, Compass } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useGuidedEnabled } from "@/hooks/use-guided-enabled";
import { NavigationPreferences } from "@/components/settings/NavigationPreferences";
import { CompanyProfileTab } from "@/components/settings/CompanyProfileTab";
import { deriveInitials, updateProfileFields } from "@/lib/admin/users";
import { toUserMessage } from "@/lib/errors";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  component: SettingsPage,
});

function SettingsPage() {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [fullName, setFullName] = useState("");
  const [initials, setInitials] = useState("");
  const [initialsTouched, setInitialsTouched] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [guidedEnabled, setGuidedEnabled] = useGuidedEnabled();

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setEmail(data.user.email ?? "");
        setUserId(data.user.id);
        // Prefer profiles.full_name (authoritative display name that admins
        // can edit). Fall back to auth user_metadata for legacy accounts.
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, initials, job_title, department, phone, avatar_url")
          .eq("id", data.user.id)
          .maybeSingle();
        const meta = data.user.user_metadata as { full_name?: string } | null;
        const resolvedName = prof?.full_name ?? meta?.full_name ?? "";
        setFullName(resolvedName);
        setInitials(prof?.initials ?? deriveInitials(resolvedName, data.user.email));
        setInitialsTouched(!!prof?.initials);
        setJobTitle(prof?.job_title ?? "");
        setDepartment(prof?.department ?? "");
        setPhone(prof?.phone ?? "");
        setAvatarUrl(prof?.avatar_url ?? null);
        const { data: role } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(!!role);
      }
    })();
  }, []);

  // Auto-derive initials from the display name until the admin edits them.
  useEffect(() => {
    if (initialsTouched) return;
    setInitials(deriveInitials(fullName, email));
  }, [fullName, email, initialsTouched]);

  async function saveProfile() {
    setSaving(true);
    const trimmedName = fullName.trim();
    try {
      // profiles.* is the authoritative store for the enterprise profile
      // (display name + initials + job title + department + phone + avatar).
      // The auth metadata copy of full_name stays in sync so JWT-based
      // consumers see the same display name.
      await updateProfileFields(userId, {
        full_name: trimmedName,
        initials,
        job_title: jobTitle,
        department,
        phone,
      });
      const { error: aErr } = await supabase.auth.updateUser({
        data: { full_name: trimmedName },
      });
      if (aErr) throw aErr;
      toast.success("Profile updated");
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your profile, workspace, and preferences." />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Compass className="mr-2 h-4 w-4" />
            Preferences
          </TabsTrigger>

          <TabsTrigger value="company">
            <Building2 className="mr-2 h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="mr-2 h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName || email} /> : null}
                  <AvatarFallback className="text-base font-medium">
                    {(initials || deriveInitials(fullName, email)).slice(0, 3)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{fullName || "Unnamed user"}</p>
                  <p className="text-xs text-muted-foreground">Profile photo upload coming soon.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>
                    Display name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Harsh Pupneja"
                  />
                  <p className="text-xs text-muted-foreground">
                    Shown across greetings, activity, comments, and assignments.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Initials</Label>
                  <Input
                    value={initials}
                    maxLength={4}
                    onChange={(e) => {
                      setInitialsTouched(true);
                      setInitials(e.target.value.toUpperCase());
                    }}
                    placeholder="Auto"
                    className="uppercase"
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-generated from display name. Editable.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Job title</Label>
                  <Input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Sales Manager"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Sales"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone number</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={email} readOnly disabled />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>User ID</Label>
                  <Input value={userId} readOnly disabled className="font-mono text-xs" />
                </div>
              </div>
              <Button onClick={saveProfile} disabled={saving || !fullName.trim()}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="mt-4 space-y-4">
          <NavigationPreferences isAdmin={isAdmin} />

          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm">Guided Workflow Assistant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label className="text-sm">Enable Guided Workflow Assistant</Label>
                  <p className="max-w-prose text-xs text-muted-foreground">
                    Suggests the next logical step in the business lifecycle (Customer → Enquiry →
                    Project → Quotation → Sales Order → Procurement → Production → Dispatch →
                    Installation → Invoice → Receipt → Follow-up) on each detail page.
                    Recommendations only — nothing happens automatically, and you can always Skip
                    for now. When disabled, STOS behaves exactly as before with no prompts.
                  </p>
                </div>
                <Switch
                  checked={guidedEnabled}
                  onCheckedChange={(v) => {
                    setGuidedEnabled(v);
                    toast.success(
                      v
                        ? "Guided Workflow Assistant enabled"
                        : "Guided Workflow Assistant disabled",
                    );
                  }}
                  aria-label="Enable Guided Workflow Assistant"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="mt-4">
          <CompanyProfileTab />
        </TabsContent>

        <TabsContent value="appearance" className="mt-4">
          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm">Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                Theme: <Badge>Granite &amp; Teal</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Theme switcher will be added in a later phase.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                Notifications <Badge variant="outline">Coming soon</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Email, WhatsApp, and in-app notifications will be configurable here.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="text-sm">Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                onClick={async () => {
                  const { error } = await supabase.auth.resetPasswordForEmail(email);
                  if (error) toast.error(error.message);
                  else toast.success("Password reset email sent");
                }}
              >
                Send password reset email
              </Button>
              <p className="text-xs text-muted-foreground">
                Two-factor authentication and audit logs are planned.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
