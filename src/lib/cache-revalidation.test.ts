import { describe, expect, it } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { getRouter } from "@/router";
import { invalidateQuote } from "./query-invalidation";
import { qk } from "./query-keys";

describe("Live Cache Revalidation & Immediate Reflections", () => {
  it("configures QueryClient with staleTime: 0 and refetchOnWindowFocus: true for live instant reflections", () => {
    const router = getRouter();
    const qc = router.options.context?.queryClient as QueryClient | undefined;
    expect(qc).toBeDefined();

    const defaultQueries = qc?.getDefaultOptions().queries;
    expect(defaultQueries?.staleTime).toBe(0);
    expect(defaultQueries?.refetchOnWindowFocus).toBe(true);
    expect(defaultQueries?.refetchOnReconnect).toBe(true);
  });

  it("invalidateQuote invalidates quotes.all, quotes.byId, quotes.items, quotes images, and linked entities", () => {
    const qc = new QueryClient();
    const quoteId = "test-quote-123";

    const invalidatedKeys: unknown[][] = [];
    qc.invalidateQueries = ((filters?: { queryKey?: unknown[] }) => {
      if (filters?.queryKey) {
        invalidatedKeys.push(filters.queryKey);
      }
      return Promise.resolve();
    }) as typeof qc.invalidateQueries;

    invalidateQuote(qc, quoteId);

    const keysStr = invalidatedKeys.map((k) => JSON.stringify(k));
    expect(keysStr).toContain(JSON.stringify(qk.quotes.all));
    expect(keysStr).toContain(JSON.stringify(qk.quotes.byId(quoteId)));
    expect(keysStr).toContain(JSON.stringify(qk.quotes.items(quoteId)));
    expect(keysStr).toContain(JSON.stringify(["quotes", "images", quoteId]));
    expect(keysStr).toContain(JSON.stringify(["quotes", "linkedSalesOrder", quoteId]));
    expect(keysStr).toContain(JSON.stringify(["quotes", "dispatches", quoteId]));
  });

  it("immediate synchronous setQueryData updates image map without needing a full page reload", () => {
    const qc = new QueryClient();
    const quoteId = "quo-test-456";
    const rowId = "item-row-789";
    const newImageUrl = "https://example.com/stone-sample.jpg";

    // Initial empty map
    qc.setQueryData(["quotes", "images", quoteId], new Map<string, string>());

    // Simulate instant update as done in handleImageUpload
    qc.setQueryData(["quotes", "images", quoteId], (prev: Map<string, string> | undefined) => {
      const next = new Map(prev ?? []);
      next.set(rowId, newImageUrl);
      next.set(`${rowId}_all`, JSON.stringify([newImageUrl]));
      return next;
    });

    const updatedMap = qc.getQueryData<Map<string, string>>(["quotes", "images", quoteId]);
    expect(updatedMap?.get(rowId)).toBe(newImageUrl);
    expect(updatedMap?.get(`${rowId}_all`)).toBe(JSON.stringify([newImageUrl]));
  });
});
