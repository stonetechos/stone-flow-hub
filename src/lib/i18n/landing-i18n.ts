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
  // Additional mappings for Luxury Showcase items
  interlocking_panels: {
    name: "इंटरलॉकिंग पैनल्स",
    tagline: "सीमलेस 3D टेक्सचर्ड लेजस्टोन और इंटरलॉकिंग एलिवेशन पैनल्स",
  },
  "Interlocking Panels": {
    name: "इंटरलॉकिंग पैनल्स",
    tagline: "सीमलेस 3D टेक्सचर्ड लेजस्टोन और इंटरलॉकिंग एलिवेशन पैनल्स",
  },
  stone_murals_carvings: {
    name: "स्टोन म्यूरल्स व नक्काशी",
    tagline: "सीएनसी 3D नक्काशीदार मंदिर, कलात्मक जालियां व वॉल स्कल्पचर्स",
  },
  "Stone Murals & Carvings": {
    name: "स्टोन म्यूरल्स व नक्काशी",
    tagline: "सीएनसी 3D नक्काशीदार मंदिर, कलात्मक जालियां व वॉल स्कल्पचर्स",
  },
  stone_mosaics_inlay: {
    name: "स्टोन मोज़ेक व इनले",
    tagline: "वॉटरजेट मेडालियन, फ्लोर इनले व ब्रास बॉर्डर",
  },
  "Stone Mosaics & Inlay": {
    name: "स्टोन मोज़ेक व इनले",
    tagline: "वॉटरजेट मेडालियन, फ्लोर इनले व ब्रास बॉर्डर",
  },
  marble_granite_flooring: {
    name: "कस्टम फ्लोरिंग",
    tagline: "आयातित इटैलियन मार्बल, प्रीमियम ग्रेनाइट और ड्राई-ले वेन मैचिंग",
  },
  "Custom Flooring": {
    name: "कस्टम फ्लोरिंग",
    tagline: "आयातित इटैलियन मार्बल, प्रीमियम ग्रेनाइट और ड्राई-ले वेन मैचिंग",
  },
  table_tops_countertops: {
    name: "टेबल टॉप्स व काउंटरटॉप्स",
    tagline: "लक्जरी डाइनिंग टेबल, किचन वॉटरफॉल आइलैंड और वैनिटी टॉप",
  },
  "Table Tops & Countertops": {
    name: "टेबल टॉप्स व काउंटरटॉप्स",
    tagline: "लक्जरी डाइनिंग टेबल, किचन वॉटरफॉल आइलैंड और वैनिटी टॉप",
  },
  agate_semi_precious: {
    name: "एगेट व सेमी-प्रेशियस स्लैब्स",
    tagline: "बार काउंटर और फ़ोयर के लिए बैकलिट सेमी-प्रेशियस स्लैब",
  },
  "Agate & Semi-Precious Slabs": {
    name: "एगेट व सेमी-प्रेशियस स्लैब्स",
    tagline: "बार काउंटर और फ़ोयर के लिए बैकलिट सेमी-प्रेशियस स्लैब",
  },
  stepping_stones_landscaping: {
    name: "स्टेपिंग स्टोन्स व लैंडस्केप",
    tagline: "गार्डन पाथवे, फ्लैगस्टोन और पेवर्स",
  },
  "Stepping Stones & Landscape": {
    name: "स्टेपिंग स्टोन्स व लैंडस्केप",
    tagline: "गार्डन पाथवे, फ्लैगस्टोन और पेवर्स",
  },
  pu_decorative_panels: {
    name: "पीयू डेकोरेटिव पैनल्स",
    tagline: "अल्ट्रा-लाइटवेट हाई-डेफिनिशन फॉक्स स्टोन पैनल्स",
  },
  "PU Decorative Panels": {
    name: "पीयू डेकोरेटिव पैनल्स",
    tagline: "अल्ट्रा-लाइटवेट हाई-डेफिनिशन फॉक्स स्टोन पैनल्स",
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
  // Additional mappings for Luxury Showcase items
  interlocking_panels: {
    name: "ઇન્ટરલોકિંગ પેનલ્સ",
    tagline: "સીમલેસ 3D ટેક્ષ્ચર્ડ લેજસ્ટોન અને ઇન્ટરલોકિંગ એલિવેશન પેનલ્સ",
  },
  "Interlocking Panels": {
    name: "ઇન્ટરલોકિંગ પેનલ્સ",
    tagline: "સીમલેસ 3D ટેક્ષ્ચર્ડ લેજસ્ટોન અને ઇન્ટરલોકિંગ એલિવેશન પેનલ્સ",
  },
  stone_murals_carvings: {
    name: "સ્ટોન મ્યુરલ્સ અને કોતરણી",
    tagline: "સીએનસી 3D કોતરણીવાળા મંદિર, કલાત્મક જાળીઓ અને વોલ સ્કલ્પચર્સ",
  },
  "Stone Murals & Carvings": {
    name: "સ્ટોન મ્યુરલ્સ અને કોતરણી",
    tagline: "સીએનસી 3D કોતરણીવાળા મંદિર, કલાત્મક જાળીઓ અને વોલ સ્કલ્પચર્સ",
  },
  stone_mosaics_inlay: {
    name: "સ્ટોન મોઝેક અને ઇનલે",
    tagline: "વોટરજેટ મેડાલિયન, ફ્લોરલ ફ્લોર ઇનલે અને બ્રાસ બોર્ડર્સ",
  },
  "Stone Mosaics & Inlay": {
    name: "સ્ટોન મોઝેક અને ઇનલે",
    tagline: "વોટરજેટ મેડાલિયન, ફ્લોરલ ફ્લોર ઇનલે અને બ્રાસ બોર્ડર્સ",
  },
  marble_granite_flooring: {
    name: "કસ્ટમ ફ્લોરિંગ",
    tagline: "આયાતી ઇટાલિયન માર્બલ, પ્રીમિયમ ગ્રેનાઇટ અને ડ્રાય-લે વેઇન મેચિંગ",
  },
  "Custom Flooring": {
    name: "કસ્ટમ ફ્લોરિંગ",
    tagline: "આયાતી ઇટાલિયન માર્બલ, પ્રીમિયમ ગ્રેનાઇટ અને ડ્રાય-લે વેઇન મેચિંગ",
  },
  table_tops_countertops: {
    name: "ટેબલ ટોપ્સ અને કાઉન્ટરટોપ્સ",
    tagline: "લક્ઝરી ડાઇનિંગ ટેબલ, કિચન વોટરફોલ આઇલેન્ડ અને વેનિટી કાઉન્ટર",
  },
  "Table Tops & Countertops": {
    name: "ટેબલ ટોપ્સ અને કાઉન્ટરટોપ્સ",
    tagline: "લક્ઝરી ડાઇનિંગ ટેબલ, કિચન વોટરફોલ આઇલેન્ડ અને વેનિટી કાઉન્ટર",
  },
  agate_semi_precious: {
    name: "એગેટ અને સેમી-પ્રેશિયસ સ્લેબ્સ",
    tagline: "બાર કાઉન્ટર અને ફોયર માટે બેકલીટ ટ્રાન્સલુસન્ટ લક્ઝરી ક્વાર્ટ્ઝ સ્લેબ્સ",
  },
  "Agate & Semi-Precious Slabs": {
    name: "એગેટ અને સેમી-પ્રેશિયસ સ્લેબ્સ",
    tagline: "બાર કાઉન્ટર અને ફોયર માટે બેકલીટ ટ્રાન્સલુસન્ટ લક્ઝરી ક્વાર્ટ્ઝ સ્લેબ્સ",
  },
  stepping_stones_landscaping: {
    name: "સ્ટેપિંગ સ્ટોન્સ અને લેન્ડસ્કેપ",
    tagline: "નેચરલ ગાર્ડન કોબલ્સ, ફ્લેગસ્ટોન, પેવર્સ અને બોલ્ડર્સ",
  },
  "Stepping Stones & Landscape": {
    name: "સ્ટેપિંગ સ્ટોન્સ અને લેન્ડસ્કેપ",
    tagline: "નેચરલ ગાર્ડન કોબલ્સ, ફ્લેગસ્ટોન, પેવર્સ અને બોલ્ડર્સ",
  },
  pu_decorative_panels: {
    name: "પીયુ ડેકોરેટિવ પેનલ્સ",
    tagline: "અલ્ટ્રા-લાઇટવેઇટ, ઝડપી ફિટિંગ હાઇ-ડેફિનેશન ફોક્સ સ્ટોન પેનલ્સ",
  },
  "PU Decorative Panels": {
    name: "પીયુ ડેકોરેટિવ પેનલ્સ",
    tagline: "અલ્ટ્રા-લાઇટવેઇટ, ઝડપી ફિટિંગ હાઇ-ડેફિનેશન ફોક્સ સ્ટોન પેનલ્સ",
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
      "वास्तविक प्राकृतिक स्लेट और क्वार्टजाइट को एयरोस्पेस-ग्रेड फाइबरग्लास रेजिन के साथ सुदृढ़ किया गया है। यह 1.8 किग्रा/वर्गमीटर से कम वजन में प्राकृतिक पत्थर की समृद्ध बनावट प्रदान करता है। बिना किसी स्ट्रक्चरल बदलाव के घुमावदार खंभों, सीलिंग और वॉर्डरोब पर आसानी से लगाया जा सकता है।",
    badge: "वास्तुशिल्प नवाचार",
    specs: {
      thickness: "1.5 मिमी – 2.0 मिमी अल्ट्रा-स्लिम",
      dimensions: "1220 × 610 मिमी · जंबो 2440 × 1220 मिमी",
      weight: "लगभग 1.5 – 1.8 किग्रा / वर्गमीटर",
      finishes: ["नेचुरल 3D रिवेन", "ट्रांसलूसेंट (बैकलिट)", "नैनो-सील्ड मैट"],
      applications: [
        "घुमावदार वास्तुशिल्प स्तंभ",
        "लिविंग रूम टीवी एक्सेंट दीवार",
        "सीलिंग सोफिट्स",
        "कस्टम वॉर्डरोब व डोर रैपिंग",
      ],
      quarryOrigin: "देवली व कुंड स्लेट बेल्ट, राजस्थान",
    },
    highlights: [
      "100% वास्तविक प्राकृतिक खदान पत्थर",
      "50 मिमी त्रिज्या तक के गोलाकार खंभों पर मुड़ने में सक्षम",
      "एलईडी बैकलाइटिंग के साथ पारभासी चमक",
      "मानक संरचनात्मक बहुलक चिपकने वाले पदार्थों से सरल स्थापना",
    ],
  },
  custom_stone_cladding: {
    name: "कस्टम स्टोन क्लैडिंग",
    categoryLabel: "एक्सटीरियर व फसाड",
    tagline: "बाहरी एलिवेशन अग्रभाग और आंतरिक 3D टेक्सचर्ड एक्सेंट दीवारें",
    luxurySubtitle: "थर्मल-मास हैंड-ड्रेस्ड चिनाई · कालातीत भव्य स्वरूप",
    description:
      "सॉलिड-बॉडी सैंडस्टोन, लाइमस्टोन व ग्रेनाइट क्लैडिंग टाइलें जो गहरी छाया और त्रि-आयामी वास्तुशिल्प प्रभाव देती हैं। राजस्थान की प्रमाणित खदानों से सीधे आयातित, प्रत्येक ब्लॉक चरम मानसून, रेगिस्तानी और तटीय जलवायु का सामना करने के लिए तैयार किया गया है।",
    badge: "हेरिटेज एलिवेशन",
    specs: {
      thickness: "20 मिमी – 75 मिमी गहराई रिलीफ",
      dimensions: "कस्टम मॉड्यूलर साइज · 300×150 से 1200×600 मिमी",
      finishes: [
        "हैंड-चिज़ल्ड रॉकफेस",
        "बुश हैमर्ड",
        "शॉट ब्लास्टेड",
        "स्प्लिटफेस",
        "एंटीक सैंडस्टोन",
      ],
      applications: [
        "बंगला व विला एलिवेशन फसाड",
        "डबल-हाइट एट्रियम दीवारें",
        "भव्य बाउंड्री वॉल्स",
        "कोर्टयार्ड झरने",
      ],
      quarryOrigin: "धौलपुर, कांदला, जोधपुर व ग्वालियर खदानें",
    },
    highlights: [
      "शून्य थर्मल मलिनकिरण और पराबैंगनी (UV) प्रतिरोधी",
      "ड्राई या वेट मैकेनिकल एंकरिंग विकल्प",
      "गहरी रिलीफ से प्राकृतिक सौर छायांकन और ध्वनि नियंत्रण",
      "रंग और वेन के अनुसार फैक्ट्री में पूर्व-वर्गीकृत",
    ],
  },
  interlocking_panels: {
    name: "इंटरलॉकिंग पैनल्स",
    categoryLabel: "मॉड्यूलर वॉल फसाड्स",
    tagline: "सीमलेस 3D टेक्सचर्ड लेजस्टोन और इंटरलॉकिंग एलिवेशन पैनल्स",
    luxurySubtitle: "मोर्टारलेस Z-लॉक परिशुद्धता · अखंड स्टैक्ड-स्टोन सौंदर्य",
    description:
      "मॉड्यूलर इंटरलॉकिंग Z-आकार की इकाइयों में जुड़े प्राकृतिक पत्थर के स्ट्रिप्स। फिंगर-जॉइंटेड कॉन्फ़िगरेशन वर्टिकल ग्राउट लाइनों को पूरी तरह छुपा देता है, जिससे एक निरंतर, सीमलेस प्राकृतिक पत्थर की दीवार बनती है जो आवासीय और कॉर्पोरेट स्थानों को भव्यता प्रदान करती है।",
    badge: "सीमलेस चिनाई",
    specs: {
      thickness: "15 मिमी – 35 मिमी मल्टी-प्लेन रिलीफ",
      dimensions: "600 × 150 मिमी · 600 × 200 मिमी इंटरलॉकिंग Z-मॉड्यूल",
      finishes: ["स्प्लिटफेस लेजस्टोन", "मल्टी-लेयर्ड होन्ड", "रस्टिक क्वार्टजाइट"],
      applications: [
        "फ़ोयर फोकल दीवारें",
        "फायरप्लेस सराउंड्स",
        "बालकनी व टेरेस फीचर्स",
        "बाहरी बाउंड्री एक्सेंट्स",
      ],
      quarryOrigin: "उत्तर भारतीय स्लेट और क्वार्टजाइट फॉर्मेशन्स",
    },
    highlights: [
      "स्थापना के बाद शून्य दृश्यमान ऊर्ध्वाधर जोड़",
      "त्वरित ड्राई-वॉल और चिनाई अनुप्रयोग",
      "प्राकृतिक बहु-स्वर प्रकाश परावर्तन",
      "उच्च-शक्ति एपॉक्सी के साथ पूर्व-निर्मित फैक्ट्री असेंबली",
    ],
  },
  stone_murals_carvings: {
    name: "स्टोन म्यूरल्स व नक्काशी",
    categoryLabel: "आध्यात्मिक व ललित कला",
    tagline: "सीएनसी 3D नक्काशीदार मंदिर, कलात्मक जालियां व स्टोन वॉल स्कल्पचर्स",
    luxurySubtitle: "5-एक्सिस सीएनसी परिशुद्धता के साथ मास्टर कारीगरों की हस्त-कला",
    description:
      "सॉलिड सैंडस्टोन, शुद्ध मकराना मार्बल और विदेशी लाइमस्टोन में उकेरी गई भक्तिमय कलाकृतियां और बेस-रिलीफ भित्तिचित्र। 5-एक्सिस कंप्यूटर मूर्तिकला और तीसरी पीढ़ी के राजस्थानी नक्काशीकारों के संगम से गर्भगृह, मंडप, स्तंभ और ज्यामितीय जालियां तैयार होती हैं।",
    badge: "अनूठी मास्टरपीस",
    specs: {
      thickness: "30 मिमी से 100 मिमी मोनोलिथिक रिलीफ",
      dimensions: "10 × 6 फीट तक के एकल पैनल · कस्टम साइज",
      finishes: ["फाइन चिज़ल्ड", "होन्ड सैटिन", "गोल्ड लीफ एक्सेंटिंग", "सैंडब्लास्टेड रिलीफ"],
      applications: [
        "कस्टम होम मंदिर",
        "मंदिर गर्भगृह व गोखले",
        "डबल-हाइट आध्यात्मिक दीवारें",
        "जाली पार्टिशन",
      ],
      quarryOrigin: "मकराना व्हाइट (राजस्थान) व धौलपुर पिंक/बेज",
    },
    highlights: [
      "गहरी 3D नक्काशी और दिव्य प्रतिमाएं",
      "ब्लूप्रिंट से 100% सटीक सीएडी-टू-स्टोन रूपांतरण",
      "पवित्र तेल, इत्र और धूप प्रतिरोधी शुद्ध मार्बल विकल्प",
      "पैकेजिंग से पहले फैक्ट्री में ड्राई-असेंबली ट्रायल",
    ],
  },
  stone_mosaics_inlay: {
    name: "स्टोन मोज़ेक व इनले",
    categoryLabel: "शाही इनले हस्तशिल्प",
    tagline: "वॉटरजेट ज्यामितीय मेडालियन, फ्लोरल फ्लोर इनले व ब्रास बॉर्डर",
    luxurySubtitle: "सब-मिलीमीटर वॉटरजेट कटिंग · शुद्ध पीतल व सेमी-प्रेशियस एक्सेंट्स",
    description:
      "शाही पिएत्रा ड्यूरा कला का आधुनिक इंजीनियरिंग रूप। उच्च दबाव वाले वॉटरजेट से इटैलियन मार्बल, विदेशी ग्रेनाइट और प्राकृतिक पीतल की पट्टियों को 0.2 मिमी से कम सटीकता में काटकर भव्य प्रवेश द्वारों के लिए मेडालियन और ज्यामितीय कालीन बनाए जाते हैं।",
    badge: "हौट इनले कला",
    specs: {
      thickness: "18 मिमी – 20 मिमी फ्लोरिंग मानक",
      dimensions: "3 फीट से 15 फीट व्यास तक के कस्टम मेडालियन",
      finishes: ["मिरर हाई-ग्लॉस पॉलिश", "होन्ड सिल्क", "ब्रश ब्रास बॉर्डर्स"],
      applications: [
        "भव्य प्रवेश फ़ोयर",
        "आलीशान लिविंग रूम कालीन",
        "मास्टर सुइट मेडालियन",
        "होटल व बॉलरूम सेंटरपीस",
      ],
      quarryOrigin: "इटैलियन स्टैचुआरियो, कैरारा, मकराना व्हाइट व फॉरेस्ट ग्रीन",
    },
    highlights: [
      "शून्य जोड़ ऑफसेट (<0.2 मिमी) के साथ फ्लश सीमलेस फिट",
      "ठोस शुद्ध पीतल और मदर-ऑफ-पर्ल (सीप) एकीकरण",
      "आसान संरेखण हेतु हेवी फाइबरग्लास मेश पर आपूर्ति",
      "औद्योगिक स्टेन बैरियर के साथ पूरी तरह से पॉलिश और सील",
    ],
  },
  marble_granite_flooring: {
    name: "कस्टम फ्लोरिंग",
    categoryLabel: "फ्लोरिंग व लार्ज स्लैब्स",
    tagline: "आयातित इटैलियन मार्बल, प्रीमियम ग्रेनाइट व ड्राई-ले वेन मैचिंग",
    luxurySubtitle: "एकल-ब्लॉक स्लैब्स · गारंटीकृत डायमंड बुकमैचिंग",
    description:
      "कैरारा, टस्कनी और दक्षिण भारतीय ग्रेनाइट खदानों से प्रथम श्रेणी के स्लैब। हम अपनी फैक्ट्री में पूर्ण ड्राई-ले लेआउट स्टेजिंग करते हैं, प्रत्येक स्लैब को नंबर देकर तस्वीरें साझा करते हैं ताकि साइट पर आने से पहले प्राकृतिक नसें शानदार डायमंड और बटरफ्लाई पैटर्न में मिलें।",
    badge: "क्यूरेटेड स्लैब्स",
    specs: {
      thickness: "18 मिमी – 20 मिमी कैलिब्रेटेड",
      dimensions: "3200 × 1950 मिमी तक जंबो स्लैब · कट-टू-साइज",
      finishes: ["मिरर पॉलिश", "लेदर्ड / रिवर-वॉश", "सैटिन होन्ड"],
      applications: [
        "बंगला लिविंग व डाइनिंग हॉल",
        "पेंटहाउस मास्टर सुइट्स",
        "होटल कॉरिडोर व लॉबी",
        "भव्य सीढ़ियां",
      ],
      quarryOrigin: "कैरारा व टस्कनी (इटली), बैंगलोर व उदयपुर (भारत)",
    },
    highlights: [
      "निर्बाध वेन निरंतरता के लिए लगातार क्रमबद्ध स्लैब नंबरिंग",
      "व्हाट्सएप पर अप्रूवल हेतु फैक्ट्री ड्राई-ले वीडियो",
      "शून्य ट्रांजिट क्रैकिंग हेतु रेजिन-प्रबलित बैक नेटिंग",
      "उच्च रासायनिक प्रतिरोध व खरोंच प्रतिरोधी मजबूती",
    ],
  },
  table_tops_countertops: {
    name: "टेबल टॉप्स व काउंटरटॉप्स",
    categoryLabel: "मोनोलिथिक फर्नीचर",
    tagline: "लक्जरी डाइनिंग टेबल, किचन वॉटरफॉल आइलैंड व स्टोन वैनिटी काउंटर",
    luxurySubtitle: "सीमलेस 45° मिटर्ड वॉटरफॉल एज · स्थायी एंटी-एच सीलिंग",
    description:
      "ठोस प्राकृतिक पत्थर की डाइनिंग सतहें, एग्जीक्यूटिव बोर्डरूम डेस्क और पाक कला के लिए वॉटरफॉल किचन आइलैंड। 45-डिग्री बुकमैच्ड मिटर्ड ड्रॉप किनारों के साथ हस्त-निर्मित ताकि भारी एकल-ब्लॉक का अहसास हो। यह हल्दी, नींबू, वाइन और तेल के दागों से सुरक्षित रहता है।",
    badge: "लक्जरी मोनोलिथ",
    specs: {
      thickness: "20 मिमी सॉलिड स्लैब + 40–80 मिमी मिटर्ड एप्रन",
      dimensions: "3.4 मीटर तक सीमलेस कस्टम लंबाई",
      finishes: ["डीप ग्लॉस पॉलिश", "टैक्टाइल लेदर्ड", "वेलवेट होन्ड"],
      applications: [
        "8–14 सीटर लक्जरी डाइनिंग टेबल",
        "किचन वॉटरफॉल सेंटर आइलैंड",
        "बाथरूम वैनिटी काउंटर",
        "एग्जीक्यूटिव बोर्डरूम टेबल",
      ],
      quarryOrigin: "एक्सोटिक ब्राजीलियन क्वार्टजाइट व इटैलियन कैलाकट्टा",
    },
    highlights: [
      "वेन रैपिंग के साथ सटीक 45° मिटर्ड एज",
      "सीएनसी अंडरमाउंट सिंक व हॉब कटआउट्स",
      "गर्म बर्तनों और भाप के प्रति थर्मल प्रतिरोध",
      "फूड-ग्रेड नैनो बैरियर से फैक्ट्री में प्री-सील्ड",
    ],
  },
  agate_semi_precious: {
    name: "एगेट व सेमी-प्रेशियस स्लैब्स",
    categoryLabel: "ट्रांसलूसेंट जेमस्टोन्स",
    tagline: "बार काउंटर और प्रवेश फ़ोयर के लिए बैकलिट ट्रांसलूसेंट लक्जरी क्वार्ट्ज स्लैब्स",
    luxurySubtitle: "प्राकृतिक वाइल्ड एगेट व हनी गोमेद · अलौकिक एम्बिएंट रोशनी",
    description:
      "आंतरिक विलासिता का शिखर। हाथ से छांटे गए अर्ध-कीमती रत्न—नीला एगेट, गोल्डन टाइगर-आई, एमेथिस्ट क्रिस्टल और हनी ओनिक्स—ऑप्टिकल-ग्रेड क्रिस्टल रेजिन से ठोस स्लैब में ढाले गए। डिफ्यूज्ड एलईडी पैनल के साथ यह पत्थर मनमोहक चमक और गहराई बिखेरता है।",
    badge: "रत्न आभूषण पत्थर",
    specs: {
      thickness: "15 मिमी – 20 मिमी ट्रांसलूसेंट कंपोजिट",
      dimensions: "2800 × 1500 मिमी तक स्लैब · कस्टम कट",
      finishes: ["ज्वैलर्स मिरर पॉलिश", "स्क्रैच-रेसिस्टेंट रेजिन सील"],
      applications: [
        "इल्युमिनेटेड कॉकटेल व बार काउंटर",
        "फीचर रिसेप्शन पोर्टल्स",
        "मास्टर पाउडर रूम दीवारें",
        "प्रीमियम बेडहेड एक्सेंट्स",
      ],
      quarryOrigin: "मेडागास्कर व भारतीय एगेट, ईरानी हनी ओनिक्स",
    },
    highlights: [
      "समान बैकलाइटिंग के लिए उच्च प्रकाश-संचरण सूचकांक",
      "100% प्रामाणिक सेमी-प्रेशियस क्वार्ट्ज क्रिस्टल रत्न",
      "शून्य सरंध्रता सतह जो वाइन या तेल नहीं सोखती",
      "अनुरोध पर कस्टम एलईडी लाइट डिफ्यूज़र किट उपलब्ध",
    ],
  },
  stepping_stones_landscaping: {
    name: "स्टेपिंग स्टोन्स व लैंडस्केप",
    categoryLabel: "आउटडोर व लैंडस्केप्स",
    tagline: "प्राकृतिक गार्डन कोबल्स, फ्लैगस्टोन, पेवर्स व वाटर फीचर बोल्डर्स",
    luxurySubtitle: "नॉन-स्लिप R11/R12 प्राकृतिक रूप · मौसम-प्रतिरोधी वास्तुकला",
    description:
      "हस्त-निर्मित अनियमित क्रेजी पेवर्स, कैलिब्रेटेड गार्डन स्टेपिंग फ्लैगस्टोन्स, ग्रेनाइट ड्राइववे कोबल्स और विशाल वाटर-फीचर बोल्डर्स। भारी वाहनों का भार, स्विमिंग पूल की नमी और तेज धूप सहन करने के लिए विशेष रूप से तैयार किए गए।",
    badge: "ऑर्गेनिक लैंडस्केप",
    specs: {
      thickness: "25 मिमी से 50 मिमी हैवी-ड्यूटी कैलिब्रेटेड",
      dimensions: "प्राकृतिक क्रेजी शेप्स · कैलिब्रेटेड 300×300 से 900×600 मिमी",
      finishes: ["नेचुरल क्लेफ्ट", "फ्लेम्ड एंटी-स्लिप", "टंबल्ड एंटीक", "वॉटरजेट ग्रिप्ड"],
      applications: [
        "विला गार्डन पाथवे",
        "स्विमिंग पूल कोपिंग व डेक",
        "कोर्टयार्ड क्रेजी पेविंग",
        "हैवी-ड्यूटी ड्राइववे कोबल्स",
      ],
      quarryOrigin: "कोटा, कांदला ग्रे, तांदूर व बैंगलोर ग्रेनाइट",
    },
    highlights: [
      "पानी में भी प्राकृतिक R11–R12 एंटी-स्लिप रेटिंग",
      "भारी वाहन आवागमन के लिए उच्च लचीली ताकत",
      "पूल डेक के लिए क्लोरीन और खारे पानी प्रतिरोधी",
      "कच्चे प्राकृतिक किनारे जो हरियाली में सहजता से घुलमिल जाते हैं",
    ],
  },
  pu_decorative_panels: {
    name: "पीयू डेकोरेटिव पैनल्स",
    categoryLabel: "अल्ट्रा-लाइटवेट एक्सेंट्स",
    tagline: "अल्ट्रा-लाइटवेट, त्वरित-माउंट हाई-डेफिनिशन फॉक्स स्टोन रेप्लिका पैनल्स",
    luxurySubtitle: "हाई-डेंसिटी पॉलीयुरेथेन तकनीक · ठोस पत्थर से 1/10वां वजन",
    description:
      "प्रामाणिक रॉकफेस और ऐशलर पत्थरों से ढाला गया हाई-डेंसिटी स्ट्रक्चरल पॉलीयुरेथेन। क्लास-बी अग्नि प्रतिरोध और 100% नमी प्रतिरोध के साथ इसका वजन मात्र 3.5 किग्रा/वर्गमीटर है। हल्के जिप्सम पार्टिशन और ऊंची इमारतों के लिए आदर्श जहां भारी पत्थर लगाना संभव नहीं है।",
    badge: "मॉडर्न लाइटवेट",
    specs: {
      thickness: "30 मिमी से 80 मिमी गहरी 3D रिलीफ",
      dimensions: "1200 × 600 मिमी · 2400 × 1200 मिमी हाई-स्पीड पैनल्स",
      weight: "लगभग 3.2 – 3.8 किग्रा / वर्गमीटर",
      finishes: ["नॉर्डिक व्हाइट रॉकफेस", "चारकोल स्लेट", "वेदर्ड सैंडस्टोन"],
      applications: [
        "अपार्टमेंट ड्राईवॉल फीचर दीवारें",
        "फास्ट-ट्रैक रेस्टोरेंट व रिटेल फिटआउट",
        "हाई-राइज सीलिंग एक्सेंट्स",
        "बेसमेंट नवीनीकरण",
      ],
      quarryOrigin: "यूवी ऐक्रेलिक कोटेड प्रिसिजन मोल्डेड हाई-डेंसिटी पीयू",
    },
    highlights: [
      "अल्ट्रा-लाइटवेट — स्क्रू के साथ सीधे ड्राईवॉल पर माउंट होता है",
      "साइट पर शून्य पत्थर कटिंग धूल या गीली चिनाई की गंदगी",
      "पैनल कोर में अंतर्निहित थर्मल और ध्वनिक इन्सुलेशन",
      "आंतरिक अनुप्रयोगों के लिए नमी-रोधी और कीट-प्रतिरोधी",
    ],
  },
  // Backward compatibility aliases
  temple_work_handcrafting: {
    name: "मंदिर निर्माण व हस्तशिल्प",
    categoryLabel: "पवित्र मंदिर वास्तुकला",
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
      "વાસ્તવિક નેચરલ સ્લેટ અને ક્વાર્ટઝાઇટને એરોસ્પેસ-ગ્રેડ ફાઇબરગ્લાસ રેઝિન સાથે મજબૂત બનાવવામાં આવી છે. 1.8 કિગ્રા/ચો.મી. કરતાં ઓછા વજનમાં કુદરતી પથ્થરનો અદ્ભુત સ્પર્શ અને ટેક્ષ્ચર આપે છે. વળાંકવાળા સ્તંભો, સીલિંગ અને ફર્નિચર પર સરળતાથી ફિટ થાય છે.",
    badge: "આર્કિટેક્ચરલ ઇનોવેશન",
    specs: {
      thickness: "1.5 મીમી – 2.0 મીમી અલ્ટ્રા-સ્લિમ",
      dimensions: "1220 × 610 મીમી · જમ્બો 2440 × 1220 મીમી શીટ્સ",
      weight: "આશરે 1.5 – 1.8 કિગ્રા / ચો.મી.",
      finishes: ["નેચરલ 3D રીવેન", "ટ્રાન્સલુસન્ટ (બેકલીટ)", "નેનો-સીલ્ડ મેટ"],
      applications: [
        "વળાંકવાળા સ્તંભો",
        "લિવિંગ રૂમ ટીવી વોલ",
        "સીલિંગ સોફિટ્સ",
        "કબાટ અને દરવાજા રેપિંગ",
      ],
      quarryOrigin: "દેવલી અને કુંડ સ્લેટ બેલ્ટ, રાજસ્થાન",
    },
    highlights: [
      "100% અસલી કુદરતી ક્વોરી સ્ટોન",
      "50 મીમી ત્રિજ્યા સુધીના ગોળાકાર સ્તંભો પર સરળતાથી વળે",
      "એલઇડી બેકલાઇટિંગ સાથે પારભાસક રોશની",
      "સ્ટાન્ડર્ડ પોલીમર એડહેસિવ્સથી સરળ ઇન્સ્ટોલેશન",
    ],
  },
  custom_stone_cladding: {
    name: "કસ્ટમ સ્ટોન ક્લેડીંગ",
    categoryLabel: "એક્સટીરિયર અને ફેસડેસ",
    tagline: "બહારના એલિવેશન અને આંતરિક 3D ટેક્ષ્ચર ફીચર વોલ્સ",
    luxurySubtitle: "થર્મલ-માસ હેન્ડ-કાર્વ્ડ ચણતર · કાલાતીત સ્થાપત્ય ભવ્યતા",
    description:
      "સોલિડ સેન્ડસ્ટોન, લાઇમસ્ટોન અને ગ્રેનાઇટ ક્લેડીંગ ટાઇલ્સ જે ઊંડી છાયા અને આર્કિટેક્ચરલ લુક આપે છે. રાજસ્થાનની પ્રમાણિત ખાણોમાંથી મેળવેલ, દરેક બ્લોક ભારે વરસાદ અને તાપમાન સામે રક્ષણ આપે છે.",
    badge: "હેરિટેજ એલિવેશન",
    specs: {
      thickness: "20 મીમી – 75 મીમી ઊંડાઈ રીલિફ",
      dimensions: "કસ્ટમ મોડ્યુલર સાઇઝ · 300×150 થી 1200×600 મીમી",
      finishes: [
        "હેન્ડ-ચીઝલ્ડ રોકફેસ",
        "બુશ હેમર્ડ",
        "શોટ બ્લાસ્ટેડ",
        "સ્પ્લિટફેસ",
        "એન્ટિક સેન્ડસ્ટોન",
      ],
      applications: [
        "બંગલો અને વિલા એલિવેશન ફેસડેસ",
        "ડબલ-હાઇટ એટ્રીયમ વોલ્સ",
        "ભવ્ય બાઉન્ડ્રી વોલ્સ",
        "કોર્ટયાર્ડ વોટરફોલ્સ",
      ],
      quarryOrigin: "ધોલપુર, કાંડલા, જોધપુર અને ગ્વાલિયર ક્વોરી",
    },
    highlights: [
      "ઝીરો થર્મલ ડિસકલરેશન અને યુવી સુરક્ષિત",
      "ડ્રાય અથવા વેટ મિકેનિકલ એન્કરિંગ વિકલ્પો",
      "ઊંડી રીલિફથી કુદરતી સોલર શેડિંગ અને સાઉન્ડ કંટ્રોલ",
      "ફેક્ટરીમાં વેઇન અને ટોન મેચિંગ સાથે સૉર્ટ કરેલ",
    ],
  },
  interlocking_panels: {
    name: "ઇન્ટરલોકિંગ પેનલ્સ",
    categoryLabel: "મોડ્યુલર વોલ ફેસડેસ",
    tagline: "સીમલેસ 3D ટેક્ષ્ચર્ડ લેજસ્ટોન અને ઇન્ટરલોકિંગ એલિવેશન પેનલ્સ",
    luxurySubtitle: "મોર્ટારલેસ Z-લૉક ચોકસાઈ · અખંડ સ્ટેક્ડ-સ્ટોન લુક",
    description:
      "મોડ્યુલર ઇન્ટરલોકિંગ Z-આકારના એકમોમાં જોડાયેલ કુદરતી પથ્થરની પટ્ટીઓ. ફિંગર-જોઇન્ટેડ સિસ્ટમ સાંધાઓને સંપૂર્ણપણે છુપાવે છે, જેથી એક સળંગ નેચરલ સ્ટોનની દીવાલ બને છે જે ઘર અને ઓફિસને ભવ્ય બનાવે છે.",
    badge: "સીમલેસ ચણતર",
    specs: {
      thickness: "15 મીમી – 35 મીમી મલ્ટી-પ્લેન રીલિફ",
      dimensions: "600 × 150 મીમી · 600 × 200 મીમી ઇન્ટરલોકિંગ Z-મોડ્યુલ્સ",
      finishes: ["સ્પ્લિટફેસ લેજસ્ટોન", "મલ્ટી-લેયર્ડ હોન્ડ", "રસ્ટિક ક્વાર્ટઝાઇટ"],
      applications: [
        "ફોયર ફોકલ વોલ્સ",
        "ફાયરપ્લેસ સરાઉન્ડ્સ",
        "બાલ્કની અને ટેરેસ ફીચર્સ",
        "એક્સટીરિયર બાઉન્ડ્રી વોલ્સ",
      ],
      quarryOrigin: "ઉત્તર ભારતીય સ્લેટ અને ક્વાર્ટઝાઇટ ફોર્મેશન્સ",
    },
    highlights: [
      "ફિટિંગ પછી કોઈ વર્ટિકલ સાંધા દેખાતા નથી",
      "ઝડપી ડ્રાય-વોલ અને ચણતર ઉપયોગ",
      "નેચરલ મલ્ટી-ટોન લાઇટ રિફ્લેક્શન",
      "ફેક્ટરીમાં હાઇ-શીયર ઇપોક્સી સાથે એસેમ્બલ કરેલ",
    ],
  },
  stone_murals_carvings: {
    name: "સ્ટોન મ્યુરલ્સ અને કોતરણી",
    categoryLabel: "આધ્યાત્મિક અને લલિત કલા",
    tagline: "સીએનસી 3D કોતરણીવાળા મંદિર, કલાત્મક જાળીઓ અને વોલ સ્કલ્પચર્સ",
    luxurySubtitle: "5-એક્સિસ સીએનસી ચોકસાઈ અને કુશળ કારીગરોની હાથની કલા",
    description:
      "સેન્ડસ્ટોન, શુદ્ધ મકરાણા માર્બલ અને વિદેશી લાઇમસ્ટોનમાં કંડારેલી ભક્તિમય કલાકૃતિઓ અને મ્યુરલ્સ. 5-એક્સિસ સીએનસી અને રાજસ્થાની કારીગરોની પરંપરાથી સુંદર ગર્ભગૃહ, સ્તંભો અને કલાત્મક જાળીઓ બને છે.",
    badge: "અનન્ય માસ્ટરપીસ",
    specs: {
      thickness: "30 મીમી થી 100 મીમી મોનોલિથિક રીલિફ",
      dimensions: "10 × 6 ફૂટ સુધીના સિંગલ પેનલ્સ · કસ્ટમ સાઇઝ",
      finishes: ["ફાઇન ચીઝલ્ડ", "હોન્ડ સેટિન", "ગોલ્ડ લીફ એક્સેન્ટ્સ", "સેન્ડબ્લાસ્ટેડ રીલિફ"],
      applications: [
        "કસ્ટમ હોમ મંદિર",
        "મંદિર ગર્ભગૃહ અને ગોખલા",
        "ડબલ-હાઇટ આધ્યાત્મિક વોલ્સ",
        "જાળી પાર્ટીશન",
      ],
      quarryOrigin: "મકરાણા વ્હાઇટ (રાજસ્થાન) અને ધોલપુર પિંક/બેજ",
    },
    highlights: [
      "ઊંડી 3D કોતરણી અને દિવ્ય મૂર્તિઓ",
      "બ્લૂપ્રિન્ટ મુજબ સીએડી-ટુ-સ્ટોન ચોકસાઈ",
      "પૂજા તેલ અને ધુમાડા સામે રક્ષણ આપતો શુદ્ધ માર્બલ",
      "પેકિંગ પહેલાં ફેક્ટરીમાં ડ્રાય-એસેમ્બલી ટ્રાયલ",
    ],
  },
  stone_mosaics_inlay: {
    name: "સ્ટોન મોઝેક અને ઇનલે",
    categoryLabel: "શાહી ઇનલે હસ્તકલા",
    tagline: "વોટરજેટ મેડાલિયન, ફ્લોરલ ફ્લોર ઇનલે અને બ્રાસ બોર્ડર્સ",
    luxurySubtitle: "સબ-મિલીમીટર વોટરજેટ કટીંગ · શુદ્ધ પિત્તળ અને સેમી-પ્રેશિયસ પથ્થરો",
    description:
      "શાહી પિયેટ્રા ડ્યુરા કલાનું આધુનિક એન્જિનિયરિંગ સ્વરૂપ. હાઇ-પ્રેશર વોટરજેટથી ઇટાલિયન માર્બલ, વિદેશી ગ્રેનાઇટ અને પિત્તળની પટ્ટીઓને 0.2 મીમીની ચોકસાઈથી કાપીને ભવ્ય ફ્લોરિંગ તૈયાર કરાય છે.",
    badge: "હોટ ઇનલે આર્ટ",
    specs: {
      thickness: "18 મીમી – 20 મીમી ફ્લોરિંગ સ્ટાન્ડર્ડ",
      dimensions: "3 ફૂટ થી 15 ફૂટ વ્યાસ સુધીના કસ્ટમ મેડાલિયન",
      finishes: ["મિરર હાઇ-ગ્લોસ પોલિશ", "હોન્ડ સિલ્ક", "બ્રશ્ડ બ્રાસ બોર્ડર્સ"],
      applications: [
        "ભવ્ય એન્ટ્રન્સ ફોયર",
        "આલીશાન લિવિંગ રૂમ કાર્પેટ",
        "માસ્ટર સ્યુટ મેડાલિયન",
        "હોટેલ લોબી સેન્ટરપીસ",
      ],
      quarryOrigin: "ઇટાલિયન સ્ટેચ્યુઆરિયો, કેરેરા, મકરાણા વ્હાઇટ અને ફોરેસ્ટ ગ્રીન",
    },
    highlights: [
      "શૂન્ય જોઈન્ટ ઓફસેટ (<0.2 મીમી) સાથે સીમલેસ ફિટ",
      "સોલિડ શુદ્ધ પિત્તળ અને મોતીના છીપનું સંયોજન",
      "સરળ એલાઇનમેન્ટ માટે ફાઇબરગ્લાસ મેશ પર સપ્લાય",
      "ડાઘ-પ્રતિરોધક ઔદ્યોગિક સીલરથી સંપૂર્ણ પોલિશ્ડ",
    ],
  },
  marble_granite_flooring: {
    name: "કસ્ટમ ફ્લોરિંગ",
    categoryLabel: "ફ્લોરિંગ અને લાર્જ સ્લેબ્સ",
    tagline: "આયાતી ઇટાલિયન માર્બલ, પ્રીમિયમ ગ્રેનાઇટ અને ડ્રાય-લે વેઇન મેચિંગ",
    luxurySubtitle: "સિંગલ-બ્લોક સ્લેબ્સ · ગેરેંટીડ ડાયમંડ બુકમેચિંગ",
    description:
      "કેરેરા, ટસ્કની અને દક્ષિણ ભારતની ખાણોમાંથી પ્રીમિયમ સ્લેબ્સ. ફેક્ટરીમાં સંપૂર્ણ ડ્રાય-લે સ્ટેજિંગ કરી સ્લેબ્સને નંબર અપાય છે જેથી સાઇટ પર પહોંચતા જ કુદરતી નસો સુંદર ડાયમંડ અને બટરફ્લાય પેટર્નમાં ગોઠવાય.",
    badge: "ક્યુરેટેડ સ્લેબ્સ",
    specs: {
      thickness: "18 મીમી – 20 મીમી કેલિબ્રેટેડ",
      dimensions: "3200 × 1950 મીમી સુધી જમ્બો સ્લેબ · કટ-ટુ-સાઇઝ",
      finishes: ["મિરર પોલિશ", "લેધર્ડ / રિવર-વોશ્ડ", "સેટિન હોન્ડ"],
      applications: [
        "બંગલો લિવિંગ અને ડાઇનિંગ પેવેલિયન",
        "પેન્ટહાઉસ માસ્ટર સ્યુટ્સ",
        "હોટેલ લોબી",
        "ભવ્ય દાદર",
      ],
      quarryOrigin: "કેરેરા અને ટસ્કની (ઇટાલી), બેંગલોર અને ઉદયપુર (ભારત)",
    },
    highlights: [
      "એકસમાન વેઇન માટે ક્રમિક સ્લેબ નંબરિંગ",
      "વોટ્સએપ પર મંજૂરી માટે ફેક્ટરી ડ્રાય-લે વિડિયો",
      "તૂટફૂટ અટકાવવા રેઝિન-રિઇન્ફોર્સ્ડ બેક નેટિંગ",
      "ઉચ્ચ કેમિકલ અને સ્ક્રેચ પ્રતિકારક શક્તિ",
    ],
  },
  table_tops_countertops: {
    name: "ટેબલ ટોપ્સ અને કાઉન્ટરટોપ્સ",
    categoryLabel: "મોનોલિથિક ફર્નિચર",
    tagline: "લક્ઝરી ડાઇનિંગ ટેબલ, કિચન વોટરફોલ આઇલેન્ડ અને વેનિટી કાઉન્ટર",
    luxurySubtitle: "સીમલેસ 45° મીટર્ડ વોટરફોલ કિનારી · એન્ટિ-એચ સીલિંગ",
    description:
      "નેચરલ સ્ટોનના સોલિડ ડાઇનિંગ ટેબલ્સ, એક્ઝિક્યુટિવ બોર્ડરૂમ ડેસ્ક અને કિચન વોટરફોલ આઇલેન્ડ્સ. 45-ડિગ્રી બુકમેચ્ડ મીટર્ડ એજ સાથે સુંદર ફિનિશિંગ. લીંબુ, હળદર, વાઇન અને તેલના ડાઘ સામે રક્ષણ આપતું ફૂડ-સેફ સીલર.",
    badge: "લક્ઝરી મોનોલિથ",
    specs: {
      thickness: "20 મીમી સોલિડ સ્લેબ + 40–80 મીમી મીટર્ડ એપ્રોન",
      dimensions: "3.4 મીટર સુધી સીમલેસ કસ્ટમ લંબાઈ",
      finishes: ["ડીપ ગ્લોસ પોલિશ", "ટેક્ટાઇલ લેધર્ડ", "વેલ્વેટ હોન્ડ"],
      applications: [
        "8–14 સીટર લક્ઝરી ડાઇનિંગ ટેબલ",
        "કિચન વોટરફોલ સેન્ટર આઇલેન્ડ",
        "બાથરૂમ વેનિટી કાઉન્ટર",
        "એક્ઝિક્યુટિવ બોર્ડરૂમ ડેસ્ક",
      ],
      quarryOrigin: "એક્ઝોટિક બ્રાઝિલિયન ક્વાર્ટઝાઇટ અને ઇટાલિયન કેલાકાટ્ટા",
    },
    highlights: [
      "વેઇન રેપિંગ સાથે ચોક્કસ 45° મીટર્ડ એજ",
      "સીએનસી અંડરમાઉન્ટ સિંક અને હોબ કટઆઉટ્સ",
      "ગરમ વાસણો અને વરાળ સામે થર્મલ પ્રતિકાર",
      "ફૂડ-ગ્રેડ નેનો બેરિયર સાથે ફેક્ટરી પ્રી-સીલ્ડ",
    ],
  },
  agate_semi_precious: {
    name: "એગેટ અને સેમી-પ્રેશિયસ સ્લેબ્સ",
    categoryLabel: "ટ્રાન્સલુસન્ટ રત્ન પથ્થરો",
    tagline: "બાર કાઉન્ટર અને ફોયર માટે બેકલીટ ટ્રાન્સલુસન્ટ લક્ઝરી ક્વાર્ટ્ઝ સ્લેબ્સ",
    luxurySubtitle: "નેચરલ વાઇલ્ડ એગેટ અને હની ઓનિક્સા · દિવ્ય એમ્બિયન્ટ લાઇટિંગ",
    description:
      "ઇન્ટિરિયર લક્ઝરીનું શિખર. હાથથી ચૂંટેલા અર્ધ-કિંમતી રત્નો—બ્લુ એગેટ, ટાઇગર-આઇ, એમેથિસ્ટ અને હની ઓનિક્સ—પારદર્શક રેઝિનમાં જોડીને બનાવેલા સ્લેબ્સ. એલઇડી લાઇટિંગ સાથે મંત્રમુગ્ધ કરનારી રોશની ફેલાવે છે.",
    badge: "રત્ન જડિત પથ્થર",
    specs: {
      thickness: "15 મીમી – 20 મીમી ટ્રાન્સલુસન્ટ કમ્પોઝિટ",
      dimensions: "2800 × 1500 મીમી સુધી સ્લેબ્સ · કસ્ટમ કટ",
      finishes: ["જ્વેલર્સ મિરર પોલિશ", "સ્ક્રેચ-રેઝિસ્ટન્ટ રેઝિન સીલ"],
      applications: [
        "બેકલીટ કોકટેલ અને બાર કાઉન્ટર",
        "રિસેપ્શન પોર્ટલ",
        "માસ્ટર પાવડર રૂમ વોલ્સ",
        "બેડહેડ ફીચર વોલ્સ",
      ],
      quarryOrigin: "મેડાગાસ્કર અને ભારતીય એગેટ, ઈરાની હની ઓનિક્સ",
    },
    highlights: [
      "એકસમાન રોશની માટે ઉચ્ચ લાઇટ-ટ્રાન્સમિશન",
      "100% અસલી સેમી-પ્રેશિયસ ક્વાર્ટઝ ક્રિસ્ટલ્સ",
      "ઝીરો પોરોસિટી જેથી ડાઘ કે વાઇન શોષાતા નથી",
      "વિનંતી પર કસ્ટમ એલઇડી ડિફ્યુઝર કિટ ઉપલબ્ધ",
    ],
  },
  stepping_stones_landscaping: {
    name: "સ્ટેપિંગ સ્ટોન્સ અને લેન્ડસ્કેપ",
    categoryLabel: "આઉટડોર અને લેન્ડસ્કેપ્સ",
    tagline: "નેચરલ ગાર્ડન કોબલ્સ, ફ્લેગસ્ટોન, પેવર્સ અને બોલ્ડર્સ",
    luxurySubtitle: "નોન-સ્લિપ R11/R12 કુદરતી રચના · તમામ ઋતુઓમાં સુરક્ષિત",
    description:
      "હાથથી બનાવેલા અનિયમિત ક્રેઝી પેવર્સ, ગાર્ડન સ્ટેપિંગ ફ્લેગસ્ટોન, ગ્રેનાઇટ ડ્રાઇવવે કોબલ્સ અને મોટા વોટર-બોલ્ડર્સ. વાહનોનો ભાર, સ્વિમિંગ પૂલનો ભેજ અને સૂર્યતાપ સહન કરવા ખાસ તૈયાર.",
    badge: "ઓર્ગેનિક લેન્ડસ્કેપ",
    specs: {
      thickness: "25 મીમી થી 50 મીમી હેવી-ડ્યુટી કેલિબ્રેટેડ",
      dimensions: "નેચરલ ક્રેઝી આકારો · કેલિબ્રેટેડ 300×300 થી 900×600 મીમી",
      finishes: ["નેચરલ ક્લેફ્ટ", "ફ્લેમ્ડ એન્ટિ-સ્લિપ", "ટમ્બલ્ડ એન્ટિક", "વોટરજેટ ગ્રિપ્ડ"],
      applications: [
        "વિલા ગાર્ડન પાથવે",
        "સ્વિમિંગ પૂલ ડેક અને કોપિંગ",
        "કોર્ટયાર્ડ ક્રેઝી પેવિંગ",
        "હેવી-ડ્યુટી ડ્રાઇવવે કોબલ્સ",
      ],
      quarryOrigin: "કોટા, કાંડલા ગ્રે, તાંદૂર અને બેંગલોર ગ્રેનાઇટ",
    },
    highlights: [
      "પાણીમાં પણ નેચરલ R11–R12 નોન-સ્લિપ રેટિંગ",
      "ભારે વાહનો માટે ઉચ્ચ મજબૂતાઈ",
      "ક્લોરીન અને ખારા પાણી સામે પ્રતિરોધક",
      "કુદરતી કિનારીઓ જે બગીચાની હરિયાળી સાથે ભળી જાય છે",
    ],
  },
  pu_decorative_panels: {
    name: "પીયુ ડેકોરેટિવ પેનલ્સ",
    categoryLabel: "અલ્ટ્રા-લાઇટવેઇટ એક્સેન્ટ્સ",
    tagline: "અલ્ટ્રા-લાઇટવેઇટ, ઝડપી ફિટિંગ હાઇ-ડેફિનેશન ફોક્સ સ્ટોન પેનલ્સ",
    luxurySubtitle: "હાઇ-ડેન્સિટી પોલીયુરેથેન ટેકનોલોજી · સોલિડ સ્ટોન કરતાં 1/10 વજન",
    description:
      "કુદરતી પથ્થરોના મોલ્ડમાંથી બનેલ હાઇ-ડેન્સિટી પોલીયુરેથેન. ક્લાસ-બી ફાયર રેઝિસ્ટન્ટ અને ભેજ સામે 100% રક્ષણ સાથે વજન માત્ર 3.5 કિગ્રા/ચો.મી. જીપ્સમ પાર્ટીશન અને હાઇ-રાઇઝ એપાર્ટમેન્ટ્સ માટે શ્રેષ્ઠ જ્યાં ભારે પથ્થર લગાવી શકાતો નથી.",
    badge: "મોડર્ન લાઇટવેઇટ",
    specs: {
      thickness: "30 મીમી થી 80 મીમી ઊંડી 3D રીલિફ",
      dimensions: "1200 × 600 મીમી · 2400 × 1200 મીમી હાઇ-સ્પીડ પેનલ્સ",
      weight: "આશરે 3.2 – 3.8 કિગ્રા / ચો.મી.",
      finishes: ["નોર્ડિક વ્હાઇટ રોકફેસ", "ચારકોલ સ્લેટ", "વેધર્ડ સેન્ડસ્ટોન"],
      applications: [
        "એપાર્ટમેન્ટ ડ્રાયવોલ ફીચર વોલ્સ",
        "રેસ્ટોરન્ટ અને શોરૂમ ફિટઆઉટ્સ",
        "હાઇ-રાઇઝ સીલિંગ એક્સેન્ટ્સ",
        "બેઝમેન્ટ રિનોવેશન",
      ],
      quarryOrigin: "યુવી એક્રેલિક કોટેડ હાઇ-ડેન્સિટી પીયુ",
    },
    highlights: [
      "અલ્ટ્રા-લાઇટવેઇટ — સ્ક્રૂ વડે ડ્રાયવોલ પર સીધું ફિટ થાય",
      "સાઇટ પર પથ્થર કટીંગની ધૂળ કે કાદવ-કચરા વગર સ્વચ્છ કામ",
      "પેનલમાં કુદરતી થર્મલ અને સાઉન્ડ ઇન્સ્યુલેશન",
      "ભેજ-મુક્ત અને ઉધઈ-પ્રતિરોધક",
    ],
  },
  // Backward compatibility aliases
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
  if (code === "hi") {
    if (HINDI_PRODUCT_MAP[nameOrId]) return HINDI_PRODUCT_MAP[nameOrId].name;
    const matchHi = Object.entries(HINDI_PRODUCT_MAP).find(
      ([id, v]) => id === nameOrId || v.name === nameOrId,
    );
    if (matchHi) return matchHi[1].name;
    if (LUXURY_SHOWCASE_HI[nameOrId]) return LUXURY_SHOWCASE_HI[nameOrId].name;
  }
  if (code === "gu") {
    if (GUJARATI_PRODUCT_MAP[nameOrId]) return GUJARATI_PRODUCT_MAP[nameOrId].name;
    const matchGu = Object.entries(GUJARATI_PRODUCT_MAP).find(
      ([id, v]) => id === nameOrId || v.name === nameOrId,
    );
    if (matchGu) return matchGu[1].name;
    if (LUXURY_SHOWCASE_GU[nameOrId]) return LUXURY_SHOWCASE_GU[nameOrId].name;
  }
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
      const match = LUXURY_SHOWCASE_HI[item.id] || LUXURY_SHOWCASE_HI[item.name];
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
      const match = LUXURY_SHOWCASE_GU[item.id] || LUXURY_SHOWCASE_GU[item.name];
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

export interface LocalizedReview {
  quote: string;
  author: string;
  role: string;
  rating: number;
}

const REVIEWS_HI: LocalizedReview[] = [
  {
    quote:
      "हमारे विला के फ्लूटेड स्टोन एलिवेशन पर उत्कृष्ट शिल्प कौशल। स्टोन टेक द्वारा प्रदान की गई ड्राई-ले मैचिंग और सब-मिलीमीटर सटीकता त्रुटिहीन थी।",
    author: "आर्किटेक्ट मिहिर पटेल",
    role: "प्रधान वास्तुकार, अहमदाबाद",
    rating: 5,
  },
  {
    quote:
      "गोटा स्थित उनके एसजी बिजनेस हब शोरूम का दौरा किया। सीएनसी मंदिर म्यूरल्स और फ्लेक्सिबल स्टोन विनियर हमारी उम्मीदों से बढ़कर निकले। व्हाट्सएप पर अत्यंत त्वरित समन्वय।",
    author: "भाविन शाह",
    role: "गृहस्वामी, गोटा, अहमदाबाद",
    rating: 5,
  },
  {
    quote:
      "3 साल की वारंटी और शून्य ट्रांजिट टूट-फूट के साथ सीधे राजस्थान खदानों से आपूर्ति। हमारे लक्जरी आवासों के लिए सबसे विश्वसनीय प्राकृतिक पत्थर भागीदार।",
    author: "पूजा मेहता",
    role: "लक्जरी इंटीरियर डिजाइनर",
    rating: 5,
  },
];

const REVIEWS_GU: LocalizedReview[] = [
  {
    quote:
      "અમારા વિલાના ફ્લૂટેડ સ્ટોન એલિવેશન પર અસાધારણ કારીગરી. સ્ટોન ટેક દ્વારા આપવામાં આવેલ ડ્રાય-લે મેચિંગ અને સબ-મિલીમીટર ચોકસાઈ અદ્ભુત હતી.",
    author: "આર્કિટેક્ટ મિહિર પટેલ",
    role: "પ્રિન્સિપલ આર્કિટેક્ટ, અમદાવાદ",
    rating: 5,
  },
  {
    quote:
      "ગોટા સ્થિત તેમના એસજી બિઝનેસ હબ શોરૂમની મુલાકાત લીધી. સીએનસી મંદિર મ્યુરલ્સ અને ફ્લેક્સિબલ સ્ટોન વિનિયર અમારી અપેક્ષાઓ કરતાં વધુ સારા હતા. વોટ્સએપ પર અત્યંત ઝડપી સહયોગ.",
    author: "ભાવિન શાહ",
    role: "ઘરમાલિક, ગોટા, અમદાવાદ",
    rating: 5,
  },
  {
    quote:
      "3 વર્ષની વોરંટી અને શૂન્ય ટ્રાન્ઝિટ તૂટફૂટ સાથે સીધા રાજસ્થાનની ખાણોમાંથી સોર્સિંગ. અમારા લક્ઝરી પ્રોજેક્ટ્સ માટે સૌથી વિશ્વસનીય નેચરલ સ્ટોન પાર્ટનર.",
    author: "પૂજા મહેતા",
    role: "લક્ઝરી ઇન્ટિરિયર ડિઝાઇનર",
    rating: 5,
  },
];

export function getLocalizedReviews(
  baseReviews: { quote: string; author: string; role: string; rating: number }[],
  lang = "en",
): LocalizedReview[] {
  const code = lang?.substring(0, 2) || "en";
  if (code === "hi") {
    return baseReviews.map((rev, idx) => {
      const match = REVIEWS_HI[idx];
      if (!match) return rev;
      return {
        ...rev,
        quote: match.quote,
        author: match.author,
        role: match.role,
        rating: rev.rating ?? match.rating,
      };
    });
  }
  if (code === "gu") {
    return baseReviews.map((rev, idx) => {
      const match = REVIEWS_GU[idx];
      if (!match) return rev;
      return {
        ...rev,
        quote: match.quote,
        author: match.author,
        role: match.role,
        rating: rev.rating ?? match.rating,
      };
    });
  }
  return baseReviews;
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
