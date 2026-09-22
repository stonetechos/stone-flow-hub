import fs from 'fs';
import path from 'path';

const hiPath = path.resolve('src/lib/i18n/locales/hi.json');
const guPath = path.resolve('src/lib/i18n/locales/gu.json');
const enPath = path.resolve('src/lib/i18n/locales/en.json');

const hiData = JSON.parse(fs.readFileSync(hiPath, 'utf-8'));
const guData = JSON.parse(fs.readFileSync(guPath, 'utf-8'));
const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

const hiNavItems = {
  "dashboard": "डैशबोर्ड",
  "enquiries": "वेबसाइट लीड्स और CRM",
  "customers": "ग्राहक",
  "quotes": "उद्धरण",
  "invoices": "बिक्री चालान",
  "dispatch": "डिस्पैच",
  "vendors": "विक्रेता",
  "rfqs": "RFQ",
  "purchase-invoices": "खरीद चालान",
  "inventory": "इन्वेंटरी",
  "money-flow": "पैसे का प्रवाह",
  "payments": "ग्राहक भुगतान",
  "vendor-payments": "विक्रेता भुगतान",
  "agency-payments": "एजेंसी भुगतान",
  "ledger": "ग्राहक खाताबही",
  "vendor-ledger": "विक्रेता खाताबही",
  "agency-ledger": "एजेंसी खाताबही",
  "liabilities": "देनदारियां और ऋण",
  "business-expenses": "व्यापारिक खर्च",
  "wf-employees": "कर्मचारी",
  "hr-attendance": "उपस्थिति और छुट्टियां",
  "hr-payroll": "पेरोल",
  "wf-today": "कार्यबल विश्लेषण",
  "products": "उत्पाद",
  "masters": "मास्टर्स",
  "communication": "संचार",
  "notifications": "सूचनाएं",
  "message-templates": "संदेश टेम्पलेट",
  "dashboards": "प्रोजेक्ट डैशबोर्ड",
  "documents": "दस्तावेज़",
  "reports": "रिपोर्ट",
  "settings": "सेटिंग्स",
  "admin-users": "उपयोगकर्ता और भूमिकाएं"
};

const guNavItems = {
  "dashboard": "ડેશબોર્ડ",
  "enquiries": "વેબસાઇટ લીડ્સ અને CRM",
  "customers": "ગ્રાહકો",
  "quotes": "અવતરણ",
  "invoices": "વેચાણ ઇન્વૉઇસ",
  "dispatch": "ડિસ્પેચ",
  "vendors": "વિક્રેતાઓ",
  "rfqs": "RFQ",
  "purchase-invoices": "ખરીદી ઇન્વૉઇસ",
  "inventory": "ઇન્વેન્ટરી",
  "money-flow": "પૈસાનો પ્રવાહ",
  "payments": "ગ્રાહક ચુકવણી",
  "vendor-payments": "વિક્રેતા ચુકવણી",
  "agency-payments": "એજન્સી ચુકવણી",
  "ledger": "ગ્રાહક ખાતાવહી",
  "vendor-ledger": "વિક્રેતા ખાતાવહી",
  "agency-ledger": "એજન્સી ખાતાવહી",
  "liabilities": "જવાબદારીઓ અને લોન",
  "business-expenses": "વ્યાપારી ખર્ચ",
  "wf-employees": "કર્મચારીઓ",
  "hr-attendance": "હાજરી અને રજાઓ",
  "hr-payroll": "પેરોલ",
  "wf-today": "કાર્યબળ વિશ્લેષણ",
  "products": "ઉત્પાદનો",
  "masters": "માસ્ટર્સ",
  "communication": "સંચાર",
  "notifications": "સૂચનાઓ",
  "message-templates": "સંદેશ નમૂનાઓ",
  "dashboards": "પ્રોજેક્ટ ડેશબોર્ડ",
  "documents": "દસ્તાવેજો",
  "reports": "અહેવાલો",
  "settings": "સેટિંગ્સ",
  "admin-users": "વપરાશકર્તાઓ અને ભૂમિકાઓ"
};

const enNavItems = {
  "dashboard": "Dashboard",
  "enquiries": "Website Leads & CRM",
  "customers": "Customers",
  "quotes": "Quotations",
  "invoices": "Sales Invoices",
  "dispatch": "Dispatches",
  "vendors": "Vendors",
  "rfqs": "RFQ",
  "purchase-invoices": "Purchase Invoices",
  "inventory": "Inventory",
  "money-flow": "Money Flow",
  "payments": "Customer Payments",
  "vendor-payments": "Vendor Payments",
  "agency-payments": "Agency Payments",
  "ledger": "Customer Ledgers",
  "vendor-ledger": "Vendor Ledgers",
  "agency-ledger": "Agency Ledgers",
  "liabilities": "Liabilities & Loans",
  "business-expenses": "Business Expenses",
  "wf-employees": "Employees",
  "hr-attendance": "Attendance & Leave",
  "hr-payroll": "Payroll",
  "wf-today": "Workforce Intelligence",
  "products": "Products",
  "masters": "Masters",
  "communication": "Communication",
  "notifications": "Notifications",
  "message-templates": "Message Templates",
  "dashboards": "Project Dashboards",
  "documents": "Documents",
  "reports": "Reports",
  "settings": "Settings",
  "admin-users": "Users & Roles"
};

const hiGroups = {
  "overview": "अवलोकन",
  "sales": "बिक्री और CRM",
  "purchase": "खरीद",
  "inventory": "इन्वेंटरी",
  "finance": "पैसे का प्रवाह",
  "payroll": "HR संचालन",
  "masterData": "मास्टर डेटा",
  "communication": "संचार",
  "others": "अन्य",
  "admin": "प्रशासन"
};

const guGroups = {
  "overview": "ઝાંખી",
  "sales": "વેચાણ અને CRM",
  "purchase": "ખરીદી",
  "inventory": "ઇન્વેન્ટરી",
  "finance": "ફાઇનાન્સ",
  "payroll": "HR કામગીરી",
  "masterData": "માસ્ટર ડેટા",
  "communication": "સંચાર",
  "others": "અન્ય",
  "admin": "વહીવટ"
};

const enGroups = {
  "overview": "Overview",
  "sales": "Sales & CRM",
  "purchase": "Purchase",
  "inventory": "Inventory",
  "finance": "Finance",
  "payroll": "HR Operations",
  "masterData": "Master Data",
  "communication": "Communication",
  "others": "Others",
  "admin": "Administration"
};


hiData.nav.items = hiNavItems;
hiData.nav.groups = hiGroups;

guData.nav.items = guNavItems;
guData.nav.groups = guGroups;

enData.nav.items = enNavItems;
enData.nav.groups = enGroups;

fs.writeFileSync(hiPath, JSON.stringify(hiData, null, 2));
fs.writeFileSync(guPath, JSON.stringify(guData, null, 2));
fs.writeFileSync(enPath, JSON.stringify(enData, null, 2));

console.log("Nav locales fixed");
