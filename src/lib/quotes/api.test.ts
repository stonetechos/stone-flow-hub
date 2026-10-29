import { describe, it, expect } from "bun:test";
import { pruneOversizedDataUrls } from "./api";

describe("pruneOversizedDataUrls", () => {
  it("keeps small data URLs and normal strings intact", () => {
    const input = {
      notes: "Hello world",
      image:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      nested: {
        count: 5,
        valid: true,
      },
    };
    const result = pruneOversizedDataUrls(input, 50_000);
    expect(result.notes).toBe("Hello world");
    expect(result.image).toBe(input.image);
    expect(result.nested.count).toBe(5);
  });

  it("prunes oversized data URLs that exceed maxChars threshold", () => {
    const giantDataUrl = `data:image/jpeg;base64,${"A".repeat(250_000)}`;
    const input = {
      notes: "Important estimate notes",
      giantPhoto: giantDataUrl,
      products: [
        { name: "Sandstone Mural", photo: giantDataUrl },
        { name: "Marble Cladding", photo: "data:image/jpeg;base64,small" },
      ],
    };

    const result = pruneOversizedDataUrls(input, 200_000);
    expect(result.notes).toBe("Important estimate notes");
    expect(result.giantPhoto).toBeUndefined();
    expect(result.products[0].photo).toBeUndefined();
    expect(result.products[1].photo).toBe("data:image/jpeg;base64,small");
  });
});
