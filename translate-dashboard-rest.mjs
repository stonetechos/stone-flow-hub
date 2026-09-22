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

// Now replace in dashboard.tsx
const dbPath = path.resolve('src/routes/_authenticated/dashboard.tsx');
let dbContent = fs.readFileSync(dbPath, 'utf-8');

// Ensure useTranslation is imported and used in the outer functional components
if (!dbContent.includes('const { t } = useTranslation();') && dbContent.includes('function OperationalRadar')) {
  dbContent = dbContent.replace(/function OperationalRadar\(\{/g, 'function OperationalRadar({ t, ');
  // we will pass t from DashboardPage to OperationalRadar
}

// 1. Radar
dbContent = dbContent.replace(
  /`\$\{kpis\.overdueFollowups\} overdue follow-up\$\{kpis\.overdueFollowups === 1 \? "" : "s"\}`/g,
  't("dashboard.radar.overdueFollowups", { count: kpis.overdueFollowups })'
);
dbContent = dbContent.replace(
  /`₹\$\{formatMoney\(kpis\.outstandingInr\)\} receivables at risk`/g,
  't("dashboard.radar.receivablesRisk", { amount: formatMoney(kpis.outstandingInr) })'
);
dbContent = dbContent.replace(
  /sub: "Urgent task"/g,
  'sub: t("dashboard.radar.urgentTask")'
);
dbContent = dbContent.replace(
  /`\$\{kpis\.pendingQuotes\} quote\$\{kpis\.pendingQuotes === 1 \? "" : "s"\} awaiting response`/g,
  't("dashboard.radar.quotesAwaiting", { count: kpis.pendingQuotes })'
);
dbContent = dbContent.replace(
  /`\$\{kpis\.ordersToStart\} sales order\$\{kpis\.ordersToStart === 1 \? "" : "s"\} to start`/g,
  't("dashboard.radar.ordersToStart", { count: kpis.ordersToStart })'
);
dbContent = dbContent.replace(
  /`\$\{kpis\.pendingRfqs\} RFQ\$\{kpis\.pendingRfqs === 1 \? "" : "s"\} pending vendor reply`/g,
  't("dashboard.radar.rfqsPending", { count: kpis.pendingRfqs })'
);
dbContent = dbContent.replace(
  /`\$\{kpis\.todayFollowups\} follow-up\$\{kpis\.todayFollowups === 1 \? "" : "s"\} today`/g,
  't("dashboard.radar.todayFollowups", { count: kpis.todayFollowups })'
);
dbContent = dbContent.replace(
  /`\$\{kpis\.deliveriesToday\} dispatch\$\{kpis\.deliveriesToday === 1 \? "" : "es"\} today`/g,
  't("dashboard.radar.dispatchesToday", { count: kpis.deliveriesToday })'
);
dbContent = dbContent.replace(
  /nextFollowup\.notes\?\.slice\(0, 60\) \?\? "Scheduled follow-up"/g,
  'nextFollowup.notes?.slice(0, 60) ?? t("dashboard.radar.scheduledFollowup")'
);
dbContent = dbContent.replace(
  /`₹\$\{formatMoney\(kpis\.collectionsTodayInr\)\} collected`/g,
  't("dashboard.radar.collected", { amount: formatMoney(kpis.collectionsTodayInr) })'
);
dbContent = dbContent.replace(
  /`₹\$\{formatMoney\(kpis\.salesTodayInr\)\} invoiced`/g,
  't("dashboard.radar.invoiced", { amount: formatMoney(kpis.salesTodayInr) })'
);
dbContent = dbContent.replace(
  /`\$\{doneTasks\} task\$\{doneTasks === 1 \? "" : "s"\} closed`/g,
  't("dashboard.radar.tasksClosed", { count: doneTasks })'
);
dbContent = dbContent.replace(
  /label: "Open calendar"/g,
  'label: t("dashboard.radar.openCalendar")'
);


// 2. Financial Grid
dbContent = dbContent.replace(/label: "Receivables",/g, 'label: t("dashboard.grid.receivables"),');
dbContent = dbContent.replace(/label: "Collected this month",/g, 'label: t("dashboard.grid.collectedMonth"),');
dbContent = dbContent.replace(/label: "Collected today",/g, 'label: t("dashboard.grid.collectedToday"),');
dbContent = dbContent.replace(/label: "Sales invoiced today",/g, 'label: t("dashboard.grid.salesInvoicedToday"),');
dbContent = dbContent.replace(/label: "Revenue in pipeline",/g, 'label: t("dashboard.grid.revenuePipeline"),');

// 3. Operational Grid
dbContent = dbContent.replace(/label: "Sales orders to start",/g, 'label: t("dashboard.grid.salesOrdersStart"),');
dbContent = dbContent.replace(/label: "Dispatches today",/g, 'label: t("dashboard.grid.dispatchesToday"),');
dbContent = dbContent.replace(/label: "Active installations",/g, 'label: t("dashboard.grid.activeInstallations"),');

// CRM Pipeline
dbContent = dbContent.replace(/label: "Active enquiries"/g, 'label: t("dashboard.grid.activeEnquiries")');
dbContent = dbContent.replace(/label: "Quotes to approve"/g, 'label: t("dashboard.grid.quotesToApprove")');
dbContent = dbContent.replace(/label: "Orders to start"/g, 'label: t("dashboard.grid.ordersToStart")');
dbContent = dbContent.replace(/label: "Enquiry → quote"/g, 'label: t("dashboard.grid.enquiryToQuote")');
dbContent = dbContent.replace(/label: "Avg\. quote value"/g, 'label: t("dashboard.grid.avgQuoteValue")');
dbContent = dbContent.replace(/label: "Pipeline value"/g, 'label: t("dashboard.grid.pipelineValue")');

// 4. Quick Actions
dbContent = dbContent.replace(/label: "Customer"/g, 'label: t("dashboard.actions.customer")');
dbContent = dbContent.replace(/label: "Enquiry"/g, 'label: t("dashboard.actions.enquiry")');
dbContent = dbContent.replace(/label: "Quote"/g, 'label: t("dashboard.actions.quote")');
dbContent = dbContent.replace(/label: "Sales order"/g, 'label: t("dashboard.actions.salesOrder")');
dbContent = dbContent.replace(/label: "Purchase order"/g, 'label: t("dashboard.actions.purchaseOrder")');
dbContent = dbContent.replace(/label: "Receipt"/g, 'label: t("dashboard.actions.receipt")');
dbContent = dbContent.replace(/label: "Dispatch"/g, 'label: t("dashboard.actions.dispatch")');

// pickHeadline missing
dbContent = dbContent.replace(/label: "Orders queued for production"/g, 'label: t("dashboard.ordersQueued")');

// Modify the OperationalRadar / BusinessHealthGrid signatures to accept t if they don't already
function patchSignature(content, funcName) {
  const regex = new RegExp(`function ${funcName}\(props: \{|function ${funcName}\(\{([^}]*)\}: \{`, "g");
  return content.replace(regex, (match, p1) => {
    if (p1) {
      return `function ${funcName}({ ${p1} }: { t?: any, `;
    }
    return `function ${funcName}(props: { t?: any, `;
  });
}

dbContent = patchSignature(dbContent, 'OperationalRadar');
dbContent = patchSignature(dbContent, 'BusinessHealthGrid');

// Wait, the components just destructure properties! Let's pass `t={t}` where they are called.
// It's easier to just add `const { t } = useTranslation();` to the top of these function components.
const addHook = (content, funcName) => {
  const re = new RegExp(`(function ${funcName}\\(.*?\\)\\s*\\{)`, 'g');
  return content.replace(re, `$1\n  const { t } = useTranslation();\n`);
};

dbContent = addHook(dbContent, 'OperationalRadar');
dbContent = addHook(dbContent, 'BusinessHealthGrid');
dbContent = addHook(dbContent, 'QuickActions');

fs.writeFileSync(dbPath, dbContent);
console.log("Rest of dashboard patched");
