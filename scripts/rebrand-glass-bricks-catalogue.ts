import { PDFDocument, PDFName, PDFPage, rgb, StandardFonts } from "pdf-lib";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "fs";
import zlib from "zlib";

async function prepareBrandingAssets() {
  const src = await loadImage("public/branding/stone-tech-logo-transparent.png");

  // 1. Pure circular emblem without text (576x577)
  const emblemCanvas = createCanvas(576, 577);
  const eCtx = emblemCanvas.getContext("2d");
  eCtx.drawImage(src, 224, 48, 576, 577, 0, 0, 576, 577);
  fs.writeFileSync("public/branding/stone-tech-emblem-hq.png", emblemCanvas.toBuffer("image/png"));

  // 2. Vertical Manufacturer Badge
  const badgeCanvas = createCanvas(600, 720);
  const bCtx = badgeCanvas.getContext("2d");
  bCtx.drawImage(emblemCanvas, 40, 10, 520, 520);

  bCtx.fillStyle = "#0f172a"; // deep architectural slate
  bCtx.font = "bold 64px sans-serif";
  bCtx.textAlign = "center";
  bCtx.fillText("STONE TECH", 300, 595);

  bCtx.fillStyle = "#475569"; // slate sub
  bCtx.font = "bold 30px sans-serif";
  bCtx.letterSpacing = "4px";
  bCtx.fillText("ATELIER · 2018", 300, 645);

  bCtx.fillStyle = "#b45309"; // amber accent
  bCtx.font = "bold 22px sans-serif";
  bCtx.letterSpacing = "3px";
  bCtx.fillText("MANUFACTURER", 300, 685);

  fs.writeFileSync(
    "public/branding/stone-tech-manufacturer-badge.png",
    badgeCanvas.toBuffer("image/png"),
  );
  console.log("Branding assets generated successfully.");
}

