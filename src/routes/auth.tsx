import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { completeUserPasswordActivation } from "@/lib/admin/users.functions";

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Factory,
  Fingerprint,
  Loader2,
  Lock,
  LockKeyhole,
  Mail,
  ShieldAlert,
  ShieldOff,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  authenticateWithBiometrics,
  checkBiometricSupport,
  saveBiometricSession,
  getLastBiometricEmail,
} from "@/lib/auth/biometrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toUserMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { getSupabaseConfigStatus } from "@/lib/env/config-status";
import { POWERED_BY_LINE } from "@/lib/platform/application";
import { LoadingBlock } from "@/components/layout/States";

/* ---------------------------------------------------------------
 * Auth route — Phase B redesign.
 *
 * A single route hosts every auth-adjacent presentation state via
 * the `?flow=` search param. Authentication logic itself (Supabase
 * signInWithPassword, resetPasswordForEmail, updateUser) is
 * unchanged — this file only replaces the presentation.
 *
 *   /auth                         → sign in
 *   /auth?flow=reset              → reset password
 *   /auth?flow=update             → set a new password (after email link)
 *   /auth?flow=invite             → accept invite (uses update password)
 *   /auth?flow=force-change       → mandatory first-login password change
 *                                    (Sprint 1.7, Part 7 — reuses the same
 *                                    update-password UI as `update`/`invite`)
 *   /auth?flow=expired            → session expired notice
 *   /auth?flow=denied             → access denied notice
 *   /auth?flow=loading            → transitional loading state
 * ------------------------------------------------------------- */

