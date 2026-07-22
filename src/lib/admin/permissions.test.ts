/**
 * Sprint 1.7, Part 12 — unit tests for the Super Admin authorization matrix.
 *
 * `canManageTargetUser` / `assertCanManageTargetUser` are pure and I/O-free
 * (see permissions.ts), so these tests exercise the decision matrix directly
 * with plain object fixtures — no Supabase mocking, and therefore none of
 * the `mock.module()` cross-file pollution risk documented in
 * src/lib/vie/testSupport/moduleMocks.ts.
 */
import { describe, test, expect } from "bun:test";
import {
  canManageTargetUser,
  assertCanManageTargetUser,
  type ActingUserRef,
  type ManagedUserRef,
} from "./permissions";

const superAdmin: ActingUserRef = { id: "super-1", isSuperAdmin: true, isAdmin: false };
const admin: ActingUserRef = { id: "admin-1", isSuperAdmin: false, isAdmin: true };
const otherAdmin: ActingUserRef = { id: "admin-2", isSuperAdmin: false, isAdmin: true };
const employeeActor: ActingUserRef = { id: "emp-1", isSuperAdmin: false, isAdmin: false };

const superAdminTarget: ManagedUserRef = { id: "super-1", isSuperAdmin: true };
const adminTarget: ManagedUserRef = { id: "admin-2", isSuperAdmin: false };
const employeeTarget: ManagedUserRef = { id: "emp-1", isSuperAdmin: false };

describe("canManageTargetUser — Super Admin protection (Parts 2-4)", () => {
  test("Super Admin cannot be deleted, even by itself", () => {
    expect(canManageTargetUser(superAdmin, superAdminTarget, "delete")).toEqual({
      allowed: false,
      reason: "This account is protected.",
    });
  });

  test("Admin cannot delete Super Admin", () => {
    expect(canManageTargetUser(admin, superAdminTarget, "delete")).toEqual({
      allowed: false,
      reason: "This account is protected.",
    });
  });

  test("Admin cannot deactivate Super Admin", () => {
    expect(canManageTargetUser(admin, superAdminTarget, "deactivate")).toEqual({
      allowed: false,
      reason: "This account is protected.",
    });
  });

  test("Admin cannot change Super Admin's role", () => {
    expect(canManageTargetUser(admin, superAdminTarget, "change_role")).toEqual({
      allowed: false,
      reason: "This account is protected.",
    });
  });

  test("Admin cannot revoke Super Admin's role", () => {
    expect(canManageTargetUser(admin, superAdminTarget, "revoke_role")).toEqual({
      allowed: false,
      reason: "This account is protected.",
    });
  });

  test("Admin cannot reset Super Admin's password", () => {
    expect(canManageTargetUser(admin, superAdminTarget, "reset_password")).toEqual({
      allowed: false,
      reason: "This account is protected.",
    });
  });

  test("Super Admin can reset their own password", () => {
    expect(canManageTargetUser(superAdmin, superAdminTarget, "reset_password")).toEqual({
      allowed: true,
    });
  });

  test("Admin can delete Admin", () => {
    expect(canManageTargetUser(admin, adminTarget, "delete")).toEqual({ allowed: true });
  });

  test("Admin can delete Employee", () => {
    expect(canManageTargetUser(admin, employeeTarget, "delete")).toEqual({ allowed: true });
  });

  test("Super Admin can delete Admin", () => {
    expect(canManageTargetUser(superAdmin, adminTarget, "delete")).toEqual({ allowed: true });
  });

  test("Super Admin can delete Employee", () => {
    expect(canManageTargetUser(superAdmin, employeeTarget, "delete")).toEqual({ allowed: true });
  });

  test("non-admin actor cannot manage another user", () => {
    expect(canManageTargetUser(employeeActor, adminTarget, "delete")).toEqual({
      allowed: false,
      reason: "You don't have permission to manage this user.",
    });
  });

  test("Admin can revoke another Admin's role", () => {
    expect(canManageTargetUser(otherAdmin, adminTarget, "revoke_role")).toEqual({
      allowed: true,
    });
  });
});

describe("assertCanManageTargetUser", () => {
  test("throws the exact Part 3 copy when denied", () => {
    expect(() => assertCanManageTargetUser(admin, superAdminTarget, "delete")).toThrow(
      "This account is protected.",
    );
  });

  test("does not throw when allowed", () => {
    expect(() => assertCanManageTargetUser(admin, employeeTarget, "delete")).not.toThrow();
  });
});
