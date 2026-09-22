import fs from 'fs';
import path from 'path';

const hiPath = path.resolve('src/lib/i18n/locales/hi.json');
const guPath = path.resolve('src/lib/i18n/locales/gu.json');

const hiData = JSON.parse(fs.readFileSync(hiPath, 'utf-8'));
const guData = JSON.parse(fs.readFileSync(guPath, 'utf-8'));

hiData.dashboard = {
  ...hiData.dashboard,
  revenuePipeline: "राजस्व पाइपलाइन",
  outstandingReceivables: "बकाया प्राप्य",
  productionWorkload: "उत्पादन कार्यभार",
  orderBacklog: "ऑर्डर बैकलॉग",
  greeting: {
    morning: "सुप्रभात",
    afternoon: "शुभ दोपहर",
    evening: "शुभ संध्या"
  },
  aiCopilotDescStrong: "व्यवसाय मजबूती से चल रहा है। विकास पर ध्यान दें।",
  aiCopilotDescSteady: "स्थिर दिन। कुछ चीजों पर ध्यान देने की आवश्यकता है।",
  aiCopilotDescWeak: "कई जोखिम खुले हैं। पहले उनका समाधान करें।",
  cashToday: "आज की नकदी",
  toApprove: "अनुमोदित करने के लिए",
  overdue: "अतिदेय",
  quotesInPlay: "{{count}} उद्धरण चल रहे हैं",
  pendingCollections: "{{count}} लंबित संग्रह",
  urgentTasks: "{{count}} तत्काल कार्य",
  dispatchesToday: "{{count}} आज का डिस्पैच",
  briefQuiet: "सब कुछ शांत है। उत्पादन सामान्य रूप से चल रहा है।",
  briefNoUrgent: "कोई तत्काल कार्य नहीं। अगले सप्ताह की योजना बनाने का अच्छा समय।"
};

hiData.crm = {
  leadsTitle: "विज़िटर पूछताछ और CRM लीड्स",
  leadsSubtitle: "www.stonetech.in के माध्यम से सबमिट किए गए लाइव वेब विज़िटर अनुरोध",
  totalLeads: "कुल वेब लीड्स",
  newUncontacted: "नए संपर्क रहित",
  inDiscussion: "चर्चा / उद्धरण में",
  ordersWon: "ऑर्डर जीते गए",
  copyLink: "वेबसाइट लिंक कॉपी करें",
  viewFull: "पूरी CRM पाइपलाइन देखें",
  recentInquiries: "हाल की पूछताछ ({{total}} में से {{count}})",
  whatsappAvailable: "डायरेक्ट 1-क्लिक व्हाट्सएप चैट उपलब्ध",
  whatsapp: "व्हाट्सएप",
  details: "विवरण",
  noWhatsapp: "व्हाट्सएप नहीं",
  urgent: "तत्काल: {{days}} दिन शेष",
  pastDate: "पिछली तारीख",
  neededIn: "{{days}} दिन में आवश्यक",
  target: "लक्ष्य: {{date}}",
  photos: "📷 {{count}} तस्वीरें",
  prospectiveClient: "संभावित ग्राहक",
  inquiries: "पूछताछ",
  awaitingReply: "उत्तर की प्रतीक्षा में",
  active: "सक्रिय",
  converted: "परिवर्तित"
};

guData.dashboard = {
  ...guData.dashboard,
  revenuePipeline: "આવક પાઇપલાઇન",
  outstandingReceivables: "બાકી લેણાં",
  productionWorkload: "ઉત્પાદન કાર્યભાર",
  orderBacklog: "ઓર્ડર બેકલોગ",
  greeting: {
    morning: "શુભ સવાર",
    afternoon: "શુભ બપોર",
    evening: "શુભ સાંજ"
  },
  aiCopilotDescStrong: "વ્યવસાય મજબૂત ચાલી રહ્યો છે. વિકાસ પર ધ્યાન આપો.",
  aiCopilotDescSteady: "સ્થિર દિવસ. કેટલીક બાબતો પર ધ્યાન આપવાની જરૂર છે.",
  aiCopilotDescWeak: "ઘણા જોખમો ખુલ્લા છે. પહેલા તેમનો ઉકેલ લાવો.",
  cashToday: "આજની રોકડ",
  toApprove: "મંજૂર કરવા માટે",
  overdue: "બાકી",
  quotesInPlay: "{{count}} અવતરણ ચાલી રહ્યા છે",
  pendingCollections: "{{count}} પેન્ડિંગ કલેક્શન",
  urgentTasks: "{{count}} તાત્કાલિક કાર્યો",
  dispatchesToday: "{{count}} આજનું ડિસ્પેચ",
  briefQuiet: "બધું શાંત છે. ઉત્પાદન સામાન્ય રીતે ચાલી રહ્યું છે.",
  briefNoUrgent: "કોઈ તાત્કાલિક કાર્ય નથી. આવતા સપ્તાહની યોજના બનાવવાનો સારો સમય."
};

guData.crm = {
  leadsTitle: "મુલાકાતી પૂછપરછ અને CRM લીડ્સ",
  leadsSubtitle: "www.stonetech.in દ્વારા સબમિટ કરેલી લાઇવ વિનંતીઓ",
  totalLeads: "કુલ વેબ લીડ્સ",
  newUncontacted: "નવા સંપર્ક વગરના",
  inDiscussion: "ચર્ચા / અવતરણમાં",
  ordersWon: "ઓર્ડર જીત્યા",
  copyLink: "વેબસાઇટ લિંક કૉપિ કરો",
  viewFull: "સંપૂર્ણ CRM પાઇપલાઇન જુઓ",
  recentInquiries: "તાજેતરની પૂછપરછ ({{total}} માંથી {{count}})",
  whatsappAvailable: "ડાયરેક્ટ 1-ક્લિક વોટ્સએપ ચેટ ઉપલબ્ધ",
  whatsapp: "વોટ્સએપ",
  details: "વિગતો",
  noWhatsapp: "વોટ્સએપ નથી",
  urgent: "તાત્કાલિક: {{days}} દિવસ બાકી",
  pastDate: "ભૂતકાળની તારીખ",
  neededIn: "{{days}} દિવસમાં જરૂરી",
  target: "લક્ષ્ય: {{date}}",
  photos: "📷 {{count}} ફોટા",
  prospectiveClient: "સંભવિત ગ્રાહક",
  inquiries: "પૂછપરછ",
  awaitingReply: "જવાબની રાહ જોવાય છે",
  active: "સક્રિય",
  converted: "રૂપાંતરિત"
};

fs.writeFileSync(hiPath, JSON.stringify(hiData, null, 2));
fs.writeFileSync(guPath, JSON.stringify(guData, null, 2));
console.log("Locales updated!");
