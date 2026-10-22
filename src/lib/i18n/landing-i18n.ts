/**
 * Comprehensive Landing Page Translations for Stone Tech (STOS)
 * Supports English ('en'), Hindi ('hi'), and Gujarati ('gu').
 */

export interface LocalizedProductOption {
  id: string;
  canonicalName: string;
  name: string;
  tagline: string;
  popular?: boolean;
}

export interface LocalizedSpaceType {
  label: string;
  value: string;
}

export interface LocalizedRole {
  label: string;
  value: string;
  type: string;
}

export interface LocalizedLuxuryProduct {
  id: string;
  name: string;
  canonicalName?: string;
  category: "all" | "facade" | "sacred" | "surfaces" | "exotic";
  categoryLabel: string;
  tagline: string;
  luxurySubtitle: string;
  description: string;
  badge: string;
  specs: {
    thickness: string;
    dimensions: string;
    weight?: string;
    finishes: string[];
    applications: string[];
    quarryOrigin: string;
  };
  highlights: string[];
  popular?: boolean;
}

export const LANDING_UI_TRANSLATIONS = {
  en: {
    brandSubtitle: "Architectural Stone Atelier",
    nav: {
      ourWork: "Our Work",
      whyUs: "Why Us",
      jobOpenings: "Job Openings",
      contact: "Contact",
      trackInquiry: "Track My Inquiry",
      track: "Track",
      employeesLogin: "Employees Login",
    },
    hero: {
      titlePart1: "Architectural Stone, Crafted for ",
      titleHighlight: "Extraordinary Spaces.",
      customersServed: "Customers Served",
      installationWarranty: "Installation Warranty",
      yearsWarranty: "3 Years",
      quarryPricing: "Quarry Pricing",
      direct: "Direct",
      googleRating: "Google Rating",
      description:
        "From handcrafted stone veneers to CNC-carved murals, custom flooring and luxury facades—we transform natural stone into timeless architectural statements.",
      benefits: {
        quarry: "Direct Quarry Sourcing",
        cnc: "CNC & Waterjet Precision",
        panIndia: "Pan India Installation",
        support: "Design-to-Installation Support",
      },
      exploreProjects: "Explore 300+ Completed Projects",
    },
    form: {
      title: "Request for estimate",
      step1: "Part 1/2: Stone Requirements",
      step1Short: "1. Stone Needs",
      step2: "Part 2/2: Contact & Timeline",
      step2Short: "2. Timeline & Info",
      selectProducts: "Select Stone Products",
      clear: "Clear",
      selectedCount: "{{count}} selected",
      tapHint: "Tap any product to select or deselect",
      selectAll: "Select All ({{count}})",
      spaceType: "Project Space Type",
      descPlaceholder:
        "Dimensions, wall sizes, or details (e.g., Living room TV wall 12x10 ft, exterior elevation in slate grey)...",
      ideas: "Ideas:",
      uploadLabel: "Upload Photos / CAD (Up to 10):",
      filesCount: "{{count}}/10 files",
      uploadPrompt: "Tap to upload site photos, sketches or CAD drawings",
      compressing: "Compressing photos...",
      continueBtn: "Continue to Step 2/2: Delivery & Contact Details",
      continueBtnShort: "Continue to Step 2/2",
      selectedLabel: "Selected:",
      noneSelected: "None selected",
      editStep1: "Edit (1/2)",
      contactTitle: "Contact & Timeline:",
      yourRole: "Your Role / Identity",
      selectOne: "Select one",
      fullName: "Your Full Name",
      whatsappNumber: "Enter WhatsApp Number:",
      projectCity: "Project City / Location",
      cityPlaceholder: "e.g. Ahmedabad, Jaipur, Delhi",
      emailOptional: "Email (Optional)",
      requiredDate: "Required Completion Date:",
      pickFromCalendar: "Pick from calendar",
      instantWhatsappOption: "Instant WhatsApp Estimate Option:",
      instantWhatsappDesc:
        "Send your requirements directly to our Lead Architect on WhatsApp to receive rapid pricing & high-res slab photos:",
      sendWhatsappBtn: "Send on WhatsApp (+91 77420 90866)",
      backBtn: "Back (1/2)",
      back: "Back",
      submitting: "Submitting request...",
      submitBtn: "Request for estimate",
      trustNote: "Instant estimate & material specifications sent to WhatsApp",
    },
    gallery: {
      title: "Live Installations & Executed Works",
      requestEstimate: "Request Estimate for this Finish",
      approvals: "Architectural Approvals",
    },
    showcase: {
      portfolioBadge: "The Architectural Atelier Portfolio",
      directMine: "Direct Mine Sourcing · Sub-Millimeter Tolerances",
      title: "Curated Natural Stone Collections",
      subtitle:
        "From rare translucent agates and precision 5-axis CNC mandir sanctums to flexible cleaved stone veneers and bookmatched Italian marble slabs. Engineered for villas, estates, and sacred architecture.",
      tabs: {
        all: "All Collections",
        facade: "Facades & Veneers",
        sacred: "Mandirs & Inlays",
        surfaces: "Floors & Monoliths",
        exotic: "Gemstones & Outdoors",
      },
      selectForEstimate: "Select for Estimate",
      selected: "Selected for Estimate",
      inquireWhatsapp: "Inquire on WhatsApp",
      getEstimate: "Get Estimate →",
      viewInForm: "View in Estimate Form →",
      viewSpecs: "View Technical Specifications",
      hideSpecs: "Hide Technical Specifications",
      sampleBoxQuestion: "Need a bespoke sample box or dry-lay proof for this product?",
      directMineNote: "Mine-direct certification with zero distributor markups",
      specsHeaders: {
        thickness: "Standard Thickness & Formats",
        dimensions: "Standard Dimensions",
        weight: "Structural Weight",
        finishes: "Available Surface Finishes",
        applications: "Recommended Architectural Applications",
        quarry: "Quarry & Regional Origin",
      },
    },
    whyUs: {
      title: "Built on Precision, Lineage & Transparency",
      p1Title: "Quarry Direct Sourcing",
      p1Desc:
        "No middleman or distributor markups. We source raw blocks straight from certified mines in Rajasthan and global stone centers.",
      p2Title: "Sub-Millimeter CNC Cutting",
      p2Desc:
        "High-pressure 5-axis CNC waterjet routers ensure under 0.5mm joint tolerances for flawless seamless installation.",
      p3Title: "WhatsApp Progress Updates",
      p3Desc:
        "Get high-resolution photo and video proofs of your stone blocks, dry-lay matching, and packaging sent to WhatsApp in real-time.",
      p4Title: "Export Zero-Damage Crating",
      p4Desc:
        "Every shipment is cushioned in EPE shock foam and sealed within export-grade wooden crates with 100% transit replacement coverage.",
    },
    contact: {
      title: "How to reach Us?",
      subtitle:
        "Connect directly with our stone specialists, request factory dry-lay guidance, or visit our Ahmedabad experience center.",
      googleVerified: "Google Verified Business",
      connectWhatsapp: "Connect Directly on WhatsApp",
      chatAtelier: "Direct chat with our atelier team",
      tapToChat: "Tap to chat on WhatsApp",
      showroomTitle: "Showroom & Studio Location",
      experienceCenter: "Ahmedabad Experience Center",
      experienceCenterAddress:
        "E-02, Ground Floor, in front of The Festival Residency, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat, Pin Code: 380060",
      getDirections: "Get Directions on Google Maps",
      emailCorrespondence: "Email Correspondence",
      emailInquiries: "Architectural inquiries & tenders",
      officialInquiries: "Official Inquiries:",
      studioHours: "Studio Hours: Mon – Sat, 10:00 AM – 7:30 PM",
      sendRfq: "Send Architectural RFQ via Email",
      reviewsTitle: "Client Feedback & 5-Star Reviews:",
      topRated: "5.0 ★ Top Rated Atelier",
      callWhatsapp: "Direct WhatsApp & Call",
      emailSupport: "Email Support",
      businessHours: "Monday – Saturday: 9:30 AM – 7:30 PM",
    },
    mobileBar: {
      whatsapp: "WhatsApp",
      freeEstimate: "Free Estimate",
    },
    success: {
      title: "Inquiry Received!",
      thankYou: "Thank you, {{name}}. We have registered your custom stone requirements.",
      refNumber: "Inquiry Reference Number",
      refNote: "Keep this reference code for instant swatch tracking and dispatch updates.",
      whatsappSent: "Automated WhatsApp Update Sent to {{phone}}",
      whatsappDesc:
        "Our system is generating your stone estimate and swatch kit. Connect directly with our lead architect on WhatsApp to receive rapid pricing & high-res slab photos:",
      openWhatsapp: "Open WhatsApp & Chat Now",
      visitCenter: "Visit Our Stone Experience Center",
      onGoogle: "{{rating}} on Google",
      touchFeel:
        "Touch and feel 200+ curated live slabs, 3D elevation claddings, and flexible stone veneer installations.",
      getDirections: "Get Exact Directions on Google Maps",
      submitAnother: "Submit Another Project Requirement",
    },
    errors: {
      selectProduct: "Please select at least one stone product.",
      selectSpace: "Please select your project space type.",
      enterName: "Please enter your full name.",
      validWhatsapp: "Please enter a valid WhatsApp phone number (at least 7 digits).",
      enterCity: "Please enter your project city or location.",
      pickDate: "Please pick your required completion date from the calendar.",
      maxPhotos: "You can upload a maximum of 10 photos.",
      invalidFileType: "{{filename}} is not an image or PDF file.",
      inquirySuccessToast:
        "Inquiry received successfully! Our stone specialist will connect with you on WhatsApp.",
    },
  },
  hi: {
    brandSubtitle: "आर्किटेक्चरल स्टोन एटलियर",
    nav: {
      ourWork: "हमारा काम",
      whyUs: "हम ही क्यों",
      jobOpenings: "करियर / नौकरियां",
      contact: "संपर्क करें",
      trackInquiry: "अपनी पूछताछ ट्रैक करें",
      track: "ट्रैक करें",
      employeesLogin: "कर्मचारी लॉगिन",
    },
    hero: {
      titlePart1: "वास्तुशिल्प प्राकृतिक पत्थर, विशेष रूप से निर्मित ",
      titleHighlight: "असाधारण स्थानों के लिए।",
      customersServed: "संतुष्ट ग्राहक",
      installationWarranty: "इंस्टॉलेशन वारंटी",
      yearsWarranty: "3 वर्ष",
      quarryPricing: "सीधी खदान दरें",
      direct: "डायरेक्ट",
      googleRating: "गूगल रेटिंग",
      description:
        "हस्तनिर्मित स्टोन विनियर से लेकर सीएनसी-नक्काशीदार भित्तिचित्र, कस्टम फर्श और लक्जरी अग्रभाग तक—हम प्राकृतिक पत्थर को कालातीत वास्तुशिल्प बयानों में बदलते हैं।",
      benefits: {
        quarry: "सीधी खदान सोर्सिंग (नो बिचौलिए)",
        cnc: "सीएनसी व वॉटरजेट सब-मिमी परिशुद्धता",
        panIndia: "संपूर्ण भारत में डिलीवरी व इंस्टॉलेशन",
        support: "डिजाइन से अंतिम फिटिंग तक पूर्ण सहयोग",
      },
      exploreProjects: "300+ पूर्ण प्रोजेक्ट्स देखें",
    },
    form: {
      title: "अनुमान व कोटेशन का अनुरोध",
      step1: "भाग 1/2: पत्थर की आवश्यकताएं",
      step1Short: "1. पत्थर की जरूरत",
      step2: "भाग 2/2: संपर्क व समयसीमा",
      step2Short: "2. समयसीमा व विवरण",
      selectProducts: "पत्थर उत्पाद चुनें",
      clear: "हटाएं",
      selectedCount: "{{count}} चयनित",
      tapHint: "चुनने या हटाने के लिए किसी भी उत्पाद पर टैप करें",
      selectAll: "सभी चुनें ({{count}})",
      spaceType: "प्रोजेक्ट का प्रकार / स्थल",
      descPlaceholder:
        "आयाम, दीवार का आकार या विवरण (उदा. लिविंग रूम टीवी वॉल 12×10 फीट, बाहरी एलिवेशन स्लेट ग्रे में)...",
      ideas: "सुझाव:",
      uploadLabel: "साइट फोटो / सीएडी ड्राइंग अपलोड करें (अधिकतम 10):",
      filesCount: "{{count}}/10 फाइलें",
      uploadPrompt: "साइट फोटो, स्केच या सीएडी ड्राइंग अपलोड करने के लिए टैप करें",
      compressing: "तस्वीरें प्रोसेस हो रही हैं...",
      continueBtn: "आगे बढ़ें (चरण 2/2): डिलीवरी व संपर्क विवरण",
      continueBtnShort: "चरण 2/2 पर जाएं",
      selectedLabel: "चयनित:",
      noneSelected: "कोई उत्पाद चयनित नहीं",
      editStep1: "संपादित करें (1/2)",
      contactTitle: "संपर्क एवं प्रोजेक्ट समयसीमा:",
      yourRole: "आपकी भूमिका / पहचान",
      selectOne: "एक चुनें",
      fullName: "आपका पूरा नाम",
      whatsappNumber: "व्हाट्सएप नंबर दर्ज करें:",
      projectCity: "प्रोजेक्ट शहर / स्थान",
      cityPlaceholder: "उदा. अहमदाबाद, जयपुर, दिल्ली",
      emailOptional: "ईमेल (वैकल्पिक)",
      requiredDate: "आवश्यक पूर्णता तिथि:",
      pickFromCalendar: "कैलेंडर से चुनें",
      instantWhatsappOption: "तत्काल व्हाट्सएप कोटेशन विकल्प:",
      instantWhatsappDesc:
        "त्वरित मूल्य निर्धारण और हाई-रेज़ोल्यूशन स्लैब तस्वीरें प्राप्त करने के लिए अपनी आवश्यकताएं सीधे हमारे मुख्य वास्तुकार को व्हाट्सएप पर भेजें:",
      sendWhatsappBtn: "व्हाट्सएप पर भेजें (+91 77420 90866)",
      backBtn: "वापस (1/2)",
      back: "वापस",
      submitting: "अनुरोध भेजा जा रहा है...",
      submitBtn: "अनुमान प्राप्त करें",
      trustNote: "तत्काल अनुमान व सामग्री विवरण आपके व्हाट्सएप पर भेजा जाएगा",
    },
    gallery: {
      title: "लाइव इंस्टॉलेशन व पूर्ण कार्य",
      requestEstimate: "इस फिनिश के लिए अनुमान का अनुरोध करें",
      approvals: "वास्तुशिल्प अनुमोदन",
    },
    showcase: {
      portfolioBadge: "आर्किटेक्चरल एटलियर पोर्टफोलियो",
      directMine: "सीधी खदान सोर्सिंग · सब-मिलीमीटर परिशुद्धता",
      title: "क्यूरेटेड प्राकृतिक पत्थर संग्रह",
      subtitle:
        "दुर्लभ पारभासी अगेट और 5-एक्सिस सीएनसी मंदिर नक्काशी से लेकर लचीले स्टोन विनियर और इटैलियन मार्बल तक। विला, हवेलियों और पावन वास्तुकला हेतु विशेष रूप से तैयार।",
      tabs: {
        all: "सभी संग्रह",
        facade: "अग्रभाग व विनियर",
        sacred: "मंदिर व जड़ाई कार्य",
        surfaces: "फ्लोरिंग व बड़े स्लैब",
        exotic: "दुर्लभ रत्न व आउटडोर",
      },
      selectForEstimate: "अनुमान हेतु चुनें",
      selected: "अनुमान हेतु चयनित ✓",
      inquireWhatsapp: "व्हाट्सएप पर पूछें",
      getEstimate: "कोटेशन पाएं →",
      viewInForm: "फॉर्म में देखें →",
      viewSpecs: "तकनीकी विवरण देखें",
      hideSpecs: "तकनीकी विवरण छुपाएं",
      sampleBoxQuestion: "क्या आपको इस उत्पाद के लिए नमूना बॉक्स या ड्राई-ले प्रूफ चाहिए?",
      directMineNote: "शून्य वितरक कमीशन के साथ खदान-प्रत्यक्ष प्रमाणीकरण",
      specsHeaders: {
        thickness: "मानक मोटाई व प्रारूप",
        dimensions: "मानक आयाम",
        weight: "संरचनात्मक वजन",
        finishes: "उपलब्ध सतह फिनिश",
        applications: "अनुशंसित वास्तुशिल्प अनुप्रयोग",
        quarry: "खदान व क्षेत्रीय स्रोत",
      },
    },
    whyUs: {
      title: "सटीकता, विरासत और पारदर्शिता पर आधारित",
      p1Title: "सीधी खदान सोर्सिंग",
      p1Desc:
        "कोई बिचौलिया या डीलर कमीशन नहीं। हम राजस्थान और वैश्विक खनन केंद्रों से सीधे कच्चे ब्लॉक सोर्स करते हैं।",
      p2Title: "सब-मिलीमीटर सीएनसी कटिंग",
      p2Desc:
        "हाई-प्रेशर 5-एक्सिस सीएनसी वॉटरजेट राउटर 0.5 मिमी से कम जॉइंट टॉलरेंस सुनिश्चित करते हैं।",
      p3Title: "व्हाट्सएप प्रगति अपडेट",
      p3Desc:
        "अपने पत्थर के ब्लॉक, ड्राई-ले मैचिंग और पैकेजिंग के हाई-डेफिनिशन फोटो और वीडियो रियल-टाइम में व्हाट्सएप पर प्राप्त करें।",
      p4Title: "निर्यात-गुणवत्ता शून्य-नुकसान क्रेटिंग",
      p4Desc:
        "प्रत्येक खेप को ईपीई शॉक फोम में सुरक्षित कर एक्सपोर्ट-ग्रेड लकड़ी के बक्सों में 100% ट्रांजिट रिप्लेसमेंट गारंटी के साथ भेजा जाता है।",
    },
    contact: {
      title: "हमसे कैसे संपर्क करें?",
      subtitle:
        "हमारे पत्थर विशेषज्ञों से सीधे जुड़ें, फैक्ट्री ड्राई-ले मार्गदर्शन का अनुरोध करें, या हमारे अहमदाबाद अनुभव केंद्र पर आएं।",
      googleVerified: "गूगल सत्यापित व्यवसाय",
      connectWhatsapp: "सीधे व्हाट्सएप पर संपर्क करें",
      chatAtelier: "हमारी एटलियर टीम से सीधी बातचीत",
      tapToChat: "व्हाट्सएप पर चैट करने के लिए टैप करें",
      showroomTitle: "शोरूम और स्टूडियो का पता",
      experienceCenter: "अहमदाबाद एक्सपीरियंस सेंटर",
      experienceCenterAddress:
        "E-02, ग्राउंड फ्लोर, द फेस्टिवल रेसिडेंसी के सामने, एसजी बिजनेस हब, वसंत नगर, गोटा, अहमदाबाद, गुजरात, पिन कोड: 380060",
      getDirections: "गूगल मैप्स पर रास्ता देखें",
      emailCorrespondence: "ईमेल पत्राचार",
      emailInquiries: "वास्तुशिल्प पूछताछ व निविदाएं",
      officialInquiries: "आधिकारिक पूछताछ:",
      studioHours: "स्टूडियो का समय: सोम – शनि, 10:00 AM – 7:30 PM",
      sendRfq: "ईमेल द्वारा वास्तुशिल्प RFQ भेजें",
      reviewsTitle: "ग्राहक प्रतिक्रिया व 5-स्टार समीक्षाएं:",
      topRated: "5.0 ★ शीर्ष रेटेड एटलियर",
      callWhatsapp: "डायरेक्ट व्हाट्सएप और कॉल",
      emailSupport: "ईमेल सहायता",
      businessHours: "सोमवार – शनिवार: 9:30 AM – 7:30 PM",
    },
    mobileBar: {
      whatsapp: "व्हाट्सएप",
      freeEstimate: "मुफ्त अनुमान",
    },
    success: {
      title: "पूछताछ प्राप्त हुई!",
      thankYou: "धन्यवाद, {{name}}। हमने आपकी कस्टम पत्थर आवश्यकताओं को दर्ज कर लिया है।",
      refNumber: "पूछताछ संदर्भ संख्या",
      refNote: "त्वरित ट्रैकिंग और डिस्पैच अपडेट के लिए इस संदर्भ कोड को सुरक्षित रखें।",
      whatsappSent: "स्वचालित व्हाट्सएप अपडेट {{phone}} पर भेजा गया",
      whatsappDesc:
        "हमारा सिस्टम आपका स्टोन एस्टीमेट तैयार कर रहा है। त्वरित मूल्य निर्धारण और उच्च गुणवत्ता वाले स्लैब फोटो प्राप्त करने के लिए हमारे मुख्य वास्तुकार से सीधे व्हाट्सएप पर जुड़ें:",
      openWhatsapp: "व्हाट्सएप खोलें और अभी चैट करें",
      visitCenter: "हमारे स्टोन एक्सपीरियंस सेंटर पर आएं",
      onGoogle: "गूगल पर {{rating}}",
      touchFeel:
        "200+ लाइव स्लैब, 3D एलिवेशन क्लैडिंग और फ्लेक्सिबल स्टोन विनियर इंस्टॉलेशन को साक्षात अनुभव करें।",
      getDirections: "गूगल मैप्स पर सटीक रास्ता देखें",
      submitAnother: "एक और प्रोजेक्ट आवश्यकता दर्ज करें",
    },
    errors: {
      selectProduct: "कृपया कम से कम एक पत्थर उत्पाद चुनें।",
      selectSpace: "कृपया अपने प्रोजेक्ट का स्थान प्रकार चुनें।",
      enterName: "कृपया अपना पूरा नाम दर्ज करें।",
      validWhatsapp: "कृपया एक मान्य व्हाट्सएप नंबर दर्ज करें (कम से कम 7 अंक)।",
      enterCity: "कृपया अपने प्रोजेक्ट का शहर या स्थान दर्ज करें।",
      pickDate: "कृपया कैलेंडर से अपनी आवश्यक पूर्णता तिथि चुनें।",
      maxPhotos: "आप अधिकतम 10 तस्वीरें अपलोड कर सकते हैं।",
      invalidFileType: "{{filename}} एक छवि या पीडीएफ फाइल नहीं है।",
      inquirySuccessToast:
        "पूछताछ सफलतापूर्वक प्राप्त हुई! हमारे पत्थर विशेषज्ञ जल्द ही व्हाट्सएप पर आपसे संपर्क करेंगे।",
    },
  },
  gu: {
    brandSubtitle: "આર્કિટેક્ચરલ સ્ટોન એટલિયર",
    nav: {
      ourWork: "અમારું કામ",
      whyUs: "અમે જ કેમ",
      jobOpenings: "નોકરીઓ / કારકિર્દી",
      contact: "સંપર્ક કરો",
      trackInquiry: "તમારી પૂછપરછ ટ્રેક કરો",
      track: "ટ્રેક",
      employeesLogin: "કર્મચારી લોગિન",
    },
    hero: {
      titlePart1: "વાસ્તુશિલ્પ નેચરલ સ્ટોન, ખાસ નિર્મિત ",
      titleHighlight: "અસાધારણ જગ્યાઓ માટે.",
      customersServed: "સંતોષકારક ગ્રાહકો",
      installationWarranty: "ઇન્સ્ટોલેશન વોરંટી",
      yearsWarranty: "3 વર્ષ",
      quarryPricing: "સીધા ક્વોરી ભાવ",
      direct: "ડાયરેક્ટ",
      googleRating: "ગૂગલ રેટિંગ",
      description:
        "હસ્તનિર્મિત સ્ટોન વિનિયરથી લઈને સીએનસી-નક્શીકામ ભીંતચિત્રો, કસ્ટમ ફ્લોરિંગ અને લક્ઝરી ફેસડેસ સુધી—અમે કુદરતી પથ્થરને કાલાતીત સ્થાપત્ય કલામાં રૂપાંતરિત કરીએ છીએ.",
      benefits: {
        quarry: "સીધા ક્વોરી સોર્સિંગ (વચેટિયા વગર)",
        cnc: "સીએનસી અને વોટરજેટ સબ-મીમી ચોકસાઈ",
        panIndia: "સમગ્ર ભારતમાં ડિલિવરી અને ઇન્સ્ટોલેશન",
        support: "ડિઝાઇનથી ફિટિંગ સુધી સંપૂર્ણ સપોર્ટ",
      },
      exploreProjects: "300+ પૂર્ણ પ્રોજેક્ટ્સ જુઓ",
    },
    form: {
      title: "અંદાજ / ક્વોટેશન માટે વિનંતી",
      step1: "ભાગ 1/2: પથ્થરની જરૂરિયાતો",
      step1Short: "1. પથ્થરની જરૂરિયાત",
      step2: "ભાગ 2/2: સંપર્ક અને સમયરેખા",
      step2Short: "2. સમયરેખા અને વિગતો",
      selectProducts: "પથ્થર ઉત્પાદનો પસંદ કરો",
      clear: "સાફ કરો",
      selectedCount: "{{count}} પસંદ કરેલ",
      tapHint: "પસંદ કરવા અથવા દૂર કરવા માટે કોઈપણ ઉત્પાદન પર ટેપ કરો",
      selectAll: "બધા પસંદ કરો ({{count}})",
      spaceType: "પ્રોજેક્ટ સ્પેસ પ્રકાર",
      descPlaceholder:
        "પરિમાણો, દિવાલનું કદ અથવા વિગતો (દા.ત., લિવિંગ રૂમ ટીવી વોલ 12×10 ફૂટ, સ્લેટ ગ્રેમાં એલિવેશન)...",
      ideas: "વિચારો:",
      uploadLabel: "સાઇટ ફોટા / સીએડી ડ્રોઇંગ અપલોડ કરો (મહત્તમ 10):",
      filesCount: "{{count}}/10 ફાઇલો",
      uploadPrompt: "સાઇટ ફોટા, સ્કેચ અથવા સીએડી ડ્રોઇંગ અપલોડ કરવા ટેપ કરો",
      compressing: "ફોટા પ્રોસેસ થઈ રહ્યા છે...",
      continueBtn: "આગળ વધો (પગલું 2/2): ડિલિવરી અને સંપર્ક વિગતો",
      continueBtnShort: "પગલું 2/2 પર જાઓ",
      selectedLabel: "પસંદ કરેલ:",
      noneSelected: "કોઈ પસંદ કરેલ નથી",
      editStep1: "સંપાદિત કરો (1/2)",
      contactTitle: "સંપર્ક અને પ્રોજેક્ટ સમયરેખા:",
      yourRole: "તમારી ભૂમિકા / ઓળખ",
      selectOne: "એક પસંદ કરો",
      fullName: "તમારું પૂરું નામ",
      whatsappNumber: "વોટ્સએપ નંબર દાખલ કરો:",
      projectCity: "પ્રોજેક્ટ શહેર / સ્થળ",
      cityPlaceholder: "દા.ત. અમદાવાદ, જયપુર, સુરત",
      emailOptional: "ઇમેઇલ (વૈકલ્પિક)",
      requiredDate: "જરૂરી પૂર્ણતા તારીખ:",
      pickFromCalendar: "કેલેન્ડરમાંથી પસંદ કરો",
      instantWhatsappOption: "ત્વરિત વોટ્સએપ અંદાજ વિકલ્પ:",
      instantWhatsappDesc:
        "ઝડપી ભાવ અને સ્લેબ ફોટા મેળવવા માટે તમારી જરૂરિયાતો સીધા અમારા મુખ્ય આર્કિટેક્ટને વોટ્સએપ પર મોકલો:",
      sendWhatsappBtn: "વોટ્સએપ પર મોકલો (+91 77420 90866)",
      backBtn: "પાછા (1/2)",
      back: "પાછા",
      submitting: "વિનંતી સબમિટ થઈ રહી છે...",
      submitBtn: "અંદાજ મેળવો",
      trustNote: "ત્વરિત અંદાજ અને વિગતો વોટ્સએપ પર મોકલવામાં આવશે",
    },
    gallery: {
      title: "લાઇવ ઇન્સ્ટોલેશન્સ અને પૂર્ણ કાર્યો",
      requestEstimate: "આ ફિનિશ માટે અંદાજનો અનુરોધ કરો",
      approvals: "આર્કિટેક્ચરલ મંજૂરીઓ",
    },
    showcase: {
      portfolioBadge: "આર્કિટેક્ચરલ એટલિયર પોર્ટફોલિયો",
      directMine: "સીધા ખાણ સ્ત્રોત · સબ-મિલીમીટર ચોકસાઈ",
      title: "ક્યુરેટેડ કુદરતી પથ્થર સંગ્રહ",
      subtitle:
        "દુર્લભ અર્ધ-પારદર્શક અકીક અને 5-એક્સિસ સીએનસી મંદિર કોતરણીથી લઈને લવચીક સ્ટોન વિનિયર અને ઇટાલિયન માર્બલ સુધી. વિલા, એસ્ટેટ અને પવિત્ર સ્થાપત્ય માટે વિશેષ રૂપથી નિર્મિત.",
      tabs: {
        all: "બધા સંગ્રહો",
        facade: "ફેસડેસ અને વિનિયર્સ",
        sacred: "મંદિરો અને ઇનલે",
        surfaces: "ફ્લોરિંગ અને મોનોલિથ્સ",
        exotic: "રત્નો અને આઉટડોર",
      },
      selectForEstimate: "અંદાજ માટે પસંદ કરો",
      selected: "અંદાજ માટે પસંદ કરેલ ✓",
      inquireWhatsapp: "વોટ્સએપ પર પૂછો",
      getEstimate: "અંદાજ મેળવો →",
      viewInForm: "ફોર્મમાં જુઓ →",
      viewSpecs: "તકનીકી વિગતો જુઓ",
      hideSpecs: "તકનીકી વિગતો છુપાવો",
      sampleBoxQuestion: "શું તમને આ પ્રોડક્ટ માટે સેમ્પલ બોક્સ અથવા ડ્રાય-લે પ્રૂફ જોઈએ છે?",
      directMineNote: "ઝીરો ડિસ્ટ્રિબ્યુટર માર્કઅપ સાથે સીધું ખાણ પ્રમાણપત્ર",
      specsHeaders: {
        thickness: "પ્રમાણભૂત જાડાઈ અને ફોર્મેટ્સ",
        dimensions: "પ્રમાણભૂત પરિમાણો",
        weight: "માળખાકીય વજન",
        finishes: "ઉપલબ્ધ સપાટી પૂર્ણાહુતિ",
        applications: "ભલામણ કરેલ સ્થાપત્ય એપ્લિકેશન્સ",
        quarry: "ખાણ અને પ્રાદેશિક મૂળ",
      },
    },
    whyUs: {
      title: "ચોકસાઈ, વારસો અને પારદર્શિતા પર આધારિત",
      p1Title: "સીધા ક્વોરી સોર્સિંગ",
      p1Desc:
        "કોઈ વચેટિયા કે ડીલર કમિશન નહીં. અમે રાજસ્થાન અને વૈશ્વિક કેન્દ્રોથી સીધા બ્લોક્સ મેળવીએ છીએ.",
      p2Title: "સબ-મિલીમીટર સીએનસી કટીંગ",
      p2Desc:
        "હાઇ-પ્રેશર 5-એક્સિસ સીએનસી વોટરજેટ 0.5 મીમી કરતાં ઓછી જોઈન્ટ ટોલરન્સ સુનિશ્ચિત કરે છે.",
      p3Title: "વોટ્સએપ પ્રોગ્રેસ અપડેટ્સ",
      p3Desc:
        "તમારા સ્ટોન બ્લોક્સ, ડ્રાય-લે મેચિંગ અને પેકિંગના ફોટા અને વીડિયો રીઅલ-ટાઇમમાં વોટ્સએપ પર મેળવો.",
      p4Title: "નિકાસ-ગુણવત્તા શૂન્ય-નુકસાન ક્રેટિંગ",
      p4Desc:
        "દરેક શિપમેન્ટને ઇપીઇ શોક ફોમમાં પેક કરી 100% ટ્રાન્ઝિટ કવરેજ સાથે એક્સપોર્ટ વુડન ક્રેટ્સમાં મોકલવામાં આવે છે.",
    },
    contact: {
      title: "અમારો સંપર્ક કેવી રીતે કરવો?",
      subtitle:
        "અમારા પથ્થર નિષ્ણાતો સાથે સીધા જોડાઓ, ફેક્ટરી ડ્રાય-લે માર્ગદર્શન મેળવો અથવા અમારા અમદાવાદ એક્સપિરિયન્સ સેન્ટરની મુલાકાત લો.",
      googleVerified: "ગૂગલ વેરિફાઇડ બિઝનેસ",
      connectWhatsapp: "સીધા વોટ્સએપ પર જોડાઓ",
      chatAtelier: "અમારી એટલિયર ટીમ સાથે સીધી વાતચીત",
      tapToChat: "વોટ્સએપ પર ચેટ કરવા માટે ટેપ કરો",
      showroomTitle: "શોરૂમ અને સ્ટુડિયોનું સરનામું",
      experienceCenter: "અમદાવાદ એક્સપિરિયન્સ સેન્ટર",
      experienceCenterAddress:
        "E-02, ગ્રાઉન્ડ ફ્લોર, ધ ફેસ્ટિવલ રેસિડેન્સી સામે, એસજી બિઝનેસ હબ, વસંત નગર, ગોટા, અમદાવાદ, ગુજરાત, પિન કોડ: 380060",
      getDirections: "ગૂગલ મેપ્સ પર દિશા મેળવો",
      emailCorrespondence: "ઇમેઇલ પત્રવ્યવહાર",
      emailInquiries: "સ્થાપત્ય પૂછપરછ અને ટેન્ડરો",
      officialInquiries: "સત્તાવાર પૂછપરછ:",
      studioHours: "સ્ટુડિયો કલાકો: સોમ – શનિ, 10:00 AM – 7:30 PM",
      sendRfq: "ઇમેઇલ દ્વારા આર્કિટેક્ચરલ RFQ મોકલો",
      reviewsTitle: "ગ્રાહક પ્રતિસાદ અને 5-સ્ટાર સમીક્ષાઓ:",
      topRated: "5.0 ★ ટોપ રેટેડ એટલિયર",
      callWhatsapp: "ડાયરેક્ટ વોટ્સએપ અને કૉલ",
      emailSupport: "ઇમેઇલ સપોર્ટ",
      businessHours: "સોમવાર – શનિવાર: 9:30 AM – 7:30 PM",
    },
    mobileBar: {
      whatsapp: "વોટ્સએપ",
      freeEstimate: "મફત અંદાજ",
    },
    success: {
      title: "પૂછપરછ પ્રાપ્ત થઈ!",
      thankYou: "આભાર, {{name}}. અમે તમારી પથ્થરની જરૂરિયાતો નોંધી લીધી છે.",
      refNumber: "પૂછપરછ સંદર્ભ નંબર",
      refNote: "ત્વરિત ટ્રેકિંગ અને ડિસ્પેચ અપડેટ્સ માટે આ સંદર્ભ કોડ સાચવો.",
      whatsappSent: "સ્વચાલિત વોટ્સએપ અપડેટ {{phone}} પર મોકલેલ છે",
      whatsappDesc:
        "અમારી સિસ્ટમ તમારો સ્ટોન અંદાજ તૈયાર કરી રહી છે. ઝડપી ભાવ અને હાઇ-રેસ સ્લેબ ફોટા મેળવવા માટે અમારા મુખ્ય આર્કિટેક્ટ સાથે સીધા વોટ્સએપ પર જોડાઓ:",
      openWhatsapp: "વોટ્સએપ ખોલો અને હમણાં ચેટ કરો",
      visitCenter: "અમારા સ્ટોન એક્સપિરિયન્સ સેન્ટરની મુલાકાત લો",
      onGoogle: "ગૂગલ પર {{rating}}",
      touchFeel:
        "200+ લાઇવ સ્લેબ, 3D એલિવેશન ક્લેડીંગ અને લવચીક સ્ટોન વિનિયર ઇન્સ્ટોલેશન્સનો અનુભવ કરો.",
      getDirections: "ગૂગલ મેપ્સ પર ચોક્કસ દિશા મેળવો",
      submitAnother: "અન્ય પ્રોજેક્ટ જરૂરિયાત સબમિટ કરો",
    },
    errors: {
      selectProduct: "કૃપા કરીને ઓછામાં ઓછું એક પથ્થર ઉત્પાદન પસંદ કરો.",
      selectSpace: "કૃપા કરીને તમારા પ્રોજેક્ટની જગ્યાનો પ્રકાર પસંદ કરો.",
      enterName: "કૃપા કરીને તમારું પૂરું નામ દાખલ કરો.",
      validWhatsapp: "કૃપા કરીને માન્ય વોટ્સએપ નંબર દાખલ કરો (ઓછામાં ઓછા 7 અંક).",
      enterCity: "કૃપા કરીને તમારા પ્રોજેક્ટનું શહેર અથવા સ્થળ દાખલ કરો.",
      pickDate: "કૃપા કરીને કેલેન્ડરમાંથી તમારી જરૂરી પૂર્ણતા તારીખ પસંદ કરો.",
      maxPhotos: "તમે મહત્તમ 10 ફોટા અપલોડ કરી શકો છો.",
      invalidFileType: "{{filename}} ફોટો અથવા પીડીએફ ફાઇલ નથી.",
      inquirySuccessToast:
        "પૂછપરછ સફળતાપૂર્વક પ્રાપ્ત થઈ! અમારા પથ્થર નિષ્ણાત ટૂંક સમયમાં વોટ્સએપ પર તમારો સંપર્ક કરશે.",
    },
  },
} as const;

