import { PDFDocument, PDFName, PDFPage, rgb, StandardFonts } from "pdf-lib";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "fs";
import zlib from "zlib";

async function ensureBrandingAssets() {
  if (
    fs.existsSync("public/branding/stone-tech-emblem-hq.png") &&
    fs.existsSync("public/branding/stone-tech-manufacturer-badge.png")
  ) {
    return;
  }

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
  await ensureBrandingAssets();

  const inputPdfPath =
    "/Users/stonetech/.gemini/antigravity/brain/692e0f8b-c231-4893-8608-267244e2257f/.user_uploaded/media_1795014091127_c5f42ec8.pdf";
  const outputPdfPath = "public/catalogues/StoneTech_Glass_Bricks_Catalogue_2026.pdf";

  console.log("Loading hollow glass bricks source PDF...");
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

  // Helper to remove only the single BT block that represents WWW.SHARDAGRANITE.COM
  const removeWwwBlocks = (str: string) => {
    // 1. Remove the 256.172 1 re underline rectangle
    str = str.replace(/0\.765625\s+17\s+256\.172\s+1\s+re\s+f\s*/g, "");
    // 2. Remove BT blocks containing 3 or more <003A> (which represents '.')
    return str.replace(/BT[\s\S]*?ET/g, (bt) => {
      const wCount = (bt.match(/<003A>\s*Tj/g) || []).length;
      if (wCount >= 3) {
        return "% website removed";
      }
      return bt;
    });
  };

  // Helper to draw unified Manufacturer Top Header on product, installation & gallery pages
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
    page.drawText("ARCHITECTURAL HOLLOW GLASS BRICK DIVISION", {
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
      "STONE TECH ATELIER · HOLLOW GLASS BRICK DIVISION · EXPERIENCE CENTER: E-02, SG BUSINESS HUB, GOTA, AHMEDABAD · WHATSAPP: +91 77420 90866 · WWW.STONETECH.IN";
    const ftrW = fontHelvetica.widthOfTextAtSize(ftr, 7.2);
    page.drawText(ftr, {
      x: (768 - ftrW) / 2,
      y: 24,
      size: 7.2,
      font: fontHelvetica,
      color: rgb(0.18, 0.22, 0.28),
    });
  };

  // Process Page by Page
  for (let p = 0; p < numPages; p++) {
    const pageNum = p + 1;
    const page = pdfDoc.getPage(p);
    const contents = page.node.Contents();
    let stream = zlib.inflateSync(contents.asUint8Array()).toString("utf8");

    if (pageNum === 1) {
      // --- COVER PAGE ---
      // 1. Remove Sharda logo (/X5 Do)
      stream = stream.replace(
        /q\s+2750\.48\s+77\.4949\s+325\s+325\s+re[\s\S]*?\/X5\s+Do\s+Q\s+Q/,
        "% logo removed",
      );

      // 2. Remove "BY SHARDA GRANITE..." with its dot
      stream = stream.replace(/16\s+10\.5\s+m[\s\S]*?BT[\s\S]*?ET\s+Q/, "% by sharda removed");

      // 3. Remove top-left website & phone number
      stream = stream.replace(
        /q\s+0\s+0\s+0\s+RG\s+0\s+0\s+0\s+rg\s+\/G3\s+gs\s+3\.125\s+0\s+0\s+3\.125\s+186\.471\s+176\.352\s+cm[\s\S]*?ET\s+Q/,
        "% top-left contact removed",
      );

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
      page.drawText("ARCHITECTURAL HOLLOW GLASS BRICK DIVISION", {
        x: 45,
        y: 523,
        size: 8.2,
        font: fontHelveticaBold,
        color: rgb(0.01, 0.45, 0.65),
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
        end: { x: 310, y: 502 },
        thickness: 0.75,
        color: rgb(0.7, 0.75, 0.8),
      });

      // Centered Subtitle Under GLASS BRICKS
      const sub1 = "•  MANUFACTURED & ENGINEERED BY STONE TECH ATELIER  •";
      const sub1W = fontHelveticaBold.widthOfTextAtSize(sub1, 10.5);
      page.drawText(sub1, {
        x: (768 - sub1W) / 2,
        y: 262,
        size: 10.5,
        font: fontHelveticaBold,
        color: rgb(0.1, 0.12, 0.18),
      });

      const sub2 = "HOLLOW & ARCHITECTURAL GLASS BRICK COLLECTION  ·  2026 – 2027";
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
      // 1. Remove Sharda logo (/X8 Do)
      stream = stream.replace(/q\s+2937\.53\s+63\.2092[\s\S]*?\/X8\s+Do\s+Q\s+Q/, "% logo removed");

      // 2. Remove all Sharda text BT..ET blocks
      stream = stream.replace(/BT[\s\S]*?ET/g, "% text removed");
      // Remove underline rectangle
      stream = stream.replace(/0\.765625\s+17\s+256\.172\s+1\s+re\s+f\s*/g, "");

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
      page.drawText("ARCHITECTURAL STONE FABRICATORS & HOLLOW GLASS BRICK MANUFACTURERS", {
        x: 58,
        y: 454,
        size: 7.8,
        font: fontHelveticaBold,
        color: rgb(0.4, 0.45, 0.5),
      });

      const paras = [
        "Stone Tech Atelier is a premier Indian architectural manufacturer and artisanal engineering atelier specializing in high-performance natural stone, engineered architectural glass brick systems, bespoke CNC facades, and luxury interior surface masonry.",
        "Our Architectural Glass Brick Division engineers kiln-cast, hollow-core thermal glass blocks tailored for exterior building envelopes, interior luminous partitions, acoustic room dividers, and decorative accents. Manufactured with dual-cavity partial vacuums, each block delivers superior thermal insulation (U-value ~1.5 W/m²K) and exceptional acoustic soundproofing (up to 42 dB) while softly diffusing natural daylight.",
        "With our proprietary VetroKwik™ mortarless dry-joint interlocking alignment system, high-tensile stainless reinforcement ladders, and precision alignment spacers, architects and builders execute sweeping curved partitions, shower walls, and expansive light-transmitting building facades with rapid installation speed and guaranteed structural stability.",
        "Our Experience Center in Ahmedabad curates luxury collections of Architectural Glass Bricks, Natural Stone Wall Claddings, Carved Murals, CNC Reliefs, Italian Marble, Sandstone, Granite, and bespoke architectural elements.",
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
      // 1. Remove Sharda logo (/X13 Do)
      stream = stream.replace(
        /q\s+2937\.53\s+63\.2092[\s\S]*?\/X13\s+Do\s+Q\s+Q/,
        "% logo removed",
      );

      // 2. Remove WWW.SHARDAGRANITE.COM and underline
      stream = removeWwwBlocks(stream);

      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      // Top-Right (above vertical 'Product Catalogue'): Stone Tech Badge
      page.drawImage(badgeImg, {
        x: 676,
        y: 476,
        width: 52,
        height: 62.4,
      });

      // Bottom-Right (under vertical 'Product Catalogue'): Official Web Portal
      const webText = "WWW.STONETECH.IN";
      const webW = fontHelveticaBold.widthOfTextAtSize(webText, 7.5);
      page.drawText(webText, {
        x: 746 - webW,
        y: 28,
        size: 7.5,
        font: fontHelveticaBold,
        color: rgb(0.2, 0.25, 0.3),
      });

      // Bottom-Left (under vertical 'Glass Bricks'): Stone Tech Atelier
      page.drawText("STONE TECH ATELIER", {
        x: 22,
        y: 28,
        size: 7.5,
        font: fontHelveticaBold,
        color: rgb(0.2, 0.25, 0.3),
      });
    } else if (pageNum === 4) {
      // --- ARCHITECTURAL OVERVIEW PAGE ---
      // 1. Remove Sharda logo (/X15 Do)
      stream = stream.replace(
        /q\s+2937\.53\s+63\.2092[\s\S]*?\/X15\s+Do\s+Q\s+Q/,
        "% logo removed",
      );

      // 2. Remove Koffee with Karan text
      stream = stream.replace(
        /q\s+0\s+0\s+0\s+RG\s+0\s+0\s+0\s+rg[\s\S]*?2027\.92\s+2111\.98\s+cm[\s\S]*?ET\s+Q/,
        "% karan mention removed",
      );

      // 3. Remove WWW.SHARDAGRANITE.COM and underline
      stream = removeWwwBlocks(stream);

      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      // Top-Right: Stone Tech Manufacturer Badge
      page.drawImage(badgeImg, {
        x: 655,
        y: 475,
        width: 74,
        height: 88.8,
      });

      // Under the right-side studio photo: Architectural Project Callout
      page.drawText("FEATURED INSTALLATION: BESPOKE STUDIO PARTITIONS & LUMINOUS FACADES", {
        x: 384,
        y: 72,
        size: 7.5,
        font: fontHelveticaBold,
        color: rgb(0.08, 0.12, 0.18),
      });
      page.drawText(
        "VetroKwik™ Modular Dry-Joint Assembly · Certified Acoustic Soundproofing (40dB)",
        {
          x: 384,
          y: 60,
          size: 6.8,
          font: fontHelvetica,
          color: rgb(0.08, 0.52, 0.42), // emerald
        },
      );
      page.drawText("Stone Tech Atelier · Architectural Systems Engineering, Ahmedabad", {
        x: 384,
        y: 49,
        size: 6.5,
        font: fontHelvetica,
        color: rgb(0.4, 0.45, 0.5),
      });

      // Footer
      drawManufacturerFooter(page);
    } else if (pageNum === 5) {
      // --- CLEAR GLASS BRICKS SUB-DIVIDER ---
      // 1. Remove Sharda logo (/X22 Do)
      stream = stream.replace(
        /q\s+2750\.48\s+77\.4949\s+325\s+325\s+re[\s\S]*?\/X22\s+Do\s+Q\s+Q/,
        "% logo removed",
      );

      // 2. Remove "BY SHARDA GRANITE..." with its dot
      stream = stream.replace(/16\s+10\.5\s+m[\s\S]*?BT[\s\S]*?ET\s+Q/, "% by sharda removed");

      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      // Top-Right: Stone Tech Manufacturer Badge
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
      page.drawText("CLEAR ARCHITECTURAL GLASS BRICKS COLLECTION", {
        x: 45,
        y: 523,
        size: 8.2,
        font: fontHelveticaBold,
        color: rgb(0.01, 0.45, 0.65),
      });

      // Centered Subtitle Under CLEAR GLASS BRICKS
      const sub1 = "•  MANUFACTURED & ENGINEERED BY STONE TECH ATELIER  •";
      const sub1W = fontHelveticaBold.widthOfTextAtSize(sub1, 10.5);
      page.drawText(sub1, {
        x: (768 - sub1W) / 2,
        y: 262,
        size: 10.5,
        font: fontHelveticaBold,
        color: rgb(0.1, 0.12, 0.18),
      });

      const sub2 = "HIGH LIGHT TRANSMISSION & THERMAL ACOUSTIC SERIES  ·  2026 – 2027";
      const sub2W = fontHelvetica.widthOfTextAtSize(sub2, 8.5);
      page.drawText(sub2, {
        x: (768 - sub2W) / 2,
        y: 247,
        size: 8.5,
        font: fontHelvetica,
        color: rgb(0.35, 0.4, 0.45),
      });
    } else if (pageNum >= 6 && pageNum <= 28) {
      // --- CLEAR SERIES PRODUCT PAGES (23 PAGES) ---
      // 1. Remove Sharda logo (matrix 218.75 0 0 -218.75 47.8766 286.721 cm)
      stream = stream.replace(
        /q\s+47\.8766[\s\S]*?218\.75\s+0\s+0\s+-218\.75[\s\S]*?\/X\d+\s+Do\s+Q\s+Q/,
        "% logo removed",
      );

      // 2. Remove old footer website & underline
      stream = removeWwwBlocks(stream);

      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      // Draw Unified Manufacturer Top Header
      drawManufacturerHeader(page);

      // Technical Engineering Specifications under product details
      page.drawText("• Thermal Insulation: Dual-Cavity Partial Vacuum (U-Value: ~1.5 W/m²K)", {
        x: 508,
        y: 155,
        size: 7.2,
        font: fontHelvetica,
        color: rgb(0.25, 0.3, 0.35),
      });
      page.drawText("• Acoustic Rating: 40–42 dB Certified Sound Attenuation", {
        x: 508,
        y: 143,
        size: 7.2,
        font: fontHelvetica,
        color: rgb(0.25, 0.3, 0.35),
      });
      page.drawText("• Modular Dry-Interlock: VetroKwik™ Modular Spacers & Aligners", {
        x: 508,
        y: 131,
        size: 7.2,
        font: fontHelveticaBold,
        color: rgb(0.08, 0.12, 0.18),
      });

      // Draw Unified Manufacturer Bottom Footer
      drawManufacturerFooter(page);
    } else if (pageNum === 29) {
      // --- COLORED GLASS BRICKS SUB-DIVIDER ---
      // 1. Remove Sharda logo (/X98 Do)
      stream = stream.replace(
        /q\s+2750\.48\s+77\.4949\s+325\s+325\s+re[\s\S]*?\/X98\s+Do\s+Q\s+Q/,
        "% logo removed",
      );

      // 2. Remove "BY SHARDA GRANITE..." with its dot
      stream = stream.replace(/16\s+10\.5\s+m[\s\S]*?BT[\s\S]*?ET\s+Q/, "% by sharda removed");

      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      // Top-Right: Stone Tech Manufacturer Badge
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
      page.drawText("COLORED & IN-COLOR GLASS BRICKS COLLECTION", {
        x: 45,
        y: 523,
        size: 8.2,
        font: fontHelveticaBold,
        color: rgb(0.01, 0.45, 0.65),
      });

      // Centered Subtitle Under COLORED GLASS BRICKS
      const sub1 = "•  MANUFACTURED & ENGINEERED BY STONE TECH ATELIER  •";
      const sub1W = fontHelveticaBold.widthOfTextAtSize(sub1, 10.5);
      page.drawText(sub1, {
        x: (768 - sub1W) / 2,
        y: 262,
        size: 10.5,
        font: fontHelveticaBold,
        color: rgb(0.1, 0.12, 0.18),
      });

      const sub2 = "IN-COLOR MASS-TINTED & TRANSLUCENT COLORED BRICK SERIES  ·  2026 – 2027";
      const sub2W = fontHelvetica.widthOfTextAtSize(sub2, 8.5);
      page.drawText(sub2, {
        x: (768 - sub2W) / 2,
        y: 247,
        size: 8.5,
        font: fontHelvetica,
        color: rgb(0.35, 0.4, 0.45),
      });
    } else if (pageNum >= 30 && pageNum <= 44) {
      // --- COLORED SERIES PRODUCT PAGES (15 PAGES) ---
      // 1. Remove Sharda logo
      stream = stream.replace(
        /q\s+47\.8766[\s\S]*?218\.75\s+0\s+0\s+-218\.75[\s\S]*?\/X\d+\s+Do\s+Q\s+Q/,
        "% logo removed",
      );

      // 2. Remove old footer website & underline
      stream = removeWwwBlocks(stream);

      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      // Draw Unified Manufacturer Top Header
      drawManufacturerHeader(page);

      // For pages 39-44 (without In-Color note), add technical engineering specs
      if (pageNum >= 39) {
        page.drawText("• Thermal Insulation: Dual-Cavity Partial Vacuum (U-Value: ~1.5 W/m²K)", {
          x: 508,
          y: 155,
          size: 7.2,
          font: fontHelvetica,
          color: rgb(0.25, 0.3, 0.35),
        });
        page.drawText("• Acoustic Rating: 40–42 dB Certified Sound Attenuation", {
          x: 508,
          y: 143,
          size: 7.2,
          font: fontHelvetica,
          color: rgb(0.25, 0.3, 0.35),
        });
        page.drawText("• Modular Dry-Interlock: VetroKwik™ Modular Spacers & Aligners", {
          x: 508,
          y: 131,
          size: 7.2,
          font: fontHelveticaBold,
          color: rgb(0.08, 0.12, 0.18),
        });
      }

      // Draw Unified Manufacturer Bottom Footer
      drawManufacturerFooter(page);
    } else if (pageNum === 45) {
      // --- INSTALLATION PROCESS ---
      // 1. Remove Sharda logo (/X146 Do)
      stream = stream.replace(
        /q\s+2937\.53\s+63\.2092[\s\S]*?\/X146\s+Do\s+Q\s+Q/,
        "% logo removed",
      );

      // 2. Remove WWW.SHARDAGRANITE.COM and underline
      stream = removeWwwBlocks(stream);

      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      // Draw Unified Manufacturer Top Header
      drawManufacturerHeader(page, "VETROKWIK™ MODULAR SYSTEM GUIDELINES");

      // Draw Unified Manufacturer Bottom Footer
      drawManufacturerFooter(page);
    } else if (pageNum >= 46 && pageNum <= 48) {
      // --- PHOTO GALLERY PAGES (3 PAGES) ---
      // 1. Remove Sharda logo (/X152, /X157, /X162 Do)
      stream = stream.replace(
        /q\s+2937\.53\s+63\.2092[\s\S]*?\/X(152|157|162)\s+Do\s+Q\s+Q/,
        "% logo removed",
      );

      // 2. Remove WWW.SHARDAGRANITE.COM and underline
      stream = removeWwwBlocks(stream);

      contents.contents = zlib.deflateSync(Buffer.from(stream, "utf8"));

      // Draw Unified Manufacturer Top Header
      drawManufacturerHeader(page, "ARCHITECTURAL REFERENCE PORTFOLIO");

      // Draw Unified Manufacturer Bottom Footer
      drawManufacturerFooter(page);
    } else if (pageNum === 49) {
      // --- BACK COVER / CONTACT PAGE ---
      // Truncate stream after /X164 Do to completely wipe Sharda logo (/X165 Do) and contact info
      const bgIdx = stream.indexOf("/X164 Do\nQ");
      if (bgIdx !== -1) {
        stream = stream.slice(0, bgIdx + 10) + "\n";
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
      const t2 = "ARCHITECTURAL HOLLOW GLASS BRICK DIVISION · INDIA";
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
        "MATERIAL FORMULATION:  Dual-Cavity Kiln-Cast Architectural Thermal Borosilicate Glass",
        "SOUND ATTENUATION:  40 – 42 dB (High Acoustic Privacy & Noise Decibel Attenuation)",
        "THERMAL TRANSMITTANCE:  U-Value ~ 1.5 W/m²K (Partial Vacuum Energy Conservation)",
        "FIRE RESISTANCE RATING:  Class E60 / EI30 (Non-Combustible Architectural Masonry)",
        "COMPRESSIVE STRENGTH:  > 7.5 N/mm² (Structural Hollow Architectural Masonry Standard)",
        "MODULAR SIZES:  190×190×80 mm · 145×145×80 mm · 240×240×80 mm · 190×90×80 mm",
        "INSTALLATION SYSTEMS:  VetroKwik™ Dry Interlocking Modules or Cementitious Mortar",
        "QUALITY ASSURANCE:  100% Pre-Dispatch Dimensional Verification & Seaworthy Crating",
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
        mY -= 16.5;
      }

      // Hairline
      page.drawLine({
        start: { x: 184, y: 202 },
        end: { x: 584, y: 202 },
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

      let cY = 184;
      for (const line of contactLines) {
        const lineW = fontHelvetica.widthOfTextAtSize(line, 8.8);
        page.drawText(line, {
          x: (768 - lineW) / 2,
          y: cY,
          size: 8.8,
          font:
            line.includes("Direct Factory WhatsApp") || line.includes("Experience Center:")
              ? fontHelveticaBold
              : fontHelvetica,
          color: rgb(0.1, 0.14, 0.18),
        });
        cY -= 19;
      }

      // Copyright footer
      const copyText =
        "© 2026 Stone Tech Atelier. Designed, Engineered & Manufactured in India. All Rights Reserved.";
      const copyW = fontHelvetica.widthOfTextAtSize(copyText, 8.5);
      page.drawText(copyText, {
        x: (768 - copyW) / 2,
        y: 40,
        size: 8.5,
        font: fontHelvetica,
        color: rgb(0.4, 0.45, 0.5),
      });
    }
  }

  console.log(`Final catalog page count: ${pdfDoc.getPageCount()} pages.`);

  console.log("Saving new Stone Tech hollow glass bricks catalogue PDF...");
  const finalPdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPdfPath, finalPdfBytes);
  console.log(
    `Saved successfully to ${outputPdfPath} (${(finalPdfBytes.length / 1024 / 1024).toFixed(2)} MB)!`,
  );
}

run().catch(console.error);
