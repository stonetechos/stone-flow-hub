import { PDFDocument, PDFName, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import zlib from "zlib";

async function run() {
  const inputPdfPath =
    "/Users/stonetech/.gemini/antigravity/brain/692e0f8b-c231-4893-8608-267244e2257f/.user_uploaded/media_1795000347600_87730ac5.pdf";
  const outputPdfPath = "public/catalogues/StoneTech_Solid_Glass_Bricks_Catalogue_2026.pdf";

  console.log("Loading original PDF...");
  const data = fs.readFileSync(inputPdfPath);
  const pdfDoc = await PDFDocument.load(data);
  const numPages = pdfDoc.getPageCount();
  console.log(`Loaded ${numPages} pages.`);

  // Load Stone Tech logo
  const logoBytes = fs.readFileSync("public/branding/stone-tech-logo-cropped.png");
  const logoImage = await pdfDoc.embedPng(logoBytes);

  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontTimesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  // 1. Process all 58 Form XObjects (handle & title on product pages)
  console.log("Neutralizing Sharda Form XObjects...");
  let formCount = 0;
  for (let p = 0; p < numPages; p++) {
    const page = pdfDoc.getPage(p);
    const res = page.node.Resources();
    const xobj = res.get(PDFName.of("XObject"));
    if (!xobj) continue;
    const dict = pdfDoc.context.lookup(xobj);
    for (const [name, ref] of dict.entries()) {
      const obj = pdfDoc.context.lookup(ref);
      if (obj.dict.get(PDFName.of("Subtype"))?.asString() === "/Form") {
        try {
          const uncomp = zlib.inflateSync(obj.asUint8Array()).toString("utf8");
          if (
            uncomp.includes("13.58 Tf") ||
            uncomp.includes("<0023> Tj") ||
            uncomp.includes("<0036> Tj\n9.83189")
          ) {
            obj.contents = zlib.deflateSync(Buffer.from("% empty", "utf8"));
            formCount++;
          }
        } catch (_err) {
          // Ignore uncompressed/raw streams
        }
      }
    }
  }
  console.log(`Neutralized ${formCount} Form XObjects.`);

  // Helper to remove only the single BT block that represents WWW.SHARDAGRANITE.COM
  const removeWwwBlocks = (str: string) => {
    return str.replace(/BT[\s\S]*?ET/g, (bt) => {
      const wCount = (bt.match(/<003A>\s*Tj/g) || []).length;
      if (wCount >= 3) {
        return "% website removed";
      }
      return bt;
    });
  };

  // 2. Process Page by Page
  for (let p = 0; p < numPages; p++) {
    const pageNum = p + 1;
    const page = pdfDoc.getPage(p);
    const contents = page.node.Contents();
    let stream = zlib.inflateSync(contents.asUint8Array()).toString("utf8");

    if (pageNum === 1) {
      // --- COVER PAGE ---
      // Remove logo: /X3 Do
      stream = stream.replace("/X3 Do", "% logo removed");
      stream = stream.replace("/X4 Do", "% line removed");
      stream = stream.replace("/X5 Do", "% dot removed");

      // On Page 1, Block 3 (BY SHARDA...), Block 4 (WWW...), Block 5 (+91...)
      // Match each BT block and filter out everything except the ones for SOLID GLASS and BRICKS
      const bts = stream.match(/BT[\s\S]*?ET/g) || [];
      for (const bt of bts) {
        if (!bt.includes("146.35 Tf") && !bt.includes("217.891 220 Tm")) {
          stream = stream.replace(bt, "% header removed");
        }
      }

      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      // Draw Stone Tech Top-Right Logo
      page.drawImage(logoImage, {
        x: 655,
        y: 495,
        width: 76,
        height: 64,
      });

      // Draw Top-Left Header
      page.drawText("STONE TECH ATELIER", {
        x: 45,
        y: 532,
        size: 11,
        font: fontHelveticaBold,
        color: rgb(0.12, 0.15, 0.18),
      });
      page.drawText("WWW.STONETECH.IN  ·  +91 77420 90866", {
        x: 45,
        y: 516,
        size: 9,
        font: fontHelvetica,
        color: rgb(0.35, 0.4, 0.45),
      });

      // Draw Centered Subtitle Under SOLID GLASS BRICKS
      const subText = "•  ARCHITECTURAL INNOVATION  ·  2026 – 2027 COLLECTION  •";
      const subWidth = fontHelveticaBold.widthOfTextAtSize(subText, 10.5);
      page.drawText(subText, {
        x: (768 - subWidth) / 2,
        y: 260,
        size: 10.5,
        font: fontHelveticaBold,
        color: rgb(0.2, 0.22, 0.25),
      });
    } else if (pageNum === 2) {
      // --- ABOUT US PAGE ---
      stream = stream.replace("/X9 Do", "% logo removed");
      stream = stream.replace("/X10 Do", "% line removed");
      stream = stream.replace(/BT[\s\S]*?ET/g, "% text removed");

      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      // Draw Stone Tech Logo at Top-Right
      page.drawImage(logoImage, {
        x: 655,
        y: 495,
        width: 76,
        height: 64,
      });

      // Draw Section Title
      page.drawText("ABOUT US", {
        x: 56,
        y: 470,
        size: 32,
        font: fontTimesBold,
        color: rgb(0.1, 0.12, 0.15),
      });
      page.drawText("STONE TECH ATELIER  ·  ARCHITECTURAL STONE FABRICATORS", {
        x: 58,
        y: 452,
        size: 8,
        font: fontHelveticaBold,
        color: rgb(0.45, 0.5, 0.55),
      });

      const paras = [
        "With a distinguished legacy in architectural stone fabrication, artisanal masonry, and luxury interior surface design, Stone Tech Atelier is the premier destination for natural stone, solid glass bricks, bespoke CNC surfaces, and architectural interior innovations.",
        "Our goal is to deliver uncompromising quality and bespoke craftsmanship; our deep material knowledge and technical mastery in architectural masonry and luminous glass systems are the keys to bringing extraordinary spaces to life.",
        "Our collaborative approach and ability to comprehend architectural vision enable us to execute complex custom designs with micro-millimeter precision, structural integrity, and flawless site integration.",
        "Our Experience Center in Ahmedabad curates luxury collections of Solid Glass Bricks, Natural Stone Wall Claddings, Carved Murals, CNC Reliefs, Italian Marble, Sandstone, Granite, and bespoke architectural elements.",
      ];

      let curY = 415;
      for (const pText of paras) {
        const words = pText.split(" ");
        let line = "";
        for (const w of words) {
          const testLine = line ? `${line} ${w}` : w;
          if (fontHelvetica.widthOfTextAtSize(testLine, 9.2) > 280) {
            page.drawText(line, {
              x: 58,
              y: curY,
              size: 9.2,
              font: fontHelvetica,
              color: rgb(0.25, 0.28, 0.32),
            });
            curY -= 14.5;
            line = w;
          } else {
            line = testLine;
          }
        }
        if (line) {
          page.drawText(line, {
            x: 58,
            y: curY,
            size: 9.2,
            font: fontHelvetica,
            color: rgb(0.25, 0.28, 0.32),
          });
          curY -= 22;
        }
      }

      // Footer
      const ftrText =
        "WWW.STONETECH.IN  ·  EXPERIENCE CENTER: AHMEDABAD  ·  WHATSAPP: +91 77420 90866";
      const ftrWidth = fontHelveticaBold.widthOfTextAtSize(ftrText, 8.5);
      page.drawText(ftrText, {
        x: (768 - ftrWidth) / 2,
        y: 40,
        size: 8.5,
        font: fontHelveticaBold,
        color: rgb(0.35, 0.4, 0.45),
      });
    } else if (pageNum === 3) {
      // --- DIVIDER PAGE (Product Catalogue) ---
      stream = stream.replace("/X13 Do", "% logo removed");
      stream = stream.replace("/X12 Do", "% line removed");
      stream = removeWwwBlocks(stream);

      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      // Draw Stone Tech Logo at Top-Right
      page.drawImage(logoImage, {
        x: 655,
        y: 495,
        width: 76,
        height: 64,
      });

      // Draw Footer Website
      page.drawText("WWW.STONETECH.IN", {
        x: 645,
        y: 28,
        size: 9,
        font: fontHelveticaBold,
        color: rgb(0.3, 0.33, 0.38),
      });
    } else if (pageNum >= 4 && pageNum <= 32) {
      // --- PRODUCT PAGES (29 PAGES) ---
      // 1. Remove Sharda logo from page stream (matrix 218.75 0 0 -218.75)
      stream = stream.replace(/(218\.75\s+0\s+0\s+-218\.75[\s\S]*?\/X\d+\s+Do)/, "% logo removed");
      // 2. Remove old footer website
      stream = removeWwwBlocks(stream);

      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      // Draw Stone Tech Top-Left Logo
      page.drawImage(logoImage, {
        x: 18,
        y: 516,
        width: 58,
        height: 48,
      });

      // Draw Top-Center Header
      page.drawText("Solid Glass Bricks Collection  ·  Stone Tech Atelier", {
        x: 236,
        y: 557,
        size: 8.8,
        font: fontHelvetica,
        color: rgb(0.38, 0.42, 0.46),
      });

      // Draw Top-Right Contact
      page.drawText("Inquire: +91 77420 90866", {
        x: 642,
        y: 557,
        size: 8.8,
        font: fontHelveticaBold,
        color: rgb(0.28, 0.32, 0.36),
      });

      // Draw Bottom Footer
      const ftr =
        "Experience Center: E-02, SG Business Hub, Gota, Ahmedabad · WhatsApp: +91 77420 90866 · www.stonetech.in";
      page.drawText(ftr, {
        x: 220,
        y: 25,
        size: 8.2,
        font: fontHelvetica,
        color: rgb(0.35, 0.38, 0.42),
      });
    } else if (pageNum === 33) {
      // --- INSTALLATION PROCESS ---
      stream = stream.replace("/X369 Do", "% logo removed");
      stream = stream.replace("/X368 Do", "% line removed");
      stream = removeWwwBlocks(stream);

      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      // Draw Stone Tech Top-Right Logo
      page.drawImage(logoImage, {
        x: 655,
        y: 495,
        width: 76,
        height: 64,
      });

      // Draw Footer
      page.drawText(
        "WWW.STONETECH.IN  ·  TECHNICAL CONSULTATION: +91 77420 90866 / +91 97844 52998",
        {
          x: 170,
          y: 28,
          size: 8.5,
          font: fontHelveticaBold,
          color: rgb(0.3, 0.33, 0.38),
        },
      );
    } else if (pageNum >= 34 && pageNum <= 36) {
      // --- PHOTO GALLERY PAGES ---
      stream = stream.replace(/\/X(372|376|380)\s+Do/g, "% logo removed");
      stream = stream.replace(/\/X(371|375|379)\s+Do/g, "% line removed");
      stream = removeWwwBlocks(stream);

      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      // Draw Stone Tech Top-Right Logo
      page.drawImage(logoImage, {
        x: 655,
        y: 495,
        width: 76,
        height: 64,
      });

      // Draw Footer
      page.drawText(
        "Experience Center: E-02, SG Business Hub, Gota, Ahmedabad · WhatsApp: +91 77420 90866 · www.stonetech.in",
        {
          x: 180,
          y: 28,
          size: 8.5,
          font: fontHelvetica,
          color: rgb(0.35, 0.38, 0.42),
        },
      );
    } else if (pageNum === 37) {
      // --- BACK COVER / CONTACT PAGE ---
      const bgIdx = stream.indexOf("/X384 Do\nQ");
      if (bgIdx !== -1) {
        stream = stream.slice(0, bgIdx + 10) + "\nQ\n";
      }
      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      const logoW = 120;
      const logoH = 100;
      page.drawImage(logoImage, {
        x: (768 - logoW) / 2,
        y: 370,
        width: logoW,
        height: logoH,
      });

      // Brand Title
      const t1 = "STONE TECH ATELIER";
      const t1W = fontHelveticaBold.widthOfTextAtSize(t1, 20);
      page.drawText(t1, {
        x: (768 - t1W) / 2,
        y: 335,
        size: 20,
        font: fontHelveticaBold,
        color: rgb(0.1, 0.12, 0.15),
      });

      // Subtitle
      const t2 = "ARCHITECTURAL STONE ATELIER & SOLID GLASS BRICKS";
      const t2W = fontHelveticaBold.widthOfTextAtSize(t2, 9.5);
      page.drawText(t2, {
        x: (768 - t2W) / 2,
        y: 318,
        size: 9.5,
        font: fontHelveticaBold,
        color: rgb(0.35, 0.4, 0.45),
      });

      // Contact Details Table
      const contactLines = [
        "Direct WhatsApp / Helpline:  +91 77420 90866  /  +91 97844 52998",
        "Instagram:  @stonetech.in  ·  @stonetech.atelier",
        "Email:  info@stonetech.in  ·  sales@stonetech.in",
        "Official Website:  www.stonetech.in",
        "Experience Center:  E-02, Ground Floor, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat 380060",
        "Studio Hours:  Monday – Saturday, 10:00 AM – 7:30 PM  ·  Port of Dispatch: Mundra / JNPT",
      ];

      let cY = 270;
      for (const line of contactLines) {
        const lineW = fontHelvetica.widthOfTextAtSize(line, 10.5);
        page.drawText(line, {
          x: (768 - lineW) / 2,
          y: cY,
          size: 10.5,
          font:
            line.includes("Experience Center:") || line.includes("Direct WhatsApp")
              ? fontHelveticaBold
              : fontHelvetica,
          color: rgb(0.18, 0.2, 0.24),
        });
        cY -= 26;
      }

      // Copyright footer
      const copyText = "© 2026 Stone Tech OS / Stone Tech Atelier. All Rights Reserved.";
      const copyW = fontHelvetica.widthOfTextAtSize(copyText, 8.5);
      page.drawText(copyText, {
        x: (768 - copyW) / 2,
        y: 60,
        size: 8.5,
        font: fontHelvetica,
        color: rgb(0.4, 0.45, 0.5),
      });
    }
  }

  console.log("Saving new Stone Tech catalogue PDF...");
  const finalPdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPdfPath, finalPdfBytes);
  console.log(
    `Saved successfully to ${outputPdfPath} (${(finalPdfBytes.length / 1024 / 1024).toFixed(2)} MB)!`,
  );
}

run().catch(console.error);