// -------------------------------------------------------------
// LOCALIZED PRODUCT CATALOG (29 Master Products)
// -------------------------------------------------------------
const HINDI_PRODUCT_MAP: Record<string, { name: string; tagline: string }> = {
  italian_marble_slabs: {
    name: "इटैलियन मार्बल स्लैब",
    tagline: "विला और लॉबी के लिए लग्जरी बुकमैच्ड आयातित इटैलियन मार्बल स्लैब",
  },
  indian_marble_slabs: {
    name: "भारतीय मार्बल स्लैब",
    tagline: "शुद्ध मकराना, अंबाजी व्हाइट और प्रीमियम भारतीय मार्बल स्लैब",
  },
  granite_slabs: {
    name: "ग्रेनाइट स्लैब",
    tagline: "अत्यधिक टिकाऊ और वास्तुशिल्प प्राकृतिक ग्रेनाइट स्लैब",
  },
  limestone_slabs: {
    name: "लाइमस्टोन स्लैब",
    tagline: "बाहरी एलिवेशन के लिए नेचुरल क्लेफ्ट और कैलिब्रेटेड कोटा व चूना पत्थर",
  },
  cobblestone: {
    name: "कोबलस्टोन (कंकड़ पत्थर)",
    tagline: "ड्राइववे और रास्तों के लिए हेवी-ड्यूटी प्राकृतिक पत्थर",
  },
  pebblestone: {
    name: "पेबलस्टोन (गोल कंकड़)",
    tagline: "पॉलिश नदी के कंकड़ और लैंडस्केपिंग पत्थर",
  },
  boulders: {
    name: "प्राकृतिक बोल्डर",
    tagline: "गार्डन व लैंडस्केप के लिए विशाल प्राकृतिक शैल खंड",
  },
  sculptures: {
    name: "पत्थर की मूर्तियां व शिल्प",
    tagline: "हाथ से तराशी गई वास्तुशिल्प मूर्तियां और कलाकृतियां",
  },
  custom_stone_basins: {
    name: "कस्टम स्टोन वॉशबेसिन",
    tagline: "हाथ से तराशे गए प्राकृतिक पत्थर के वैनिटी बाउल और बेसिन",
  },
  agate_stone_articles: {
    name: "एगेट स्टोन कलाकृतियां",
    tagline: "दुर्लभ अर्ध-कीमती एगेट आर्टिफैक्ट्स और लक्जरी सजावट",
  },
  waterfall: {
    name: "वाटरफॉल (कृत्रिम झरना)",
    tagline: "प्राकृतिक पत्थर के वास्तुशिल्प जलप्रपात व फाउंटेन",
  },
  fountain: {
    name: "फव्वारा (फाउंटेन)",
    tagline: "क्लासिकल और आधुनिक हाथ से नक्काशीदार फव्वारे",
  },
  temple_work_handcrafting: {
    name: "मंदिर निर्माण व हस्तशिल्प",
    tagline: "पवित्र मंदिर वास्तुकला, नक्काशीदार स्तंभ और जालियां",
  },
  natural_stone_cladding_tiles: {
    name: "नेचुरल स्टोन क्लैडिंग टाइल्स",
    tagline: "दीवार क्लैडिंग और बाहरी एलिवेशन के लिए सटीक कटी हुई टाइलें",
  },
  natural_stone_interlocking_panels: {
    name: "इंटरलॉकिंग स्टोन पैनल्स",
    tagline: "सीमलेस 3D टेक्सचर्ड लेजस्टोन और इंटरलॉकिंग एलिवेशन पैनल्स",
  },
  natural_stone_mosaics: {
    name: "नेचुरल स्टोन मोज़ेक",
    tagline: "ज्यामितीय मोज़ेक पैटर्न और हस्तनिर्मित मेश टाइलें",
  },
  stone_murals: {
    name: "स्टोन म्यूरल्स व जाली",
    tagline: "सीएनसी 3D नक्काशीदार मंदिर, कलात्मक जालियां व वॉल स्कल्पचर्स",
  },
  inlay_work: {
    name: "पिएत्रा ड्यूरा इनले कार्य",
    tagline: "वॉटरजेट मेडालियन, फ्लोर इनले व ब्रास बॉर्डर",
  },
  table_top: {
    name: "स्टोन टेबल टॉप व काउंटर",
    tagline: "डाइनिंग टेबल, किचन वॉटरफॉल आइलैंड और वैनिटी टॉप",
  },
  custom_stone_cladding: {
    name: "कस्टम स्टोन क्लैडिंग",
    tagline: "बाहरी फसाड और आंतरिक 3D टेक्सचर्ड एक्सेंट दीवारें",
  },
  crazy_pattern_in_stone: {
    name: "क्रेजी पैटर्न स्टोन पेविंग",
    tagline: "कलात्मक अनियमित प्राकृतिक पत्थर पेविंग",
  },
  general_flooring: {
    name: "जनरल स्टोन फ्लोरिंग",
    tagline: "सटीक कैलिब्रेटेड प्राकृतिक पत्थर फ्लोरिंग स्लैब",
  },
  custom_flooring: {
    name: "कस्टम फ्लोरिंग (लक्जरी)",
    tagline: "आयातित इटैलियन मार्बल, ग्रेनाइट और ड्राई-ले वेन मैचिंग",
  },
  stepping_stone: {
    name: "स्टेपिंग स्टोन (गार्डन पेवर)",
    tagline: "गार्डन पाथवे, फ्लैगस्टोन और पेवर्स",
  },
  stone_veneer: {
    name: "स्टोन विनियर (लचीली शीट)",
    tagline: "दीवारों, छत और फर्नीचर के लिए अल्ट्रा-पतली लचीली स्लेट शीट",
  },
  clay_veneers: {
    name: "क्ले विनियर (टेराकोटा शीट)",
    tagline: "पर्यावरण-अनुकूल लचीले मिट्टी के वॉल कवरिंग",
  },
  pu_panels: {
    name: "पीयू स्टोन पैनल्स (लाइटवेट)",
    tagline: "अल्ट्रा-लाइटवेट हाई-डेफिनिशन फॉक्स स्टोन पैनल्स",
  },
  stone_veneer_artwork: {
    name: "स्टोन विनियर आर्टवर्क",
    tagline: "बैकलिट कलात्मक पारभासी स्टोन विनियर कंपोजिशन",
  },
  agate_slabs: {
    name: "एगेट स्लैब (बैकलिट क्वार्ट्ज)",
    tagline: "बार काउंटर और फ़ोयर के लिए बैकलिट सेमी-प्रेशियस स्लैब",
  },
};

