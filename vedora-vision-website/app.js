/* ==========================================================================
   VEDORA VISION (www.vedoravision.in) — Fast, Zero-Lag JavaScript Engine
   ========================================================================== */

const APPS_DATA = {
  stos: {
    title: "Stone Tech OS (STOS)",
    subtitle: "Enterprise Stone Fabrication & Construction ERP",
    category: "Live & Operational",
    badgeClass: "status-live",
    iconClass: "icon-emerald",
    icon: "building-2",
    logoImg: "assets/logos/stos.png",
    desc: "Complete operational hub for stone fabrication and construction operations, eliminating leakages from initial measurement to final ledger.",
    subdomain: "stonetech.in",
    liveUrl: "https://stonetech.in",
    bullets: [
      "<strong>End-to-End Lineage:</strong> Customer Enquiry → Estimate → Quotation → Sales Order → PO/Manufacturing → Dispatch → Installation → Invoicing & Ledger.",
      "<strong>Granular Slab & Wastage Tracking:</strong> Live remnant calculation, bundle management, and inventory movement logs.",
      "<strong>Cross-Platform & Offline-Ready:</strong> Native mobile app (Android) with safe-area support for on-site factory and installation teams.",
    ],
  },
  vedaflow: {
    title: "VedaFlow",
    subtitle: "Vedic Astrology, Kundali Milan & Sacred Pilgrimages",
    category: "Live & Operational",
    badgeClass: "status-orange",
    iconClass: "icon-orange",
    icon: "sun",
    logoImg: "assets/logos/vedaflow.png",
    desc: "The premier digital Vedic sanctuary blending ancient astrological wisdom with cutting-edge AI palmistry, compatibility matching, and temple lore.",
    subdomain: "vedaflow.vedoravision.in",
    liveUrl: "https://vedaflow.vedoravision.in",
    bullets: [
      "<strong>Precision 36 Gunas Ashtakoota Milan:</strong> In-depth marriage compatibility algorithms and Dosha remedies (Manglik, Nadi, Bhakoot).",
      "<strong>AI Palm & Face Reading:</strong> Intelligent computer vision analysis for Hastarekha and facial Vedic traits.",
      "<strong>Sacred Pilgrimages Directory:</strong> Comprehensive guides to the 12 Jyotirlingas, Shaktipeeths, and spiritual rituals across India.",
    ],
  },
  taxflow: {
    title: "TaxFlow",
    subtitle: "AI Tax & Financial Operating System (Hisabi)",
    category: "Live & Operational",
    badgeClass: "status-live",
    iconClass: "icon-emerald",
    icon: "receipt",
    logoImg: "assets/logos/taxflow.jpg",
    desc: "Automated financial assistant providing seamless tax filing, invoice OCR scanning, real-time GST computation, and audit-proof financial intelligence.",
    subdomain: "taxflow.stonetech.in",
    liveUrl: "https://taxflow.stonetech.in",
    bullets: [
      "<strong>Instant Document Intelligence:</strong> AI OCR document parsing extracting 100% accurate invoice data and deductions in seconds.",
      "<strong>Unified Financial Profile:</strong> Consolidated tracking of bank accounts, investments, liabilities, and daily financial briefs.",
      "<strong>Automated Compliance & ITR Filing:</strong> Pre-calculated tax liabilities, audit warnings, and direct filing workflows.",
    ],
  },
  marketflow: {
    title: "MarketFlow",
    subtitle: "AI Growth, Lead Generation & Marketing Operating System",
    category: "Live & Operational",
    badgeClass: "status-violet",
    iconClass: "icon-violet",
    icon: "trending-up",
    desc: "Unified growth engine combining multi-channel CRM pipelines, intelligent campaign delivery, lead scoring, and automated customer outreach.",
    subdomain: "marketflow.vedoravision.in",
    liveUrl: "https://marketflow.vedoravision.in",
    bullets: [
      "<strong>Multi-Channel Lead Automation:</strong> Automated lead capture, WhatsApp/Email nurture sequences, and conversion scoring.",
      "<strong>Autonomous Copilot & Insights:</strong> AI-driven campaign recommendation cards and real-time revenue analytics.",
      "<strong>Complete CRM Pipeline:</strong> Visual deal stages, unified client histories, tasks, and team attribution.",
    ],
  },
  testerix: {
    title: "TesteriX",
    subtitle: "AI-Supervised Crowdsourced Beta Testing & Google Play 14-Day Bridge",
    category: "Live & Operational",
    badgeClass: "status-cyan",
    iconClass: "icon-cyan",
    icon: "bug-play",
    logoImg: "assets/logos/testerix.jpg",
    desc: "AI-monitored crowdsourced beta testing ecosystem connecting indie developers and contractual employers with verified community testers to satisfy Google Play's 14-day 20-tester closed testing mandate.",
    subdomain: "testerix.vedoravision.in",
    liveUrl: "https://testerix.vedoravision.in",
    bullets: [
      "<strong>Google Play 14-Day 20-Tester Closed Testing Bridge:</strong> Structured cohort curation via Employee Cart, custom durations (15m, 30m, 60m, or multi-day sprint), and daily job sheet telemetry.",
      "<strong>DigiLocker KYC & RBI-Compliant Escrow:</strong> Automated Aadhaar, PAN, corporate email OTP, and Penny-Drop bank verification with instant IMPS/UPI disbursement upon developer review.",
      "<strong>Dynamic 1x–5x Rate Multiplier:</strong> ₹100 base scaling up to ₹500/slot based on tester ratings, conduct assessment, and edge-case bug reporting rigor.",
    ],
  },
  foodflow: {
    title: "FoodFlow",
    subtitle: "Next-Gen Dine-In & Restaurant POS",
    category: "Under Development (Target: Q4 2026)",
    badgeClass: "status-indev",
    iconClass: "icon-violet",
    icon: "utensils",
    desc: "Engineered to supersede legacy POS systems like Petpooja with sub-second offline billing, unified table turns, and zero billing counter bottlenecks.",
    subdomain: "foodflow.vedoravision.in",
    liveUrl: null,
    bullets: [
      "<strong>Sub-Second Offline-First Billing:</strong> Lightning-fast checkouts even during peak rush hour or total internet dropouts.",
      "<strong>Unified Multi-Aggregator Sync:</strong> Swiggy, Zomato, Direct Dine-In, and Takeaway managed from one unified screen.",
      "<strong>Dynamic KDS & Recipe Depletion:</strong> Real-time kitchen routing that auto-deducts ingredients to eliminate food pilferage.",
    ],
  },
  clouk: {
    title: "Clouk",
    subtitle: "Dedicated Multi-Brand Cloud Kitchen OS",
    category: "Under Development (Target: Q4 2026)",
    badgeClass: "status-indev",
    iconClass: "icon-indigo",
    icon: "cloud",
    desc: "Tailor-made specifically for multi-brand cloud kitchens to operate 5+ virtual brands from a single kitchen footprint with zero cross-brand confusion.",
    subdomain: "clouk.vedoravision.in",
    liveUrl: null,
    bullets: [
      "<strong>Multi-Brand Centralized Terminal:</strong> Unified order queue across all virtual brands on a single screen.",
      "<strong>Live Rider Dispatch Timers:</strong> Real-time dispatch handoff timers to maximize aggregator delivery rating algorithms.",
      "<strong>Commissary & Shared Inventory:</strong> Unified base-gravy, packaging, and raw material tracking across brands.",
    ],
  },
  streamflow: {
    title: "StreamFlow",
    subtitle: "Synchronized Social OTT 'Watch Together' Platform",
    category: "Under Development (Target: Q1 2027)",
    badgeClass: "status-indev",
    iconClass: "icon-pink",
    icon: "tv",
    desc: "Co-stream and watch identical OTT content with up to 5 friends simultaneously in real time with sub-millisecond sync and floating facecams.",
    subdomain: "streamflow.vedoravision.in",
    liveUrl: null,
    bullets: [
      "<strong>Sub-Millisecond Sync Engine:</strong> Frame-perfect playback alignment across all viewers with zero audio drift.",
      "<strong>5-User Floating Video Hub:</strong> Picture-in-picture live facecams, spatial voice audio, and instant emoji bursts.",
      "<strong>Cross-Platform Web & Smart TV:</strong> Zero clunky software installations; instant browser room sharing.",
    ],
  },
  buildassure: {
    title: "BuildAssure",
    subtitle: "AI Construction Quality Assurance & Milestone Verification",
    category: "Under Development (Target: Q1 2027)",
    badgeClass: "status-indev",
    iconClass: "icon-yellow",
    icon: "hard-hat",
    desc: "Empowering construction builders, architects, and property buyers with verified milestone logs, material testing audits, and QA compliance.",
    subdomain: "buildassure.vedoravision.in",
    liveUrl: null,
    bullets: [
      "<strong>Milestone & Site Progress Verification:</strong> Geo-tagged site inspections, photo timestamping, and contractor audits.",
      "<strong>Material QA & Structural Compliance:</strong> Concrete slump tests, steel quality certificates, and defect snag lists.",
      "<strong>Client Warranty & Audit Vault:</strong> Tamper-proof handover records and digital maintenance passports.",
    ],
  },
  gaming: {
    title: "Vedora Gaming Labs",
    subtitle: "Real-Time Multiplayer Mini-Games & Gamified Productivity",
    category: "Future Horizon (Target: Mid 2027)",
    badgeClass: "status-amber",
    iconClass: "icon-amber",
    icon: "gamepad-2",
    desc: "Developing lightweight, highly engaging social multiplayer mini-games and turning enterprise business operations into fun, motivating team quests.",
    subdomain: "gaming.vedoravision.in",
    liveUrl: null,
    bullets: [
      "<strong>Instant Multiplayer Mini-Games:</strong> Zero-install real-time web & mobile experiences for communities and breaks.",
      "<strong>Gamified Operations:</strong> Translating daily business KPIs and sales targets into interactive team quests.",
    ],
  },
};

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  }

  initMobileMenu();
  initCategoryFilters();
  initAppModal();
  initEnquiryForm();
});