const flowSchema = z.object({
  flow: z
    .enum(["signin", "reset", "update", "invite", "force-change", "expired", "denied", "loading"])
    .optional()
    .default("signin")
    .catch("signin"),
  redirect: z.string().optional().catch(undefined),
  token_hash: z.string().optional().catch(undefined),
  token: z.string().optional().catch(undefined),
  type: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  // With `ssr: false` the server emits the router's pending fallback
  // (`<LoadingBlock />`) for this match. Timing alone can't guarantee the
  // client commits the same markup on its first pass, so `AuthPage` renders
  // that exact fallback until it has hydrated — see the note there.

  validateSearch: (search) => flowSchema.parse(search),
  beforeLoad: async ({ search }) => {
    if (typeof window === "undefined") return;
    // See the matching comment in
    // `_authenticated/route.tsx` — the root route already replaces the
    // entire app with the configuration screen when misconfigured, so this
    // only needs to avoid throwing.
    if (!getSupabaseConfigStatus().ok) return;
    // When an invitation token or recovery token is present in the URL,
    // let AuthPage mount so it can execute verifyOtp without auto-redirecting.
    if (search.token_hash || search.token) return;
    // Only bounce authenticated users away from the sign-in surface.
    if (search.flow && search.flow !== "signin") return;
    // supabase-js serialises every auth call behind a `navigator.locks`
    // lock and `getSession()` can trigger a token refresh against the
    // Supabase host. If that host is unreachable — offline, DNS-blocked,
    // blocked by an extension — the promise never settles, and since this
    // route is `ssr: false` the result is a permanently blank sign-in page.
    // Losing the redirect-if-already-signed-in convenience is a far better
    // outcome than losing the page, so the check gives up after 4 seconds
    // and falls through to rendering the form.
    const session = await Promise.race([
      supabase.auth.getSession().then(({ data }) => data.session),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
    if (session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

/* ============================================================
 * Page shell — split-screen (desktop) / stacked (tablet) / card-only (mobile)
 * ============================================================ */
function AuthPage() {
  const search = Route.useSearch();
  const flow = search.flow ?? "signin";
  const tokenHash = search.token_hash || search.token;
  const tokenType = search.type || "invite";

  // The server HTML for this `ssr: false` route is the router's pending
  // fallback. Rendering the identical fallback on the first client pass makes
  // the two trees structurally identical, so hydration commits cleanly and the
  // real page mounts on the following render.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  if (!hydrated) return <LoadingBlock />;

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[45fr_55fr]">
        {/* Hero panel — hidden on mobile, visible tablet+ */}
        <HeroPanel className="hidden md:flex" />

        {/* Form panel — always visible */}
        <section className="flex items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-[440px]">
            {tokenHash ? (
              <VerifyTokenCard tokenHash={tokenHash} type={tokenType} />
            ) : (
              <FormArea flow={flow} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

/* ============================================================
 * Hero panel — Basalt material, logo, copy, capabilities, quarry illustration
 * ============================================================ */
function HeroPanel({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "material-sapphire relative flex-col justify-between overflow-hidden px-10 py-12 lg:px-14 lg:py-16",
        // Border only where it butts up to the form panel on desktop.
        "lg:border-r lg:border-border-inverse",
        className,
      )}
    >
      {/* Layered specular / grain accent, purely decorative. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(120% 60% at 20% 0%, oklch(from white l c h / 0.06), transparent 60%)",
        }}
      />

      {/* Top: logo */}
      <div className="relative z-10">
        <StoneTechMark />
      </div>

      {/* Middle: headline + copy + capabilities */}
      <div className="relative z-10 mt-16 max-w-[520px] space-y-10 lg:mt-24">
        <div className="space-y-5">
          <h2 className="font-display text-3xl leading-[1.15] tracking-tight text-text-on-material sm:text-[38px] lg:text-[44px]">
            Enterprise OS for the Natural Stone Industry
          </h2>
          <p className="max-w-[46ch] text-[15px] leading-relaxed text-text-on-material-muted">
            Manage enquiries, quotations, production, inventory, procurement, dispatch, finance and
            customer relationships from one operating system.
          </p>
        </div>

        <ul className="space-y-4">
          <Capability
            icon={TrendingUp}
            title="Sales &amp; CRM"
            body="Enquiries, estimates, quotations and customer intelligence in one pipeline."
          />
          <Capability
            icon={Factory}
            title="Manufacturing &amp; Inventory"
            body="Production orders, slab tracking, dispatch and installation, end to end."
          />
          <Capability
            icon={BadgeCheck}
            title="Finance &amp; Operations"
            body="Receipts, vendor payments, GST-ready invoicing and executive reporting."
          />
        </ul>
      </div>

      {/* Bottom: quarry line illustration + wordmark */}
      <div className="relative z-10 mt-16">
        <QuarryLines />
        <p className="mt-6 text-xs uppercase tracking-[0.14em] text-text-on-material-muted">
          STOS · v1.0 · By Vedora Vision
        </p>
      </div>
    </aside>
  );
}

function StoneTechMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-white/95 p-1 shadow-md ring-1 ring-white/40">
        <img
          src="/branding/stone-tech-icon.png"
          alt="Stone Tech"
          className="h-full w-full object-contain"
        />
      </div>
      <div className="leading-tight">
        <div className="font-display text-lg font-bold tracking-tight text-text-on-material">
          STONE TECH
        </div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-text-on-material-muted">
          Enterprise ERP Hub
        </div>
      </div>
    </div>
  );
}

function Capability({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4">
      <span
        aria-hidden="true"
        className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border-inverse bg-white/[0.04] text-mint-300"
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-medium tracking-tight text-text-on-material">{title}</div>
        <div className="mt-1 text-[12.5px] leading-relaxed text-text-on-material-muted">{body}</div>
      </div>
    </li>
  );
}

/** Quiet architectural line drawing — quarry steps + stacked slabs. */
function QuarryLines() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 480 96"
      className="h-20 w-full max-w-[460px] text-text-on-material-muted"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinecap="square"
      style={{ opacity: 0.35 }}
    >
      {/* Stepped quarry section */}
      <path d="M0 84 L60 84 L60 68 L130 68 L130 52 L210 52 L210 36 L300 36 L300 20 L400 20 L400 6 L480 6" />
      {/* Faint horizon */}
      <path d="M0 88 L480 88" style={{ opacity: 0.6 }} />
      {/* Stacked slabs, right side */}
      <g style={{ opacity: 0.85 }}>
        <path d="M340 88 L470 88" />
        <path d="M348 82 L462 82" />
        <path d="M356 76 L454 76" />
        <path d="M364 70 L446 70" />
      </g>
      {/* Vein hint */}
      <path d="M20 84 L45 60 L80 55" style={{ opacity: 0.4 }} />
    </svg>
  );
}

/* ============================================================
 * Form area — dispatches by flow
 * ============================================================ */
function FormArea({ flow }: { flow: string }) {
  switch (flow) {
    case "reset":
      return <ResetPasswordCard />;
    case "update":
    case "invite":
      return <UpdatePasswordCard invite={flow === "invite"} />;
    case "force-change":
      return <UpdatePasswordCard forceChange />;
    case "expired":
      return (
        <NoticeCard
          tone="warning"
          icon={LockKeyhole}
          title="Your session expired"
          body="For your security we signed you out after a period of inactivity. Please sign in again to continue where you left off."
          primary={{ label: "Sign in again", to: "/auth" }}
        />
      );
    case "denied":
      return (
        <NoticeCard
          tone="danger"
          icon={ShieldOff}
          title="Access denied"
          body="You don't have permission to view that area. If you believe this is a mistake, contact your STOS administrator."
          primary={{ label: "Back to sign in", to: "/auth" }}
        />
      );
    case "loading":
      return <AuthLoadingCard />;
    case "signin":
    default:
      return <SignInCard />;
  }
}

/* ============================================================
 * Card scaffolding — reused across every flow
 * ============================================================ */
function AuthCard({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="w-full">
      {/* Mobile-only compact wordmark */}
      <div className="mb-8 flex items-center justify-center gap-2.5 md:hidden">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/95 p-0.5 shadow-xs ring-1 ring-slate-200">
          <img
            src="/branding/stone-tech-icon.png"
            alt="Stone Tech"
            className="h-full w-full object-contain"
          />
        </span>
        <span className="font-display text-lg font-bold tracking-tight text-text-primary">
          STONE TECH
        </span>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface-card px-6 py-8 shadow-e1 sm:px-8 sm:py-10">
        <header className="mb-7 space-y-2">
          {eyebrow ? (
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="font-display text-[26px] font-medium leading-[1.15] tracking-tight text-text-primary sm:text-[28px]">
            {title}
          </h1>
          {description ? (
            <p className="text-[13.5px] leading-relaxed text-text-secondary">{description}</p>
          ) : null}
        </header>

        {children}

        {footer ? (
          <>
            <div className="mt-8 border-t border-border-subtle" />
            <div className="pt-6 text-[13px] text-text-muted">{footer}</div>
          </>
        ) : null}
      </div>

      <p className="mt-6 text-center text-[11.5px] leading-relaxed text-text-muted">
        Accounts are provisioned by an administrator. Contact your admin for access.
      </p>
      <p className="mt-2 text-center text-[11px] text-text-muted">
        {POWERED_BY_LINE} ·{" "}
        <a
          href="/privacy.html"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-text-secondary"
        >
          Privacy Policy
        </a>
      </p>
    </div>
  );
}

/* ============================================================
 * Sign In
 * ============================================================ */
function SignInCard() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
    checkBiometricSupport().then((res) => {
      setBioSupported(res.isSupported);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Signed in");
      const { data: sess } = await supabase.auth.getSession();
      if (sess.session) {
        saveBiometricSession(email, {
          access_token: sess.session.access_token,
          refresh_token: sess.session.refresh_token,
        });
      }
      const uid = sess.session?.user?.id;
      let isVendor = false;
      if (uid) {
        const { data: vu } = await supabase
          .from("vendor_users")
          .select("vendor_id")
          .eq("user_id", uid)
          .maybeSingle();
        isVendor = !!vu;
      }
      await navigate({ to: isVendor ? "/vendor/dashboard" : "/dashboard" });
    } catch (err) {
      const msg = toUserMessage(err);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function onBiometricSignIn() {
    setFormError(null);
    setBusy(true);
    try {
      const targetEmail = email.trim() || getLastBiometricEmail() || "";
      if (!targetEmail) {
        setFormError("Enter your registered work email first to use fingerprint sign in.");
        emailRef.current?.focus();
        setBusy(false);
        return;
      }
      toast.loading("Touch your phone's fingerprint sensor…", { id: "bio-auth" });
      await authenticateWithBiometrics(targetEmail);
      toast.dismiss("bio-auth");
      toast.success("Fingerprint verified! Welcome back.");
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      let isVendor = false;
      if (uid) {
        const { data: vu } = await supabase
          .from("vendor_users")
          .select("vendor_id")
          .eq("user_id", uid)
          .maybeSingle();
        isVendor = !!vu;
      }
      await navigate({ to: isVendor ? "/vendor/dashboard" : "/dashboard" });
    } catch (err: unknown) {
      toast.dismiss("bio-auth");
      const msg = toUserMessage(err);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  return (
    <AuthCard
      eyebrow="Welcome back"
      title="Sign in to STOS"
      description="Sign in using your company credentials or phone fingerprint."
      footer={
        <span>
          Need help?{" "}
          <a
            className="font-medium text-text-link underline-offset-4 hover:underline"
            href="mailto:support@stonetech.in"
          >
            Contact support
          </a>
        </span>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={formError} />

        <Field label="Work email" htmlFor="signin-email" icon={<Mail className="h-4 w-4" />}>
          <Input
            ref={emailRef}
            id="signin-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="pl-10 h-11"
            disabled={busy}
            aria-invalid={!!formError}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="signin-password"
          icon={<Lock className="h-4 w-4" />}
          hint={capsOn ? <span className="text-status-warning-fg">Caps Lock is on</span> : null}
        >
          <Input
            id="signin-password"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyUp={(e) => setCapsOn(e.getModifierState?.("CapsLock") ?? false)}
            onKeyDown={(e) => setCapsOn(e.getModifierState?.("CapsLock") ?? false)}
            placeholder="••••••••"
            className="pl-10 pr-11 h-11"
            disabled={busy}
            aria-invalid={!!formError}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Hide password" : "Show password"}
            aria-pressed={showPw}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-sm",
              "text-text-muted transition-colors hover:text-text-primary",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-intent-focus-ring",
            )}
            tabIndex={busy ? -1 : 0}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </Field>

        <div className="flex items-center justify-end">
          <a
            href="/auth?flow=reset"
            className="text-[12.5px] font-medium text-text-link underline-offset-4 hover:underline"
          >
            Forgot password?
          </a>
        </div>

        <Button type="submit" size="lg" disabled={!canSubmit} className="w-full h-11 gap-2">
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>

        {bioSupported && (
          <>
            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-border" />
              <span className="mx-3 shrink-0 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                or biometric sign in
              </span>
              <div className="flex-grow border-t border-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onBiometricSignIn}
              disabled={busy}
              className="w-full h-11 gap-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-foreground font-medium"
            >
              <Fingerprint className="h-5 w-5 text-primary" />
              Sign in with Fingerprint
            </Button>
          </>
        )}
      </form>
    </AuthCard>
  );
}

/* ============================================================
 * Reset password (send email)
 * ============================================================ */
function ResetPasswordCard() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    try {
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/auth?flow=update` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      const msg = toUserMessage(err);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <NoticeCard
        tone="success"
        icon={CheckCircle2}
        title="Check your inbox"
        body={`If an account exists for ${email}, we've sent a link to reset the password. The link is valid for one hour.`}
        primary={{ label: "Back to sign in", to: "/auth" }}
      />
    );
  }

  return (
    <AuthCard
      eyebrow="Password recovery"
      title="Reset your password"
      description="Enter the email on your account and we'll send you a secure link to set a new password."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={formError} />
        <Field label="Work email" htmlFor="reset-email" icon={<Mail className="h-4 w-4" />}>
          <Input
            id="reset-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="off"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="pl-10 h-11"
            disabled={busy}
          />
        </Field>
        <Button type="submit" size="lg" disabled={busy || !email} className="w-full h-11 gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? "Sending link…" : "Send reset link"}
        </Button>
        <a
          href="/auth"
          className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </a>
      </form>
    </AuthCard>
  );
}

/* ============================================================
 * Update password (after email link) — also handles invite accept
 * ============================================================ */
function UpdatePasswordCard({ invite, forceChange }: { invite?: boolean; forceChange?: boolean }) {
  const navigate = useNavigate();
  const router = useRouter();
  const completeActivationFn = useServerFn(completeUserPasswordActivation);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const strength = useMemo(() => passwordStrength(pw), [pw]);
  const match = pw.length > 0 && pw === pw2;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!pw || pw.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }
    if (!pw2) {
      setFormError("Please confirm your password.");
      return;
    }
    if (pw !== pw2) {
      setFormError("Passwords don't match. Please make sure both fields match.");
      return;
    }
    if (strength.score < 2) {
      setFormError(
        "Please choose a stronger password (use at least 8 characters with a mix of letters and numbers).",
      );
      return;
    }

    setBusy(true);
    try {
      // 1. Update the user password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({ password: pw });
      if (updateError) {
        throw updateError;
      }

      // 2. Clear force_password_change and guarantee operational role on server
      try {
        await completeActivationFn({ data: { password: pw } });
      } catch (srvErr) {
        console.warn("[auth] Server activation helper notice:", srvErr);
      }

      // 3. Clear force_password_change client-side (backed by DB migration allow-rule)
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      let isVendor = false;
      if (uid) {
        try {
          await supabase.from("profiles").update({ force_password_change: false }).eq("id", uid);
        } catch {
          // Non-fatal if server function already completed it
        }

        const { data: vu } = await supabase
          .from("vendor_users")
          .select("vendor_id")
          .eq("user_id", uid)
          .maybeSingle();
        isVendor = !!vu;
      }

      toast.success(
        invite ? "Welcome to STOS! Account activated." : "Password updated successfully.",
      );

      // Invalidate router so auth layout recognises updated profile and clears flags
      router.invalidate();

      await navigate({ to: isVendor ? "/vendor/dashboard" : "/dashboard" });
    } catch (err) {
      const msg = toUserMessage(err);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      eyebrow={forceChange ? "Required" : invite ? "Accept your invite" : "Set a new password"}
      title={
        forceChange
          ? "Set your permanent password"
          : invite
            ? "Welcome to STOS"
            : "Choose a new password"
      }
      description={
        forceChange
          ? "Your administrator created this account with a temporary password. Choose a new password to continue — you can't access STOS until this is done."
          : invite
            ? "Create a password to activate your account. You'll be signed in immediately."
            : "Pick a strong password. Use at least 8 characters — a mix of letters, numbers and symbols is best."
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={formError} />

        <Field
          label="New password"
          htmlFor="new-pw"
          icon={<Lock className="h-4 w-4" />}
          hint={<span className="text-text-muted">Min. 8 chars (letters & numbers)</span>}
        >
          <Input
            id="new-pw"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            required
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="••••••••"
            className="pl-10 pr-11 h-11"
            disabled={busy}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Hide password" : "Show password"}
            aria-pressed={showPw}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-sm text-text-muted transition-colors hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-intent-focus-ring"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </Field>

        <StrengthMeter strength={strength} />

        <Field label="Confirm password" htmlFor="new-pw-2" icon={<Lock className="h-4 w-4" />}>
          <Input
            id="new-pw-2"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            required
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="••••••••"
            className="pl-10 h-11"
            disabled={busy}
            aria-invalid={pw2.length > 0 && !match}
          />
        </Field>
        {pw2.length > 0 && !match ? (
          <p className="-mt-3 text-[12px] text-status-danger-fg">
            The two passwords don't match yet.
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={busy} className="w-full h-11 gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy
            ? "Saving…"
            : forceChange
              ? "Set password and continue"
              : invite
                ? "Activate account"
                : "Update password"}
        </Button>

        {/* The force-change screen is the one place in the app a user can
            be held with no navigation and no way back: the shell is not
            rendered, and every authenticated route redirects here. If the
            password update itself keeps failing, this is the only exit. */}
        {forceChange ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void (async () => {
                try {
                  await supabase.auth.signOut();
                } catch (err) {
                  console.warn("[auth] sign-out from the force-change screen failed", err);
                }
                await navigate({ to: "/auth", search: { flow: "signin" } });
              })();
            }}
            className="w-full text-center text-[13px] text-text-muted underline-offset-4 transition-colors hover:text-text-primary hover:underline disabled:opacity-50"
          >
            Sign out and use a different account
          </button>
        ) : null}
      </form>
    </AuthCard>
  );
}

/* ============================================================
 * Loading + Notice cards (Expired, Denied, generic messages)
 * ============================================================ */
function AuthLoadingCard() {
  return (
    <div className="w-full">
      <div className="rounded-xl border border-border-subtle bg-surface-card px-6 py-14 shadow-e1 sm:px-10">
        <div className="flex flex-col items-center gap-5 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-md bg-surface-panel text-text-secondary">
            <Loader2 className="h-5 w-5 animate-spin" />
          </span>
          <div className="space-y-1.5">
            <h1 className="font-display text-lg font-medium tracking-tight text-text-primary">
              Preparing your workspace
            </h1>
            <p className="text-[13px] text-text-secondary">
              We're verifying your session and loading your permissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function NoticeCard({
  tone,
  icon: Icon,
  title,
  body,
  primary,
}: {
  tone: "success" | "warning" | "danger";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  primary?: { label: string; to: string };
}) {
  const tones: Record<typeof tone, { bg: string; fg: string; border: string }> = {
    success: {
      bg: "bg-status-success-bg",
      fg: "text-status-success-fg",
      border: "border-status-success-border",
    },
    warning: {
      bg: "bg-status-warning-bg",
      fg: "text-status-warning-fg",
      border: "border-status-warning-border",
    },
    danger: {
      bg: "bg-status-danger-bg",
      fg: "text-status-danger-fg",
      border: "border-status-danger-border",
    },
  };
  const t = tones[tone];

  return (
    <div className="w-full">
      <div className="rounded-xl border border-border-subtle bg-surface-card px-6 py-10 shadow-e1 sm:px-10 sm:py-12">
        <div className="flex flex-col items-start gap-6">
          <span
            aria-hidden="true"
            className={cn(
              "grid h-11 w-11 place-items-center rounded-md border",
              t.bg,
              t.fg,
              t.border,
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="space-y-2">
            <h1 className="font-display text-[22px] font-medium leading-tight tracking-tight text-text-primary">
              {title}
            </h1>
            <p className="max-w-[46ch] text-[13.5px] leading-relaxed text-text-secondary">{body}</p>
          </div>
          {primary ? (
            <Button asChild size="lg" className="h-11 gap-2">
              <a href={primary.to}>
                <ArrowLeft className="h-4 w-4" />
                {primary.label}
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function VerifyTokenCard({ tokenHash, type }: { tokenHash: string; type: string }) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const primaryType =
          (type as "invite" | "recovery" | "magiclink" | "signup" | "email") || "invite";
        let { error: verifyErr } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: primaryType,
        });

        // Fallback: if 'invite' failed or was unexpected, try 'magiclink' or 'recovery'
        if (verifyErr && primaryType === "invite") {
          const fallback = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "magiclink",
          });
          if (!fallback.error) {
            verifyErr = null;
          } else {
            const recoveryFallback = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: "recovery",
            });
            if (!recoveryFallback.error) {
              verifyErr = null;
            }
          }
        }

        if (verifyErr) throw verifyErr;
        if (mounted) {
          toast.success("Account verified! Please set your permanent password.");
          await navigate({
            to: "/auth",
            search: { flow: type === "recovery" ? "update" : "invite" },
            replace: true,
          });
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(toUserMessage(err) || "Invalid or expired invitation link.");
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [tokenHash, type, navigate]);

  if (error) {
    return (
      <NoticeCard
        tone="danger"
        icon={ShieldAlert}
        title="Invalid or Expired Link"
        body={error}
        primary={{ label: "Back to sign in", to: "/auth" }}
      />
    );
  }

  return (
    <AuthCard
      eyebrow="Accept Invitation"
      title="Verifying your account"
      description="Please wait a moment while we verify your invitation token..."
    >
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-text-secondary">Authenticating with Stone Tech OS...</p>
      </div>
    </AuthCard>
  );
}

/* ============================================================
 * Field primitive
 * ============================================================ */
function Field({
  label,
  htmlFor,
  icon,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor} className="text-[12.5px] font-medium text-text-secondary">
          {label}
        </Label>
        {hint ? <span className="text-[11.5px]">{hint}</span> : null}
      </div>
      <div className="relative">
        {icon ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          >
            {icon}
          </span>
        ) : null}
        {children}
      </div>
    </div>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-2.5 rounded-md border border-status-danger-border bg-status-danger-bg px-3 py-2.5 text-[13px] text-status-danger-fg"
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

/* ============================================================
 * Password strength meter
 * ============================================================ */
type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string };

function passwordStrength(pw: string): Strength {
  if (!pw) return { score: 0, label: "Too short" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-zA-Z]/.test(pw) && /\d/.test(pw)) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const clamped = Math.min(4, Math.max(1, score)) as Strength["score"];
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"] as const;
  return { score: clamped, label: labels[clamped] };
}

function StrengthMeter({ strength }: { strength: Strength }) {
  const bars = [0, 1, 2, 3];
  return (
    <div aria-live="polite" className="-mt-2 space-y-1.5">
      <div className="flex gap-1">
        {bars.map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < strength.score
                ? strength.score >= 3
                  ? "bg-status-success-fg"
                  : strength.score === 2
                    ? "bg-status-warning-fg"
                    : "bg-status-danger-fg"
                : "bg-border-subtle",
            )}
          />
        ))}
      </div>
      <div className="text-[11.5px] text-text-muted">
        Password strength: <span className="text-text-secondary">{strength.label}</span>
      </div>
    </div>
  );
}