const GUJARATI_PRODUCT_MAP: Record<string, { name: string; tagline: string }> = {
  italian_marble_slabs: {
    name: "ઇટાલિયન માર્બલ સ્લેબ",
    tagline: "વિલા અને લૉબી માટે લક્ઝરી બુકમેચ્ડ ઇટાલિયન માર્બલ સ્લેબ",
  },
  indian_marble_slabs: {
    name: "ભારતીય માર્બલ સ્લેબ",
    tagline: "શુદ્ધ મકરાણા, અંબાજી વ્હાઇટ અને પ્રીમિયમ ભારતીય માર્બલ સ્લેબ",
  },
  granite_slabs: {
    name: "ગ્રેનાઇટ સ્લેબ",
    tagline: "ઉચ્ચ ટકાઉપણું ધરાવતા કુદરતી ગ્રેનાઇટ સ્લેબ",
  },
  limestone_slabs: {
    name: "લાઇમસ્ટોન સ્લેબ (કોટા સ્ટોન)",
    tagline: "બહારના એલિવેશન માટે નેચરલ ક્લેફ્ટ અને કેલિબ્રેટેડ લાઇમસ્ટોન",
  },
  cobblestone: {
    name: "કોબલસ્ટોન",
    tagline: "ડ્રાઇવવે અને પાથવે માટે હેવી-ડ્યુટી કુદરતી પથ્થર",
  },
  pebblestone: {
    name: "પેબલસ્ટોન (ગોળ કાંકરા)",
    tagline: "પોલિશ્ડ રિવર પેબલ્સ અને લેન્ડસ્કેપિંગ પત્થરો",
  },
  boulders: {
    name: "નેચરલ બોલ્ડર્સ",
    tagline: "ગાર્ડન લેન્ડસ્કેપ માટે મોટા કુદરતી શિલાખંડો",
  },
  sculptures: {
    name: "પથ્થરના શિલ્પો અને મૂર્તિઓ",
    tagline: "હાથેથી કોતરેલી ભવ્ય મૂર્તિઓ અને આર્ટિસ્ટિક શિલ્પો",
  },
  custom_stone_basins: {
    name: "કસ્ટમ સ્ટોન વોશબેસિન",
    tagline: "હાથેથી કોતરેલા નેચરલ સ્ટોન બેસિન અને વેનિટી બાઉલ",
  },
  agate_stone_articles: {
    name: "એગેટ સ્ટોન આર્ટિકલ્સ",
    tagline: "દુર્લભ અર્ધ-કિંમતી એગેટ આર્ટિફેક્ટ્સ અને લક્ઝરી ડેકોર",
  },
  waterfall: {
    name: "વોટરફોલ (કૃત્રિમ ઝરણું)",
    tagline: "નેચરલ સ્ટોન આર્કિટેક્ચરલ વોટરફોલ અને ફુવારા",
  },
  fountain: {
    name: "ફાઉન્ટેન (ફુવારો)",
    tagline: "ક્લાસિકલ અને આધુનિક પથ્થરના ફુવારા",
  },
  temple_work_handcrafting: {
    name: "મંદિર નિર્માણ અને હસ્તકલા",
    tagline: "પવિત્ર મંદિર સ્થાપત્ય, નકશીદાર સ્તંભો અને જાળીઓ",
  },
  natural_stone_cladding_tiles: {
    name: "નેચરલ સ્ટોન ક્લેડીંગ ટાઇલ્સ",
    tagline: "દિવાલ ક્લેડીંગ અને એલિવેશન માટે ચોકસાઈથી કાપેલી ટાઇલ્સ",
  },
  natural_stone_interlocking_panels: {
    name: "ઇન્ટરલોકિંગ સ્ટોન પેનલ્સ",
    tagline: "સીમલેસ 3D ટેક્ષ્ચર લેજસ્ટોન અને ઇન્ટરલોકિંગ પેનલ્સ",
  },
  natural_stone_mosaics: {
    name: "નેચરલ સ્ટોન મોઝેક",
    tagline: "ભૌમિતિક મોઝેક પેટર્ન અને હાથથી બનાવેલી મેશ ટાઇલ્સ",
  },
  stone_murals: {
    name: "સ્ટોન મ્યુરલ્સ અને જાળી",
    tagline: "સીએનસી 3D નકશીદાર મંદિર, જાળીઓ અને વોલ સ્કલ્પચર્સ",
  },
  inlay_work: {
    name: "ઇનલે વર્ક (પિયેટ્રા ડ્યુરા)",
    tagline: "વોટરજેટ મેડાલિયન, ફ્લોર ઇનલે અને બ્રાસ બોર્ડર્સ",
  },
  table_top: {
    name: "ટેબલ ટોપ અને કાઉન્ટર",
    tagline: "ડાઇનિંગ ટેબલ, કિચન આઇલેન્ડ અને સ્ટોન વેનિટી ટોપ",
  },
  custom_stone_cladding: {
    name: "કસ્ટમ સ્ટોન ક્લેડીંગ",
    tagline: "બહારના એલિવેશન અને આંતરિક 3D ફીચર વોલ્સ",
  },
  crazy_pattern_in_stone: {
    name: "ક્રેઝી પેટર્ન સ્ટોન ફ્લોરિંગ",
    tagline: "આર્ટિઝનલ અનિયમિત ફ્લેગસ્ટોન પેવિંગ",
  },
  general_flooring: {
    name: "જનરલ સ્ટોન ફ્લોરિંગ",
    tagline: "ચોકસાઈપૂર્વક કેલિબ્રેટેડ નેચરલ સ્ટોન ફ્લોરિંગ",
  },
  custom_flooring: {
    name: "કસ્ટમ ફ્લોરિંગ (લક્ઝરી)",
    tagline: "આયાતી ઇટાલિયન માર્બલ અને ડ્રાય-લે વેઇન મેચિંગ",
  },
  stepping_stone: {
    name: "સ્ટેપિંગ સ્ટોન (ગાર્ડન પાથવે)",
    tagline: "બગીચાના રસ્તાઓ માટે કુદરતી ફ્લેગસ્ટોન અને પેવર્સ",
  },
  stone_veneer: {
    name: "સ્ટોન વિનિયર (ફ્લેક્સિબલ શીટ)",
    tagline: "દિવાલો, છત અને ફર્નિચર માટે અલ્ટ્રા-પાતળી ફ્લેક્સિબલ શીટ્સ",
  },
  clay_veneers: {
    name: "ક્લે વિનિયર (ટેરાકોટા)",
    tagline: "ઇકો-ફ્રેન્ડલી ફ્લેક્સિબલ ક્લે વોલ કવરિંગ્સ",
  },
  pu_panels: {
    name: "પીયુ પેનલ્સ (હળવા વજનના)",
    tagline: "અલ્ટ્રા-લાઇટવેઇટ હાઇ-ડેફિનેશન ફોક્સ સ્ટોન પેનલ્સ",
  },
  stone_veneer_artwork: {
    name: "સ્ટોન વિનિયર આર્ટવર્ક",
    tagline: "બેકલીટ આર્ટિસ્ટિક સ્ટોન વિનિયર કમ્પોઝિશન",
  },
  agate_slabs: {
    name: "એગેટ સ્લેબ (બેકલીટ ક્વાર્ટ્ઝ)",
    tagline: "બાર કાઉન્ટર અને ફોયર માટે બેકલીટ સેમી-પ્રેશિયસ સ્લેબ",
  },
};

