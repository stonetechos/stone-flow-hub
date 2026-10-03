import { describe, expect, it } from "bun:test";
import { customerCreateSchema } from "./schema";
import { normalizeMobile } from "@/lib/zod";

describe("customerCreateSchema optional mobile & email", () => {
  it("allows customer creation without mobile or email", () => {
    const parsed = customerCreateSchema.parse({
      name: "Ramesh Bhai",
    });

    expect(parsed.name).toBe("Ramesh Bhai");
    expect(parsed.mobile ?? null).toBeNull();
    expect(parsed.email ?? null).toBeNull();
  });

  it("allows customer creation with empty string mobile and email", () => {
    const parsed = customerCreateSchema.parse({
      name: "Suresh Patel",
      mobile: "",
      email: "",
    });

    expect(parsed.name).toBe("Suresh Patel");
    expect(parsed.mobile).toBeNull();
    expect(parsed.email).toBeNull();
  });

  it("validates mobile format when mobile is provided", () => {
    const parsed = customerCreateSchema.parse({
      name: "Mahesh Kumar",
      mobile: "9876543210",
      email: "mahesh@example.com",
    });

    expect(parsed.mobile).toBe("9876543210");
    expect(parsed.email).toBe("mahesh@example.com");
  });

  it("normalizes empty or null mobile gracefully without crashing", () => {
    expect(normalizeMobile("")).toBe("");
    expect(normalizeMobile(null)).toBe("");
    expect(normalizeMobile(undefined)).toBe("");
    expect(normalizeMobile("+91 98765-43210")).toBe("9876543210");
  });
});
