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
          .select("full_name")
          .eq("id", data.user.id)
          .maybeSingle();
        const meta = data.user.user_metadata as { full_name?: string } | null;
        setFullName(prof?.full_name ?? meta?.full_name ?? "");
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

  async function saveProfile() {
    setSaving(true);
    const trimmed = fullName.trim();
    // Write to both stores so the change surfaces regardless of which one a
    // caller reads. profiles.full_name is authoritative for the UI; the auth
    // metadata copy stays in sync so JWT-based consumers see the same value.
    const [{ error: pErr }, { error: aErr }] = await Promise.all([
      supabase
        .from("profiles")
        .update({ full_name: trimmed.length ? trimmed : null })
        .eq("id", userId),
      supabase.auth.updateUser({ data: { full_name: trimmed } }),
    ]);
    setSaving(false);
    const error = pErr ?? aErr;
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
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
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
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
              <Button onClick={saveProfile} disabled={saving}>
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
                    Suggests the next logical step in the business lifecycle
                    (Customer → Enquiry → Project → Quotation → Sales Order →
                    Procurement → Production → Dispatch → Installation → Invoice
                    → Receipt → Follow-up) on each detail page. Recommendations
                    only — nothing happens automatically, and you can always Skip
                    for now. When disabled, Stone Tech OS behaves exactly as
                    before with no prompts.
                  </p>
                </div>
                <Switch
                  checked={guidedEnabled}
                  onCheckedChange={(v) => {
                    setGuidedEnabled(v);
                    toast.success(
                      v ? "Guided Workflow Assistant enabled" : "Guided Workflow Assistant disabled",
                    );
                  }}
                  aria-label="Enable Guided Workflow Assistant"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>



        <TabsContent value="company" className="mt-4">
          <Card className="shadow-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                Company <Badge variant="outline">Coming soon</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Company name</Label>
                  <Input placeholder="Stone Tech Pvt. Ltd." disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>GSTIN</Label>
                  <Input placeholder="—" disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Input value="INR" disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>Timezone</Label>
                  <Input value="Asia/Kolkata" disabled />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Multi-company workspace configuration ships in a later phase.
              </p>
            </CardContent>
          </Card>
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