// -------------------------------------------------------------
// LOCALIZED SPACE TYPES
// -------------------------------------------------------------
const SPACE_TYPES_HI: Record<string, string> = {
  "Bungalow / Villa": "बंगला / विला",
  "Apartment / Flat": "अपार्टमेंट / फ्लैट",
  "Commercial Office": "कमर्शियल ऑफिस",
  "Hotel / Resort": "होटल / रिसॉर्ट",
  "Temple / Mandir": "मंदिर / पूजा स्थल",
  Farmhouse: "फार्महाउस",
  "Restaurant / Cafe": "रेस्तरां / कैफे",
  "Showroom / Retail": "शोरूम / रिटेल स्टोर",
  Other: "अन्य",
};

const SPACE_TYPES_GU: Record<string, string> = {
  "Bungalow / Villa": "બંગલો / વિલા",
  "Apartment / Flat": "એપાર્ટમેન્ટ / ફ્લેટ",
  "Commercial Office": "કોમર્શિયલ ઑફિસ",
  "Hotel / Resort": "હોટેલ / રિસોર્ટ",
  "Temple / Mandir": "મંદિર / પૂજા સ્થળ",
  Farmhouse: "ફાર્મહાઉસ",
  "Restaurant / Cafe": "રેસ્ટોરન્ટ / કાફે",
  "Showroom / Retail": "શોરૂમ / રિટેલ",
  Other: "અન્ય",
};

