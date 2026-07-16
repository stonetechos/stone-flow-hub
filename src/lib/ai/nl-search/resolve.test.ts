/**
 * NL Search entity-name resolution tests — pure, no I/O. Run with `bun test`.
 *
 * Regression coverage for a Phase RC-4 bug: a query naming one specific
 * customer ("Darshan Shah's enquiry status") must never resolve to a
 * different customer's records just because both happen to be in the same
 * result set. resolveByName() is the single deterministic name-matching
 * primitive every named-customer lookup in resolve.ts shares (resolveCustomer,
 * resolveTimelineIntent, and resolveGeneric's customer-scoped entity types) —
 * pinning its behavior here protects all of them at once.
 */
import { describe, expect, test } from "bun:test";
import { resolveByName } from "./resolve";

type Row = { id: string; name: string };

const darshan: Row = { id: "cus-darshan", name: "Darshan Shah" };
const shiv: Row = { id: "cus-shiv-1", name: "Shiv Solanki" };
const sunny: Row = { id: "cus-sunny", name: "Sunny Gandhi" };
const shivNader: Row = { id: "cus-shiv-2", name: "Shiv Nader" };

describe("resolveByName", () => {
  test("an exact match is never substituted for another row in the same set", () => {
    const resolution = resolveByName([darshan, shiv, sunny], "Darshan Shah", (r) => r.name);
    expect(resolution.kind).toBe("one");
    expect(resolution.kind === "one" && resolution.row.id).toBe("cus-darshan");
  });

  test("exact match is case-insensitive", () => {
    const resolution = resolveByName([darshan, shiv], "darshan shah", (r) => r.name);
    expect(resolution.kind).toBe("one");
    expect(resolution.kind === "one" && resolution.row.id).toBe("cus-darshan");
  });

  test("prefers an exact match over a partial one instead of guessing", () => {
    // "Shiv" alone is a substring of both "Shiv Solanki" and "Shiv Nader",
    // but here the needle IS a full, exact name — it must resolve to that
    // one row, not fall through to treating the set as ambiguous.
    const resolution = resolveByName([shiv, shivNader], "Shiv Solanki", (r) => r.name);
    expect(resolution.kind).toBe("one");
    expect(resolution.kind === "one" && resolution.row.id).toBe("cus-shiv-1");
  });

  test("two genuine candidates with no exact match ask the user instead of picking one", () => {
    const resolution = resolveByName([shiv, shivNader], "Shiv", (r) => r.name);
    expect(resolution.kind).toBe("ambiguous");
    expect(resolution.kind === "ambiguous" && resolution.rows.length).toBe(2);
  });

  test("a single remaining candidate is still confident even without an exact match", () => {
    const resolution = resolveByName([shiv], "Shiv", (r) => r.name);
    expect(resolution.kind).toBe("one");
    expect(resolution.kind === "one" && resolution.row.id).toBe("cus-shiv-1");
  });

  test("no rows resolves to none, never a guess", () => {
    const resolution = resolveByName([], "Darshan Shah", (r) => r.name);
    expect(resolution.kind).toBe("none");
  });
});
