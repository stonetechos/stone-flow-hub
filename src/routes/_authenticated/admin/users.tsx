import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
  RefreshCw,
} from "lucide-react";
import { toUserMessage } from "@/lib/errors";
import {
  listAppUsers,
  assignRole,
  revokeRole,
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
  type AdminUserRow,
  type AdminUserStatus,
} from "@/lib/admin/users.functions";
import { generatePassword, scorePasswordStrength, MIN_PASSWORD_LENGTH } from "@/lib/admin/password";
import { toneText } from "@/lib/ui/tones";

const qk = {
  users: ["admin", "users"] as const,
  auth: ["admin", "auth-users"] as const,
};

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  sales_manager: "Sales Manager",
  sales: "Sales",
  purchase: "Purchase",
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
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", sess.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/dashboard" });
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

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: qk.users });
    qc.invalidateQueries({ queryKey: qk.auth });
  };

  const assign = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AppRole }) =>
      assignRole(userId, role),
    onSuccess: (_d, v) => {
      toast.success(`Granted ${ROLE_LABEL[v.role]}`);
      invalidate();
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const revoke = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AppRole }) =>
      revokeRole(userId, role),
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
          redirect_to:
            typeof window !== "undefined" ? `${window.location.origin}/auth` : null,
        },
      }).then(async (res) => {
        if (res.id && data.role) {
          await assignRole(res.id, data.role);
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
          await assignRole(res.id, data.role);
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
          redirect_to:
            typeof window !== "undefined" ? `${window.location.origin}/auth` : null,
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return combined.filter((u) => {
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (u.full_name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
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
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
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
                      isSelf={u.id === currentUserId}
                      onAssign={(role) => assign.mutate({ userId: u.id, role })}
                      onRevoke={(role) => revoke.mutate({ userId: u.id, role })}
                      onReset={() => u.email && reset.mutate(u.email)}
                      onRename={(fullName) => rename.mutate({ userId: u.id, fullName })}
                      onResend={() => u.email && resend.mutate(u.email)}
                      onSetActive={(isActive) =>
                        setActive.mutate({ userId: u.id, isActive })
                      }
                      onDelete={() => setConfirmDelete(u)}
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

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes their sign-in access and profile. Historical records (activity log,
              comments, assignments) are preserved and continue to show the user's previous
              display name. For most cases, deactivating instead is safer.
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onCancel={() => onOpenChange(false)}
              onSubmit={(v) => onSubmitPassword(v)}
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
}: {
  busy: boolean;
  onCancel: () => void;
  onSubmit: (v: {
    email: string;
    full_name?: string | null;
    password: string;
    role?: AppRole | null;
  }) => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole | "none">("none");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const strength = scorePasswordStrength(password);
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;

  async function copyPassword() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    toast.success("Password copied to clipboard");
  }

  return (
    <form
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
          <button
            type="button"
            onClick={() => setPassword(generatePassword())}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <RefreshCw className="h-3 w-3" /> Generate
          </button>
        </div>
        <div className="relative">
          <Input
            id="pw-password"
            type={showPassword ? "text" : "password"}
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Type or generate a password"
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
        <Button type="submit" disabled={busy || !email.trim() || password.length < MIN_PASSWORD_LENGTH}>
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

function UserRowView({
  user,
  isSelf,
  onAssign,
  onRevoke,
  onReset,
  onRename,
  onResend,
  onSetActive,
  onDelete,
  busy,
  renaming,
}: {
  user: CombinedUser;
  isSelf: boolean;
  onAssign: (role: AppRole) => void;
  onRevoke: (role: AppRole) => void;
  onReset: () => void;
  onRename: (fullName: string) => void;
  onResend: () => void;
  onSetActive: (isActive: boolean) => void;
  onDelete: () => void;
  busy: boolean;
  renaming: boolean;
}) {
  const available = APP_ROLES.filter((r) => !user.roles.includes(r));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(user.full_name ?? "");
  const pendingInvite = user.status === "invited" || user.status === "expired";

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
          <span className="text-xs text-muted-foreground">
            No application roles assigned.
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {user.roles.map((r) => (
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
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {formatDate(user.last_sign_in_at)}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {formatDate(user.created_at)}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {available.map((r) => (
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
              {user.is_active ? (
                <DropdownMenuItem
                  onClick={() => onSetActive(false)}
                  disabled={isSelf}
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
                disabled={isSelf}
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
