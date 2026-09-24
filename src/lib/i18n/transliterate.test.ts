import { describe, expect, it } from "bun:test";
import { transliterateName } from "./transliterate";

describe("transliterateName", () => {
  it("leaves English unchanged when lang is en", () => {
    expect(transliterateName("Valmiki Gautam Himantbhai", "en")).toBe("Valmiki Gautam Himantbhai");
  });

  it("transliterates target user names to Gujarati accurately", () => {
    expect(transliterateName("Valmiki Gautam Himantbhai", "gu")).toBe("વાલ્મીકિ ગૌતમ હિમંતભાઈ");
  });

  it("handles compound suffixes like -bhai and -ben in Gujarati", () => {
    expect(transliterateName("Rameshbhai Patel", "gu")).toBe("રમેશભાઈ પટેલ");
    expect(transliterateName("Hetalben Solanki", "gu")).toBe("હેતલબેન સોલંકી");
    expect(transliterateName("Jigneshbhai Shah", "gu")).toBe("જીગ્નેશભાઈ શાહ");
  });

  it("does not double-transliterate text that is already in Gujarati", () => {
    const gujText = "વાલ્મીકિ ગૌતમ હિમંતભાઈ";
    expect(transliterateName(gujText, "gu")).toBe(gujText);
  });

  it("handles Hindi transliteration", () => {
    expect(transliterateName("Valmiki Gautam Himantbhai", "hi")).toBe("वाल्मीकि गौतम हिम्मतभाई");
    expect(transliterateName("Ramesh Patel", "hi")).toBe("रमेश पटेल");
  });

  it("handles null, undefined, empty strings cleanly", () => {
    expect(transliterateName("", "gu")).toBe("");
    expect(transliterateName(null, "gu")).toBe("");
    expect(transliterateName(undefined, "gu")).toBe("");
  });
});
