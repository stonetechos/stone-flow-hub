import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, KeyRound, X, Plus } from "lucide-react";
import { toUserMessage } from "@/lib/errors";
import {
  listAppUsers,
  assignRole,
  revokeRole,
  sendPasswordReset,
  APP_ROLES,
  type AppRole,
  type UserRow,
} from "@/lib/admin/users";

const qk = {
  users: ["admin", "users"] as const,
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

function UsersAdminPage() {
  const qc = useQueryClient();
  const users = useQuery({ queryKey: qk.users, queryFn: listAppUsers });

  const assign = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AppRole }) =>
      assignRole(userId, role),
    onSuccess: () => {
      toast.success("Role assigned");
      qc.invalidateQueries({ queryKey: qk.users });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const revoke = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AppRole }) =>
      revokeRole(userId, role),
    onSuccess: () => {
      toast.success("Role removed");
      qc.invalidateQueries({ queryKey: qk.users });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const reset = useMutation({
    mutationFn: (email: string) => sendPasswordReset(email),
    onSuccess: () => toast.success("Password reset email sent"),
    onError: (err) => toast.error(toUserMessage(err)),
  });

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Assign roles and manage access for staff users."
      />
      <Card className="shadow-1">
        <CardContent className="p-0">
          {users.isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : users.error ? (
            <div className="p-6 text-sm text-destructive">
              {toUserMessage(users.error)}
            </div>
          ) : (users.data ?? []).length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No users yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Roles</th>
                    <th className="px-4 py-3">Assign role</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(users.data ?? []).map((u) => (
                    <UserRowView
                      key={u.id}
                      user={u}
                      onAssign={(role) => assign.mutate({ userId: u.id, role })}
                      onRevoke={(role) => revoke.mutate({ userId: u.id, role })}
                      onReset={() => u.email && reset.mutate(u.email)}
                      busy={assign.isPending || revoke.isPending}
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
  user: UserRow;
  onAssign: (role: AppRole) => void;
  onRevoke: (role: AppRole) => void;
  onReset: () => void;
  busy: boolean;
}) {
  const [pending, setPending] = useState<AppRole | "">("");
  const available = APP_ROLES.filter((r) => !user.roles.includes(r));

  return (
    <tr>
      <td className="px-4 py-3">
        <div className="font-medium">{user.full_name || "—"}</div>
        <div className="text-xs text-muted-foreground">{user.email ?? user.id}</div>
      </td>
      <td className="px-4 py-3">
        {user.roles.length === 0 ? (
          <span className="text-xs text-muted-foreground">No roles</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {user.roles.map((r) => (
              <Badge key={r} variant="secondary" className="gap-1">
                {r}
                <button
                  type="button"
                  onClick={() => onRevoke(r)}
                  disabled={busy}
                  className="ml-0.5 rounded hover:bg-muted-foreground/20"
                  aria-label={`Remove ${r}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {available.length === 0 ? (
          <span className="text-xs text-muted-foreground">All roles assigned</span>
        ) : (
          <div className="flex items-center gap-2">
            <Select value={pending} onValueChange={(v) => setPending(v as AppRole)}>
              <SelectTrigger className="h-8 w-40">
                <SelectValue placeholder="Pick a role" />
              </SelectTrigger>
              <SelectContent>
                {available.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              disabled={!pending || busy}
              onClick={() => {
                if (!pending) return;
                onAssign(pending);
                setPending("");
              }}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add
            </Button>
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <Button size="sm" variant="ghost" disabled={!user.email} onClick={onReset}>
          <KeyRound className="mr-1 h-3.5 w-3.5" /> Reset password
        </Button>
      </td>
    </tr>
  );
}
