import { describe, expect, it } from "bun:test";
import { localizeNotificationText } from "./NotificationsBell";

describe("localizeNotificationText", () => {
  it("leaves English unchanged or when lang is en/undefined", () => {
    expect(localizeNotificationText("New Customer Added", "en")).toBe("New Customer Added");
    expect(localizeNotificationText("New Customer Added", undefined)).toBe("New Customer Added");
  });

  it("translates exact notification titles into natural Hindi and Gujarati", () => {
    expect(localizeNotificationText("New Customer Added", "hi")).toBe("नया ग्राहक जोड़ा गया");
    expect(localizeNotificationText("New Customer Added", "gu")).toBe("નવા ગ્રાહક ઉમેર્યા");
    expect(localizeNotificationText("Quotation Approved", "hi")).toBe("कोटेशन स्वीकृत");
    expect(localizeNotificationText("Quotation Approved", "gu")).toBe("ક્વોટેશન મંજૂર");
    expect(localizeNotificationText("Quotation Sent", "hi")).toBe("कोटेशन भेजा गया");
    expect(localizeNotificationText("Quotation Sent", "gu")).toBe("ક્વોટેશન મોકલવામાં આવ્યું");
    expect(localizeNotificationText("Material Dispatched", "hi")).toBe("सामग्री रवाना की गई");
    expect(localizeNotificationText("Material Dispatched", "gu")).toBe("માલ રવાના કરવામાં આવ્યો");
    expect(localizeNotificationText("Payment Received", "hi")).toBe("भुगतान प्राप्त हुआ");
    expect(localizeNotificationText("Payment Received", "gu")).toBe("ચુકવણી પ્રાપ્ત થઈ");
    expect(localizeNotificationText("Project Completed", "hi")).toBe("परियोजना संपन्न हुई");
    expect(localizeNotificationText("Project Completed", "gu")).toBe("પ્રોજેક્ટ પૂર્ણ થયો");
    expect(localizeNotificationText("Liability Payment Recorded", "hi")).toBe(
      "देनदारी भुगतान दर्ज",
    );
    expect(localizeNotificationText("Liability Payment Recorded", "gu")).toBe(
      "દેવું ચૂકવણી નોંધાઈ",
    );
  });

  it("translates customer added body without mangling name or entity code", () => {
    const input = "A new customer entry has been made: Siraj Bhai (CUS-000067)";
    expect(localizeNotificationText(input, "hi")).toBe(
      "नया ग्राहक दर्ज किया गया: सिराज भाई (CUS-००००६७)",
    );
    expect(localizeNotificationText(input, "gu")).toBe(
      "નવા ગ્રાહક નોંધાયા: સિરાજ ભાઈ (CUS-૦૦૦૦૬૭)",
    );
  });

  it("translates annual goal growth advisory titles into clean Hindi and Gujarati with Indic digits", () => {
    const input = "On track to miss the ₹50,00,000 annual net-margin goal...";
    expect(localizeNotificationText(input, "hi")).toBe(
      "₹५०,००,००० वार्षिक शुद्ध-मार्जिन लक्ष्य से पीछे रहने की चेतावनी...",
    );
    expect(localizeNotificationText(input, "gu")).toBe(
      "₹૫૦,૦૦,૦૦૦ વાર્ષિક નેટ-માર્જિન લક્ષ્યાંક ચૂકી જવાની ચેતવણી...",
    );
  });

  it("translates growth advisory body into natural Hindi and Gujarati", () => {
    const input =
      "Effective net profit (after netting off ₹61,600 in monthly liabilities and ₹0 in this month's business expenses) is ₹2,46,324 against the ₹50,00,000 annual goal. To close the gap, either raise prices by roughly 3.2%, or bring in about 4 more customers of ₹60,000+ each in the next 30 days.";
    const hi = localizeNotificationText(input, "hi");
    expect(hi).toContain("प्रभावी शुद्ध लाभ");
    expect(hi).toContain("₹६१,६००");
    expect(hi).toContain("₹२,४६,३२४");
    expect(hi).toContain("₹५०,००,०००");

    const gu = localizeNotificationText(input, "gu");
    expect(gu).toContain("અસરકારક નેટ નફો");
    expect(gu).toContain("₹૬૧,૬૦૦");
    expect(gu).toContain("₹૨,૪૬,૩૨૪");
    expect(gu).toContain("₹૫૦,૦૦,૦૦૦");
  });

  it("translates payment received body cleanly", () => {
    const input = "Received ₹25,000 in Cash from Siraj Bhai against INV-000007.";
    expect(localizeNotificationText(input, "hi")).toBe(
      "₹२५,००० भुगतान प्राप्त हुआ (नकद) सिराज भाई से (INV-०००००७ के एवज में)।",
    );
    expect(localizeNotificationText(input, "gu")).toBe(
      "₹૨૫,૦૦૦ ચુકવણી પ્રાપ્ત થઈ (રોકડ) સિરાજ ભાઈ તરફથી (INV-૦૦૦૦૦૭ સામે).",
    );
  });

  it("translates system audit messages cleanly", () => {
    expect(localizeNotificationText("System created — receipts created", "hi")).toBe(
      "सिस्टम निर्मित — रसीदें निर्मित",
    );
    expect(localizeNotificationText("System updated — receipts updated", "gu")).toBe(
      "સિસ્ટમ અપડેટ — રસીદો અપડેટ",
    );
  });
});
