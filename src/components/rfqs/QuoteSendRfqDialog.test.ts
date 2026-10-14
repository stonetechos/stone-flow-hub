import { describe, expect, it } from "bun:test";
import { isStoneMaterialItem } from "@/lib/quotes/quote-images";
import type { QuoteSendRfqItem } from "./QuoteSendRfqDialog";

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
