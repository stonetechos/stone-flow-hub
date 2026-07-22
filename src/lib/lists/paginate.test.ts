/** Sprint 1.8, Part 3 — unit tests for the shared pagination slice. */
import { describe, test, expect } from "bun:test";
import { pageSlice } from "./paginate";

const rows = Array.from({ length: 60 }, (_, i) => i + 1);

describe("pageSlice", () => {
  test("first page returns the first pageSize rows", () => {
    expect(pageSlice(rows, 1, 25)).toEqual(rows.slice(0, 25));
  });

  test("second page continues where the first ended", () => {
    expect(pageSlice(rows, 2, 25)).toEqual(rows.slice(25, 50));
  });

  test("last partial page returns the remainder", () => {
    expect(pageSlice(rows, 3, 25)).toEqual(rows.slice(50, 60));
    expect(pageSlice(rows, 3, 25)).toHaveLength(10);
  });

  test("page beyond the data returns empty, not an error", () => {
    expect(pageSlice(rows, 10, 25)).toEqual([]);
  });

  test("empty input stays empty on any page", () => {
    expect(pageSlice([], 1, 25)).toEqual([]);
    expect(pageSlice([], 3, 25)).toEqual([]);
  });

  test("nonsense page/pageSize values are clamped instead of slicing negatively", () => {
    expect(pageSlice(rows, 0, 25)).toEqual(rows.slice(0, 25));
    expect(pageSlice(rows, -2, 25)).toEqual(rows.slice(0, 25));
    expect(pageSlice(rows, 1, 0)).toEqual(rows.slice(0, 1));
    expect(pageSlice(rows, Number.NaN, Number.NaN)).toEqual(rows.slice(0, 1));
  });

  test("does not mutate the input array", () => {
    const input = [3, 1, 2];
    pageSlice(input, 1, 2);
    expect(input).toEqual([3, 1, 2]);
  });
});
