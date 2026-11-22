import { describe, expect, test } from "bun:test";
import { parseWhatsappChatExport, extractContactFromFilename } from "./whatsapp-chat-parser";

describe("WhatsApp Chat Export Parser for One-Time Synchronization", () => {
  test("extracts contact name and phone from standard filenames", () => {
    expect(extractContactFromFilename("WhatsApp Chat with Ar. Mehul Panchal.txt")).toEqual({
      name: "Ar. Mehul Panchal",
    });

    expect(extractContactFromFilename("WhatsApp Chat - +91 98250 12345.txt")).toEqual({
      name: "+91 98250 12345",
      phone: "919825012345",
    });
  });

  test("parses iOS bracket format chat with multiline messages", () => {
    const rawIos = `
[22/11/26, 10:30:15 AM] Messages and calls are end-to-end encrypted.
[22/11/26, 10:30:20 AM] Ar. Mehul Panchal: Namaste Stone Tech team!
We are designing a 4-storey villa at Bopal, Ahmedabad.
Can you share rates?
[22/11/26, 10:35:10 AM] Stone Tech: Namaste Mehulbhai!
Thank you for reaching out. We have Gwalior Mint and Teakwood Sandstone.
[22/11/26, 10:45:00 AM] Ar. Mehul Panchal: Please send quotation for 1200 sq.ft.
    `.trim();

    const result = parseWhatsappChatExport(rawIos, "conv-test-1");
    expect(result.contactName).toBe("Ar. Mehul Panchal");
    expect(result.messageCount).toBe(3);

    expect(result.messages[0].sender).toBe("customer");
    expect(result.messages[0].text).toContain("4-storey villa at Bopal");
    expect(result.messages[0].timestamp).toContain("22/11/26");

    expect(result.messages[1].sender).toBe("team");
    expect(result.messages[1].text).toContain("Namaste Mehulbhai!");

    expect(result.messages[2].sender).toBe("customer");
    expect(result.messages[2].text).toContain("Please send quotation");
  });

  test("parses Android dash format chat with 12h/24h timestamps", () => {
    const rawAndroid = `
22/11/2026, 10:30 am - Jigar Patel: Hello Stone Tech, is our shipment dispatched?
22/11/2026, 10:32 am - Stone Tech: Yes Jigar bhai, tempo GJ-01-AB-1234 has departed quarry.
22/11/2026, 14:15 - Jigar Patel: Excellent, received the delivery.
    `.trim();

    const result = parseWhatsappChatExport(rawAndroid, "conv-test-2");
    expect(result.contactName).toBe("Jigar Patel");
    expect(result.messageCount).toBe(3);
    expect(result.messages[0].sender).toBe("customer");
    expect(result.messages[1].sender).toBe("team");
    expect(result.messages[2].sender).toBe("customer");
  });
});
