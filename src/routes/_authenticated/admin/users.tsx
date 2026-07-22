import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  KeyRound,
  X,
  Pencil,
  Check,
  Search,
  MoreHorizontal,
  UserPlus,
  Send,
  UserX,
  UserCheck,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  ShieldAlert,
} from "lucide-react";
import { toUserMessage } from "@/lib/errors";
import {
  listAppUsers,
  assignRoleGuarded,
  revokeRoleGuarded,
  sendPasswordReset,
  updateDisplayName,
  fallbackName,
  APP_ROLES,
  type AppRole,
} from "@/lib/admin/users";
import {
  listAuthUsers,
  inviteUser,
  createUserWithPassword,
  resendInvite,
  deleteAuthUser,
  setUserActive,
  resetUserPassword,
  type AdminUserRow,
  type AdminUserStatus,
} from "@/lib/admin/users.functions";
import { scorePasswordStrength, MIN_PASSWORD_LENGTH } from "@/lib/admin/password";
import { toneText } from "@/lib/ui/tones";
import { canManageTargetUser, type ActingUserRef } from "@/lib/admin/permissions";
import { confirmCloseIfDirty } from "@/hooks/use-unsaved-changes";

const qk = {
  users: ["admin", "users"] as const,
  auth: ["admin", "auth-users"] as const,
};

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  sales_manager: "Sales Manager",
  sales: "Sales",
  purchase: "Purchase",
  // Sprint 1.7, Part 2: rendered read-only (see UserRowView) — there is no
  // "Grant Super Admin" action anywhere in this UI (APP_ROLES deliberately
  // excludes it), and the badge's remove control is disabled for it.
  super_admin: "Super Admin",
};

const STATUS_LABEL: Record<AdminUserStatus, string> = {
  active: "Active",
  invited: "Invited",
  expired: "Invite expired",
  deactivated: "Deactivated",
};

export const Route = createFileRoute("/_authenticated/admin/users")({
  ssr: false,
  beforeLoad: async () => {
    const { data: sess, error } = await supabase.auth.getUser();
    if (error || !sess.user) throw redirect({ to: "/auth", search: { flow: "signin" } });
    // Sprint 1.7, Part 4: the Super Admin is granted only the `super_admin`
    // role (never also `admin`), so this must accept either — checking
    // `admin` alone would lock the Platform Owner out of Users & Roles.
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", sess.user.id)
      .in("role", ["admin", "super_admin"]);
    if (!data || data.length === 0) throw redirect({ to: "/dashboard" });
  },
  component: UsersAdminPage,
});

interface CombinedUser extends AdminUserRow {
  roles: AppRole[];
  initials: string | null;
  job_title: string | null;
  department: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusVariant(s: AdminUserStatus): "default" | "outline" | "secondary" | "destructive" {
  switch (s) {
    case "active":
      return "default";
    case "invited":
      return "secondary";
    case "expired":
      return "outline";
    case "deactivated":
      return "destructive";
  }
}

function UsersAdminPage() {
  const qc = useQueryClient();
  const listAuthUsersFn = useServerFn(listAuthUsers);
  const inviteFn = useServerFn(inviteUser);
  const createWithPasswordFn = useServerFn(createUserWithPassword);
  const resendFn = useServerFn(resendInvite);
  const deleteFn = useServerFn(deleteAuthUser);
  const setActiveFn = useServerFn(setUserActive);
  const resetPasswordFn = useServerFn(resetUserPassword);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useState(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
    return null;
  });

  const profiles = useQuery({ queryKey: qk.users, queryFn: listAppUsers });
  const authUsers = useQuery({ queryKey: qk.auth, queryFn: () => listAuthUsersFn() });

  const combined = useMemo<CombinedUser[]>(() => {
    const auth = authUsers.data ?? [];
    const profileById = new Map((profiles.data ?? []).map((p) => [p.id, p] as const));

    return auth
      .map((u) => {
        const p = profileById.get(u.id);
        return {
          ...u,
          full_name: p?.full_name ?? u.full_name,
          roles: p?.roles ?? [],
          initials: p?.initials ?? null,
          job_title: p?.job_title ?? null,
          department: p?.department ?? null,
        };
      })
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  }, [authUsers.data, profiles.data]);