// -------------------------------------------------------------
// LOCALIZED CUSTOMER PERSONAS / ROLES
// -------------------------------------------------------------
const ROLES_HI: Record<string, string> = {
  "Owner / Homeowner": "मालिक / गृहस्वामी",
  Architect: "आर्किटेक्ट",
  "Interior Designer": "इंटीरियर डिजाइनर",
  "Contractor / Builder": "ठेकेदार / बिल्डर",
  Other: "अन्य",
};

const ROLES_GU: Record<string, string> = {
  "Owner / Homeowner": "માલિક / ઘરમાલિક",
  Architect: "આર્કિટેક્ટ",
  "Interior Designer": "ઇન્ટિરિયર ડિઝાઇનર",
  "Contractor / Builder": "કોન્ટ્રાક્ટર / બિલ્ડર",
  Other: "અન્ય",
};

// -------------------------------------------------------------
// LOCALIZED LUXURY SHOWCASE DATA
// -------------------------------------------------------------
const LUXURY_SHOWCASE_HI: Record<
  string,
  {
    name: string;
    categoryLabel: string;
    tagline: string;
    luxurySubtitle: string;
    description: string;
    badge: string;
    specs: {
      thickness: string;
      dimensions: string;
      weight?: string;
      finishes: string[];
      applications: string[];
      quarryOrigin: string;
    };
    highlights: string[];
  }
