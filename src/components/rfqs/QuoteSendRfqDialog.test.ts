import { describe, expect, it } from "bun:test";
import { isStoneMaterialItem } from "@/lib/quotes/quote-images";
import {
  formatRfqItemsSummary,
  resolveRfqItemDescription,
  type QuoteSendRfqItem,
} from "@/lib/rfqs/summary";

describe("QuoteSendRfqDialog - isStoneMaterialItem", () => {
  it("keeps natural stone materials and slabs", () => {
    const stoneItems: QuoteSendRfqItem[] = [
      { product_name: "Mint Sandstone Honed 20mm", description: "Honed mint sandstone panels" },
      { product_name: "Italian Marble Diana 18mm", description: "Full slab polished" },
      { product_name: "Black Basalt Flamed Cobbles", description: "Natural stone cobbles" },
      { product_name: "Teakwood Sandstone CNC Carving Panel", description: "Mandir wall panel" },
      { product_name: "Slate Stone Cladding Veneer", description: "Flexible stone veneer sheet" },
      { product_name: "Kota Stone Blue Rough", description: "Flooring stone" },
    ];

    for (const it of stoneItems) {
      expect(isStoneMaterialItem(it)).toBe(true);
    }
  });

  it("filters out adhesives and bonding agents", () => {
    const adhesives: QuoteSendRfqItem[] = [
      { product_name: "Laticrete 254 Platinum Adhesive", description: "High polymer adhesive" },
      { product_name: "Ardex Endura Stone Adhesive", description: "Adhesives for wall fixing" },
      { product_name: "Epoxy Tile Adhesive", description: "Heavy duty fixing epoxy" },
    ];

    for (const it of adhesives) {
      expect(isStoneMaterialItem(it)).toBe(false);
    }
  });

  it("filters out sealers, chemicals, impregnators and grouts", () => {
    const chemicals: QuoteSendRfqItem[] = [
      { product_name: "Hydrophobic Stone Sealer", description: "Aqua Mix nano sealer" },
      { product_name: "Tenax Impregnator Sealant", description: "Stain protection chemical" },
      { product_name: "Epoxy Grout Neutral", description: "Joint filler grout" },
      { product_name: "Cleaning Chemical & Wax", description: "Surface cleaner and polish wax" },
    ];

    for (const it of chemicals) {
      expect(isStoneMaterialItem(it)).toBe(false);
    }
  });

  it("filters out labour and installation services", () => {
    const labourItems: QuoteSendRfqItem[] = [
      {
        product_name: "Fixing Labour & Installation",
        description: "Wall cladding installation charges",
      },
      {
        product_name: "Site Measurement & Scaffolding",
        description: "Site visit and scaffolding labor",
      },
      {
        product_name: "Edge Chamfering & Fabrication Charge",
        description: "Fabrication charge per rft",
      },
    ];

    for (const it of labourItems) {
      expect(isStoneMaterialItem(it)).toBe(false);
    }
  });

  it("filters out transport, carting, and freight charges", () => {
    const transportItems: QuoteSendRfqItem[] = [
      { product_name: "Site Carting & Transport", description: "Transportation via tempo" },
      { product_name: "Freight & Delivery Charges", description: "Truck freight to destination" },
      { product_name: "Loading & Unloading Crane Charges", description: "Crane unloading at site" },
    ];

    for (const it of transportItems) {
      expect(isStoneMaterialItem(it)).toBe(false);
    }
  });
});

describe("QuoteSendRfqDialog - resolveRfqItemDescription & formatRfqItemsSummary", () => {
  it("resolves manual description from item notes", () => {
    const item: QuoteSendRfqItem = {
      id: "item-1",
      product_name: "Clay Veneers",
      description: "Clay Veneers",
      notes: "Hammerstone 8 ft x 4 ft, Light Cool Grey",
      quantity: 288,
      unit: "sqft",
    };

    expect(resolveRfqItemDescription(item)).toBe("Hammerstone 8 ft x 4 ft, Light Cool Grey");
  });

  it("prioritizes custom user edits over original notes", () => {
    const item: QuoteSendRfqItem = {
      id: "item-1",
      product_name: "Clay Veneers",
      notes: "Hammerstone 8 ft x 4 ft, Light Cool Grey",
    };

    expect(resolveRfqItemDescription(item, "Hammerstone 8x4, calibrated 30mm, honed finish")).toBe(
      "Hammerstone 8x4, calibrated 30mm, honed finish",
    );
  });

  it("falls back to description if distinct from catalog product_name", () => {
    const item: QuoteSendRfqItem = {
      id: "item-2",
      product_name: "Sandstone Slabs",
      description: "Mint Sandstone Rosette 4ft diameter",
      notes: null,
    };

    expect(resolveRfqItemDescription(item)).toBe("Mint Sandstone Rosette 4ft diameter");
  });

  it("formats items summary with manual description and specs for WhatsApp RFQ", () => {
    const items: QuoteSendRfqItem[] = [
      {
        id: "item-1",
        product_name: "Clay Veneers",
        description: "Clay Veneers",
        notes: "Hammerstone 8 ft x 4 ft, Light Cool Grey",
        quantity: 288,
        unit: "sqft",
      },
      {
        id: "item-2",
        product_name: "Mint Sandstone",
        description: "Mint Sandstone",
        notes: "3D Origami Pinwheel Faceted Relief, Honed 25mm",
        quantity: 450,
        unit: "sqft",
      },
    ];

    const summary = formatRfqItemsSummary(items);
    expect(summary).toContain("• *Clay Veneers* — 288 sqft");
    expect(summary).toContain("📝 *Description & Specs:* Hammerstone 8 ft x 4 ft, Light Cool Grey");
    expect(summary).toContain("• *Mint Sandstone* — 450 sqft");
    expect(summary).toContain(
      "📝 *Description & Specs:* 3D Origami Pinwheel Faceted Relief, Honed 25mm",
    );
  });
});
