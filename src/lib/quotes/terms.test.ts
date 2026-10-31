import { describe, expect, it } from "bun:test";
import {
  ADVANCE_PAYMENT_THRESHOLD_INR,
  EARLY_PAYMENT_DISCOUNT_DISCLAIMER,
  buildClientProvidedSlabBreakageTerm,
  buildDeliveryTimelineTerm,
  buildPaymentTermsTerm,
  detectClientProvidedSlabFromItems,
  detectDealScopeFromItems,
  formatTimelineDate,
  generateQuoteTerms,
  getQuoteTermsList,
  hasClientBreakageDisclaimer,
  hasEarlyPaymentDiscountDisclaimer,
} from "./terms";

describe("Quote Terms & Conditions Engine", () => {
  describe("formatTimelineDate", () => {
    it("formats ISO YYYY-MM-DD into readable DD MMM YYYY", () => {
      expect(formatTimelineDate("2026-11-20")).toBe("20 Nov 2026");
      expect(formatTimelineDate("2026-06-05")).toBe("5 Jun 2026");
      expect(formatTimelineDate("2026-12-31")).toBe("31 Dec 2026");
    });

    it("passes through already formatted strings or empty strings safely", () => {
      expect(formatTimelineDate("15th November")).toBe("15th November");
      expect(formatTimelineDate("")).toBe("");
    });
  });

  describe("buildDeliveryTimelineTerm", () => {
    it("formats delivery timeline with number of days", () => {
      const term = buildDeliveryTimelineTerm("days", { timelineDays: 15 });
      expect(term).toContain("The time duration to deliver and dispatch the product is 15 days");
      expect(term).toContain("from the date of design confirmation and advance payment clearance");
    });

    it("handles string days with 'working days' or 'days'", () => {
      const term = buildDeliveryTimelineTerm("days", { timelineDays: "10-12 working days" });
      expect(term).toContain(
        "The time duration to deliver and dispatch the product is 10-12 working days",
      );
    });

    it("formats delivery timeline with on or before date", () => {
      const term = buildDeliveryTimelineTerm("date", { deliveryDate: "2026-11-20" });
      expect(term).toContain(
        "The product delivery and dispatch will be completed on or before 20 Nov 2026",
      );
      expect(term).toContain("subject to site readiness and advance payment clearance");
    });

    it("falls back gracefully when neither days nor date is provided", () => {
      const term = buildDeliveryTimelineTerm("days", {});
      expect(term).toContain("The estimated delivery and dispatch timeline will be communicated");
    });
  });

  describe("buildPaymentTermsTerm & < ₹50,000 Rule", () => {
    it("enforces 100% advance payment when order total is less than ₹50,000 for Supply Only", () => {
      expect(ADVANCE_PAYMENT_THRESHOLD_INR).toBe(50000);
      const term = buildPaymentTermsTerm("supply_only", 35000);
      expect(term).toContain("100% advance payment required");
      expect(term).toContain("applicable for order value under ₹50,000");
    });

    it("enforces 100% advance payment when order total is less than ₹50,000 for Supply + Installation", () => {
      const term = buildPaymentTermsTerm("supply_and_installation", 49999);
      expect(term).toContain("100% advance payment required");
    });

    it("applies 80% advance and 20% on delivery for Supply Only when total >= ₹50,000", () => {
      const term = buildPaymentTermsTerm("supply_only", 50000);
      expect(term).toContain("80% advance token upon order booking");
      expect(term).toContain(
        "20% balance payment has to be provided once the material gets delivered",
      );
      expect(term).not.toContain("100% advance");
    });

    it("applies 50% advance, 30% delivery, and 20% installation for Supply + Installation when total >= ₹50,000", () => {
      const term = buildPaymentTermsTerm("supply_and_installation", 125000);
      expect(term).toContain("50% advance token upon order booking");
      expect(term).toContain("30% on delivery of the material at site");
      expect(term).toContain(
        "remaining 20% balance payment to be provided upon completion of installation",
      );
      expect(term).not.toContain("100% advance payment required");
    });

    it("includes the 100% advance payment 5% discount disclaimer in all payment term modes", () => {
      expect(EARLY_PAYMENT_DISCOUNT_DISCLAIMER).toBe(
        "Premake 100% payment to avail 5% discount, plus a complimentary certified Shree Yantra worth ₹14,999 on stone product purchase value > ₹1 Lakh (excludes installation & chemicals).*",
      );
      const under50k = buildPaymentTermsTerm("supply_only", 30000);
      expect(under50k).toContain("Premake 100% payment to avail 5% discount");
      expect(under50k).toContain("Shree Yantra worth ₹14,999");
      expect(hasEarlyPaymentDiscountDisclaimer(under50k)).toBe(true);

      const supplyOnly = buildPaymentTermsTerm("supply_only", 80000);
      expect(supplyOnly).toContain("Premake 100% payment to avail 5% discount");
      expect(supplyOnly).toContain("Shree Yantra worth ₹14,999");
      expect(hasEarlyPaymentDiscountDisclaimer(supplyOnly)).toBe(true);

      const supplyInstall = buildPaymentTermsTerm("supply_and_installation", 150000);
      expect(supplyInstall).toContain("Premake 100% payment to avail 5% discount");
      expect(supplyInstall).toContain("Shree Yantra worth ₹14,999");
      expect(hasEarlyPaymentDiscountDisclaimer(supplyInstall)).toBe(true);
    });
  });

  describe("generateQuoteTerms & getQuoteTermsList", () => {
    it("generates exactly 7 terms for Supply Only", () => {
      const termsList = getQuoteTermsList({
        dealScope: "supply_only",
        totalAmount: 65000,
        timelineMode: "days",
        timelineDays: 20,
      });

      expect(termsList.length).toBe(7);
      expect(termsList[0]).toContain("1. Delivery Timeline:");
      expect(termsList[1]).toContain("2. Payment Terms: The payment terms are 80% advance token");
      expect(termsList[2]).toContain("3. Natural Variation:");
      expect(termsList[3]).toContain("4. Material Evolution:");
      expect(termsList[4]).toContain("5. Non-Returnable: Material once sold");
      expect(termsList[5]).toContain("6. Transportation & Freight: Local transportation");
      expect(termsList[6]).toContain(
        "7. Jurisdiction: Any dispute arising out of or related to this quotation is strictly subject to Ahmedabad Jurisdiction.",
      );
    });

    it("generates exactly 9 terms for Supply + Installation including Scaffolding and Surface Readiness", () => {
      const termsList = getQuoteTermsList({
        dealScope: "supply_and_installation",
        totalAmount: 85000,
        timelineMode: "date",
        deliveryDate: "2026-12-15",
      });

      expect(termsList.length).toBe(9);
      expect(termsList[0]).toContain(
        "1. Delivery Timeline: The product delivery and dispatch will be completed on or before 15 Dec 2026",
      );
      expect(termsList[1]).toContain("2. Payment Terms: The payment terms are 50% advance token");
      expect(termsList[2]).toContain("3. Natural Variation:");
      expect(termsList[3]).toContain("4. Material Evolution:");
      expect(termsList[4]).toContain("5. Non-Returnable:");
      expect(termsList[5]).toContain("6. Transportation & Freight:");
      expect(termsList[6]).toContain(
        "7. Scaffolding & Site Facilities: Necessary scaffolding, H-frames",
      );
      expect(termsList[7]).toContain(
        "8. Site & Surface Readiness: The workable surface must be verified by the client",
      );
      expect(termsList[8]).toContain(
        "9. Jurisdiction: Any dispute arising out of or related to this quotation is strictly subject to Ahmedabad Jurisdiction.",
      );
    });

    it("joins terms with double newline in generateQuoteTerms", () => {
      const fullText = generateQuoteTerms({
        dealScope: "supply_only",
        totalAmount: 25000,
        timelineMode: "days",
        timelineDays: 14,
      });

      expect(fullText).toContain("1. Delivery Timeline:");
      expect(fullText).toContain("100% advance payment required");
      expect(fullText).toContain("Ahmedabad Jurisdiction");
      expect(fullText.split("\n\n").length).toBe(7);
    });
  });

  describe("Client Provided Slab & Priority Breakage Condition", () => {
    it("builds the priority breakage disclaimer containing CNC job work and transportation waiver", () => {
      const term = buildClientProvidedSlabBreakageTerm();
      expect(term).toContain(
        "Priority Condition — Client-Supplied Stone / Slab Breakage Disclaimer:",
      );
      expect(term).toContain(
        "Stone Tech undertakes CNC job work, carving, handling, and transportation strictly at the client's own risk",
      );
      expect(term).toContain("inherent brittleness");
      expect(term).toContain("easily crackable characteristics");
      expect(term).toContain(
        "breakage of the slab during CNC job work, carving, handling, fabrication, or transit",
      );
    });

    it("prepends Priority Condition as Term #1 for Supply Only, increasing total terms from 7 to 8", () => {
      const termsList = getQuoteTermsList({
        dealScope: "supply_only",
        totalAmount: 65000,
        timelineMode: "days",
        timelineDays: 15,
        clientProvidedSlab: true,
      });

      expect(termsList.length).toBe(8);
      expect(termsList[0]).toContain(
        "1. Priority Condition — Client-Supplied Stone / Slab Breakage Disclaimer:",
      );
      expect(termsList[1]).toContain(
        "2. Delivery Timeline: The time duration to deliver and dispatch the product is 15 days",
      );
      expect(termsList[2]).toContain("3. Payment Terms: The payment terms are 80% advance token");
      expect(termsList[3]).toContain("4. Natural Variation:");
      expect(termsList[4]).toContain("5. Material Evolution:");
      expect(termsList[5]).toContain("6. Non-Returnable:");
      expect(termsList[6]).toContain("7. Transportation & Freight:");
      expect(termsList[7]).toContain(
        "8. Jurisdiction: Any dispute arising out of or related to this quotation is strictly subject to Ahmedabad Jurisdiction.",
      );
    });

    it("prepends Priority Condition as Term #1 for Supply + Installation, increasing total terms from 9 to 10", () => {
      const termsList = getQuoteTermsList({
        dealScope: "supply_and_installation",
        totalAmount: 95000,
        timelineMode: "date",
        deliveryDate: "2026-12-25",
        clientProvidedSlab: true,
      });

      expect(termsList.length).toBe(10);
      expect(termsList[0]).toContain(
        "1. Priority Condition — Client-Supplied Stone / Slab Breakage Disclaimer:",
      );
      expect(termsList[1]).toContain(
        "2. Delivery Timeline: The product delivery and dispatch will be completed on or before 25 Dec 2026",
      );
      expect(termsList[2]).toContain("3. Payment Terms: The payment terms are 50% advance token");
      expect(termsList[3]).toContain("4. Natural Variation:");
      expect(termsList[4]).toContain("5. Material Evolution:");
      expect(termsList[5]).toContain("6. Non-Returnable:");
      expect(termsList[6]).toContain("7. Transportation & Freight:");
      expect(termsList[7]).toContain("8. Scaffolding & Site Facilities:");
      expect(termsList[8]).toContain("9. Site & Surface Readiness:");
      expect(termsList[9]).toContain(
        "10. Jurisdiction: Any dispute arising out of or related to this quotation is strictly subject to Ahmedabad Jurisdiction.",
      );
    });

    it("correctly identifies breakage disclaimer presence with hasClientBreakageDisclaimer", () => {
      const withDisclaimer = generateQuoteTerms({
        dealScope: "supply_only",
        clientProvidedSlab: true,
      });
      const withoutDisclaimer = generateQuoteTerms({
        dealScope: "supply_only",
        clientProvidedSlab: false,
      });

      expect(hasClientBreakageDisclaimer(withDisclaimer)).toBe(true);
      expect(hasClientBreakageDisclaimer(withoutDisclaimer)).toBe(false);
      expect(hasClientBreakageDisclaimer("")).toBe(false);
      expect(hasClientBreakageDisclaimer(null)).toBe(false);
    });

    it("detects client provided slab from line items or worksheet", () => {
      // From item description
      expect(
        detectClientProvidedSlabFromItems([
          {
            description:
              "Base Stone Slabs — Provided by Client (Mint Sandstone 50mm) [Client Scope]",
          },
          { description: "Base Stone CNC Carving — Deep 3D Bas-Relief" },
        ]),
      ).toBe(true);

      // From item with unit_price: 0 and client scope
      expect(
        detectClientProvidedSlabFromItems([
          { description: "Stone Slab Client Supplied", unit_price: 0 },
        ]),
      ).toBe(true);

      // From worksheet metadata
      expect(
        detectClientProvidedSlabFromItems([], {
          scenario: "stone_mural",
          slab: { sourcing: "client_provided" },
        }),
      ).toBe(true);

      // From worksheet baseStoneSourcing
      expect(
        detectClientProvidedSlabFromItems([], {
          scenario: "stone_mural",
          baseStoneSourcing: "client_provided",
        }),
      ).toBe(true);

      // When procured by stone tech
      expect(
        detectClientProvidedSlabFromItems(
          [
            { description: "Base Stone Slabs — Mint Sandstone 50mm", unit_price: 550 },
            { description: "Base Stone CNC Carving — Deep 3D Bas-Relief", unit_price: 450 },
          ],
          {
            scenario: "stone_mural",
            slab: { sourcing: "stone_tech" },
          },
        ),
      ).toBe(false);
    });
  });

  describe("detectDealScopeFromItems", () => {
    it("detects supply_and_installation when any item has fulfilment flag", () => {
      expect(
        detectDealScopeFromItems([
          { fulfilment: "supply_only", description: "Mint Sandstone Tiles" },
          { fulfilment: "supply_and_installation", description: "Cladding Work" },
        ]),
      ).toBe("supply_and_installation");
    });

    it("detects supply_and_installation when description mentions installation or labour", () => {
      expect(
        detectDealScopeFromItems([
          { description: "Mint Sandstone 20mm" },
          { description: "Installation Labour Charges" },
        ]),
      ).toBe("supply_and_installation");
    });

    it("defaults to supply_only when only material is present", () => {
      expect(
        detectDealScopeFromItems([
          { description: "Teakwood Sandstone Slabs" },
          { description: "Local Carting" },
        ]),
      ).toBe("supply_only");
    });
  });

  describe("WhatsApp Message Terms formatting", () => {
    it("omits Terms & Conditions header when terms is blank or omitted", async () => {
      const { buildEstimateWhatsappMessage, buildMuralEstimateWhatsappMessage } =
        await import("./estimateWhatsappPdf");
      const wallMsg = buildEstimateWhatsappMessage(
        {
          greetingName: "Ramesh Patel",
          wallSizeSummary: "100 sq ft",
          materialSummary: "Mint Rockface",
          materialToOrderSummary: "110 sq ft with 10% wastage",
          materialAmount: 21000,
          installationLabourAmount: 7000,
          adhesivesAmount: 0,
          sealerAmount: 0,
          sealerApplicationAmount: 0,
          cartingLocation: "Ahmedabad",
          totalEstimate: 28000,
          preparerName: "Stone Tech Atelier",
          terms: "",
        },
        "Stone Tech",
      );

      expect(wallMsg).not.toContain("Terms & Conditions:");

      const muralMsg = buildMuralEstimateWhatsappMessage(
        {
          greetingName: "Pooja Shah",
          wallSizeSummary: "6ft x 4ft",
          wallSqft: 24,
          slabDetails: "Mint Sandstone 50mm",
          slabsCount: 2,
          totalSlabSqft: 24,
          slabAmount: 12000,
          slabPricePerSqft: 500,
          cncWorkSummary: "Deep 3D Bas-Relief Carving",
          cncAmount: 18000,
          installationLabourAmount: 3000,
          rubbingAmount: 0,
          polishingAmount: 0,
          adhesivesAmount: 0,
          adhesivesSummary: "Standard",
          touchUpAmount: 0,
          cartingAmount: 0,
          totalEstimate: 33000,
          preparerName: "Stone Tech Atelier",
          baseStoneSourcing: "stone_tech",
          terms: undefined,
        },
        "Stone Tech",
      );

      expect(muralMsg).not.toContain("Terms & Conditions:");
    });

    it("includes custom Terms & Conditions text when explicitly provided", async () => {
      const { buildEstimateWhatsappMessage } = await import("./estimateWhatsappPdf");
      const wallMsg = buildEstimateWhatsappMessage(
        {
          greetingName: "Ramesh Patel",
          wallSizeSummary: "100 sq ft",
          materialSummary: "Mint Rockface",
          materialToOrderSummary: "100 sq ft",
          materialAmount: 21000,
          installationLabourAmount: 0,
          adhesivesAmount: 0,
          sealerAmount: 0,
          sealerApplicationAmount: 0,
          totalEstimate: 21000,
          preparerName: "Stone Tech Atelier",
          terms: "1. 100% advance payment required.\n2. Delivery within 7 days.",
        },
        "Stone Tech",
      );

      expect(wallMsg).toContain("Terms & Conditions:");
      expect(wallMsg).toContain("1. 100% advance payment required.");
      expect(wallMsg).toContain("2. Delivery within 7 days.");
    });
  });
});