/* 1. Mobile Menu Toggle */
function initMobileMenu() {
  const menuBtn = document.getElementById("mobile-menu-btn");
  const drawer = document.getElementById("mobile-drawer");
  if (!menuBtn || !drawer) return;

  menuBtn.addEventListener("click", () => {
    drawer.classList.toggle("hidden");
  });

  drawer.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      drawer.classList.add("hidden");
    });
  });
}

/* 2. Fast Category Filters */
function initCategoryFilters() {
  const filterTabs = document.querySelectorAll(".filter-tab");
  const productCards = document.querySelectorAll(".product-card");

  filterTabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      filterTabs.forEach((t) => t.classList.remove("active"));
      this.classList.add("active");

      const filter = this.getAttribute("data-filter");

      productCards.forEach((card) => {
        const category = card.getAttribute("data-category");
        if (filter === "all" || category === filter) {
          card.style.display = "flex";
        } else {
          card.style.display = "none";
        }
      });
    });
  });
}

/* 3. Interactive Modal */
function initAppModal() {
  const modal = document.getElementById("app-modal");
  const closeBtn = document.getElementById("modal-close-btn");
  if (!modal) return;

  function openModal(appKey) {
    const data = APPS_DATA[appKey];
    if (!data) return;

    document.getElementById("modal-title").textContent = data.title;
    document.getElementById("modal-subtitle").textContent = data.subtitle;

    const badge = document.getElementById("modal-badge");
    badge.textContent = data.category;
    badge.className = `modal-badge ${data.badgeClass}`;

    const iconBox = document.getElementById("modal-icon");
    iconBox.className = `modal-icon-box ${data.iconClass}`;
    if (data.logoImg) {
      iconBox.innerHTML = `<img src="${data.logoImg}" alt="${data.title}" class="icon-badge-img" />`;
    } else {
      iconBox.innerHTML = `<i data-lucide="${data.icon}" class="icon-md"></i>`;
    }

    document.getElementById("modal-desc").textContent = data.desc;
    document.getElementById("modal-subdomain").textContent = data.subdomain;

    const bulletsList = document.getElementById("modal-bullets");
    bulletsList.innerHTML = data.bullets
      .map(
        (b) =>
          `<li style="display:flex; align-items:flex-start; gap:0.375rem;"><i data-lucide="check" class="icon-xs text-neon-mint" style="flex-shrink:0; margin-top:0.2rem;"></i><span>${b}</span></li>`,
      )
      .join("");

    const actionContainer = document.getElementById("modal-action-container");
    if (data.liveUrl) {
      actionContainer.innerHTML = `
        <a href="${data.liveUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="padding:0.375rem 0.875rem; font-size:0.75rem;">
          <span>Launch Live App</span>
          <i data-lucide="arrow-up-right" class="icon-xs"></i>
        </a>
      `;
    } else {
      actionContainer.innerHTML = `
        <a href="mailto:ainfo@vedoravision.in?subject=Early%20Access%20Inquiry%20-%20${encodeURIComponent(data.title)}" class="btn-secondary" style="padding:0.375rem 0.875rem; font-size:0.75rem;">
          <span>Request Early Access</span>
          <i data-lucide="mail" class="icon-xs"></i>
        </a>
      `;
    }

    if (window.lucide && typeof lucide.createIcons === "function") {
      lucide.createIcons();
    }

    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest(".open-modal-btn");
    if (trigger) {
      const appKey = trigger.getAttribute("data-app");
      if (appKey) openModal(appKey);
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });
}

