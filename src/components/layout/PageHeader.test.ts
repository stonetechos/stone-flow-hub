import { describe, expect, it } from "bun:test";
import { NAV_ITEMS, findNavItemForPath } from "@/lib/nav/config";

describe("PageHeader custom nav tab rename resolution logic", () => {
  function resolvePageHeaderTitle({
    title,
    navId,
    pathname,
    searchStr = "",
    renames,
  }: {
    title: string;
    navId?: string;
    pathname?: string;
    searchStr?: string;
    renames: Record<string, string>;
  }): string {
    // 1. Explicit navId
    if (navId && renames[navId]) {
      return renames[navId];
    }

    // 2. Derive from active navigation item matching the current page route
    if (pathname) {
      const cleanPath = pathname.split("?")[0].replace(/\/+$/, "") || "/";
      const fullCurrent = `${cleanPath}${searchStr}`;

      let matchingItem = NAV_ITEMS.find(
        (item) =>
          item.to === fullCurrent || item.to === `${cleanPath}?${searchStr.replace(/^\?/, "")}`,
      );

      if (!matchingItem) {
        matchingItem = NAV_ITEMS.find((item) => {
          const itemClean = item.to.split("?")[0].replace(/\/+$/, "") || "/";
          return itemClean === cleanPath && !item.to.includes("?");
        });
      }

      if (!matchingItem) {
        const best = findNavItemForPath(cleanPath);
        if (best) {
          const bestClean = best.to.split("?")[0].replace(/\/+$/, "") || "/";
          if (bestClean === cleanPath) {
            matchingItem = best;
          }
        }
      }

      if (matchingItem && renames[matchingItem.id]) {
        return renames[matchingItem.id];
      }
    }

    // 3. Fallback: match by title against renames dictionary or nav items
    if (typeof title === "string") {
      if (renames[title]) {
        return renames[title];
      }
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      if (slug && renames[slug]) {
        return renames[slug];
      }
      const item = NAV_ITEMS.find(
        (ni) => ni.id === slug || ni.label.toLowerCase() === title.toLowerCase(),
      );
      if (item && renames[item.id]) {
        return renames[item.id];
      }
    }

    return title;
  }

  it("returns default title when no tab renames exist", () => {
    const title = resolvePageHeaderTitle({
      title: "Purchase Invoices & Logistics",
      pathname: "/purchase-invoices",
      renames: {},
    });
    expect(title).toBe("Purchase Invoices & Logistics");
  });

  it("resolves renamed tab title when user renames purchase-invoices to 'Purchase Entries'", () => {
    const title = resolvePageHeaderTitle({
      title: "Purchase Invoices & Logistics",
      pathname: "/purchase-invoices",
      renames: {
        "purchase-invoices": "Purchase Entries",
      },
    });
    expect(title).toBe("Purchase Entries");
  });

  it("resolves via explicit navId prop override", () => {
    const title = resolvePageHeaderTitle({
      navId: "purchase-invoices",
      title: "Purchase Invoices & Logistics",
      pathname: "/purchase-invoices",
      renames: {
        "purchase-invoices": "Purchase Entries",
      },
    });
    expect(title).toBe("Purchase Entries");
  });

  it("preserves sub-page title when on /purchase-invoices/new", () => {
    const title = resolvePageHeaderTitle({
      title: "Record a purchase invoice",
      pathname: "/purchase-invoices/new",
      renames: {
        "purchase-invoices": "Purchase Entries",
      },
    });
    expect(title).toBe("Record a purchase invoice");
  });

  it("resolves custom rename for other tabs like suppliers ledger", () => {
    const title = resolvePageHeaderTitle({
      title: "Suppliers Ledger",
      pathname: "/purchase-ledger",
      renames: {
        "vendor-ledger": "Vendor Statement & Ledger",
      },
    });
    expect(title).toBe("Vendor Statement & Ledger");
  });
});
