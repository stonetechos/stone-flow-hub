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

  it("transliterates admin, roles, and common Indian first names in Hindi and Gujarati", () => {
    expect(transliterateName("Admin", "hi")).toBe("एडमिन");
    expect(transliterateName("Admin", "gu")).toBe("એડમિન");
    expect(transliterateName("Kavita", "hi")).toBe("कविता");
    expect(transliterateName("Kavita", "gu")).toBe("કવિતા");
    expect(transliterateName("Anand", "hi")).toBe("आनंद");
    expect(transliterateName("Anand", "gu")).toBe("આનંદ");
    expect(transliterateName("Rishi", "hi")).toBe("ऋषि");
    expect(transliterateName("Rishi", "gu")).toBe("ઋષિ");
  });

  it("transliterates customer and firm names in Hindi and Gujarati", () => {
    expect(transliterateName("Khushbu Bhatia", "hi")).toBe("खुशबू भाटिया");
    expect(transliterateName("Khushbu Bhatia", "gu")).toBe("ખુશબૂ ભાટિયા");
    expect(transliterateName("Jignesh Gandhi", "hi")).toBe("जिग्नेश गांधी");
    expect(transliterateName("Jignesh Gandhi", "gu")).toBe("જીગ્નેશ ગાંધી");
    expect(transliterateName("Mehul Panchal", "hi")).toBe("मेहुल पांचाल");
    expect(transliterateName("Mehul Panchal", "gu")).toBe("મેહુલ પંચાલ");
    expect(transliterateName("Varahi Enterprise", "hi")).toBe("वाराही एंटरप्राइज");
    expect(transliterateName("Varahi Enterprise", "gu")).toBe("વારાહી એન્ટરપ્રાઇઝ");
    expect(transliterateName("The Home Decor Point", "hi")).toBe("द होम डेकोर पॉइंट");
    expect(transliterateName("The Home Decor Point", "gu")).toBe("ધ હોમ ડેકોર પોઇન્ટ");
    expect(transliterateName("JIL Pack Marketing LLP", "hi")).toBe("जेआईएल पैक मार्केटिंग एलएलपी");
    expect(transliterateName("JIL Pack Marketing LLP", "gu")).toBe("જેઆઈએલ પેક માર્કેટિંગ એલએલપી");
  });

  it("handles null, undefined, empty strings cleanly", () => {
    expect(transliterateName("", "gu")).toBe("");
    expect(transliterateName(null, "gu")).toBe("");
    expect(transliterateName(undefined, "gu")).toBe("");
  });
});
