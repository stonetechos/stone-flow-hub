import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toUserMessage } from "@/lib/errors";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Stone Tech <span className="text-primary">OS</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ERP for the natural stone industry
          </p>
        </div>
        <Card className="shadow-3">
          <Tabs defaultValue="signin">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="signin" className="mt-0">
                <SignInForm />
              </TabsContent>
              <TabsContent value="signup" className="mt-0">
                <SignUpForm />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Signed in");
      await navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <CardDescription>Welcome back. Enter your credentials to continue.</CardDescription>
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign in
      </Button>
    </form>
  );
}

function SignUpForm() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName }, emailRedirectTo: redirectUrl },
      });
      if (error) throw error;
      toast.success("Account created");
      await navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <CardDescription>
        The first account becomes the administrator automatically.
      </CardDescription>
      <div className="space-y-2">
        <Label htmlFor="signup-name">Full name</Label>
        <Input
          id="signup-name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create account
      </Button>
    </form>
  );
}