> = {
  stone_veneer: {
    name: "स्टोन विनियर",
    categoryLabel: "फ्लेक्सिबल और लाइटवेट",
    tagline: "दीवारों, छत और फर्नीचर के लिए अल्ट्रा-पतली लचीली स्लेट व क्वार्टजाइट शीट",
    luxurySubtitle:
      "1.5–2 मिमी तराशा गया प्राकृतिक पत्थर · घुमावदार स्तंभों व ऊंची छतों पर आसानी से मुड़े",
    description:
      "वास्तविक प्राकृतिक स्लेट और क्वार्टजाइट को एयरोस्पेस-ग्रेड फाइबरग्लास रेजिन के साथ सुदृढ़ किया गया है। यह 1.8 किग्रा/वर्गमीटर से कम वजन में प्राकृतिक पत्थर की समृद्ध बनावट प्रदान करता है।",
    badge: "वास्तुशिल्प नवाचार",
    specs: {
      thickness: "1.5 मिमी – 2.0 मिमी अल्ट्रा-स्लिम",
      dimensions: "1220 × 610 मिमी · जंबो 2440 × 1220 मिमी",
      weight: "लगभग 1.5 – 1.8 किग्रा / वर्गमीटर",
      finishes: ["नेचुरल 3D रिवेन", "ट्रांसलूसेंट (बैकलिट)", "नैनो-सील्ड मैट"],
      applications: [
        "घुमावदार स्तंभ",
        "लिविंग रूम टीवी दीवार",
        "लक्जरी किचन कैबिनेट",
        "होटल लिफ्ट कैब",
      ],
      quarryOrigin: "राजस्थान, भारत (देवली व भीलवाड़ा खदानें)",
    },
    highlights: [
      "100% वास्तविक प्राकृतिक पत्थर की ऊपरी परत",
      "वजन पारंपरिक स्लैब से 90% कम",
      "साधारण बढ़ईगीरी औजारों से कटिंग व इंस्टॉलेशन",
      "बैकलिट विकल्पों के साथ मनमोहक रात्रि प्रकाश",
    ],
  },
  custom_stone_cladding: {
    name: "कस्टम स्टोन क्लैडिंग",
    categoryLabel: "3D एलिवेशन फसाड",
    tagline: "बाहरी एलिवेशन अग्रभाग और आंतरिक 3D टेक्सचर्ड एक्सेंट दीवारें",
    luxurySubtitle: "मशीनी कटी हुई और हाथ से तराशी गई पत्थर की टाइलें · शून्य-अपक्षय बाहरी जीवन",
    description:
      "बाहरी बंगलों और व्यावसायिक अग्रभागों के लिए कैलिब्रेटेड सैंडस्टोन, लाइमस्टोन व ग्रेनाइट टाइलें। शुष्क और आर्द्र दोनों प्रकार के मौसम में यह दशकों तक बिना किसी रंग-परिवर्तन के जीवंत रहता है।",
    badge: "सटीक हस्तशिल्प",
    specs: {
      thickness: "15 मिमी, 20 मिमी, 25 मिमी व 30 मिमी",
      dimensions: "600 × 300 मिमी, 600 × 600 मिमी, कस्टम कट",
      weight: "लगभग 35 – 55 किग्रा / वर्गमीटर",
      finishes: ["शॉट-ब्लास्टेड", "फ्लेम्ड ग्रूव", "रॉक फेस", "सैंडब्लास्टेड मैट"],
      applications: ["विला बाहरी एलिवेशन", "बाउंड्री वॉल", "स्वीमिंग पूल डेक", "प्रवेश लॉबी"],
      quarryOrigin: "धौलपुर, जोधपुर व कोटा, राजस्थान",
    },
    highlights: [
      "कठोर धूप, भारी बारिश और प्रदूषण प्रतिरोधी",
      "सटीक जोड़ संरेखण के साथ निर्बाध स्थापना",
      "विभिन्न प्राकृतिक रंगों व बनावटों में उपलब्ध",
      "थर्मल इन्सुलेशन और ऊर्जा की बचत",
    ],
  },
  temple_work_handcrafting: {
    name: "मंदिर निर्माण व हस्तशिल्प",
    categoryLabel: "पवित्र मंदिर वास्तुकla",
    tagline: "पवित्र मंदिर वास्तुकला, नक्काशीदार स्तंभ, मूर्तियां व जालियां",
    luxurySubtitle: "शुद्ध मकराना संगमरमर व बंसी पहाड़पुर सैंडस्टोन · शास्त्रोक्त पारंपरिक नक्काशी",
    description:
      "तीसरी पीढ़ी के राजस्थानी शिल्पकारों और 5-एक्सिस सीएनसी तकनीक का अनूठा संगम। गर्भगृह, मंडप, नक्काशीदार खंभे और ज्योमेट्रिक जाली स्क्रीन का निर्माण पूरी पवित्रता और सटीकता से किया जाता है।",
    badge: "भव्य पवित्र वास्तुकला",
    specs: {
      thickness: "50 मिमी से 300 मिमी तक ठोस ब्लॉक",
      dimensions: "कस्टम आर्किटेक्चरल ब्लूप्रिंट अनुसार",
      weight: "ठोस संरचनात्मक घनत्व (2650 किग्रा/घनमीटर)",
      finishes: ["हाथ की छैनी नक्काशी", "दर्पण पॉलिश", "पुरातन ब्रश फिनिश"],
      applications: [
        "निजी घर मंदिर",
        "सार्वजनिक मंदिर परिसर",
        "हवेली मेहराब व झरोखा",
        "धार्मिक स्तूप",
      ],
      quarryOrigin: "मकराना (मार्बल) व बंसी पहाड़पुर (सैंडस्टोन), राजस्थान",
    },
    highlights: [
      "तेल, धूप और धुएं के प्रति अत्यधिक प्रतिरोधी मकराना मार्बल",
      "सीएडी ब्लूप्रिंट से 100% सटीक पत्थर तराशी",
      "फैक्ट्री में ड्राई-ले ट्रायल असेंबली पैकेजिंग से पहले",
      "दिव्य मूर्तिकला और वैदिक वास्तुकला के नियमों का पालन",
    ],
  },
  inlay_work: {
    name: "पिएत्रा ड्यूरा इनले कार्य",
    categoryLabel: "रॉयल इनले कला",
    tagline: "वॉटरजेट मेडालियन, फ्लोर इनले, सेमी-प्रेशियस स्टोन व ब्रास बॉर्डर",
    luxurySubtitle: "सब-मिलीमीटर वॉटरजेट कटिंग · शुद्ध पीतल व मदर-ऑफ-पर्ल एक्सेंट्स",
    description:
      "मुगल और इतालवी पिएत्रा ड्यूरा कला का आधुनिक रूप। उच्च दबाव वाले वॉटरजेट से इटैलियन मार्बल, दुर्लभ पत्थरों और पीतल की पट्टियों को 0.2 मिमी की शुद्धता में काटकर आलीशान फ़्लोरिंग तैयार की जाती है।",
    badge: "शाही पिएत्रा ड्यूरा",
    specs: {
      thickness: "18 मिमी – 20 मिमी कैलिब्रेटेड स्लैब",
      dimensions: "गोल मेडालियन (1200–2400 मिमी व्यास), कस्टम कालीन",
      weight: "लगभग 50 – 55 किग्रा / वर्गमीटर",
      finishes: ["डायमंड मिरर पॉलिश", "सैटिन मैट सील"],
      applications: [
        "विला प्रवेश फ़ोयर",
        "होटल लॉबी सेंटरपीस",
        "मास्टर डाइनिंग फ्लोर",
        "पूजा कक्ष मेडालियन",
      ],
      quarryOrigin: "कैरेरा (इटली), मकराना और मकरेडा, भारत",
    },
    highlights: [
      "शून्य-जॉइंट ऑफसेट (<0.2 मिमी) के साथ फ्लश फिट",
      "ठोस पीतल और मदर-ऑफ-पर्ल (सीप) का भव्य समावेश",
      "सरल स्थापना हेतु भारी फाइबरग्लास मेश पर आपूर्ति",
      "औद्योगिक दाग-रोधी बैरियर से पूरी तरह सील",
    ],
  },
  custom_flooring: {
    name: "कस्टम फ्लोरिंग (लक्जरी)",
    categoryLabel: "क्यूरेटेड स्लैब्स व बुकमैचિંગ",
    tagline: "आयातित इटैलियन मार्बल, प्रीमियम ग्रेनाइट और ड्राई-ले वेन मैचिंग",
    luxurySubtitle: "एकल-ब्लॉक स्लैब चयन · गारंटीकृत डायमंड बुकमैचिंग",
    description:
      "कैरेरा, टस्कनी और दक्षिण भारत की खदानों से चुनिंदा स्लैब। हम हमारी फैक्ट्री में व्यापक ड्राई-ले लेआउट स्टेजिंग निष्पादित करते हैं, हर स्लैब की फोटो खींचते हैं ताकि प्राकृतिक नसें बटरफ्लाई पैटर्न में मिलें।",
    badge: "बुकमैच लक्जरी",
    specs: {
      thickness: "18 मिमी व 20 मिमी अंतरराष्ट्रीय मानक",
      dimensions: "जंबो गैंगसॉ स्लैब (2800+ × 1600+ मिमी)",
      weight: "लगभग 50 – 55 किग्रा / वर्गमीटर",
      finishes: ["मिरर ग्लॉस", "लेदर फिनिश", "होन्ड मैट", "एंटीक पेटिना"],
      applications: [
        "विशाल लिविंग रूम",
        "भव्य सीढ़ियां व लैंडिंग",
        "प्रीमियम हॉलवे",
        "लक्जरी बाथरूम फ्लोर",
      ],
      quarryOrigin: "इटली, ग्रीस, वियतनाम और भारत",
    },
    highlights: [
      "एक ही ब्लॉक से लगातार स्लैब ताकि रंग व पैटर्न समान रहे",
      "डिलीवरी से पहले फैक्ट्री में पूर्ण फ्लोर ड्राई-ले पूर्वावलोकन",
      "एपॉक्सी बैक-मेशिंग द्वारा बढ़ी हुई संरचनात्मक शक्ति",
      "अत्यधिक टिकाऊ और पीढ़ियों तक चमक बरकरार रखने वाला",
    ],
  },
  stone_murals: {
    name: "स्टोन म्यूरल्स व जाली",
    categoryLabel: "3D रिलीफ म्यूरल्स",
    tagline: "सीएनसी 3D नक्काशीदार कला, फ्लोरल वॉल आर्ट व नक्काशीदार स्क्रीन",
    luxurySubtitle: "मल्टी-डेप्थ 3D रिलीफ नक्काशी · प्राकृतिक पत्थर की मूर्तिकला",
    description:
      "प्राकृतिक सैंडस्टोन, ट्रैवर्टीन व चूना पत्थर पर सीएनसी और हस्तशिल्प से उकेरी गई त्रि-आयामी कला। चाहे वह प्रकृति के दृश्य हों, देव प्रतिमाएं या समकालीन ज्यामितीय आकृतियां, यह हर दीवार को जीवंत बनाती हैं।",
    badge: "3D नक्काशीदार कला",
    specs: {
      thickness: "30 मिमी, 50 मिमी, 75 मिमी व 100 मिमी",
      dimensions: "पैनल आकार 1200 × 600 मिमी से 2400 × 1200 मिमी या निरंतर दीवार",
      weight: "लगभग 65 – 120 किग्रा / वर्गमीटर",
      finishes: ["मल्टी-टोन रिवेन", "सैंडब्लास्टेड टेक्सचर", "हस्तशिल्प छेनी फिनिश"],
      applications: [
        "ड्राइंग रूम फीचर वॉल",
        "प्रवेश द्वार मेहराब",
        "कोर्टयार्ड बैकड्रॉप",
        "होटल रिसेप्शन",
      ],
      quarryOrigin: "राजस्थान की प्रीमियम सैंडस्टोन व मार्बल खदानें",
    },
    highlights: [
      "उभरी हुई 3D गहराई जो प्रकाश और छाया का सुंदर प्रभाव बनाती है",
      "क्लाइंट के ब्लूप्रिंट या 3D रेंडर से 100% अनुकूलन",
      "आंतरिक और बाहरी दोनों वातावरण के लिए उपयुक्त",
      "दीवार पर सुरक्षित माउंटिंग के लिए हिडन ब्रैकेट सिस्टम",
    ],
  },
  agate_slabs: {
    name: "एगेट स्लैब (बैकलिट)",
    categoryLabel: "ट्रांसलूसेंट बैकलाइट स्लैब्स",
    tagline: "बार काउंटर, पूजा घर और फ़ोयर के लिए बैकलिट सेमी-प्रेशियस स्लैब",
    luxurySubtitle: "प्राकृतिक अर्ध-कीमती रत्न खंड · जब पीछे से प्रकाश पड़े तो जादुई चमक",
    description:
      "प्राकृतिक एगेट, क्वार्ट्ज और अमेथिस्ट पत्थरों को पारदर्शी रेजिन में जोड़कर बनाए गए अल्ट्रा-लक्जरी स्लैब। जब इसके पीछे एलईडी लाइट जलाई जाती है, तो पत्थर के क्रिस्टल मनमोहक रंग और चमक बिखेरते हैं।",
    badge: "दुर्लभ रत्न स्लैब",
    specs: {
      thickness: "20 मिमी (ठोस या बैक-लाइट ग्लास सपोर्टेड)",
      dimensions: "2400 × 1200 मिमी मानक स्लैब, कस्टम काउंटर आकार",
      weight: "लगभग 55 किग्रा / वर्गमीटर",
      finishes: ["अल्ट्रा-ग्लॉस डायमंड पॉलिश"],
      applications: [
        "लक्जरी बार काउंटर",
        "बैकलिट वैनिटी टॉप",
        "पूजा कक्ष पृष्ठभूमि",
        "स्टेटमेंट वॉल फीचर",
      ],
      quarryOrigin: "ब्राजील, मेडागास्कर और भारत",
    },
    highlights: [
      "100% वास्तविक प्राकृतिक सेमी-प्रेशियस रत्न क्रिस्टल",
      "एलईडी लाइट के साथ शानदार पारभासी चमक",
      "गर्मी, दाग और खरोंच प्रतिरोधी सतह",
      "दुनिया के सबसे प्रतिष्ठित प्रोजेक्ट्स के लिए पसंद",
    ],
  },
};

