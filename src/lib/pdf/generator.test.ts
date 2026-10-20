import { describe, expect, it } from "bun:test";
import { generatePdfBlob, renderDocHtml, type PdfDoc } from "./generator";

const sampleDoc: PdfDoc = {
  kind: "quotation",
  title: "Quotation",
  number: "QUO-000002",
  date: "2026-10-20",
  from: {
    name: "Stone Tech",
    address: "Plot 10, Industrial Area, Surat",
    gstin: "24AAAAA0000A1Z5",
    phone: "9876543210",
  },
  to: {
    name: "The Home Decor Point",
    address: "Ring Road, Surat",
    gstin: "24BBBBB0000B1Z6",
  },
  lines: [
    {
      label: "Limestone Slabs",
      notes: "Honed finish 20mm",
      qty: 150,
      unit: "sq ft",
      rate: 450,
      amount: 67500,
      hsn: "6802",
    },
  ],
  totals: [
    { label: "Subtotal", value: "₹67,500" },
    { label: "GST (18%)", value: "₹12,150" },
    { label: "Total", value: "₹79,650" },
  ],
  balanceDue: 79650,
  notes: "Goods once sold cannot be taken back.",
  terms: "100% advance before dispatch.",
};

describe("PDF Generator", () => {
  it("renders valid HTML document with UPI ID, Bank details, and QR code", () => {
    const html = renderDocHtml(sampleDoc);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Quotation");
    expect(html).toContain("QUO-000002");
    expect(html).toContain("stonetech.ahmedabad@okicici");
    expect(html).toContain("Bank of Baroda");
    expect(html).toContain("53130200000136");
    expect(html).toContain("BARB0CHAAHM");
    expect(html).toContain('alt="UPI QR Code"');
  });

  it("renders QR code on Quotations even when balanceDue is undefined", () => {
    const quoteWithoutBalanceDue: PdfDoc = {
      ...sampleDoc,
      balanceDue: undefined,
    };
    const html = renderDocHtml(quoteWithoutBalanceDue);
    expect(html).toContain("stonetech.ahmedabad@okicici");
    expect(html).toContain('alt="UPI QR Code"');
    expect(html).toContain("Scan to pay via UPI / GPay");
  });

  it("generatePdfBlob produces a real binary PDF with %PDF- header", async () => {
    const blob = await generatePdfBlob(sampleDoc);
    expect(blob).toBeDefined();
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(1000);

    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const magicHeader = String.fromCharCode(...bytes.subarray(0, 5));

    // A valid PDF must start with %PDF-
    expect(magicHeader).toBe("%PDF-");
  });

  it("generatePdfBlob automatically includes company details even if doc.from is omitted", async () => {
    const docWithoutFrom: PdfDoc = {
      ...sampleDoc,
      from: undefined,
    };
    const blob = await generatePdfBlob(docWithoutFrom);
    expect(blob).toBeDefined();
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(1000);

    const arrayBuffer = await blob.arrayBuffer();
    const textContent = new TextDecoder("latin1").decode(arrayBuffer);
    expect(textContent).toContain("Stone Tech");
  });
});
