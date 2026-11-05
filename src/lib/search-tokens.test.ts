import { describe, expect, it } from "bun:test";
import { generateSearchTokens } from "./search-tokens";

describe("generateSearchTokens", () => {
  it("handles empty and short queries gracefully", () => {
    expect(generateSearchTokens("")).toEqual([]);
    expect(generateSearchTokens("   ")).toEqual([]);
    expect(generateSearchTokens("a")).toEqual([]);
  });

  it("generates variants for 'dillep' including 'dileep' and 'dilip'", () => {
    const tokens = generateSearchTokens("dillep");
    expect(tokens).toContain("dillep");
    expect(tokens).toContain("dileep");
    expect(tokens).toContain("dilip");
  });

  it("generates variants for 'Mahavar' including 'mahawar' (v <-> w swap)", () => {
    const tokens = generateSearchTokens("Mahavar");
    expect(tokens).toContain("mahavar");
    expect(tokens).toContain("mahawar");
  });

  it("handles multi-word search 'dileep Mahavar'", () => {
    const tokens = generateSearchTokens("dileep Mahavar");
    expect(tokens).toContain("dileep");
    expect(tokens).toContain("mahavar");
    expect(tokens).toContain("mahawar");
    expect(tokens).toContain("dileep mahawar");
  });

  it("handles payment reference codes without altering them", () => {
    const tokens = generateSearchTokens("VPAY-20261021-10283");
    expect(tokens).toContain("vpay-20261021-10283");
  });
});