const LUXURY_SHOWCASE_GU: Record<
  string,
  {
    name: string;
    categoryLabel: string;
    tagline: string;
    luxurySubtitle: string;
    description: string;
    badge: string;
    specs: {
      thickness: string;
      dimensions: string;
      weight?: string;
      finishes: string[];
      applications: string[];
      quarryOrigin: string;
    };
    highlights: string[];
  }
> = {
  stone_veneer: {
    name: "સ્ટોન વિનિયર (ફ્લેક્સિબલ)",
    categoryLabel: "હળવા વજન અને લવચીક",
    tagline: "દિવાલો, છત અને ફર્નિચર માટે અલ્ટ્રા-પાતળી ફ્લેક્સિબલ શીટ્સ",
    luxurySubtitle: "1.5–2 મીમી કુદરતી પથ્થર · વક્ર સ્તંભો અને ઊંચી છત પર સરળતાથી વળે",
    description:
      "વાસ્તવિક નેચરલ સ્લેટ અને ક્વાર્ટઝાઇટને એરોસ્પેસ-ગ્રેડ ફાઇબરગ્લાસ રેઝિન સાથે મજબૂત બનાવવામાં આવી છે. 1.8 કિગ્રા/ચો.મી. કરતાં ઓછા વજનમાં કુદરતી પથ્થરનો અદ્ભુત સ્પર્શ અને ટેક્ષ્ચર આપે છે.",
    badge: "આર્કિટેક્ચરલ ઇનોવેશન",
    specs: {
      thickness: "1.5 મીમી – 2.0 મીમી અલ્ટ્રા-સ્લિમ",
      dimensions: "1220 × 610 મીમી · જમ્બો 2440 × 1220 મીમી",
      weight: "આશરે 1.5 – 1.8 કિગ્રા / ચો.મી.",
      finishes: ["નેચરલ 3D રીવેન", "ટ્રાન્સલુસન્ટ (બેકલીટ)", "નેનો-સીલ્ડ મેટ"],
      applications: ["વળાંકવાળા સ્તંભો", "લિવિંગ રૂમ ટીવી વોલ", "કિચન કેબિનેટ", "લિફ્ટ કેબિન"],
      quarryOrigin: "રાજસ્થાન, ભારત (દેવલી અને ભીલવાડા ક્વોરી)",
    },
    highlights: [
      "100% અસલી કુદરતી પથ્થરનું ઉપરનું સ્તર",
      "પરંપરાગત સ્લેબ કરતાં 90% ઓછું વજન",
      "સામાન્ય સુથારી ઓજારોથી સરળ કટીંગ અને ફિટિંગ",
      "બેકલાઇટ વિકલ્પો સાથે આકર્ષક રાત્રિ લાઇટિંગ",
    ],
  },
  custom_stone_cladding: {
    name: "કસ્ટમ સ્ટોન ક્લેડીંગ",
    categoryLabel: "3D એલિવેશન ફેસડેસ",
    tagline: "બહારના એલિવેશન અને આંતરિક 3D ટેક્ષ્ચર ફીચર વોલ્સ",
    luxurySubtitle: "મશીનથી કાપેલી અને હાથથી બનાવેલી પથ્થરની ટાઇલ્સ · શૂન્ય-ઘસારો",
    description:
      "બંગલા અને વાણિજ્યિક ફેસડેસ માટે પ્રીમિયમ સેન્ડસ્ટોન, લાઇમસ્ટોન અને ગ્રેનાઇટ. સૂર્યપ્રકાશ, વરસાદ અને ધૂળ-પ્રદૂષણ સામે દાયકાઓ સુધી તેનું કુદરતી સૌંદર્ય અકબંધ રાખે છે.",
    badge: "ચોકસાઈપૂર્વક હાથથી બનાવેલ",
    specs: {
      thickness: "15 મીમી, 20 મીમી, 25 મીમી અને 30 મીમી",
      dimensions: "600 × 300 મીમી, 600 × 600 મીમી, કસ્ટમ કટ",
      weight: "આશરે 35 – 55 કિગ્રા / ચો.મી.",
      finishes: ["શોટ-બ્લાસ્ટેડ", "ફ્લેમ્ડ ગ્રૂવ", "રોક ફેસ", "સેન્ડબ્લાસ્ટેડ મેટ"],
      applications: [
        "વિલા એક્સટીરિયર એલિવેશન",
        "બાઉન્ડ્રી વોલ",
        "સ્વિમિંગ પૂલ ડેક",
        "એન્ટ્રન્સ લોબી",
      ],
      quarryOrigin: "ધોલપુર, જોધપુર અને કોટા, રાજસ્થાન",
    },
    highlights: [
      "તીવ્ર તડકો, વરસાદ અને ભેજ સામે 100% રક્ષણ",
      "સંપૂર્ણ જોઈન્ટ અલાઇનમેન્ટ સાથે સીમલેસ ઇન્સ્ટોલેશન",
      "વિવિધ નેચરલ શેડ્સ અને ટેક્ષ્ચરમાં ઉપલબ્ધ",
      "કુદરતી થર્મલ ઇન્સ્યુલેશન",
    ],
  },
  temple_work_handcrafting: {
    name: "મંદિર નિર્માણ અને હસ્તકલા",
    categoryLabel: "પવિત્ર મંદિર સ્થાપત્ય",
    tagline: "પવિત્ર મંદિર સ્થાપત્ય, નકશીદાર સ્તંભો, મૂર્તિઓ અને જાળીઓ",
    luxurySubtitle: "શુદ્ધ મકરાણા માર્બલ અને બંસી પહાડપુર સેન્ડસ્ટોન · શાસ્ત્રોક્ત નક્શીકામ",
    description:
      "રાજસ્થાની કારીગરોની પરંપરાગત કળા અને 5-એક્સિસ સીએનસી ટેકનોલોજીનું મિશ્રણ. ગર્ભગૃહ, મંડપ, સ્તંભો અને જાળી સ્ક્રીન સંપૂર્ણ શાસ્ત્રોક્ત ચોકસાઈ સાથે બનાવવામાં આવે છે.",
    badge: "પવિત્ર ભવ્ય સ્થાપત્ય",
    specs: {
      thickness: "50 મીમી થી 300 મીમી સુધી નક્કર બ્લોક્સ",
      dimensions: "આર્કિટેક્ચરલ બ્લૂપ્રિન્ટ મુજબ કસ્ટમ",
      weight: "નક્કર માળખાકીય ઘનતા (2650 કિગ્રા/ઘનમીટર)",
      finishes: ["હાથની છીણીથી કોતરણી", "મિરર પોલિશ", "એન્ટિક બ્રશ ફિનિશ"],
      applications: ["ઘર મંદિર", "જાહેર મંદિર સંકુલ", "હવેલી ઝરૂખા અને કમાનો", "ધાર્મિક સ્મારક"],
      quarryOrigin: "મકરાણા અને બંસી પહાડપુર, રાજસ્થાન",
    },
    highlights: [
      "પવિત્ર તેલ, અબીલ-ગુલાલ અને ધુમાડા સામે પ્રતિરોધક મકરાણા માર્બલ",
      "સીએડી બ્લૂપ્રિન્ટથી 100% ચોક્કસ પથ્થર કોતરણી",
      "પેકિંગ પહેલાં ફેક્ટરીમાં ડ્રાય-લે ટ્રાયલ એસેમ્બલી",
      "વૈદિક શિલ્પશાસ્ત્રના નિયમોનું પાલન",
    ],
  },
  inlay_work: {
    name: "ઇનલે વર્ક (પિયેટ્રા ડ્યુરા)",
    categoryLabel: "શાહી ઇનલે ક્રાફ્ટ",
    tagline: "વોટરજેટ મેડાલિયન, ફ્લોર ઇનલે, બ્રાસ બોર્ડર્સ અને ફ્લોરલ કાર્પેટ",
    luxurySubtitle: "સબ-મિલીમીટર વોટરજેટ કટીંગ · પ્યોર બ્રાસ અને મધર-ઓફ-પર્લ ઇન્ટિગ્રેશન",
    description:
      "શાહી પિયેટ્રા ડ્યુરા આર્ટનું આધુનિક સ્વરૂપ. હાઇ-પ્રેશર વોટરજેટ કટરથી ઇટાલિયન માર્બલ અને પિત્તળની પટ્ટીઓને 0.2 મીમીની ચોકસાઈથી કાપીને અતિ ભવ્ય ફ્લોરિંગ તૈયાર કરાય છે.",
    badge: "શાહી ઇનલે ક્રાફ્ટ",
    specs: {
      thickness: "18 મીમી – 20 મીમી કેલિબ્રેટેડ સ્લેબ",
      dimensions: "ગોળ મેડાલિયન (1200–2400 મીમી વ્યાસ), કસ્ટમ ફ્લોર કાર્પેટ",
      weight: "આશરે 50 – 55 કિગ્રા / ચો.મી.",
      finishes: ["ડાયમંડ મિરર પોલિશ", "સેટિન મેટ સીલ"],
      applications: [
        "વિલા એન્ટ્રન્સ ફોયર",
        "હોટેલ લોબી સેન્ટરપીસ",
        "ડાઇનિંગ ફ્લોરિંગ",
        "પૂજા રૂમ મેડાલિયન",
      ],
      quarryOrigin: "કેરેરા (ઇટાલી), મકરાણા (ભારત)",
    },
    highlights: [
      "ઝીરો જોઈન્ટ ઓફસેટ (<0.2 મીમી) સાથે ફ્લશ ફિટ",
      "સોલિડ શુદ્ધ પિત્તળ અને મોતીના છીપ (સીપ) નું ભવ્ય સંયોજન",
      "સરળ ફિટિંગ માટે હેવી ફાઇબરગ્લાસ મેશ પર સપ્લાય",
      "ડાઘ-પ્રતિરોધક ઔદ્યોગિક સીલરથી સુરક્ષિત",
    ],
  },
  custom_flooring: {
    name: "કસ્ટમ ફ્લોરિંગ (લક્ઝરી)",
    categoryLabel: "ક્યુરેટેડ સ્લેબ્સ અને બુકમેચિંગ",
    tagline: "આયાતી ઇટાલિયન માર્બલ, પ્રીમિયમ ગ્રેનાઇટ અને ડ્રાય-લે વેઇન મેચિંગ",
    luxurySubtitle: "સિંગલ-બ્લોક સ્લેબ પસંદગી · ગેરેંટીડ ડાયમંડ બુકમેચિંગ",
    description:
      "ઇટાલીના કેરેરા અને દક્ષિણ ભારતની ખાણોમાંથી ઉત્કૃષ્ટ સ્લેબ. કુદરતી નસો એકસમાન પતંગિયા અને હીરા જેવા આકારો બનાવે તે રીતે ફેક્ટરીમાં ડ્રાય-લે સ્ટેજિંગ કરવામાં આવે છે.",
    badge: "બુકમેચ લક્ઝરી",
    specs: {
      thickness: "18 મીમી અને 20 મીમી આંતરરાષ્ટ્રીય ધોરણ",
      dimensions: "જમ્બો ગેંગસો સ્લેબ (2800+ × 1600+ મીમી)",
      weight: "આશરે 50 – 55 કિગ્રા / ચો.મી.",
      finishes: ["મિરર ગ્લોસ", "લેધર ફિનિશ", "હોન્ડ મેટ"],
      applications: [
        "મોટા લિવિંગ રૂમ",
        "દાદર અને લેન્ડિંગ",
        "પ્રીમિયમ હૉલવે",
        "લક્ઝરી બાથરૂમ ફ્લોર",
      ],
      quarryOrigin: "ઇટાલી, ગ્રીસ, વિયેતનામ અને ભારત",
    },
    highlights: [
      "એક જ બ્લોકમાંથી સતત સ્લેબ જેથી કલર અને વેઇન સમાન રહે",
      "ડિલિવરી પહેલાં ફેક્ટરીમાં સંપૂર્ણ ફ્લોર ડ્રાય-લે પ્રીવ્યુ",
      "ઇપોક્સી બેક-મેશિંગ દ્વારા ઉચ્ચ મજબૂતાઈ",
      "પેઢીઓ સુધી ચમક જાળવી રાખે તેવું ટકાઉપણું",
    ],
  },
  stone_murals: {
    name: "સ્ટોન મ્યુરલ્સ અને જાળી",
    categoryLabel: "3D રીલિફ મ્યુરલ્સ",
    tagline: "સીએનસી 3D નકશીદાર આર્ટ, વોલ આર્ટ અને કોતરણી કરેલી જાળી",
    luxurySubtitle: "મલ્ટી-ડેપ્થ 3D રીલિફ કોતરણી · કુદરતી પથ્થરનું શિલ્પકામ",
    description:
      "નેચરલ સેન્ડસ્ટોન અને લાઇમસ્ટોન પર 3D સીએનસી અને હસ્તકળાથી કંડારેલી કલા. લિવિંગ રૂમ ફીચર વોલ અને એન્ટ્રન્સ માટે આકર્ષક અને ભવ્ય વાતાવરણનું નિર્માણ કરે છે.",
    badge: "3D નક્શીકામ કલા",
    specs: {
      thickness: "30 મીમી, 50 મીમી, 75 મીમી અને 100 મીમી",
      dimensions: "પેનલ કદ 1200 × 600 મીમી થી 2400 × 1200 મીમી",
      weight: "આશરે 65 – 120 કિગ્રા / ચો.મી.",
      finishes: ["મલ્ટી-ટોન રીવેન", "સેન્ડબ્લાસ્ટેડ ટેક્ષ્ચર", "છીણી ફિનિશ"],
      applications: [
        "લિવિંગ રૂમ ફીચર વોલ",
        "એન્ટ્રન્સ ગેટવે",
        "કોર્ટયાર્ડ બેકડ્રોપ",
        "હોટેલ રિસેપ્શન",
      ],
      quarryOrigin: "રાજસ્થાનની પ્રીમિયમ સેન્ડસ્ટોન ક્વોરી",
    },
    highlights: [
      "ઉભરી આવેલી 3D ઊંડાઈ જે અદ્ભુત પ્રકાશ-છાયાની અસર ઊભી કરે છે",
      "ક્લાયન્ટની જરૂરિયાત મુજબ 100% કસ્ટમાઇઝેશન",
      "ઇન્ડોર અને આઉટડોર બંને વાતાવરણ માટે યોગ્ય",
      "સરળ અને મજબૂત માઉન્ટિંગ સિસ્ટમ",
    ],
  },
  agate_slabs: {
    name: "એગેટ સ્લેબ (બેકલીટ)",
    categoryLabel: "ટ્રાન્સલુસન્ટ બેકલાઇટ સ્લેબ્સ",
    tagline: "બાર કાઉન્ટર, પૂજા રૂમ અને ફોયર માટે બેકલીટ સેમી-પ્રેશિયસ સ્લેબ",
    luxurySubtitle: "કુદરતી અર્ધ-કિંમતી રત્ન પથ્થરો · પાછળથી લાઇટ પડે ત્યારે જાદુઈ ચમક",
    description:
      "કુદરતી એગેટ અને ક્વાર્ટ્ઝના ટુકડાઓને પારદર્શક રેઝિનમાં જોડીને બનાવેલા લક્ઝરી સ્લેબ. પાછળથી એલઇડી લાઇટ ચાલુ થતાં જ સ્ફટિકો ચમકી ઊઠે છે.",
    badge: "દુર્લભ રત્ન સ્લેબ",
    specs: {
      thickness: "20 મીમી (નક્કર અથવા ગ્લાસ સપોર્ટેડ)",
      dimensions: "2400 × 1200 મીમી સ્ટાન્ડર્ડ સ્લેબ, કસ્ટમ કાઉન્ટર સાઈઝ",
      weight: "આશરે 55 કિગ્રા / ચો.મી.",
      finishes: ["અલ્ટ્રા-ગ્લોસ ડાયમંડ પોલિશ"],
      applications: [
        "લક્ઝરી બાર કાઉન્ટર",
        "બેકલીટ વેનિટી ટોપ",
        "પૂજા રૂમ બેકડ્રોપ",
        "સ્ટેટમેન્ટ વોલ",
      ],
      quarryOrigin: "બ્રાઝિલ, મેડાગાસ્કર અને ભારત",
    },
    highlights: [
      "100% વાસ્તવિક કુદરતી સેમી-પ્રેશિયસ રત્ન સ્ફટિકો",
      "એલઇડી લાઇટિંગ સાથે અદભુત પારભાસકતા",
      "ગરમી, ડાઘ અને સ્ક્રેચ પ્રતિરોધક સપાટી",
      "વિશ્વભરના ભવ્ય પ્રોજેક્ટ્સની પ્રથમ પસંદગી",
    ],
  },
};

