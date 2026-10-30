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

  it("renders circular logo with 1:1 aspect ratio and circular border-radius", () => {
    const html = renderDocHtml(sampleDoc);
    expect(html).toContain("border-radius:50%");
    expect(html).toContain("aspect-ratio:1/1");
    expect(html).toContain("width:76px;height:76px");
  });

  it("renders authorized signature in quotations and invoices", () => {
    const quoteHtml = renderDocHtml(sampleDoc);
    expect(quoteHtml).toContain('alt="Authorized Signature"');
    expect(quoteHtml).toContain("Authorized Signatory");

    const invoiceDoc: PdfDoc = {
      ...sampleDoc,
      kind: "invoice",
      title: "Tax Invoice",
      number: "INV-2026-0001",
    };
    const invoiceHtml = renderDocHtml(invoiceDoc);
    expect(invoiceHtml).toContain('alt="Authorized Signature"');
    expect(invoiceHtml).toContain("Authorized Signatory");
    expect(invoiceHtml).toContain("GST INVOICE");
  });

  it("never renders Balance due on Invoice PDFs (only customer statements)", () => {
    const invoiceWithBalance: PdfDoc = {
      ...sampleDoc,
      kind: "invoice",
      title: "Tax Invoice",
      number: "INV-2026-0002",
      totals: [
        { label: "Subtotal", value: "₹54,000" },
        { label: "Tax", value: "₹2,700" },
        { label: "Total", value: "₹56,700" },
        { label: "Balance due", value: "₹56,700" },
      ],
      balanceDue: 56700,
    };
    const html = renderDocHtml(invoiceWithBalance);
    expect(html).toContain("GST INVOICE");
    expect(html).toContain("Total");
    expect(html).toContain("₹56,700");
    expect(html.toLowerCase()).not.toContain("balance due");
  });

  it("centrally aligns Invoice Date, Terms, and Due Date both horizontally and vertically in the bar", () => {
    const invoiceDoc: PdfDoc = {
      ...sampleDoc,
      kind: "invoice",
      title: "Tax Invoice",
      number: "INV-000005",
      date: "2026-10-27",
      terms: "Due on Receipt",
      meta: [{ label: "Due date", value: "2026-11-11" }],
    };
    const html = renderDocHtml(invoiceDoc);
    expect(html).toContain('<div style="text-align:center;">Invoice Date</div>');
    expect(html).toContain('<div style="text-align:center;">Terms</div>');
    expect(html).toContain('<div style="text-align:center;">Due Date</div>');
    expect(html).toContain("height:26px;");
    expect(html).toContain("Item &amp; Description");
  });

  it("enforces clean typography, normal letter-spacing, and page break avoidance for compact PDF printing", () => {
    const multiTermDoc: PdfDoc = {
      ...sampleDoc,
      terms: `1. Delivery Timeline: 15 days from design confirmation.
2. Payment Terms: 50% advance token, 30% on delivery, 20% on completion.
3. Natural Variation: Natural stone product with inherent variations.
4. Material Evolution: May show natural patina post-installation.
5. Non-Returnable: Material once sold cannot be returned.`,
    };
    const html = renderDocHtml(multiTermDoc);
    // Typography guarantees
    expect(html).toContain("letter-spacing: normal !important");
    expect(html).toContain("-apple-system, BlinkMacSystemFont");
    // Break-avoidance classes
    expect(html).toContain("avoid-break");
    expect(html).toContain("bank-signatory-block");
    // 2-column terms layout to conserve vertical space and prevent unwanted page spill
    expect(html).toContain("display:grid;grid-template-columns:1fr 1fr;");
  });

  it("omits Terms & Conditions section entirely when doc.terms is empty, undefined or blank", () => {
    const quoteWithoutTerms: PdfDoc = {
      ...sampleDoc,
      terms: undefined,
    };
    const html = renderDocHtml(quoteWithoutTerms);
    expect(html).not.toContain("Terms &amp; Conditions");
    expect(html).not.toContain('class="terms');

    const quoteWithBlankTerms: PdfDoc = {
      ...sampleDoc,
      terms: "   ",
    };
    const htmlBlank = renderDocHtml(quoteWithBlankTerms);
    expect(htmlBlank).not.toContain("Terms &amp; Conditions");
    expect(htmlBlank).not.toContain('class="terms');
  });

  it("never renders Terms & Conditions block on invoice PDFs even if doc.terms is set", () => {
    const invoiceDoc: PdfDoc = {
      ...sampleDoc,
      kind: "invoice",
      title: "Tax Invoice",
      number: "INV-2026-0003",
      terms: "Due on Receipt",
    };
    const html = renderDocHtml(invoiceDoc);
    // Invoice metadata block displays "Due on Receipt" in the central terms column
    expect(html).toContain('<div style="text-align:center;">Due on Receipt</div>');
    // But never the multi-line quotation legal terms section
    expect(html).not.toContain("Terms &amp; Conditions");
    expect(html).not.toContain('class="terms');
  });

  it("renders line item photos preserving rectangular natural stone proportions", () => {
    const quoteWithPhoto: PdfDoc = {
      ...sampleDoc,
      lines: [
        {
          ...sampleDoc.lines![0],
          image: "https://example.com/mint-rockface.jpg",
        },
      ],
    };
    const html = renderDocHtml(quoteWithPhoto);
    expect(html).toContain('alt="Limestone Slabs"');
    expect(html).toContain(
      "max-width:50px;max-height:36px;width:auto;height:auto;object-fit:contain",
    );
  });
});