  // Sprint 1.7, Parts 2-4: the acting user's own role flags, used to decide
  // (client-side, mirroring the server-side checks in users.functions.ts)
  // whether a given row action against the Super Admin should be allowed.
  const actor = useMemo<ActingUserRef>(() => {
    const self = combined.find((u) => u.id === currentUserId);
    return {
      id: currentUserId ?? "",
      isSuperAdmin: self?.roles.includes("super_admin") ?? false,
      isAdmin: self?.roles.includes("admin") ?? false,
    };
  }, [combined, currentUserId]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: qk.users });
    qc.invalidateQueries({ queryKey: qk.auth });
  };

  const assign = useMutation({
    mutationFn: ({
      userId,
      role,
      targetRoles,
    }: {
      userId: string;
      role: AppRole;
      targetRoles: AppRole[];
    }) => assignRoleGuarded(actor, { id: userId, roles: targetRoles }, role),
    onSuccess: (_d, v) => {
      toast.success(`Granted ${ROLE_LABEL[v.role]}`);
      invalidate();
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const revoke = useMutation({
    mutationFn: ({
      userId,
      role,
      targetRoles,
    }: {
      userId: string;
      role: AppRole;
      targetRoles: AppRole[];
    }) => revokeRoleGuarded(actor, { id: userId, roles: targetRoles }, role),
    onSuccess: (_d, v) => {
      toast.success(`Removed ${ROLE_LABEL[v.role]}`);
      invalidate();
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const reset = useMutation({
    mutationFn: (email: string) => sendPasswordReset(email),
    onSuccess: () => toast.success("Password reset email sent"),
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const resetPassword = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      resetPasswordFn({ data: { user_id: userId, password } }),
    onSuccess: () => toast.success("Password reset"),
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const rename = useMutation({
    mutationFn: ({ userId, fullName }: { userId: string; fullName: string }) =>
      updateDisplayName(userId, fullName),
    onSuccess: () => {
      toast.success("Display name updated");
      invalidate();
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const invite = useMutation({
    mutationFn: (data: { email: string; full_name?: string | null; role?: AppRole | null }) =>
      inviteFn({
        data: {
          email: data.email,
          full_name: data.full_name ?? null,
          redirect_to: typeof window !== "undefined" ? `${window.location.origin}/auth` : null,
        },
      }).then(async (res) => {
        if (res.id && data.role) {
          // A newly invited user never already holds any role, so this is
          // never a protected-target mutation — kept on the guarded path
          // for consistency with every other role write in this file.
          await assignRoleGuarded(actor, { id: res.id, roles: [] }, data.role);
        }
        return res;
      }),
    onSuccess: () => {
      toast.success("Invitation sent");
      invalidate();
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const createWithPassword = useMutation({
    mutationFn: (data: {
      email: string;
      full_name?: string | null;
      password: string;
      role?: AppRole | null;
    }) =>
      createWithPasswordFn({
        data: {
          email: data.email,
          password: data.password,
          full_name: data.full_name ?? null,
        },
      }).then(async (res) => {
        if (res.id && data.role) {
          await assignRoleGuarded(actor, { id: res.id, roles: [] }, data.role);
        }
        return res;
      }),
    onSuccess: () => {
      toast.success("User created");
      invalidate();
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const resend = useMutation({
    mutationFn: (email: string) =>
      resendFn({
        data: {
          email,
          redirect_to: typeof window !== "undefined" ? `${window.location.origin}/auth` : null,
        },
      }),
    onSuccess: () => toast.success("Invitation resent"),
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const del = useMutation({
    mutationFn: (userId: string) => deleteFn({ data: { user_id: userId } }),
    onSuccess: () => {
      toast.success("User deleted");
      invalidate();
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const setActive = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      setActiveFn({ data: { user_id: userId, is_active: isActive } }),
    onSuccess: (_d, v) => {
      toast.success(v.isActive ? "User reactivated" : "User deactivated");
      invalidate();
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminUserStatus>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<CombinedUser | null>(null);
  const [passwordResetTarget, setPasswordResetTarget] = useState<CombinedUser | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return combined.filter((u) => {
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (u.full_name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [combined, search, statusFilter]);

  const isLoading = profiles.isLoading || authUsers.isLoading;
  const error = profiles.error || authUsers.error;
  const busy = assign.isPending || revoke.isPending;

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        subtitle="Invite users, assign roles, and manage the full user lifecycle. Email remains the login identity."
        actions={
          <Button onClick={() => setInviteOpen(true)} size="sm">
            <UserPlus className="mr-1.5 h-4 w-4" /> Add user
          </Button>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by display name or email…"
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="invited">Invited</SelectItem>
            <SelectItem value="expired">Invite expired</SelectItem>
            <SelectItem value="deactivated">Deactivated</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card className="shadow-1">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-destructive">{toUserMessage(error)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              {combined.length === 0 ? "No users yet." : "No users match your filters."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Display Name</th>
                    <th className="px-4 py-3">Job Title</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Roles</th>
                    <th className="px-4 py-3">Last Login</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((u) => (
                    <UserRowView
                      key={u.id}
                      user={u}
                      actor={actor}
                      isSelf={u.id === currentUserId}
                      onAssign={(role) =>
                        assign.mutate({ userId: u.id, role, targetRoles: u.roles })
                      }
                      onRevoke={(role) =>
                        revoke.mutate({ userId: u.id, role, targetRoles: u.roles })
                      }
                      onReset={() => u.email && reset.mutate(u.email)}
                      onRename={(fullName) => rename.mutate({ userId: u.id, fullName })}
                      onResend={() => u.email && resend.mutate(u.email)}
                      onSetActive={(isActive) => setActive.mutate({ userId: u.id, isActive })}
                      onDelete={() => setConfirmDelete(u)}
                      onSetNewPassword={() => setPasswordResetTarget(u)}
                      busy={busy}
                      renaming={rename.isPending}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">
        Display name is shown throughout the app (greetings, activity log, comments, assignments).
        Deactivating a user preserves all historical records; deletion is blocked for yourself and
        for the last remaining active administrator.
      </p>

      <CreateUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        busyInvite={invite.isPending}
        busyPassword={createWithPassword.isPending}
        onSubmitInvite={(v) => invite.mutateAsync(v).then(() => setInviteOpen(false))}
        onSubmitPassword={(v) => createWithPassword.mutateAsync(v).then(() => setInviteOpen(false))}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes their sign-in access and profile. Historical records (activity log,
              comments, assignments) are preserved and continue to show the user's previous display
              name. For most cases, deactivating instead is safer.
              {confirmDelete?.email ? (
                <span className="mt-2 block font-medium text-foreground">
                  {confirmDelete.full_name?.trim() || fallbackName(confirmDelete.email)} —{" "}
                  {confirmDelete.email}
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) {
                  del.mutate(confirmDelete.id, { onSuccess: () => setConfirmDelete(null) });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SetPasswordDialog
        user={passwordResetTarget}
        busy={resetPassword.isPending}
        onOpenChange={(o) => !o && setPasswordResetTarget(null)}
        onSubmit={(password) => {
          if (!passwordResetTarget) return;
          resetPassword.mutate(
            { userId: passwordResetTarget.id, password },
            { onSuccess: () => setPasswordResetTarget(null) },
          );
        }}
      />
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  busyInvite,
  busyPassword,
  onSubmitInvite,
  onSubmitPassword,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  busyInvite: boolean;
  busyPassword: boolean;
  onSubmitInvite: (v: {
    email: string;
    full_name?: string | null;
    role?: AppRole | null;
  }) => Promise<unknown>;
  onSubmitPassword: (v: {
    email: string;
    full_name?: string | null;
    password: string;
    role?: AppRole | null;
  }) => Promise<unknown>;
}) {
  const [mode, setMode] = useState<"invite" | "password">("invite");
  // Sprint 1.7, Part 10 — only the "Set password now" tab is one of the
  // approved QuickForm conversions; the invite tab is unchanged.
  const [passwordDirty, setPasswordDirty] = useState(false);
  const dirty = mode === "password" && passwordDirty;

  return (
    <Dialog open={open} onOpenChange={(o) => confirmCloseIfDirty(o, dirty) && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Send an email invitation, or set a password directly and skip the invite step.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList>
            <TabsTrigger value="invite">Send invite</TabsTrigger>
            <TabsTrigger value="password">Set password now</TabsTrigger>
          </TabsList>
          <TabsContent value="invite">
            <InviteForm
              busy={busyInvite}
              onCancel={() => onOpenChange(false)}
              onSubmit={(v) => onSubmitInvite(v)}
            />
          </TabsContent>
          <TabsContent value="password">
            <PasswordCreateForm
              busy={busyPassword}
              onCancel={() => confirmCloseIfDirty(false, passwordDirty) && onOpenChange(false)}
              onSubmit={(v) => onSubmitPassword(v)}
              onDirtyChange={setPasswordDirty}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InviteForm({
  busy,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  onCancel: () => void;
  onSubmit: (v: { email: string; full_name?: string | null; role?: AppRole | null }) => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole | "none">("none");

  return (
    <form
      className="space-y-3 pt-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (!email.trim()) return;
        onSubmit({
          email: email.trim(),
          full_name: fullName.trim() || null,
          role: role === "none" ? null : role,
        });
      }}
    >
      <p className="text-xs text-muted-foreground">
        Sends a sign-in invitation. The recipient sets their own password on first visit.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="invite-email">Email</Label>
        <Input
          id="invite-email"
          type="email"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@company.com"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="invite-name">Display name (optional)</Label>
        <Input
          id="invite-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Harsh Pupneja"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Initial role (optional)</Label>
        <Select value={role} onValueChange={(v) => setRole(v as AppRole | "none")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No role (assign later)</SelectItem>
            {APP_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || !email.trim()}>
          {busy ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-1.5 h-4 w-4" />
          )}
          Send invitation
        </Button>
      </DialogFooter>
    </form>
  );
}

function PasswordCreateForm({
  busy,
  onCancel,
  onSubmit,
  onDirtyChange,
}: {
  busy: boolean;
  onCancel: () => void;
  onSubmit: (v: {
    email: string;
    full_name?: string | null;
    password: string;
    role?: AppRole | null;
  }) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole | "none">("none");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const strength = scorePasswordStrength(password);
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const formRef = useRef<HTMLFormElement>(null);

  // Sprint 1.7, Part 10 — reports unsaved-edit state up to CreateUserDialog,
  // which uses it to guard against an accidental close.
  useEffect(() => {
    onDirtyChange?.(!!email || !!fullName || !!password || role !== "none");
  }, [email, fullName, password, role, onDirtyChange]);

  // Ctrl/Cmd+Enter submits, matching the shortcut convention used across
  // the other converted dialogs.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (!email.trim() || password.length < MIN_PASSWORD_LENGTH || busy) return;
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [email, password, busy]);

  async function copyPassword() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    toast.success("Password copied to clipboard");
  }

  return (
    <form
      ref={formRef}
      className="space-y-3 pt-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (!email.trim() || password.length < MIN_PASSWORD_LENGTH) return;
        onSubmit({
          email: email.trim(),
          full_name: fullName.trim() || null,
          password,
          role: role === "none" ? null : role,
        });
      }}
    >
      <p className="text-xs text-muted-foreground">
        Creates the account with this password immediately — no invitation email is sent, and the
        email address is not independently verified. Share the password with the user yourself.
        They'll be required to set their own password the first time they sign in.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="pw-email">Email</Label>
        <Input
          id="pw-email"
          type="email"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@company.com"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pw-name">Display name (optional)</Label>
        <Input
          id="pw-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Harsh Pupneja"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Initial role (optional)</Label>
        <Select value={role} onValueChange={(v) => setRole(v as AppRole | "none")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No role (assign later)</SelectItem>
            {APP_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="pw-password">Password</Label>
        </div>
        <div className="relative">
          <Input
            id="pw-password"
            type={showPassword ? "text" : "password"}
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Type a temporary password"
            className="pr-16 font-mono"
            aria-describedby="pw-strength"
          />
          <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={copyPassword}
              disabled={!password}
              aria-label="Copy password"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div id="pw-strength" className="space-y-1">
          <Progress value={strength.percent} className="h-1" />
          <div className="flex items-center justify-between text-xs">
            <span className={password ? toneText(strength.tone) : "text-muted-foreground"}>
              {password ? strength.label : "Minimum 8 characters"}
            </span>
            {tooShort && (
              <span className="text-status-danger-fg">
                {MIN_PASSWORD_LENGTH - password.length} more character
                {MIN_PASSWORD_LENGTH - password.length === 1 ? "" : "s"} needed
              </span>
            )}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={busy || !email.trim() || password.length < MIN_PASSWORD_LENGTH}
        >
          {busy ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="mr-1.5 h-4 w-4" />
          )}
          Create user
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * Sprint 1.7, Part 6 — Admin/Super Admin-driven direct password reset.
 * Distinct from "Send password reset" (an email link the user completes
 * themselves): here the caller enters the new password directly and it
 * takes effect immediately. Permission (including the Super Admin
 * self-only rule) is enforced server-side in `resetUserPassword`; this
 * dialog itself has no special-casing because `UserRowView` never renders
 * the menu item that opens it unless the action is already allowed.
 */
function SetPasswordDialog({
  user,
  busy,
  onOpenChange,
  onSubmit,
}: {
  user: { email: string | null; full_name: string | null } | null;
  busy: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const strength = scorePasswordStrength(password);
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;

  useEffect(() => {
    if (!user) setPassword("");
  }, [user]);

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Set a new password</DialogTitle>
          <DialogDescription>
            {user?.full_name?.trim() || fallbackName(user?.email)} — {user?.email ?? ""}. Takes
            effect immediately; they'll be required to set their own password on next sign-in.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3 pt-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (password.length < MIN_PASSWORD_LENGTH) return;
            onSubmit(password);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="reset-pw-password">New password</Label>
            <div className="relative">
              <Input
                id="reset-pw-password"
                type={showPassword ? "text" : "password"}
                required
                autoFocus
                minLength={MIN_PASSWORD_LENGTH}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Type a temporary password"
                className="pr-10 font-mono"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
            <div className="space-y-1">
              <Progress value={strength.percent} className="h-1" />
              <div className="flex items-center justify-between text-xs">
                <span className={password ? toneText(strength.tone) : "text-muted-foreground"}>
                  {password ? strength.label : "Minimum 8 characters"}
                </span>
                {tooShort && (
                  <span className="text-status-danger-fg">
                    {MIN_PASSWORD_LENGTH - password.length} more character
                    {MIN_PASSWORD_LENGTH - password.length === 1 ? "" : "s"} needed
                  </span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy || password.length < MIN_PASSWORD_LENGTH}>
              {busy ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-1.5 h-4 w-4" />
              )}
              Set password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UserRowView({
  user,
  actor,
  isSelf,
  onAssign,
  onRevoke,
  onReset,
  onRename,
  onResend,
  onSetActive,
  onDelete,
  onSetNewPassword,
  busy,
  renaming,
}: {
  user: CombinedUser;
  actor: ActingUserRef;
  isSelf: boolean;
  onAssign: (role: AppRole) => void;
  onRevoke: (role: AppRole) => void;
  onReset: () => void;
  onRename: (fullName: string) => void;
  onResend: () => void;
  onSetActive: (isActive: boolean) => void;
  onDelete: () => void;
  onSetNewPassword: () => void;
  busy: boolean;
  renaming: boolean;
}) {
  const available = APP_ROLES.filter((r) => !user.roles.includes(r));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(user.full_name ?? "");
  const pendingInvite = user.status === "invited" || user.status === "expired";

  // Sprint 1.7, Part 3: the same decision matrix `users.functions.ts`
  // enforces server-side, evaluated here purely to disable/hide row
  // actions the request would be denied anyway — the server (and, for
  // user_roles, the DB trigger) remains the authoritative check.
  const targetRef = { id: user.id, isSuperAdmin: user.roles.includes("super_admin") };
  const isProtected = targetRef.isSuperAdmin;
  const canDelete = !isSelf && canManageTargetUser(actor, targetRef, "delete").allowed;
  const canDeactivate = !isSelf && canManageTargetUser(actor, targetRef, "deactivate").allowed;
  const canSetPassword = canManageTargetUser(actor, targetRef, "reset_password").allowed;

  function startEdit() {
    setDraft(user.full_name ?? "");
    setEditing(true);
  }
  function commit() {
    const next = draft.trim();
    if (next === (user.full_name ?? "").trim()) {
      setEditing(false);
      return;
    }
    onRename(next);
    setEditing(false);
  }

  return (
    <tr className={user.status === "deactivated" ? "opacity-60" : undefined}>
      <td className="px-4 py-3 font-medium">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") setEditing(false);
              }}
              placeholder="e.g. Harsh"
              className="h-8 w-48"
              disabled={renaming}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={commit}
              disabled={renaming}
              aria-label="Save display name"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setEditing(false)}
              disabled={renaming}
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="group inline-flex items-center gap-1.5 text-left hover:text-primary"
            title="Click to edit display name"
          >
            <span>{user.full_name?.trim() || fallbackName(user.email)}</span>
            <Pencil className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
          </button>
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{user.job_title ?? "—"}</td>
      <td className="px-4 py-3 text-muted-foreground">{user.department ?? "—"}</td>
      <td className="px-4 py-3 text-muted-foreground">{user.email ?? "—"}</td>
      <td className="px-4 py-3">
        <Badge variant={statusVariant(user.status)}>{STATUS_LABEL[user.status]}</Badge>
      </td>
      <td className="px-4 py-3">
        {user.roles.length === 0 ? (
          <span className="text-xs text-muted-foreground">No application roles assigned.</span>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {user.roles.map((r) =>
              r === "super_admin" ? (
                // Sprint 1.7, Part 3: never revocable, by anyone — no
                // remove control at all, not even a disabled one, so
                // there's nothing here that looks actionable.
                <Badge
                  key={r}
                  variant="secondary"
                  className="gap-1"
                  title="This account is protected."
                >
                  <ShieldAlert className="h-3 w-3" />
                  {ROLE_LABEL[r]}
                </Badge>
              ) : (
                <Badge key={r} variant="secondary" className="gap-1">
                  {ROLE_LABEL[r]}
                  <button
                    type="button"
                    onClick={() => onRevoke(r)}
                    disabled={busy}
                    className="ml-0.5 rounded hover:bg-muted-foreground/20"
                    aria-label={`Remove ${ROLE_LABEL[r]}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ),
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {formatDate(user.last_sign_in_at)}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(user.created_at)}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {/* Sprint 1.7, Part 3: the protected account's role set is fixed —
              no additional roles can be granted to it either. */}
          {!isProtected &&
            available.map((r) => (
              <Button
                key={r}
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onAssign(r)}
              >
                Grant {ROLE_LABEL[r]}
              </Button>
            ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Lifecycle</DropdownMenuLabel>
              {pendingInvite ? (
                <DropdownMenuItem onClick={onResend} disabled={!user.email}>
                  <Send className="mr-2 h-4 w-4" /> Resend invitation
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={onReset} disabled={!user.email}>
                <KeyRound className="mr-2 h-4 w-4" /> Send password reset
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onSetNewPassword}
                disabled={!canSetPassword}
                title={!canSetPassword ? "This account is protected." : undefined}
              >
                <KeyRound className="mr-2 h-4 w-4" /> Set new password
              </DropdownMenuItem>
              {user.is_active ? (
                <DropdownMenuItem
                  onClick={() => onSetActive(false)}
                  disabled={!canDeactivate}
                  title={isProtected ? "This account is protected." : undefined}
                >
                  <UserX className="mr-2 h-4 w-4" /> Deactivate user
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onSetActive(true)}>
                  <UserCheck className="mr-2 h-4 w-4" /> Reactivate user
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                disabled={!canDelete}
                title={isProtected ? "This account is protected." : undefined}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {pendingInvite ? "Cancel invitation" : "Delete user"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}
