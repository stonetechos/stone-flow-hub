import { describe, expect, it } from "bun:test";
import { autoTranslate, reverseTranslateToEnglish } from "./auto-translator";

describe("autoTranslate - Deal, Status, and Date Localization", () => {
  it("translates deal types to Gujarati and Hindi", () => {
    expect(autoTranslate("Deal Type", "gu")).toBe("ડીલ પ્રકાર");
    expect(autoTranslate("Deal Type", "hi")).toBe("सौदा प्रकार");

    expect(autoTranslate("GST Deal", "gu")).toBe("જીએસટી ડીલ");
    expect(autoTranslate("Cash Deal", "gu")).toBe("રોકડ ડીલ");
    expect(autoTranslate("Hybrid Deal", "gu")).toBe("હાઇબ્રિડ ડીલ");

    expect(autoTranslate("GST Deal (Tax Bill)", "gu")).toBe("જીએસટી ડીલ (ટેક્સ બિલ)");
    expect(autoTranslate("Cash Deal (Challan Only)", "gu")).toBe("રોકડ ડીલ (ફક્ત ચલણ)");
  });

  it("translates quotation statuses like Declined and Converted", () => {
    expect(autoTranslate("Declined", "gu")).toBe("અસ્વીકૃત");
    expect(autoTranslate("Declined", "hi")).toBe("अस्वीकृत");

    expect(autoTranslate("Converted", "gu")).toBe("રૂપાંતરિત");
    expect(autoTranslate("Converted", "hi")).toBe("रूपांतरित");

    expect(autoTranslate("Mark as Declined", "gu")).toBe("અસ્વીકૃત તરીકે ચિહ્નિત કરો");
  });

  it("translates invoice and order statuses and labels", () => {
    expect(autoTranslate("Partially paid", "gu")).toBe("આંશિક ચૂકવેલ");
    expect(autoTranslate("Partially paid", "hi")).toBe("आंशिक भुगतान");

    expect(autoTranslate("Issued / Sent", "gu")).toBe("જારી / મોકલેલ");
    expect(autoTranslate("Issued / Sent", "hi")).toBe("जारी / भेजा गया");

    expect(autoTranslate("Fulfilment Source", "gu")).toBe("પૂર્તિ સ્ત્રોત");
    expect(autoTranslate("Fulfilment Source", "hi")).toBe("पूर्ति स्रोत");

    expect(autoTranslate("+ EWB Req.", "gu")).toBe("+ ઇ-વે બિલ જરૂરી");
    expect(autoTranslate("+ EWB Req.", "hi")).toBe("+ ई-वे बिल आवश्यक");

    expect(autoTranslate("To be invoiced", "gu")).toBe("ઇન્વૉઇસ કરવાનું બાકી");
    expect(autoTranslate("To be invoiced", "hi")).toBe("चालान किया जाना बाकी");
  });

  it("translates ISO dates to localized format with Indic digits", () => {
    const guDate = autoTranslate("2026-11-05", "gu");
    expect(guDate).toBe("૫/૧૧/૨૦૨૬");

    const hiDate = autoTranslate("2026-11-05", "hi");
    expect(hiDate).toBe("५/११/२०२६");
  });

  it("reverse-translates Indic phrases and digits back to clean English", () => {
    expect(reverseTranslateToEnglish("ડીલ પ્રકાર")).toBe("Deal Type");
    expect(reverseTranslateToEnglish("જીએસટી ડીલ")).toBe("GST Deal");
    expect(reverseTranslateToEnglish("રોકડ ડીલ")).toBe("Cash Deal");
    expect(reverseTranslateToEnglish("અસ્વીકૃત")).toBe("Declined");
    expect(reverseTranslateToEnglish("રૂપાંતરિત")).toBe("Converted");
    expect(reverseTranslateToEnglish("આંશિક ચૂકવેલ")).toBe("Partially paid");
    expect(reverseTranslateToEnglish("પૂર્તિ સ્ત્રોત")).toBe("Fulfilment Source");
    expect(reverseTranslateToEnglish("RFQ (દર પૂછપરછ)")).toBe("RFQ");
    expect(reverseTranslateToEnglish("Customize સ્ટોસ POP • 270PX")).toBe(
      "Customize ST POP • 270PX",
    );
    expect(reverseTranslateToEnglish("૫/૧૧/૨૦૨૬")).toBe("5/11/2026");
  });
});
