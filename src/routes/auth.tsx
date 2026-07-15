import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Factory,
  Loader2,
  Lock,
  LockKeyhole,
  Mail,
  ShieldAlert,
  ShieldOff,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toUserMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

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
 *   /auth?flow=expired            → session expired notice
 *   /auth?flow=denied             → access denied notice
 *   /auth?flow=loading            → transitional loading state
 * ------------------------------------------------------------- */

const flowSchema = z.object({
  flow: z
    .enum(["signin", "reset", "update", "invite", "expired", "denied", "loading"])
    .catch("signin"),
  redirect: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search) => flowSchema.parse(search),
  beforeLoad: async ({ search }) => {
    if (typeof window === "undefined") return;
    // Only bounce authenticated users away from the sign-in surface.
    if (search.flow && search.flow !== "signin") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

/* ============================================================
 * Page shell — split-screen (desktop) / stacked (tablet) / card-only (mobile)
 * ============================================================ */
function AuthPage() {
  const search = Route.useSearch();
  const flow = search.flow ?? "signin";

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[45fr_55fr]">
        {/* Hero panel — hidden on mobile, visible tablet+ */}
        <HeroPanel className="hidden md:flex" />

        {/* Form panel — always visible */}
        <section className="flex items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-[440px]">
            <FormArea flow={flow} />
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
        "material-basalt relative flex-col justify-between overflow-hidden px-10 py-12 lg:px-14 lg:py-16",
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
            Manage enquiries, quotations, production, inventory, procurement,
            dispatch, finance and customer relationships from one operating
            system.
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
          Stone Tech OS · v1.0
        </p>
      </div>
    </aside>
  );
}

function StoneTechMark() {
  return (
    <div className="flex items-center gap-3">
      <div
        aria-hidden="true"
        className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-md"
        style={{
          background:
            "linear-gradient(140deg, var(--mint-500), var(--mint-700))",
        }}
      >
        {/* Faceted stone mark — abstract slab silhouette */}
        <svg
          viewBox="0 0 32 32"
          className="h-6 w-6 text-text-on-intent"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
        >
          <path d="M4 10 L16 4 L28 10 L28 22 L16 28 L4 22 Z" />
          <path d="M4 10 L16 16 L28 10" />
          <path d="M16 16 L16 28" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="font-display text-lg font-medium tracking-tight text-text-on-material">
          Stone Tech <span className="text-mint-300">OS</span>
        </div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-text-on-material-muted">
          Natural Stone Industry
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
        <div className="text-[13px] font-medium tracking-tight text-text-on-material">
          {title}
        </div>
        <div className="mt-1 text-[12.5px] leading-relaxed text-text-on-material-muted">
          {body}
        </div>
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
          body="You don't have permission to view that area. If you believe this is a mistake, contact your Stone Tech OS administrator."
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
      <div className="mb-8 flex items-center justify-center gap-2 md:hidden">
        <span
          aria-hidden="true"
          className="grid h-8 w-8 place-items-center rounded-md text-text-on-intent"
          style={{
            background: "linear-gradient(140deg, var(--mint-500), var(--mint-700))",
          }}
        >
          <svg viewBox="0 0 32 32" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M4 10 L16 4 L28 10 L28 22 L16 28 L4 22 Z" />
          </svg>
        </span>
        <span className="font-display text-base font-medium tracking-tight text-text-primary">
          Stone Tech <span className="text-intent-primary">OS</span>
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
            <p className="text-[13.5px] leading-relaxed text-text-secondary">
              {description}
            </p>
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
        Accounts are provisioned by an administrator. Contact your admin
        for access.
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
  const [formError, setFormError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Signed in");
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
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

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  return (
    <AuthCard
      eyebrow="Welcome back"
      title="Sign in to Stone Tech OS"
      description="Sign in using your company credentials."
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

        <Field
          label="Work email"
          htmlFor="signin-email"
          icon={<Mail className="h-4 w-4" />}
        >
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
          hint={
            capsOn ? (
              <span className="text-status-warning-fg">Caps Lock is on</span>
            ) : null
          }
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

        <Button
          type="submit"
          size="lg"
          disabled={!canSubmit}
          className="w-full h-11 gap-2"
        >
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
        typeof window !== "undefined"
          ? `${window.location.origin}/auth?flow=update`
          : undefined;
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
function UpdatePasswordCard({ invite }: { invite?: boolean }) {
  const navigate = useNavigate();
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
    if (pw.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (pw !== pw2) {
      setFormError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast.success(invite ? "Welcome to Stone Tech OS" : "Password updated");
      await navigate({ to: "/dashboard" });
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
      eyebrow={invite ? "Accept your invite" : "Set a new password"}
      title={invite ? "Welcome to Stone Tech OS" : "Choose a new password"}
      description={
        invite
          ? "Create a password to activate your account. You'll be signed in immediately."
          : "Pick a strong password. Use at least 8 characters — a mix of letters, numbers and symbols is best."
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={formError} />

        <Field label="New password" htmlFor="new-pw" icon={<Lock className="h-4 w-4" />}>
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

        <Button
          type="submit"
          size="lg"
          disabled={busy || !match || strength.score < 2}
          className="w-full h-11 gap-2"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? "Saving…" : invite ? "Activate account" : "Update password"}
        </Button>
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
            <p className="max-w-[46ch] text-[13.5px] leading-relaxed text-text-secondary">
              {body}
            </p>
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
        <Label
          htmlFor={htmlFor}
          className="text-[12.5px] font-medium text-text-secondary"
        >
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
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const clamped = Math.min(4, score) as Strength["score"];
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
