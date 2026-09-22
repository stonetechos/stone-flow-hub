import fs from 'fs';
import path from 'path';

const locales = ['hi', 'gu', 'en'];

const newKeys = {
  hi: {
    "dashboard": {
      "radar": {
        "overdueFollowups": "{{count}} अतिदेय फॉलो-अप",
        "receivablesRisk": "₹{{amount}} प्राप्य जोखिम में",
        "urgentTask": "तत्काल कार्य",
        "quotesAwaiting": "{{count}} उद्धरण प्रतिक्रिया की प्रतीक्षा में",
        "ordersToStart": "{{count}} बिक्री आदेश शुरू करने के लिए",
        "rfqsPending": "{{count}} RFQ विक्रेता उत्तर की प्रतीक्षा में",
        "todayFollowups": "{{count}} फॉलो-अप आज",
        "dispatchesToday": "{{count}} डिस्पैच आज",
        "scheduledFollowup": "निर्धारित फॉलो-अप",
        "collected": "₹{{amount}} एकत्र किया गया",
        "invoiced": "₹{{amount}} चालान किया गया",
        "tasksClosed": "{{count}} कार्य बंद",
        "openCalendar": "कैलेंडर खोलें"
      },
      "grid": {
        "receivables": "प्राप्य (Receivables)",
        "collectedMonth": "इस महीने एकत्र",
        "collectedToday": "आज एकत्र",
        "salesInvoicedToday": "आज बिक्री चालान",
        "revenuePipeline": "राजस्व पाइपलाइन",
        "salesOrdersStart": "बिक्री आदेश (प्रारंभ)",
        "dispatchesToday": "आज डिस्पैच",
        "activeInstallations": "सक्रिय इंस्टॉलेशन",
        "activeEnquiries": "सक्रिय पूछताछ",
        "quotesToApprove": "अनुमोदन हेतु उद्धरण",
        "ordersToStart": "शुरू करने के आदेश",
        "enquiryToQuote": "पूछताछ → उद्धरण",
        "avgQuoteValue": "औसत उद्धरण मूल्य",
        "pipelineValue": "पाइपलाइन मूल्य"
      },
      "actions": {
        "customer": "ग्राहक",
        "enquiry": "पूछताछ",
        "quote": "उद्धरण",
        "salesOrder": "बिक्री आदेश",
        "purchaseOrder": "खरीद आदेश",
        "receipt": "रसीद",
        "dispatch": "डिस्पैच"
      },
      "ordersQueued": "उत्पादन के लिए आदेश"
    }
  },
  gu: {
    "dashboard": {
      "radar": {
        "overdueFollowups": "{{count}} બાકી ફોલો-અપ",
        "receivablesRisk": "₹{{amount}} લેણાં જોખમમાં",
        "urgentTask": "તાત્કાલિક કાર્ય",
        "quotesAwaiting": "{{count}} અવતરણ પ્રતિસાદની રાહ જોવાય છે",
        "ordersToStart": "{{count}} શરૂ કરવાના વેચાણ ઓર્ડર",
        "rfqsPending": "{{count}} RFQ વિક્રેતા જવાબની રાહ જોવાય છે",
        "todayFollowups": "{{count}} ફોલો-અપ આજે",
        "dispatchesToday": "{{count}} ડિસ્પેચ આજે",
        "scheduledFollowup": "નિર્ધારિત ફોલો-અપ",
        "collected": "₹{{amount}} એકત્રિત",
        "invoiced": "₹{{amount}} ઇન્વોઇસ કરેલ",
        "tasksClosed": "{{count}} કાર્યો બંધ",
        "openCalendar": "કેલેન્ડર ખોલો"
      },
      "grid": {
        "receivables": "લેણાં (Receivables)",
        "collectedMonth": "આ મહિને એકત્રિત",
        "collectedToday": "આજે એકત્રિત",
        "salesInvoicedToday": "આજે વેચાણ ઇન્વોઇસ",
        "revenuePipeline": "આવક પાઇપલાઇન",
        "salesOrdersStart": "વેચાણ ઓર્ડર (પ્રારંભ)",
        "dispatchesToday": "આજે ડિસ્પેચ",
        "activeInstallations": "સક્રિય ઇન્સ્ટોલેશન્સ",
        "activeEnquiries": "સક્રિય પૂછપરછ",
        "quotesToApprove": "મંજૂર કરવા માટે અવતરણ",
        "ordersToStart": "શરૂ કરવાના ઓર્ડર",
        "enquiryToQuote": "પૂછપરછ → અવતરણ",
        "avgQuoteValue": "સરેરાશ અવતરણ મૂલ્ય",
        "pipelineValue": "પાઇપલાઇન મૂલ્ય"
      },
      "actions": {
        "customer": "ગ્રાહક",
        "enquiry": "પૂછપરછ",
        "quote": "અવતરણ",
        "salesOrder": "વેચાણ ઓર્ડર",
        "purchaseOrder": "ખરીદી ઓર્ડર",
        "receipt": "રસીદ",
        "dispatch": "ડિસ્પેચ"
      },
      "ordersQueued": "ઉત્પાદન માટે ઓર્ડર"
    }
  },
  en: {
    "dashboard": {
      "radar": {
        "overdueFollowups": "{{count}} overdue follow-up(s)",
        "receivablesRisk": "₹{{amount}} receivables at risk",
        "urgentTask": "Urgent task",
        "quotesAwaiting": "{{count}} quote(s) awaiting response",
        "ordersToStart": "{{count}} sales order(s) to start",
        "rfqsPending": "{{count}} RFQ(s) pending vendor reply",
        "todayFollowups": "{{count}} follow-up(s) today",
        "dispatchesToday": "{{count}} dispatch(es) today",
        "scheduledFollowup": "Scheduled follow-up",
        "collected": "₹{{amount}} collected",
        "invoiced": "₹{{amount}} invoiced",
        "tasksClosed": "{{count}} task(s) closed",
        "openCalendar": "Open calendar"
      },
      "grid": {
        "receivables": "Receivables",
        "collectedMonth": "Collected this month",
        "collectedToday": "Collected today",
        "salesInvoicedToday": "Sales invoiced today",
        "revenuePipeline": "Revenue in pipeline",
        "salesOrdersStart": "Sales orders to start",
        "dispatchesToday": "Dispatches today",
        "activeInstallations": "Active installations",
        "activeEnquiries": "Active enquiries",
        "quotesToApprove": "Quotes to approve",
        "ordersToStart": "Orders to start",
        "enquiryToQuote": "Enquiry → quote",
        "avgQuoteValue": "Avg. quote value",
        "pipelineValue": "Pipeline value"
      },
      "actions": {
        "customer": "Customer",
        "enquiry": "Enquiry",
        "quote": "Quote",
        "salesOrder": "Sales order",
        "purchaseOrder": "Purchase order",
        "receipt": "Receipt",
        "dispatch": "Dispatch"
      },
      "ordersQueued": "Orders queued for production"
    }
  }
};

for (const lang of locales) {
  const p = path.resolve('src/lib/i18n/locales/' + lang + '.json');
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  
  data.dashboard = { ...data.dashboard, ...newKeys[lang].dashboard };
  
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

