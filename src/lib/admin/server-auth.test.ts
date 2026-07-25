import { describe, expect, it } from "bun:test";
import { requireAdminOrSuperAdmin, type HasRoleClient } from "./server-auth";

type RpcResult = { data: boolean | null; error: { message: string; code?: string } | null };

/** A `has_role` stub that answers differently per role asked about. */
function client(answers: Record<"admin" | "super_admin", RpcResult>): HasRoleClient {
  return {
    rpc: (_fn, args) => Promise.resolve(answers[args._role]),
  };
}

const ok = (data: boolean): RpcResult => ({ data, error: null });
const fails = (message: string, code?: string): RpcResult => ({
  data: null,
  error: { message, code },
});

describe("requireAdminOrSuperAdmin", () => {
  it("resolves both flags when the database answers both questions", async () => {
    const flags = await requireAdminOrSuperAdmin(
      client({ admin: ok(true), super_admin: ok(true) }),
      "u1",
    );
    expect(flags).toEqual({ isAdmin: true, isSuperAdmin: true });
  });

  it("admits a super admin who holds no separate admin role", async () => {
    const flags = await requireAdminOrSuperAdmin(
      client({ admin: ok(false), super_admin: ok(true) }),
      "u1",
    );
    expect(flags).toEqual({ isAdmin: false, isSuperAdmin: true });
  });

  it("rejects a caller holding neither role", async () => {
    await expect(
      requireAdminOrSuperAdmin(client({ admin: ok(false), super_admin: ok(false) }), "u1"),
    ).rejects.toThrow("Admin role required");
  });

  // The regression this guards: `HasRoleClient` is hand-written, so the
  // literal "super_admin" typechecks against a database that has never
  // heard of it, and the mismatch only shows up as a 22P02 at runtime —
  // which used to throw and lock every admin out of every admin-gated
  // surface at once.
  it("treats an unknown super_admin enum value as 'no super admin yet'", async () => {
    const flags = await requireAdminOrSuperAdmin(
      client({
        admin: ok(true),
        super_admin: fails('invalid input value for enum app_role: "super_admin"', "22P02"),
      }),
      "u1",
    );
    expect(flags).toEqual({ isAdmin: true, isSuperAdmin: false });
  });

  it("recognises the unapplied-migration failure from its message alone", async () => {
    const flags = await requireAdminOrSuperAdmin(
      client({
        admin: ok(true),
        super_admin: fails('invalid input value for enum app_role: "super_admin"'),
      }),
      "u1",
    );
    expect(flags.isSuperAdmin).toBe(false);
  });

  it("still surfaces any other super_admin failure", async () => {
    await expect(
      requireAdminOrSuperAdmin(
        client({ admin: ok(true), super_admin: fails("permission denied for function has_role") }),
        "u1",
      ),
    ).rejects.toThrow("permission denied for function has_role");
  });

  it("does not let the degraded path admit a caller who holds nothing", async () => {
    await expect(
      requireAdminOrSuperAdmin(
        client({
          admin: ok(false),
          super_admin: fails('invalid input value for enum app_role: "super_admin"', "22P02"),
        }),
        "u1",
      ),
    ).rejects.toThrow("Admin role required");
  });

  it("propagates an admin-side failure unchanged", async () => {
    await expect(
      requireAdminOrSuperAdmin(
        client({ admin: fails("connection terminated"), super_admin: ok(false) }),
        "u1",
      ),
    ).rejects.toThrow("connection terminated");
  });
});
