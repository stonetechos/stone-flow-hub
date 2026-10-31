import { describe, expect, it } from "bun:test";
import { extractDeterministicIntent } from "./nl-search.functions";
import { stripIndianHonorifics } from "./nl-search/resolve";

describe("NL Search Deterministic Intent Classifier & Indian Honorifics", () => {
  describe("stripIndianHonorifics", () => {
    it("stems single-word Indian honorifics attached to names", () => {
      expect(stripIndianHonorifics("Mehulbhai")).toBe("Mehul");
      expect(stripIndianHonorifics("Dineshbhai")).toBe("Dinesh");
      expect(stripIndianHonorifics("Rameshji")).toBe("Ramesh");
      expect(stripIndianHonorifics("Anubhutiben")).toBe("Anubhuti");
      expect(stripIndianHonorifics("Jashbhai")).toBe("Jash");
    });

    it("stems spaced Indian honorifics", () => {
      expect(stripIndianHonorifics("Mehul bhai")).toBe("Mehul");
      expect(stripIndianHonorifics("Gagan Bhai")).toBe("Gagan");
      expect(stripIndianHonorifics("Sunny Sheth")).toBe("Sunny");
      expect(stripIndianHonorifics("Dinesh Seth")).toBe("Dinesh");
    });

    it("leaves regular full names without honorifics intact", () => {
      expect(stripIndianHonorifics("Mehul Panchal")).toBe("Mehul Panchal");
      expect(stripIndianHonorifics("Shiv Solanki")).toBe("Shiv Solanki");
      expect(stripIndianHonorifics("Dinesh Suthar")).toBe("Dinesh Suthar");
    });
  });

  describe("extractDeterministicIntent", () => {
    it("extracts quote search for 'Can you tell me the quotation of Mehulbhai'", () => {
      const intent = extractDeterministicIntent("Can you tell me the quotation of Mehulbhai");
      expect(intent).not.toBeNull();
      expect(intent?.intent).toBe("filter");
      expect(intent?.entityType).toBe("quote");
      expect(intent?.filters?.customerName).toBe("mehul");
      expect(intent?.searchText).toBe("mehulbhai");
    });

    it("extracts invoices search for 'invoices for Dinesh'", () => {
      const intent = extractDeterministicIntent("invoices for Dinesh");
      expect(intent).not.toBeNull();
      expect(intent?.intent).toBe("filter");
      expect(intent?.entityType).toBe("invoice");
      expect(intent?.filters?.customerName).toBe("dinesh");
    });

    it("extracts direct document ID open_record for QUO-000025", () => {
      const intent = extractDeterministicIntent("open quote QUO-000025");
      expect(intent).not.toBeNull();
      expect(intent?.intent).toBe("open_record");
      expect(intent?.entityType).toBe("quote");
      expect(intent?.identifier).toBe("QUO-000025");
    });

    it("extracts pending dispatches with date range", () => {
      const intent = extractDeterministicIntent("pending dispatches this week");
      expect(intent).not.toBeNull();
      expect(intent?.intent).toBe("filter");
      expect(intent?.entityType).toBe("dispatch");
      expect(intent?.filters?.status).toBe("pending");
      expect(intent?.filters?.dateRange).toBe("this_week");
    });

    it("classifies pure how-to questions as chat", () => {
      const intent = extractDeterministicIntent("How do I navigate STOS?");
      expect(intent).not.toBeNull();
      expect(intent?.intent).toBe("chat");
    });
  });
});
