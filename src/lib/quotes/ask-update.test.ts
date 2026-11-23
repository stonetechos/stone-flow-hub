import { describe, expect, it } from "bun:test";
import { buildQuoteUpdateWhatsappMessage, extractCandidatePhones } from "./ask-update";

describe("buildQuoteUpdateWhatsappMessage", () => {
  it("generates a complete, polite follow-up WhatsApp message with all details", () => {
    const msg = buildQuoteUpdateWhatsappMessage({
      quoteNo: "QUO-000042",
      customerName: "Ar. Mehul Panchal",
      projectName: "Villa Nirvana Facade",
      total: 350000,
    });

    expect(msg).toContain("Namaste Ar. Mehul Panchal! 🙏");
    expect(msg).toContain("Quotation *QUO-000042*");
    expect(msg).toContain("for *Villa Nirvana Facade*");
    expect(msg).toContain("Total: *₹3,50,000*");
    expect(msg).toContain("expecting your kind confirmation or reply");
    expect(msg).toContain("negotiation, quantity adjustment, or re-structuring");
    expect(msg).toContain("Stone Tech Architectural Atelier");
    expect(msg).toContain("Ahmedabad, Gujarat");
  });

  it("handles missing optional parameters gracefully", () => {
    const msg = buildQuoteUpdateWhatsappMessage({
      quoteNo: "QUO-999",
    });

    expect(msg).toContain("Namaste! 🙏");
    expect(msg).toContain("Quotation *QUO-999*");
    expect(msg).not.toContain("Total:");
    expect(msg).not.toContain("for *");
    expect(msg).toContain("expecting your kind confirmation or reply");
    expect(msg).toContain("negotiation, quantity adjustment, or re-structuring");
  });

  it("appends custom notes when provided", () => {
    const msg = buildQuoteUpdateWhatsappMessage({
      quoteNo: "QUO-100",
      customNote: "Note: Samples were delivered to your office yesterday.",
    });

    expect(msg).toContain("Note: Samples were delivered to your office yesterday.");
  });
});

describe("extractCandidatePhones", () => {
  it("prioritizes customer whatsapp and falls back to primary phone", () => {
    const candidates = extractCandidatePhones({
      customer: {
        name: "Mehul Panchal",
        whatsapp: "+91 98791 23456",
        primary_phone: "9879123456", // duplicate, should be skipped
      },
    });

    expect(candidates.length).toBe(1);
    expect(candidates[0].phone).toBe("919879123456");
    expect(candidates[0].label).toContain("WhatsApp");
  });

  it("extracts and deduplicates phones from customer and contacts", () => {
    const candidates = extractCandidatePhones({
      customer: {
        name: "Acme Corp",
        whatsapp: "9879111111",
      },
      contacts: [
        {
          name: "Rishi",
          designation: "Site Architect",
          phone: "9879222222",
          whatsapp: "9879222222", // duplicate
        },
        {
          name: "Jigar",
          phone: "9879333333",
        },
      ],
    });

    expect(candidates.length).toBe(3);
    expect(candidates[0].phone).toBe("919879111111");
    expect(candidates[1].phone).toBe("919879222222");
    expect(candidates[2].phone).toBe("919879333333");
  });

  it("returns empty array when customer has no numbers", () => {
    const candidates = extractCandidatePhones({ customer: null, contacts: [] });
    expect(candidates).toEqual([]);
  });
});
