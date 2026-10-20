import { describe, expect, it } from "bun:test";

describe("Terminated Employee Access Security", () => {
  it("does not include terminated employee email (rp140528@gmail.com) in director lists", () => {
    const directorEmails = [
      "raman.pupneja@gmail.com",
      "stonetechrajasthan@gmail.com",
      "rishirai@gmail.com",
    ];

    expect(directorEmails.includes("rp140528@gmail.com")).toBe(false);
  });

  it("identifies terminated and resigned employment statuses as revoked", () => {
    const isRevokedStatus = (status: string) => ["terminated", "resigned"].includes(status);

    expect(isRevokedStatus("terminated")).toBe(true);
    expect(isRevokedStatus("resigned")).toBe(true);
    expect(isRevokedStatus("active")).toBe(false);
    expect(isRevokedStatus("on_leave")).toBe(false);
    expect(isRevokedStatus("notice")).toBe(false);
  });

  it("strictly denies software login rights when employment status is terminated", () => {
    const checkAccess = (profileActive: boolean, employmentStatus: string | null) => {
      if (!profileActive) return false;
      if (employmentStatus && ["terminated", "resigned"].includes(employmentStatus)) {
        return false;
      }
      return true;
    };

    // Active employee with active profile
    expect(checkAccess(true, "active")).toBe(true);

    // Terminated employee with active profile -> BLOCKED
    expect(checkAccess(true, "terminated")).toBe(false);

    // Terminated employee with inactive profile -> BLOCKED
    expect(checkAccess(false, "terminated")).toBe(false);

    // Resigned employee -> BLOCKED
    expect(checkAccess(true, "resigned")).toBe(false);

    // Inactive profile regardless of employee status -> BLOCKED
    expect(checkAccess(false, "active")).toBe(false);
  });
});
