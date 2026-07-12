import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound, X } from "lucide-react";
import { toUserMessage } from "@/lib/errors";
import {
  listAppUsers,
  assignRole,
  revokeRole,
  sendPasswordReset,
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
    const rolesByUser = new Map<string, AppRole[]>();
    (profiles.data ?? []).forEach((p) => rolesByUser.set(p.id, p.roles));
    const profileNameById = new Map<string, string | null>();
    (profiles.data ?? []).forEach((p) => profileNameById.set(p.id, p.full_name));
    return auth
      .map((u) => ({
        ...u,
        full_name: profileNameById.get(u.id) ?? u.full_name,
        roles: rolesByUser.get(u.id) ?? [],
      }))
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

  const isLoading = profiles.isLoading || authUsers.isLoading;
  const error = profiles.error || authUsers.error;
  const busy = assign.isPending || revoke.isPending;

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        subtitle="Grant or revoke application roles. Changes apply on the user's next refresh."
      />
      <Card className="shadow-1">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-destructive">{toUserMessage(error)}</div>
          ) : combined.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No users yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Roles</th>
                    <th className="px-4 py-3">Last Login</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {combined.map((u) => (
                    <UserRowView
                      key={u.id}
                      user={u}
                      onAssign={(role) => assign.mutate({ userId: u.id, role })}
                      onRevoke={(role) => revoke.mutate({ userId: u.id, role })}
                      onReset={() => u.email && reset.mutate(u.email)}
                      busy={busy}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">
        Need to invite a new user?{" "}
        <Link to="/settings" className="text-primary hover:underline">
          Go to Settings
        </Link>{" "}
        — new accounts are provisioned via Lovable Cloud.
      </p>
    </div>
  );
}

function UserRowView({
  user,
  onAssign,
  onRevoke,
  onReset,
  busy,
}: {
  user: CombinedUser;
  onAssign: (role: AppRole) => void;
  onRevoke: (role: AppRole) => void;
  onReset: () => void;
  busy: boolean;
}) {
  const available = APP_ROLES.filter((r) => !user.roles.includes(r));

  return (
    <tr>
      <td className="px-4 py-3 font-medium">{user.full_name || "—"}</td>
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
