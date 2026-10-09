import { describe, expect, it } from "bun:test";
import { isChunkLoadError } from "./chunk-recovery";

describe("chunk-recovery", () => {
  it("detects WebKit / Safari module import failures", () => {
    expect(isChunkLoadError(new Error("Importing a module script failed."))).toBe(true);
    expect(isChunkLoadError(new TypeError("Importing a module script failed"))).toBe(true);
  });

  it("detects Chromium dynamic import failures", () => {
    expect(
      isChunkLoadError(
        new TypeError(
          "Failed to fetch dynamically imported module: https://stonetech.in/assets/payments-xyz.js",
        ),
      ),
    ).toBe(true);
  });

  it("detects CSS preload and chunk failures", () => {
    expect(isChunkLoadError(new Error("Unable to preload CSS for /assets/styles.css"))).toBe(true);
    expect(isChunkLoadError(new Error("Loading chunk 42 failed"))).toBe(true);
  });

  it("returns false for regular application errors", () => {
    expect(isChunkLoadError(new Error("Network response was not ok"))).toBe(false);
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});
