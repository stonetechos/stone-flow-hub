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
import { Loader2, KeyRound, X, Pencil, Check, Search } from "lucide-react";
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
import { listAuthUsers, type AdminUserRow } from "@/lib/admin/users.functions";

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

export const Route = createFileRoute("/_authenticated/admin/users")({
  ssr: false,
  beforeLoad: async () => {
    const { data: sess, error } = await supabase.auth.getUser();
    if (error || !sess.user) throw redirect({ to: "/auth" });
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

function UsersAdminPage() {
  const qc = useQueryClient();
  const listAuthUsersFn = useServerFn(listAuthUsers);

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

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return combined;
    return combined.filter(
      (u) =>
        (u.full_name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q),
    );
  }, [combined, search]);

  const isLoading = profiles.isLoading || authUsers.isLoading;
  const error = profiles.error || authUsers.error;
  const busy = assign.isPending || revoke.isPending;

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        subtitle="Manage display names and application roles. Email remains the login identity."
      />
      <div className="mb-3 flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by display name or email…"
            className="pl-8"
          />
        </div>
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
              {combined.length === 0 ? "No users yet." : "No users match your search."}
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
                      onAssign={(role) => assign.mutate({ userId: u.id, role })}
                      onRevoke={(role) => revoke.mutate({ userId: u.id, role })}
                      onReset={() => u.email && reset.mutate(u.email)}
                      onRename={(fullName) => rename.mutate({ userId: u.id, fullName })}
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
        Editing it never changes the user's login email, ID, or permissions.
      </p>
    </div>
  );
}

function UserRowView({
  user,
  onAssign,
  onRevoke,
  onReset,
  onRename,
  busy,
  renaming,
}: {
  user: CombinedUser;
  onAssign: (role: AppRole) => void;
  onRevoke: (role: AppRole) => void;
  onReset: () => void;
  onRename: (fullName: string) => void;
  busy: boolean;
  renaming: boolean;
}) {
  const available = APP_ROLES.filter((r) => !user.roles.includes(r));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(user.full_name ?? "");

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
    <tr>
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
        <Badge variant={user.status === "active" ? "default" : "outline"}>
          {user.status === "active" ? "Active" : "Invited"}
        </Badge>
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
        <div className="flex flex-wrap justify-end gap-1.5">
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
          <Button
            size="sm"
            variant="ghost"
            disabled={!user.email}
            onClick={onReset}
          >
            <KeyRound className="mr-1 h-3.5 w-3.5" /> Reset password
          </Button>
        </div>
      </td>
    </tr>
  );
}
