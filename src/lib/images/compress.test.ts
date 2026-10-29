import { describe, it, expect } from "bun:test";
import { compressImageToDataUrl } from "./compress";

describe("compressImageToDataUrl", () => {
  it("falls back gracefully in headless environment and returns data URL", async () => {
    const file = new File(["test image content"], "photo.jpg", { type: "image/jpeg" });
    const result = await compressImageToDataUrl(file);
    expect(result).toBeDefined();
    expect(result.startsWith("data:")).toBe(true);
  });

  it("handles empty or non-image files safely", async () => {
    const file = new File(["text content"], "sample.txt", { type: "text/plain" });
    const result = await compressImageToDataUrl(file);
    expect(result).toBeDefined();
    expect(result.startsWith("data:")).toBe(true);
  });
});