async function run() {
  await prepareBrandingAssets();

  const inputPdfPath =
    "/Users/stonetech/.gemini/antigravity/brain/692e0f8b-c231-4893-8608-267244e2257f/.user_uploaded/media_1795000347600_87730ac5.pdf";
  const outputPdfPath = "public/catalogues/StoneTech_Solid_Glass_Bricks_Catalogue_2026.pdf";

  console.log("Loading original PDF...");
  const data = fs.readFileSync(inputPdfPath);
  const pdfDoc = await PDFDocument.load(data);
  const numPages = pdfDoc.getPageCount();
  console.log(`Loaded ${numPages} pages.`);

  // Load high-resolution transparent branding assets
  const emblemBytes = fs.readFileSync("public/branding/stone-tech-emblem-hq.png");
  const emblemImg = await pdfDoc.embedPng(emblemBytes);

  const badgeBytes = fs.readFileSync("public/branding/stone-tech-manufacturer-badge.png");
  const badgeImg = await pdfDoc.embedPng(badgeBytes);

  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontTimesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  // 1. Process all 58 Form XObjects (headers & handles on product pages)
  console.log("Neutralizing Sharda Form XObjects...");
  let formCount = 0;
  for (let p = 0; p < numPages; p++) {
    const page = pdfDoc.getPage(p);
    const res = page.node.Resources();
    const xobj = res.get(PDFName.of("XObject"));
    if (!xobj) continue;
    const dict = pdfDoc.context.lookup(xobj);
    for (const [, ref] of dict.entries()) {
      const obj = pdfDoc.context.lookup(ref);
      if (obj.dict.get(PDFName.of("Subtype"))?.asString() === "/Form") {
        try {
          const uncomp = zlib.inflateSync(obj.asUint8Array()).toString("utf8");
          if (uncomp.includes("13.58 Tf")) {
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

  // Helper to draw unified Manufacturer Top Header on product & gallery pages
  const drawManufacturerHeader = (page: PDFPage, pageTitle = "") => {
    // 1. Top-Left: Circular radiating Stone Tech emblem
    page.drawImage(emblemImg, {
      x: 22,
      y: 520,
      width: 36,
      height: 36,
    });

    // 2. Beside Emblem: Corporate identity & division
    page.drawText("STONE TECH ATELIER", {
      x: 66,
      y: 546,
      size: 10.5,
      font: fontHelveticaBold,
      color: rgb(0.06, 0.09, 0.16),
    });
    page.drawText("ARCHITECTURAL SOLID GLASS BRICK DIVISION", {
      x: 66,
      y: 533,
      size: 7.2,
      font: fontHelveticaBold,
      color: rgb(0.01, 0.45, 0.65), // brand peacock blue
    });
    page.drawText("MANUFACTURER & SYSTEM ENGINEER · AHMEDABAD, INDIA", {
      x: 66,
      y: 522,
      size: 6.5,
      font: fontHelvetica,
      color: rgb(0.4, 0.45, 0.5),
    });

    // 3. Top-Right: Technical Specification & Direct Factory Orders
    const right1 = pageTitle || "TECHNICAL SPECIFICATION · 2026-27";
    const right1W = fontHelveticaBold.widthOfTextAtSize(right1, 8);
    page.drawText(right1, {
      x: 746 - right1W,
      y: 546,
      size: 8,
      font: fontHelveticaBold,
      color: rgb(0.08, 0.12, 0.18),
    });

    const right2 = "FACTORY DIRECT ORDERS: +91 77420 90866";
    const right2W = fontHelveticaBold.widthOfTextAtSize(right2, 7.5);
    page.drawText(right2, {
      x: 746 - right2W,
      y: 533,
      size: 7.5,
      font: fontHelveticaBold,
      color: rgb(0.08, 0.52, 0.42), // deep emerald
    });

    const right3 = "WWW.STONETECH.IN · INFO@STONETECH.IN";
    const right3W = fontHelvetica.widthOfTextAtSize(right3, 6.8);
    page.drawText(right3, {
      x: 746 - right3W,
      y: 522,
      size: 6.8,
      font: fontHelvetica,
      color: rgb(0.45, 0.5, 0.55),
    });

    // 4. Clean 0.75pt Hairline Divider across top
    page.drawLine({
      start: { x: 22, y: 512 },
      end: { x: 746, y: 512 },
      thickness: 0.75,
      color: rgb(0.84, 0.87, 0.9),
    });
  };

  // Helper to draw unified Manufacturer Bottom Footer
  const drawManufacturerFooter = (page: PDFPage) => {
    // 1. Hairline Divider
    page.drawLine({
      start: { x: 22, y: 36 },
      end: { x: 746, y: 36 },
      thickness: 0.5,
      color: rgb(0.84, 0.87, 0.9),
    });

    // 2. Footer details
    const ftr =
      "STONE TECH ATELIER · SOLID GLASS BRICK DIVISION · EXPERIENCE CENTER: E-02, SG BUSINESS HUB, GOTA, AHMEDABAD · WHATSAPP: +91 77420 90866 · WWW.STONETECH.IN";
    const ftrW = fontHelvetica.widthOfTextAtSize(ftr, 7.2);
    page.drawText(ftr, {
      x: (768 - ftrW) / 2,
      y: 24,
      size: 7.2,
      font: fontHelvetica,
      color: rgb(0.18, 0.22, 0.28),
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
      stream = stream.replace("/X3 Do", "% logo removed");
      stream = stream.replace("/X4 Do", "% line removed");
      stream = stream.replace("/X5 Do", "% dot removed");

      // Filter out Sharda BT blocks, keeping SOLID GLASS and BRICKS
      const bts = stream.match(/BT[\s\S]*?ET/g) || [];
      for (const bt of bts) {
        if (!bt.includes("146.35 Tf") && !bt.includes("217.891 220 Tm")) {
          stream = stream.replace(bt, "% header removed");
        }
      }

      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      // Top-Right: Transparent Stone Tech Manufacturer Badge (74 x 88.8 pt)
      page.drawImage(badgeImg, {
        x: 648,
        y: 472,
        width: 74,
        height: 88.8,
      });

      // Top-Left Masthead
      page.drawText("STONE TECH ATELIER", {
        x: 45,
        y: 538,
        size: 13.5,
        font: fontHelveticaBold,
        color: rgb(0.06, 0.09, 0.16),
      });
      page.drawText("ARCHITECTURAL SOLID GLASS BRICK DIVISION", {
        x: 45,
        y: 523,
        size: 8.2,
        font: fontHelveticaBold,
        color: rgb(0.35, 0.4, 0.45),
      });
      page.drawText("WWW.STONETECH.IN  ·  FACTORY DIRECT: +91 77420 90866", {
        x: 45,
        y: 510,
        size: 7.8,
        font: fontHelvetica,
        color: rgb(0.25, 0.3, 0.35),
      });
      page.drawLine({
        start: { x: 45, y: 502 },
        end: { x: 295, y: 502 },
        thickness: 0.75,
        color: rgb(0.7, 0.75, 0.8),
      });

      // Centered Subtitle Under SOLID GLASS BRICKS
      const sub1 = "•  MANUFACTURED & ENGINEERED BY STONE TECH ATELIER  •";
      const sub1W = fontHelveticaBold.widthOfTextAtSize(sub1, 10.5);
      page.drawText(sub1, {
        x: (768 - sub1W) / 2,
        y: 262,
        size: 10.5,
        font: fontHelveticaBold,
        color: rgb(0.1, 0.12, 0.18),
      });

      const sub2 = "ARCHITECTURAL K9 OPTICAL CRYSTAL COLLECTION  ·  2026 – 2027";
      const sub2W = fontHelvetica.widthOfTextAtSize(sub2, 8.5);
      page.drawText(sub2, {
        x: (768 - sub2W) / 2,
        y: 247,
        size: 8.5,
        font: fontHelvetica,
        color: rgb(0.35, 0.4, 0.45),
      });
    } else if (pageNum === 2) {
      // --- ABOUT US PAGE ---
      stream = stream.replace("/X9 Do", "% logo removed");
      stream = stream.replace("/X10 Do", "% line removed");
      stream = stream.replace(/BT[\s\S]*?ET/g, "% text removed");

      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      // Top-Right Manufacturer Badge
      page.drawImage(badgeImg, {
        x: 655,
        y: 475,
        width: 74,
        height: 88.8,
      });

      // Section Title
      page.drawText("ABOUT STONE TECH ATELIER", {
        x: 56,
        y: 472,
        size: 20,
        font: fontTimesBold,
        color: rgb(0.06, 0.09, 0.16),
      });
      page.drawText("ARCHITECTURAL STONE FABRICATORS & SOLID GLASS BRICK MANUFACTURERS", {
        x: 58,
        y: 454,
        size: 7.8,
        font: fontHelveticaBold,
        color: rgb(0.4, 0.45, 0.5),
      });

      const paras = [
        "Stone Tech Atelier is a premier Indian architectural manufacturer and artisanal fabricator specializing in high-performance natural stone, solid optical glass brick systems, bespoke CNC facades, and luxury interior surface engineering.",
        "Our Solid Glass Brick Division engineers kiln-cast, micro-annealed optical crystal glass bricks designed specifically for architectural load-bearing partitions, illuminated facades, and luminous interior dividing walls. Formulated from high-purity K9 borosilicate silica crystal, each block achieves compressive load-bearing strength exceeding 120 MPa—far surpassing traditional structural masonry.",
        "With our proprietary VetroKwik™ mortarless dry-joint interlocking alignment system and precision diamond edge calibration, architects and interior designers can execute sweeping curved partitions, floating luminous reception counters, and light-transmitting building facades with micro-millimeter precision and total structural integrity.",
        "Our Experience Center in Ahmedabad curates luxury collections of Solid Glass Bricks, Natural Stone Wall Claddings, Carved Murals, CNC Reliefs, Italian Marble, Sandstone, Granite, and bespoke architectural elements.",
      ];

      let curY = 420;
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
              color: rgb(0.2, 0.24, 0.28),
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
            color: rgb(0.2, 0.24, 0.28),
          });
          curY -= 20;
        }
      }

      // Facility Credentials Box
      page.drawText(
        "MANUFACTURING FACILITY: AHMEDABAD, GUJARAT · SEAPORT OF DISPATCH: MUNDRA / JNPT",
        {
          x: 58,
          y: 72,
          size: 7.2,
          font: fontHelveticaBold,
          color: rgb(0.15, 0.2, 0.25),
        },
      );

      // Footer
      drawManufacturerFooter(page);
    } else if (pageNum === 3) {
      // --- DIVIDER PAGE (Product Catalogue) ---
      stream = stream.replace("/X13 Do", "% logo removed");
      stream = stream.replace("/X12 Do", "% line removed");
      stream = removeWwwBlocks(stream);

      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      // Top-Right Badge
      page.drawImage(badgeImg, {
        x: 655,
        y: 475,
        width: 74,
        height: 88.8,
      });

      // Subtitle
      page.drawText("STONE TECH ARCHITECTURAL SOLID GLASS COLLECTION · 2026", {
        x: 45,
        y: 440,
        size: 9,
        font: fontHelveticaBold,
        color: rgb(0.35, 0.4, 0.45),
      });

      drawManufacturerFooter(page);
    } else if (pageNum >= 4 && pageNum <= 32) {
      // --- PRODUCT PAGES (29 PAGES) ---
      // 1. Remove Sharda logo from page stream (matrix 218.75 0 0 -218.75)
      stream = stream.replace(/(218\.75\s+0\s+0\s+-218\.75[\s\S]*?\/X\d+\s+Do)/, "% logo removed");
      // 2. Remove old footer website
      stream = removeWwwBlocks(stream);

      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      // Draw Unified Manufacturer Top Header
      drawManufacturerHeader(page);

      // Draw Technical Engineering Specifications under Code (safe for all pages)
      page.drawText("• Formulation: High-Purity Micro-Annealed K9 Optical Crystal (>120 N/mm²)", {
        x: 38,
        y: 370,
        size: 7.2,
        font: fontHelvetica,
        color: rgb(0.25, 0.3, 0.35),
      });
      page.drawText("• System Engineering: VetroKwik™ Interlock · Stone Tech Atelier, Ahmedabad", {
        x: 38,
        y: 358,
        size: 7.2,
        font: fontHelveticaBold,
        color: rgb(0.08, 0.12, 0.18),
      });

      // Draw Unified Manufacturer Bottom Footer
      drawManufacturerFooter(page);
    } else if (pageNum === 33) {
      // --- INSTALLATION PROCESS ---
      stream = stream.replace("/X369 Do", "% logo removed");
      stream = stream.replace("/X368 Do", "% line removed");
      stream = removeWwwBlocks(stream);

      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      // Draw Unified Manufacturer Top Header
      drawManufacturerHeader(page, "VETROKWIK™ MODULAR SYSTEM GUIDELINES");

      // Draw Unified Manufacturer Bottom Footer
      drawManufacturerFooter(page);
    } else if (pageNum >= 34 && pageNum <= 36) {
      // --- PHOTO GALLERY PAGES ---
      stream = stream.replace(/\/X(372|376|380)\s+Do/g, "% logo removed");
      stream = stream.replace(/\/X(371|375|379)\s+Do/g, "% line removed");
      stream = removeWwwBlocks(stream);

      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      // Draw Unified Manufacturer Top Header
      drawManufacturerHeader(page, "ARCHITECTURAL REFERENCE PORTFOLIO");

      // Draw Unified Manufacturer Bottom Footer
      drawManufacturerFooter(page);
    } else if (pageNum === 37) {
      // --- BACK COVER / CONTACT PAGE ---
      const bgIdx = stream.indexOf("/X384 Do\nQ");
      if (bgIdx !== -1) {
        stream = stream.slice(0, bgIdx + 10) + "\nQ\n";
      }
      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      // Centered Prominent Circular Stone Tech Emblem
      const embW = 86;
      const embH = 86;
      page.drawImage(emblemImg, {
        x: (768 - embW) / 2,
        y: 418,
        width: embW,
        height: embH,
      });

      // Brand Title
      const t1 = "STONE TECH ATELIER";
      const t1W = fontHelveticaBold.widthOfTextAtSize(t1, 22);
      page.drawText(t1, {
        x: (768 - t1W) / 2,
        y: 388,
        size: 22,
        font: fontHelveticaBold,
        color: rgb(0.06, 0.09, 0.16),
      });

      // Subtitle
      const t2 = "ARCHITECTURAL SOLID GLASS BRICKS DIVISION · INDIA";
      const t2W = fontHelveticaBold.widthOfTextAtSize(t2, 9.5);
      page.drawText(t2, {
        x: (768 - t2W) / 2,
        y: 372,
        size: 9.5,
        font: fontHelveticaBold,
        color: rgb(0.35, 0.4, 0.45),
      });

      // Hairline
      page.drawLine({
        start: { x: 184, y: 360 },
        end: { x: 584, y: 360 },
        thickness: 1,
        color: rgb(0.8, 0.83, 0.87),
      });

      // Technical Specification Matrix Box
      const matrixLines = [
        "MATERIAL FORMULATION:  Micro-Annealed K9 High-Purity Optical Borosilicate Crystal Glass",
        "COMPRESSIVE STRENGTH:  > 120 N/mm² (Structural Architectural Masonry Grade)",
        "LIGHT TRANSMITTANCE:  92% Ultra-Clear High-Luminance Refraction",
        "FIRE & THERMAL RATING:  Non-Combustible Class A1  ·  150°C Thermal Shock Resistant",
        "STANDARD MODULAR SIZES:  200 × 100 × 50 mm (Custom Molds & Tints on Architectural Request)",
        "INSTALLATION SYSTEMS:  VetroKwik™ Mortarless Interlocking Spacers or UV Structural Sealant",
        "QUALITY ASSURANCE:  100% Pre-Dispatch Optical Inspection & Seaworthy Wooden Crating",
      ];

      let mY = 340;
      for (const line of matrixLines) {
        const lineW = fontHelvetica.widthOfTextAtSize(line, 8.5);
        page.drawText(line, {
          x: (768 - lineW) / 2,
          y: mY,
          size: 8.5,
          font: fontHelvetica,
          color: rgb(0.18, 0.22, 0.26),
        });
        mY -= 17;
      }

      // Hairline
      page.drawLine({
        start: { x: 184, y: 215 },
        end: { x: 584, y: 215 },
        thickness: 1,
        color: rgb(0.8, 0.83, 0.87),
      });

      // Contact Details Table
      const contactLines = [
        "Direct Factory WhatsApp & Orders:  +91 77420 90866  /  +91 97844 52998",
        "Technical Architectural Consultation:  info@stonetech.in  ·  sales@stonetech.in",
        "Official Web Portal:  www.stonetech.in  ·  Instagram:  @stonetech.in",
        "Experience Center:  E-02, Ground Floor, SG Business Hub, Vasant Nagar, Gota, Ahmedabad 380060",
        "Manufacturing Facility:  Ahmedabad, Gujarat  ·  Port of Dispatch:  Mundra / JNPT",
      ];

      let cY = 195;
      for (const line of contactLines) {
        const lineW = fontHelvetica.widthOfTextAtSize(line, 9);
        page.drawText(line, {
          x: (768 - lineW) / 2,
          y: cY,
          size: 9,
          font:
            line.includes("Direct Factory WhatsApp") || line.includes("Experience Center:")
              ? fontHelveticaBold
              : fontHelvetica,
          color: rgb(0.1, 0.14, 0.18),
        });
        cY -= 20;
      }

      // Copyright footer
      const copyText =
        "© 2026 Stone Tech Atelier. Designed, Engineered & Manufactured in India. All Rights Reserved.";
      const copyW = fontHelvetica.widthOfTextAtSize(copyText, 8.5);
      page.drawText(copyText, {
        x: (768 - copyW) / 2,
        y: 45,
        size: 8.5,
        font: fontHelvetica,
        color: rgb(0.4, 0.45, 0.5),
      });
    }
  }

  console.log("Saving new Stone Tech manufacturer catalogue PDF...");
  const finalPdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPdfPath, finalPdfBytes);
  console.log(
    `Saved successfully to ${outputPdfPath} (${(finalPdfBytes.length / 1024 / 1024).toFixed(2)} MB)!`,
  );
}

run().catch(console.error);