// -------------------------------------------------------------
// HELPER FUNCTIONS
// -------------------------------------------------------------

export function getLandingTexts(lang = "en") {
  const code = (lang?.substring(0, 2) || "en") as "en" | "hi" | "gu";
  return LANDING_UI_TRANSLATIONS[code] || LANDING_UI_TRANSLATIONS.en;
}

export function getLocalizedProducts(
  baseProducts: { id: string; name: string; tagline: string; popular?: boolean }[],
  lang = "en",
): LocalizedProductOption[] {
  const code = lang?.substring(0, 2) || "en";
  if (code === "hi") {
    return baseProducts.map((p) => {
      const match = HINDI_PRODUCT_MAP[p.id];
      return {
        id: p.id,
        canonicalName: p.name,
        name: match?.name || p.name,
        tagline: match?.tagline || p.tagline,
        popular: p.popular,
      };
    });
  }
  if (code === "gu") {
    return baseProducts.map((p) => {
      const match = GUJARATI_PRODUCT_MAP[p.id];
      return {
        id: p.id,
        canonicalName: p.name,
        name: match?.name || p.name,
        tagline: match?.tagline || p.tagline,
        popular: p.popular,
      };
    });
  }
  return baseProducts.map((p) => ({
    ...p,
    canonicalName: p.name,
  }));
}

export function getProductNameInLang(nameOrId: string, lang = "en"): string {
  const code = lang?.substring(0, 2) || "en";
  if (code === "en") return nameOrId;
  const matchHi = Object.entries(HINDI_PRODUCT_MAP).find(
    ([id, v]) => id === nameOrId || v.name === nameOrId,
  );
  if (code === "hi" && matchHi) return matchHi[1].name;

  const matchGu = Object.entries(GUJARATI_PRODUCT_MAP).find(
    ([id, v]) => id === nameOrId || v.name === nameOrId,
  );
  if (code === "gu" && matchGu) return matchGu[1].name;

  return nameOrId;
}

export function getLocalizedSpaceTypes(baseTypes: string[], lang = "en"): LocalizedSpaceType[] {
  const code = lang?.substring(0, 2) || "en";
  return baseTypes.map((t) => {
    let label = t;
    if (code === "hi") {
      label = SPACE_TYPES_HI[t] || t;
    } else if (code === "gu") {
      label = SPACE_TYPES_GU[t] || t;
    }
    return { label, value: t };
  });
}

export function getLocalizedCustomerRoles(
  baseRoles: { label: string; value: string; type: string }[],
  lang = "en",
): LocalizedRole[] {
  const code = lang?.substring(0, 2) || "en";
  return baseRoles.map((r) => {
    let label = r.label;
    if (code === "hi") {
      label = ROLES_HI[r.value] || r.label;
    } else if (code === "gu") {
      label = ROLES_GU[r.value] || r.label;
    }
    return { label, value: r.value, type: r.type };
  });
}

export function getLocalizedLuxuryProducts(
  baseItems: LocalizedLuxuryProduct[],
  lang = "en",
): LocalizedLuxuryProduct[] {
  const code = lang?.substring(0, 2) || "en";
  if (code === "hi") {
    return baseItems.map((item) => {
      const canonicalName = item.canonicalName || item.name;
      const match = LUXURY_SHOWCASE_HI[item.id];
      if (!match) return { ...item, canonicalName };
      return {
        ...item,
        canonicalName,
        name: match.name,
        categoryLabel: match.categoryLabel,
        tagline: match.tagline,
        luxurySubtitle: match.luxurySubtitle,
        description: match.description,
        badge: match.badge,
        specs: match.specs,
        highlights: match.highlights,
      };
    });
  }
  if (code === "gu") {
    return baseItems.map((item) => {
      const canonicalName = item.canonicalName || item.name;
      const match = LUXURY_SHOWCASE_GU[item.id];
      if (!match) return { ...item, canonicalName };
      return {
        ...item,
        canonicalName,
        name: match.name,
        categoryLabel: match.categoryLabel,
        tagline: match.tagline,
        luxurySubtitle: match.luxurySubtitle,
        description: match.description,
        badge: match.badge,
        specs: match.specs,
        highlights: match.highlights,
      };
    });
  }
  return baseItems.map((item) => ({
    ...item,
    canonicalName: item.canonicalName || item.name,
  }));
}

const QUICK_IDEAS_HI: Record<string, string> = {
  "Living Room TV Accent Wall": "लिविंग रूम टीवी दीवार",
  "Exterior Elevation Facade": "बाहरी एलिवेशन अग्रभाग",
  "Foyer Inlay Flooring": "फ़ोयर इनले फ्लोरिंग",
  "Temple / Mandir Carving": "मंदिर नक्काशी व गर्भगृह",
  "Bathroom Wall Cladding": "बाथरूम वॉल क्लैडिंग",
  "Dining Table Top": "डाइनिंग टेबल टॉप",
  "Balcony Feature Wall": "बालकनी फ़ीचर दीवार",
};

const QUICK_IDEAS_GU: Record<string, string> = {
  "Living Room TV Accent Wall": "લિવિંગ રૂમ ટીવી વોલ",
  "Exterior Elevation Facade": "બહારનું એલિવેશન ફેસડે",
  "Foyer Inlay Flooring": "ફોયર ઇનલે ફ્લોરિંગ",
  "Temple / Mandir Carving": "મંદિર કોતરણી",
  "Bathroom Wall Cladding": "બાથરૂમ વોલ ક્લેડીંગ",
  "Dining Table Top": "ડાઇનિંગ ટેબલ ટોપ",
  "Balcony Feature Wall": "બાલ્કની ફીચર વોલ",
};

export function getLocalizedQuickIdeas(baseIdeas: string[], lang = "en"): string[] {
  const code = lang?.substring(0, 2) || "en";
  if (code === "hi") {
    return baseIdeas.map((idea) => QUICK_IDEAS_HI[idea] || idea);
  }
  if (code === "gu") {
    return baseIdeas.map((idea) => QUICK_IDEAS_GU[idea] || idea);
  }
  return baseIdeas;
}