/* 4. Table of Enquiry / Lead Generation Form */
function initEnquiryForm() {
  const form = document.getElementById("enquiry-form");
  const statusBox = document.getElementById("enquiry-status-box");
  const reqTextarea = document.getElementById("enquiry-requirement");
  if (!form) return;

  // Allow pressing Enter (without Shift) in requirement textarea to trigger form submission
  if (reqTextarea) {
    reqTextarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // 1. Extract selected platforms
    const selectedPlatforms = Array.from(
      form.querySelectorAll('input[name="platform"]:checked'),
    ).map((cb) => cb.value);

    const platformText =
      selectedPlatforms.length > 0 ? selectedPlatforms.join(", ") : "General Custom Software Build";

    // 2. Extract inputs
    const requirement = (document.getElementById("enquiry-requirement")?.value || "").trim();
    const name = (document.getElementById("enquiry-name")?.value || "").trim();
    const mobile = (document.getElementById("enquiry-mobile")?.value || "").trim();
    const email = (document.getElementById("enquiry-email")?.value || "").trim();
    const country = (document.getElementById("enquiry-country")?.value || "").trim();
    const state = (document.getElementById("enquiry-state")?.value || "").trim();

    if (!requirement || !name || !mobile || !email || !country || !state) {
      if (statusBox) {
        statusBox.className = "enquiry-status-box error";
        statusBox.innerHTML =
          "<strong>Missing Required Fields:</strong> Please fill in all fields before submitting.";
        statusBox.classList.remove("hidden");
      }
      return;
    }

    // 3. Construct detailed email subject and body
    const emailTo = "ainfo@vedoravision.in";
    const subject = `New Project Enquiry: ${name} (${platformText.split(",")[0]})`;

    const emailBody = [
      `==================================================`,
      `VEDORA VISION (www.vedoravision.in) — PROJECT ENQUIRY`,
      `==================================================`,
      ``,
      `1. CLIENT & CONTACT DETAILS:`,
      `--------------------------------------------------`,
      `• Full Name:       ${name}`,
      `• Mobile / WhatsApp: ${mobile}`,
      `• Email Address:   ${email}`,
      `• Location:        ${state}, ${country}`,
      ``,
      `2. PLATFORM SCOPE REQUESTED:`,
      `--------------------------------------------------`,
      `• Platforms:       ${platformText}`,
      ``,
      `3. DETAILED PROJECT REQUIREMENT:`,
      `--------------------------------------------------`,
      `${requirement}`,
      ``,
      `--------------------------------------------------`,
      `Sent via Table of Enquiry on www.vedoravision.in`,
      `==================================================`,
    ].join("\n");

    const mailtoUrl = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;

    // 4. Render sleek success status with option to re-open email client or copy requirement
    if (statusBox) {
      statusBox.className = "enquiry-status-box success";
      statusBox.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.625rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700; color: #50c878;">
            <i data-lucide="check-circle" class="icon-sm"></i>
            <span>Enquiry Dispatched Directly to ainfo@vedoravision.in!</span>
          </div>
          <p style="margin: 0; color: #cbd5e1; font-size: 0.8125rem; line-height: 1.5;">
            Thank you, <strong>${name}</strong>. Your project specifications for <strong>${platformText}</strong> have been compiled. If your email client did not automatically launch, you can click below to trigger the message directly or send your brief to <strong>ainfo@vedoravision.in</strong>.
          </p>
          <div style="display: flex; flex-wrap: wrap; gap: 0.625rem; margin-top: 0.25rem;">
            <a href="${mailtoUrl}" class="btn-primary" style="padding: 0.375rem 0.875rem; font-size: 0.75rem;">
              <span>Open Email Client</span>
              <i data-lucide="send" class="icon-xs"></i>
            </a>
            <button type="button" id="copy-brief-btn" class="btn-secondary" style="padding: 0.375rem 0.875rem; font-size: 0.75rem;">
              <span>Copy Full Brief</span>
              <i data-lucide="copy" class="icon-xs"></i>
            </button>
          </div>
        </div>
      `;
      statusBox.classList.remove("hidden");

      if (window.lucide && typeof lucide.createIcons === "function") {
        lucide.createIcons();
      }

      // Copy brief button listener
      const copyBtn = document.getElementById("copy-brief-btn");
      if (copyBtn) {
        copyBtn.addEventListener("click", () => {
          navigator.clipboard.writeText(emailBody).then(() => {
            copyBtn.innerHTML = `<span>Copied to Clipboard!</span> <i data-lucide="check" class="icon-xs text-neon-mint"></i>`;
            if (window.lucide) lucide.createIcons();
          });
        });
      }
    }

    // 5. Trigger the native/web mailto protocol
    window.location.href = mailtoUrl;
  });
}
