/**
 * Stone Tech OS — Universal Indic Auto-Localization & Translation Engine.
 *
 * Provides:
 * 1. Comprehensive ERP, stone fabrication, accounting, CRM, HR, dates,
 *    and UI vocabulary for Hindi ('hi') and Gujarati ('gu').
 * 2. Dynamic pattern transformers for counters (e.g. "All Partners (11)" -> "सभी पार्टनर्स (११)"),
 *    actions with symbols (e.g. "+ Add Application Partner" -> "+ एप्लिकेशन पार्टनर जोड़ें"),
 *    financial flows ("In: +₹5,000" / "Out: -₹5,000"), notifications, relative times,
 *    and activity logs.
 * 3. Automatic Latin-to-Indic digit conversion (0-9 -> ०-९ / ૦-૯).
 * 4. An i18next postProcessor plugin (`indicAutoTranslate`) so that ANY call to
 *    `t(key, defaultValue)` automatically translates into natural Hindi or Gujarati
 *    at runtime, even for future pages or keys not yet written into hi.json / gu.json.
 * 5. A recursive `translateNode` helper to translate React component trees.
 */

import React from "react";
import type { PostProcessorModule } from "i18next";
import { toIndicDigits } from "@/lib/format";

export function getActiveLanguage(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("stos-lang") || "en";
  }
  return "en";
}

// ============================================================================
// COMPREHENSIVE ERP VOCABULARY DICTIONARY (English -> Hindi & Gujarati)
// ============================================================================
export const INDIC_DICTIONARY: Record<string, { hi: string; gu: string }> = {
  // Navigation & Core Pages
  Dashboard: { hi: "डैशबोर्ड", gu: "ડેશબોર્ડ" },
  Customers: { hi: "ग्राहक", gu: "ગ્રાહકો" },
  Customer: { hi: "ग्राहक", gu: "ગ્રાહક" },
  "Website Leads & CRM": { hi: "वेबसाइट लीड्स और CRM", gu: "વેબસાઇટ લીડ્સ અને CRM" },
  "Projects & Profit Diary": { hi: "प्रोजेक्ट्स और लाभ डायरी", gu: "પ્રોજેક્ટ્સ અને નફા ડાયરી" },
  Quotations: { hi: "कोटेशन", gu: "ક્વોટેશન" },
  "Sales Orders": { hi: "बिक्री आदेश", gu: "વેચાણ ઓર્ડર" },
  "Sales Invoices": { hi: "बिक्री चालान", gu: "વેચાણ ઇન્વૉઇસ" },
  Dispatches: { hi: "डिस्पैच", gu: "ડિસ્પેચ" },
  "Customer Payments": { hi: "ग्राहक भुगतान", gu: "ગ્રાહક ચુકવણી" },
  Purchases: { hi: "खरीद", gu: "ખરીદી" },
  "Supplying Partners": { hi: "सप्लाई पार्टनर्स", gu: "સપ્લાય પાર્ટનર્સ" },
  "Work & Supply Directory": {
    hi: "कार्य एवं आपूर्ति निर्देशिका",
    gu: "કામ અને પુરવઠા નિર્દેશિકા",
  },
  "RFQs (Price Inquiries)": { hi: "आरएफक्यू (दर पूछताछ)", gu: "RFQ (ભાવ પૂછપરછ)" },
  "Purchase Orders": { hi: "खरीद आदेश", gu: "ખરીદી ઓર્ડર" },
  "Purchase Invoices (Bills)": { hi: "खरीद प्रविष्टियां (बिल)", gu: "ખરીદી બિલ" },
  "Supplier Payments": { hi: "सप्लायर भुगतान", gu: "સપ્લાયર ચુકવણી" },
  "Goods Receipts (GRN)": { hi: "माल प्राप्ति (GRN)", gu: "માલ પ્રાપ્તિ (GRN)" },
  "Executions & Cartings": { hi: "एग्जीक्यूशन और कार्टिंग", gu: "એક્ઝિક્યુશન અને કાર્ટિંગ" },
  "Site Installations": { hi: "साइट इंस्टॉलेशन", gu: "સાઇટ ઇન્સ્ટોલેશન" },
  Installations: { hi: "साइट इंस्टॉलेशन", gu: "સાઇટ ઇન્સ્ટોલેશન" },
  "Installation Partners": { hi: "एप्लिकेशन पार्टनर्स", gu: "એપ્લિકેશન પાર્ટનર્સ" },
  "Application Partners": { hi: "एप्लिकेशन पार्टनर्स", gu: "એપ્લિકેશન પાર્ટનર્સ" },
  "Application Partner Payments": {
    hi: "एप्लिकेशन पार्टनर भुगतान",
    gu: "એપ્લિકેશન પાર્ટનર ચુકવણી",
  },
  "Application Partner Ledger": { hi: "एप्लिकेशन पार्टनर लेजर", gu: "એપ્લિકેશન પાર્ટનર લેજર" },
  "Transport Partners": { hi: "ट्रांसपोर्ट पार्टनर्स", gu: "ટ્રાન્સપોર્ટ પાર્ટનર્સ" },
  "Transport Partners & Cartings": {
    hi: "ट्रांसपोर्ट पार्टनर्स एवं कार्टिंग",
    gu: "ટ્રાન્સપોર્ટ પાર્ટનર્સ અને કાર્ટિંગ",
  },
  "HR & Workforce": { hi: "एचआर और कार्यबल", gu: "HR અને કાર્યબળ" },
  "HR Operations": { hi: "एचआर संचालन", gu: "HR સંચાલન" },
  Employees: { hi: "कर्मचारी", gu: "કર્મચારીઓ" },
  "Attendance & Leave": { hi: "उपस्थिति और छुट्टियां", gu: "હાજરી અને રજાઓ" },
  Payroll: { hi: "पेरोल", gu: "પેરોલ" },
  "Employee Payments": { hi: "कर्मचारी भुगतान", gu: "કર્મચારી ચુકવણી" },
  "Employee Payments & Advances": {
    hi: "कर्मचारी भुगतान एवं अग्रिम",
    gu: "કર્મચારી ચુકવણી અને એડવાન્સ",
  },
  "Workforce Analytics": { hi: "कार्यबल विश्लेषण", gu: "કાર્યબળ વિશ્લેષણ" },
  "Filing & Compliance": { hi: "फाइलिंग और अनुपालन", gu: "ફાઇલિંગ અને અનુપાલન" },
  "Pay GST": { hi: "जीएसटी भुगतान एवं रिटर्न", gu: "GST ચૂકવો અને રિટર્ન" },
  "Pay GST & 1-Click Filing Hub": {
    hi: "जीएसटी भुगतान एवं 1-क्लिक फाइलिंग हब",
    gu: "GST ચૂકવો અને 1-ક્લિક ફાઇલિંગ હબ",
  },
  Accountant: { hi: "अकाउंटेंट", gu: "એકાઉન્ટન્ટ" },
  "Customer Ledger": { hi: "ग्राहक खाता बही", gu: "ગ્રાહક ખાતાવહી" },
  "Supplier Ledger": { hi: "सप्लायर खाता बही", gu: "સપ્લાયર ખાતાવહી" },
  "Money Flow": { hi: "पैसे का प्रवाह", gu: "પૈસાનો પ્રવાહ" },
  "Business Expenses": { hi: "व्यापारिक खर्च", gu: "ધંધાકીય ખર્ચ" },
  Liabilities: { hi: "देनदारियां और ऋण", gu: "દેવાં અને જવાબદારીઓ" },
  "Liabilities & Recurring Expenses": {
    hi: "देनदारियां एवं आवर्ती खर्च",
    gu: "દેવાં અને પુનરાવર્તિત ખર્ચ",
  },
  "Raman's Cashbook": { hi: "रमन की कैशबुक", gu: "રમનની કેશબુક" },
  "Personal Transfers": { hi: "व्यक्तिगत ट्रांसफर", gu: "વ્યક્તિગત ટ્રાન્સફર" },
  "Personal Transfers & Ledgers": {
    hi: "व्यक्तिगत ट्रांसफर एवं लेजर",
    gu: "વ્યક્તિગત ટ્રાન્સફર અને લેજર",
  },
  Reports: { hi: "रिपोर्ट्स", gu: "રિપોર્ટ્સ" },
  Documents: { hi: "दस्तावेज", gu: "દસ્તાવેજો" },
  Settings: { hi: "सेटिंग्स", gu: "સેટિંગ્સ" },
  Communication: { hi: "संचार", gu: "સંચાર" },
  Notifications: { hi: "सूचनाएं", gu: "સૂચનાઓ" },
  "Message Templates": { hi: "संदेश टेम्पलेट", gu: "સંદેશ ટેમ્પલેટ" },
  "Users & Roles": { hi: "उपयोगकर्ता और भूमिकाएं", gu: "વપરાશકર્તા અને ભૂમિકાઓ" },
  "Website CMS": { hi: "वेबसाइट CMS", gu: "વેબસાઇટ CMS" },

  // Table Column Headers & Common Labels
  Code: { hi: "कोड", gu: "કોડ" },
  CODE: { hi: "कोड", gu: "કોડ" },
  Name: { hi: "नाम", gu: "નામ" },
  NAME: { hi: "नाम", gu: "નામ" },
  Edit: { hi: "संपादित करें", gu: "સંપાદિત કરો" },
  EDIT: { hi: "संपादित करें", gu: "સંપાદિત કરો" },
  Actions: { hi: "कार्रवाई", gu: "કાર્યવાહી" },
  Channel: { hi: "चैनल", gu: "ચેનલ" },
  Category: { hi: "श्रेणी", gu: "શ્રેણી" },
  Active: { hi: "सक्रिय", gu: "સક્રિય" },
  Status: { hi: "स्थिति", gu: "સ્થિતિ" },
  Type: { hi: "प्रकार", gu: "પ્રકાર" },
  TYPE: { hi: "प्रकार", gu: "પ્રકાર" },
  Created: { hi: "निर्मित", gu: "નિર્મિત" },
  Amount: { hi: "राशि", gu: "રકમ" },
  Balance: { hi: "शेष", gu: "સિલક" },
  Date: { hi: "तारीख", gu: "તારીખ" },
  DATE: { hi: "तारीख", gu: "તારીખ" },
  Remarks: { hi: "टिप्पणी", gu: "નોંધ" },
  "REMARKS / NOTES": { hi: "टिप्पणी / विवरण", gu: "નોંધ / વિગત" },
  "Remarks / Notes": { hi: "टिप्पणी / विवरण", gu: "નોંધ / વિગત" },
  "Remarks / Notes *": { hi: "टिप्पणी / विवरण *", gu: "નોંધ / વિગત *" },
  "Transaction Type *": { hi: "लेनदेन प्रकार *", gu: "વ્યવહાર પ્રકાર *" },
  "Contact Person": { hi: "संपर्क व्यक्ति", gu: "સંપર્ક વ્યક્તિ" },
  Phone: { hi: "फ़ोन", gu: "ફોન" },
  "Phone Number": { hi: "फ़ोन नंबर", gu: "ફોન નંબર" },
  "Contact Number": { hi: "संपर्क नंबर", gu: "સંપર્ક નંબર" },
  "CONTACT NUMBER": { hi: "संपर्क नंबर", gu: "સંપર્ક નંબર" },
  City: { hi: "शहर", gu: "શહેર" },
  "City / Base": { hi: "शहर / बेस", gu: "શહેર / બેઝ" },
  "CITY / BASE": { hi: "शहर / बेस", gu: "શહેર / બેઝ" },
  "Hub / Base": { hi: "हब / बेस", gu: "હબ / બેઝ" },
  "HUB / BASE": { hi: "हब / बेस", gu: "હબ / બેઝ" },
  "Daily Output": { hi: "दैनिक उत्पादन", gu: "દૈનિક ઉત્પાદન" },
  "DAILY OUTPUT": { hi: "दैनिक उत्पादन", gu: "દૈનિક ઉત્પાદન" },
  Specializations: { hi: "विशेषज्ञताएं", gu: "વિશેષતાઓ" },
  SPECIALIZATIONS: { hi: "विशेषज्ञताएं", gu: "વિશેષતાઓ" },
  "Master / Supervisor": { hi: "मास्टर / सुपरवाइजर", gu: "માસ્ટર / સુપરવાઇઝર" },
  "MASTER / SUPERVISOR": { hi: "मास्टर / सुपरवाइजर", gu: "માસ્ટર / સુપરવાઇઝર" },
  "Application Partner / Firm": { hi: "एप्लिकेशन पार्टनर / फर्म", gu: "એપ્લિકેશન પાર્ટનર / પેઢી" },
  "APPLICATION PARTNER / FIRM": { hi: "एप्लिकेशन पार्टनर / फर्म", gu: "એપ્લિકેશન પાર્ટનર / પેઢી" },
  "Transporter / Firm Name": {
    hi: "ट्रांसपोर्टर / फर्म का नाम",
    gu: "ટ્રાન્સપોર્ટર / પેઢીનું નામ",
  },
  "TRANSPORTER / FIRM NAME": {
    hi: "ट्रांसपोर्टर / फर्म का नाम",
    gu: "ટ્રાન્સપોર્ટર / પેઢીનું નામ",
  },
  "Transporter / Driver": { hi: "ट्रांसपोर्टर / ड्राइवर", gu: "ટ્રાન્સપોર્ટર / ડ્રાઈવર" },
  "TRANSPORTER / DRIVER": { hi: "ट्रांसपोर्टर / ड्राइवर", gu: "ટ્રાન્સપોર્ટર / ડ્રાઈવર" },
  "Vehicles & Fleet": { hi: "वाहन एवं बेड़ा", gu: "વાહનો અને કાફલો" },
  "VEHICLES & FLEET": { hi: "वाहन एवं बेड़ा", gu: "વાહનો અને કાફલો" },
  "Vehicle Reg No.": { hi: "वाहन पंजीकरण संख्या", gu: "વાહન નોંધણી નંબર" },
  "VEHICLE REG NO.": { hi: "वाहन पंजीकरण संख्या", gu: "વાહન નોંધણી નંબર" },
  "Category / Specialization": { hi: "श्रेणी / विशेषज्ञता", gu: "શ્રેણી / વિશેષતા" },
  "CATEGORY / SPECIALIZATION": { hi: "श्रेणी / विशेषज्ञता", gu: "શ્રેણી / વિશેષતા" },
  "Payment Source & Ref #": { hi: "भुगतान स्रोत एवं संदर्भ #", gu: "ચુકવણી સ્ત્રોત અને સંદર્ભ #" },
  "PAYMENT SOURCE & REF #": { hi: "भुगतान स्रोत एवं संदर्भ #", gu: "ચુકવણી સ્ત્રોત અને સંદર્ભ #" },
  Employee: { hi: "कर्मचारी", gu: "કર્મચારી" },
  EMPLOYEE: { hi: "कर्मचारी", gu: "કર્મચારી" },
  Department: { hi: "विभाग", gu: "વિભાગ" },
  DEPARTMENT: { hi: "विभाग", gu: "વિભાગ" },
  "Base Net Salary": { hi: "मूल शुद्ध वेतन", gu: "મૂળ ચોખ્ખો પગાર" },
  "BASE NET SALARY": { hi: "मूल शुद्ध वेतन", gu: "મૂળ ચોખ્ખો પગાર" },
  "Intermediate Paid": { hi: "माह के दौरान भुगतान", gu: "મહિના દરમિયાન ચૂકવેલ" },
  "INTERMEDIATE PAID": { hi: "माह के दौरान भुगतान", gu: "મહિના દરમિયાન ચૂકવેલ" },
  "Salary Due After Month Ends": {
    hi: "माह समाप्त होने पर देय वेतन",
    gu: "મહિનો પૂરો થતાં બાકી પગાર",
  },
  "SALARY DUE AFTER MONTH ENDS": {
    hi: "माह समाप्त होने पर देय वेतन",
    gu: "મહિનો પૂરો થતાં બાકી પગાર",
  },
  "Settlement Status": { hi: "निपटान स्थिति", gu: "ચુકવણી સ્થિતિ" },
  "SETTLEMENT STATUS": { hi: "निपटान स्थिति", gu: "ચુકવણી સ્થિતિ" },
  "Monthly Salary Pool": { hi: "मासिक वेतन बजट", gu: "માસિક પગાર બજેટ" },
  "Staff Settlement Status": { hi: "स्टाफ निपटान स्थिति", gu: "સ્ટાફ ચુકવણી સ્થિતિ" },
  "Cash In": { hi: "कैश आवक", gu: "રોકડ આવક" },
  "CASH IN": { hi: "कैश आवक", gu: "રોકડ આવક" },
  "Cash Out": { hi: "कैश जावक", gu: "રોકડ જાવક" },
  "CASH OUT": { hi: "कैश जावक", gu: "રોકડ જાવક" },
  "Cash In Hand Balance": { hi: "हाथ में नकदी शेष", gu: "હાથ પર રોકડ સિલક" },
  "CASH IN HAND BALANCE": { hi: "हाथ में नकदी शेष", gu: "હાથ પર રોકડ સિલક" },
  "Total Cash In": { hi: "कुल नकदी आवक", gu: "કુલ રોકડ આવક" },
  "TOTAL CASH IN": { hi: "कुल नकदी आवक", gu: "કુલ રોકડ આવક" },
  "Total Cash Out": { hi: "कुल नकदी जावक", gu: "કુલ રોકડ જાવક" },
  "TOTAL CASH OUT": { hi: "कुल नकदी जावक", gu: "કુલ રોકડ જાવક" },
  "Opening Balance": { hi: "प्रारंभिक शेष", gu: "શરૂઆતની સિલક" },
  "OPENING BALANCE": { hi: "प्रारंभिक शेष", gu: "શરૂઆતની સિલક" },
  "Record Cash Transaction": { hi: "नकद लेनदेन दर्ज करें", gu: "રોકડ વ્યવહાર નોંધો" },

  // Badges & Statuses
  Email: { hi: "ईमेल", gu: "ઇમેઇલ" },
  EMAIL: { hi: "ईमेल", gu: "ઇમેઇલ" },
  WhatsApp: { hi: "व्हाट्सएप", gu: "વ્હોટ્સએપ" },
  WHATSAPP: { hi: "व्हाट्सएप", gu: "વ્હોટ્સએપ" },
  SMS: { hi: "एसएमएस", gu: "SMS" },
  dispatch: { hi: "डिस्पैच", gu: "ડિસ્પેચ" },
  estimate: { hi: "अनुमान", gu: "અંદાજ" },
  invoice: { hi: "चालान", gu: "ઇન્વૉઇસ" },
  receipt: { hi: "रसीद", gu: "રસીદ" },
  payment: { hi: "भुगतान", gu: "ચુકવણી" },
  lead: { hi: "लीड", gu: "લીડ" },
  "walk-in": { hi: "वॉक-इन", gu: "વોક-ઇન" },
  reference: { hi: "रेफरेंस", gu: "રેફરન્સ" },
  "google search": { hi: "गूगल सर्च", gu: "ગૂગલ સર્ચ" },
  responding: { hi: "जवाब दे रहे हैं", gu: "પ્રતિસાદ આપી રહ્યા છે" },
  completed: { hi: "पूर्ण", gu: "પૂર્ણ" },
  Completed: { hi: "पूर्ण", gu: "પૂર્ણ" },
  "Contract Agency": { hi: "अनुबंध एजेंसी", gu: "કોન્ટ્રાક્ટ એજન્સી" },
  "Site Execution Team": { hi: "साइट निष्पादन टीम", gu: "સાઇટ એક્ઝિક્યુશન ટીમ" },
  "On-site / Regional": { hi: "ऑन-साइट / क्षेत्रीय", gu: "ઓન-સાઇટ / પ્રાદેશિક" },
  Installation: { hi: "स्थापना", gu: "ઇન્સ્ટોલેશન" },
  Handcrafter: { hi: "हस्तशिल्पी", gu: "હસ્તકલાકાર" },
  "Fleet Operator": { hi: "फ्लीट ऑपरेटर", gu: "કાફલો ઓપરેટર" },
  "Individual Driver": { hi: "व्यक्तिगत चालक", gu: "વ્યક્તિગત ડ્રાઈવર" },
  "Contract Fleet": { hi: "अनुबंधित फ्लीट", gu: "કોન્ટ્રાક્ટ કાફલો" },
  "Pickup Truck": { hi: "पिकअप ट्रक", gu: "પીકઅપ ટ્રક" },
  "Mini Truck": { hi: "छोटा ट्रक (छोटा हाथी)", gu: "મીની ટ્રક (છોટા હાથી)" },
  "Open Truck": { hi: "खुला ट्रक", gu: "ખુલ્લો ટ્રક" },
  Trailer: { hi: "ट्रेलर", gu: "ટ્રેલર" },

  // Action Buttons
  "Sync Access & Roles": {
    hi: "एक्सेस एवं भूमिकाएं सिंक करें",
    gu: "એક્સેસ અને ભૂમિકાઓ સમન્વયિત કરો",
  },
  "Syncing…": { hi: "सिंक हो रहा है…", gu: "સમન્વય થઈ રહ્યું છે…" },
  "Record Personal Transfer": {
    hi: "व्यक्तिगत ट्रांसफर दर्ज करें",
    gu: "વ્યક્તિગત ટ્રાન્સફર નોંધો",
  },
  "Add Application Partner": { hi: "एप्लिकेशन पार्टनर जोड़ें", gu: "એપ્લિકેશન પાર્ટનર ઉમેરો" },
  "Add Transport Partner": { hi: "ट्रांसपोर्ट पार्टनर जोड़ें", gu: "ટ્રાન્સપોર્ટ પાર્ટનર ઉમેરો" },
  "Add Partner": { hi: "पार्टनर जोड़ें", gu: "પાર્ટનર ઉમેરો" },
  "Partner Ledgers": { hi: "पार्टनर लेजर", gu: "પાર્ટનર લેજર" },
  "Record Payment / Advance": { hi: "भुगतान / अग्रिम दर्ज करें", gu: "ચુકવણી / એડવાન્સ નોંધો" },
  "Record Payment": { hi: "भुगतान दर्ज करें", gu: "ચુકવણી નોંધો" },
  "Export CSV": { hi: "CSV निर्यात करें", gu: "CSV નિકાસ કરો" },
  "Pay GST (PMT-06)": { hi: "जीएसटी भुगतान (PMT-06)", gu: "GST ચૂકવો (PMT-06)" },
  "1-Click GSTR-3B": { hi: "1-क्लिक GSTR-3B", gu: "1-ક્લિક GSTR-3B" },
  "1-Click GSTR-1": { hi: "1-क्लिक GSTR-1", gu: "1-ક્લિક GSTR-1" },
  "GST Portal Returns": { hi: "जीएसटी पोर्टल रिटर्न्स", gu: "GST પોર્ટલ રિટર્ન્સ" },
  "New from SO": { hi: "बिक्री आदेश से नया बनाएं", gu: "વેચાણ ઓર્ડર પરથી નવું બનાવો" },
  Teams: { hi: "टीमें", gu: "ટીમો" },
  "Back to Flow Radar": { hi: "फ्लो रडार पर वापस", gu: "ફ્લો રડાર પર પાછા" },
  "Quick Transfer:": { hi: "त्वरित ट्रांसफर:", gu: "ઝડપી ટ્રાન્સફર:" },
  "Transport Partners & Fleet Directory": {
    hi: "ट्रांसपोर्ट पार्टनर्स एवं फ्लीट निर्देशिका",
    gu: "ટ્રાન્સપોર્ટ પાર્ટનર્સ અને કાફલો નિર્દેશિકા",
  },
  "Inward Shipments & Freight Log": {
    hi: "आवक शिपमेंट एवं भाड़ा लॉग",
    gu: "આવક શિપમેન્ટ અને નૂર લોગ",
  },
  "Clear search": { hi: "खोज साफ़ करें", gu: "શોધ સાફ કરો" },
  Density: { hi: "घनत्व", gu: "ઘનતા" },
  Columns: { hi: "कॉलम", gu: "કૉલમ" },
  "Total Paid:": { hi: "कुल भुगतान:", gu: "કુલ ચૂકવેલ:" },
  "Total:": { hi: "कुल:", gu: "કુલ:" },

  // Communication / WhatsApp CRM
  "Stone Catalog": { hi: "पत्थर कैटलॉग", gu: "પથ્થર કેટલોગ" },
  "Hide CRM": { hi: "CRM छुपाएं", gu: "CRM છુપાવો" },
  "Show CRM": { hi: "CRM दिखाएं", gu: "CRM બતાવો" },
  All: { hi: "सभी", gu: "બધા" },
  Unread: { hi: "अपठित", gu: "ન વંચાયેલ" },
  Leads: { hi: "लीड्स", gu: "લીડ્સ" },
  "Gone Quiet": { hi: "शांत लीड्स", gu: "શાંત લીડ્સ" },
  "Search chats, numbers, firms...": {
    hi: "चैट, नंबर, फर्म खोजें...",
    gu: "ચેટ, નંબર, પેઢી શોધો...",
  },
  "Insert Stone Specs": { hi: "पत्थर विवरण डालें", gu: "પથ્થર વિગત ઉમેરો" },
  "Share Catalog PDF": { hi: "कैटलॉग PDF साझा करें", gu: "કેટલોગ PDF શેર કરો" },
  Template: { hi: "टेम्पलेट", gu: "ટેમ્પલેટ" },
  "Type a WhatsApp message...": { hi: "व्हाट्सएप संदेश लिखें...", gu: "વ્હોટ્સએપ સંદેશ લખો..." },
  "Natural Stone Product Catalog": {
    hi: "प्राकृतिक पत्थर उत्पाद कैटलॉग",
    gu: "કુદરતી પથ્થર ઉત્પાદન કેટલોગ",
  },

  // User Roles & Designations
  OWNER: { hi: "मालिक", gu: "માલિક" },
  SALES: { hi: "बिक्री", gu: "વેચાણ" },
  ESTIMATION: { hi: "अनुमान", gu: "અંદાજ" },
  ACCOUNTS: { hi: "लेखा", gu: "હિસાબ" },
  DISPATCH: { hi: "डिस्पैच", gu: "ડિસ્પેચ" },
  SITE_EXECUTION: { hi: "साइट निष्पादन", gu: "સાઇટ એક્ઝિક્યુશન" },
  PURCHASE: { hi: "खरीद", gu: "ખરીદી" },
  ADMIN: { hi: "प्रशासक", gu: "એડમિન" },
  SUPER_ADMIN: { hi: "सुपर एडमिन", gu: "સુપર એડમિન" },
  Operations: { hi: "परिचालन", gu: "ઓપરેશન્સ" },
  System: { hi: "सिस्टम", gu: "સિસ્ટમ" },

  // Notifications Tiers
  IMPORTANT: { hi: "आवश्यक", gu: "મહત્વનું" },
  CRITICAL: { hi: "अति आवश्यक", gu: "અતિ મહત્વનું" },
  INFO: { hi: "सूचना", gu: "માહિતી" },
  Warning: { hi: "चेतावनी", gu: "ચેતવણી" },

  // Liabilities Page
  "Monthly Active Drain": { hi: "मासिक सक्रिय व्यय", gu: "માસિક સક્રિય ખર્ચ" },
  "MONTHLY ACTIVE DRAIN": { hi: "मासिक सक्रिय व्यय", gu: "માસિક સક્રિય ખર્ચ" },
  "Total Payments Settled": { hi: "कुल चुकता भुगतान", gu: "કુલ પતાવટ થયેલ ચુકવણી" },
  "TOTAL PAYMENTS SETTLED": { hi: "कुल चुकता भुगतान", gu: "કુલ પતાવટ થયેલ ચુકવણી" },
  "Annual Net-Margin Goal": {
    hi: "वार्षिक शुद्ध-मार्जिन लक्ष्य",
    gu: "વાર્ષિક નેટ-માર્જિન લક્ષ્યાંક",
  },
  "ANNUAL NET-MARGIN GOAL": {
    hi: "वार्षिक शुद्ध-मार्जिन लक्ष्य",
    gu: "વાર્ષિક નેટ-માર્જિન લક્ષ્યાંક",
  },
  "Office Rent & Tenancy Register": {
    hi: "कार्यालय किराया एवं किरायेदारी रजिस्टर",
    gu: "ઓફિસ ભાડું અને ભાડુઆત રજિસ્ટર",
  },
  "Active Liabilities": { hi: "सक्रिय देनदारियां", gu: "સક્રિય દેવાં" },
  "Payments Registry": { hi: "भुगतान रजिस्टर", gu: "ચુકવણી રજિસ્ટર" },

  // Tax & GST Page
  "Output GST (Sales)": { hi: "आउटपुट जीएसटी (बिक्री)", gu: "આઉટપુટ GST (વેચાણ)" },
  "Input Tax Credit (ITC)": { hi: "इनपुट टैक्स क्रेडिट (ITC)", gu: "ઇનપુટ ટેક્સ ક્રેડિટ (ITC)" },
  "Net Tax Payable (Cash)": { hi: "शुद्ध कर देयता (नकद)", gu: "ચોખ્ખો કરપાત્ર (રોકડ)" },
  "ITC Carried Forward": { hi: "आगे ले जाया गया ITC", gu: "આગળ લઈ ગયેલ ITC" },
  "Overview & Rule 88A": { hi: "अवलोकन एवं नियम 88A", gu: "ઓવરવ્યૂ અને નિયમ 88A" },
  "Sales Register": { hi: "बिक्री रजिस्टर", gu: "વેચાણ રજિસ્ટર" },
  "Purchase ITC Register": { hi: "खरीद ITC रजिस्टर", gu: "ખરીદી ITC રજિસ્ટર" },
  "Statutory Tax Computation & Set-Off": {
    hi: "वैधानिक कर गणना एवं समायोजन",
    gu: "કાયદાકીય કર ગણતરી અને સેટ-ઓફ",
  },

  // Miscellaneous / Common ERP Phrases
  "No installations yet": { hi: "अभी तक कोई स्थापना नहीं", gu: "હજુ સુધી કોઈ ઇન્સ્ટોલેશન નથી" },
  "Set a sales order supply scope to Supply + Installation to auto-create one.": {
    hi: "स्वचालित रूप से बनाने के लिए बिक्री आदेश में सप्लाई + इंस्टॉलेशन चुनें।",
    gu: "આપોઆપ બનાવવા માટે વેચાણ ઓર્ડરમાં સપ્લાય + ઇન્સ્ટોલેશન પસંદ કરો.",
  },
  "customers deleted": { hi: "ग्राहक हटाए गए", gu: "ગ્રાહકો કાઢી નાખ્યા" },
  "customer deleted": { hi: "ग्राहक हटाया गया", gu: "ગ્રાહક કાઢી નાખ્યો" },
  "customer created": { hi: "नया ग्राहक बनाया गया", gu: "નવા ગ્રાહક ઉમેર્યા" },
  "receipts created": { hi: "रसीदें दर्ज की गईं", gu: "રસીદો નોંધવામાં આવી" },
  "receipt created": { hi: "रसीद दर्ज की गई", gu: "રસીદ નોંધવામાં આવી" },
  "quotes created": { hi: "कोटेशन बनाए गए", gu: "ક્વોટેશન બનાવવામાં આવ્યા" },
  "orders created": { hi: "बिक्री आदेश बनाए गए", gu: "વેચાણ ઓર્ડર બનાવવામાં આવ્યા" },
  "invoices created": { hi: "चालान जारी किए गए", gu: "ઇન્વૉઇસ જનરેટ થયા" },
  "dispatches created": { hi: "डिस्पैच दर्ज किए गए", gu: "ડિસ્પેચ નોંધાયા" },
  "payments recorded": { hi: "भुगतान दर्ज किए गए", gu: "ચુકવણી નોંધાઈ" },
  Process: { hi: "प्रक्रिया करें", gu: "પ્રોસેસ કરો" },
  "Salary Balances & Month-End Due": {
    hi: "वेतन शेष एवं माह-अंत देय",
    gu: "પગાર સિલક અને મહિના-અંત બાકી",
  },
  "Payment Ledger": { hi: "भुगतान लेजर", gu: "ચુકવણી લેજર" },
  "RISHI RAI LEDGER": { hi: "ऋषि राय लेजर", gu: "ઋષિ રાય લેજર" },
  "RAMAN PUPNEJA LEDGER": { hi: "रमन पुपनेजा लेजर", gu: "રમન પુપનેજા લેજર" },
  "COMPANY CASH & BANK": { hi: "कंपनी कैश एवं बैंक", gu: "કંપની કેશ અને બેંક" },
  "ALL PERSONAL TRANSFERS": { hi: "सभी व्यक्तिगत ट्रांसफर", gu: "બધા વ્યક્તિગત ટ્રાન્સફર" },
  "Contractors & Agencies": { hi: "ठेकेदार एवं एजेंसियां", gu: "કોન્ટ્રાક્ટરો અને એજન્સીઓ" },
  "Site Execution Teams": { hi: "साइट निष्पादन टीमें", gu: "સાઇટ એક્ઝિક્યુશન ટીમો" },
  "All Partners": { hi: "सभी पार्टनर्स", gu: "બધા પાર્ટનર્સ" },
  "All Categories": { hi: "सभी श्रेणियां", gu: "બધી શ્રેણીઓ" },
  "All Payers": { hi: "सभी भुगतानकर्ता", gu: "બધા ચૂકવનાર" },
  "Paid by Company": { hi: "कंपनी द्वारा भुगतान", gu: "કંપની દ્વારા ચુકવણી" },
  "Paid by Customer": { hi: "ग्राहक द्वारा भुगतान", gu: "ગ્રાહક દ્વારા ચુકવણી" },
  "🏢 Paid by Company": { hi: "🏢 कंपनी द्वारा भुगतान", gu: "🏢 કંપની દ્વારા ચુકવણી" },
  "👤 Paid by Customer": { hi: "👤 ग्राहक द्वारा भुगतान", gu: "👤 ગ્રાહક દ્વારા ચુકવણી" },
  "Agency's Payments": { hi: "एजेंसी भुगतान", gu: "એજન્સી ચુકવણી" },
  "Pay Agency": { hi: "एजेंसी को भुगतान करें", gu: "એજન્સીને ચૂકવો" },
  "Tax & Regime Hub": { hi: "टैक्स एवं व्यवस्था हब", gu: "ટેક્સ અને વ્યવસ્થા હબ" },

  // Customer Modal & Customer Table
  "New customer": { hi: "नया ग्राहक", gu: "નવો ગ્રાહક" },
  "Edit customer": { hi: "ग्राहक संपादित करें", gu: "ગ્રાહક સંપાદિત કરો" },
  "Import from Phonebook": { hi: "फ़ोनबुक से आयात करें", gu: "ફોનબુકમાંથી આયાત કરો" },
  "Voice fill:": { hi: "आवाज से भरें:", gu: "અવાજથી ભરો:" },
  "QUICK FILL — essentials only": { hi: "त्वरित भरें — केवल आवश्यक", gu: "ઝડપી ભરો — માત્ર જરૂરી" },
  "Quick Fill": { hi: "त्वरित भरें", gu: "ઝડપી ભરો" },
  "— essentials only": { hi: "— केवल आवश्यक", gu: "— માત્ર જરૂરી" },
  "1. Contact Person's Name (Representative)": {
    hi: "१. संपर्क व्यक्ति का नाम (प्रतिनिधि)",
    gu: "૧. સંપર્ક વ્યક્તિનું નામ (પ્રતિનિધિ)",
  },
  "Contact Person's Name": { hi: "संपर्क व्यक्ति का नाम", gu: "સંપર્ક વ્યક્તિનું નામ" },
  "Point of communication for supply": {
    hi: "सप्लाई के लिए संपर्क बिंदु",
    gu: "સપ્લાય માટે સંપર્ક બિંદુ",
  },
  "Key person or representative": {
    hi: "मुख्य व्यक्ति या प्रतिनिधि",
    gu: "મુખ્ય વ્યક્તિ અથવા પ્રતિનિધિ",
  },
  "2. Firm / Company Name": { hi: "२. फर्म / कंपनी का नाम", gu: "૨. પેઢી / કંપનીનું નામ" },
  "Firm / Company Name": { hi: "फर्म / कंपनी का नाम", gu: "પેઢી / કંપનીનું નામ" },
  "Business or organization name": { hi: "व्यवसाय या संगठन का नाम", gu: "વ્યવસાય કે પેઢીનું નામ" },
  "Business or enterprise name": { hi: "व्यवसाय या उद्यम का नाम", gu: "વ્યવસાય કે સાહસનું નામ" },
  "Reflect in Customer List As": {
    hi: "ग्राहक सूची में इस तरह दिखाएं",
    gu: "ગ્રાહક યાદીમાં આ રીતે બતાવો",
  },
  "(Dropdown selector)": { hi: "(ड्रॉपडाउन चयनकर्ता)", gu: "(ડ્રૉપડાઉન પસંદગીકાર)" },
  "Choose how this customer is titled in the compiled dashboard directory": {
    hi: "चुनें कि संकलित डैशबोर्ड निर्देशिका में इस ग्राहक को किस शीर्षक से दिखाया जाए",
    gu: "પસંદ કરો કે ડેશબોર્ડ નિર્દેશિકામાં આ ગ્રાહક કયા શીર્ષકથી દેખાય",
  },
  "Smart (Firm if present, else Contact)": {
    hi: "स्मार्ट (फर्म यदि मौजूद हो, अन्यथा संपर्क)",
    gu: "સ્માર્ટ (પેઢી હોય તો તે, નહીંતર સંપર્ક)",
  },
  "Both (Firm · Contact Person)": {
    hi: "दोनों (फर्म · संपर्क व्यक्ति)",
    gu: "બંને (પેઢી · સંપર્ક વ્યક્તિ)",
  },
  "Custom / Manual": { hi: "कस्टम / मैन्युअल", gu: "કસ્ટમ / મેન્યુઅલ" },
  "Reflected Customer Name": { hi: "प्रदर्शित ग्राहक का नाम", gu: "દર્શાવેલ ગ્રાહકનું નામ" },
  "Titled name shown on quotes, orders, and dashboard list": {
    hi: "कोटेशन, ऑर्डर और डैशबोर्ड सूची में दिखने वाला नाम",
    gu: "ક્વોટેશન, ઓર્ડર અને ડેશબોર્ડ યાદીમાં દેખાતું નામ",
  },
  "Type of Customer": { hi: "ग्राहक का प्रकार", gu: "ગ્રાહકનો પ્રકાર" },
  "Type of Customer *": { hi: "ग्राहक का प्रकार *", gu: "ગ્રાહકનો પ્રકાર *" },
  "10 digits, +91 optional": { hi: "१० अंक, +९१ वैकल्पिक", gu: "૧૦ અંક, +૯૧ વૈકલ્પિક" },
  "Same as Phone": { hi: "फ़ोन नंबर जैसा ही", gu: "ફોન નંબર જેવું જ" },
  "Dropdown defaults to Phone Number": {
    hi: "ड्रॉपडाउन डिफ़ॉल्ट रूप से फ़ोन नंबर लेता है",
    gu: "ડ્રૉપડાઉન મૂળભૂત રીતે ફોન નંબર લે છે",
  },
  "Additional Contacts": { hi: "अतिरिक्त संपर्क", gu: "વધારાના સંપર્કો" },
  Cancel: { hi: "रद्द करें", gu: "રદ કરો" },
  Save: { hi: "सहेजें", gu: "સાચવો" },
  "SR. NO.": { hi: "क्र. सं.", gu: "ક્રમ નં." },
  "Sr. No.": { hi: "क्र. सं.", gu: "ક્રમ નં." },
  "CRM STATUS & UPDATES": { hi: "CRM स्थिति एवं अपडेट", gu: "CRM સ્થિતિ અને અપડેટ" },
  "ASSIGNED TO": { hi: "सौंपा गया", gu: "સોંપેલ" },
  "PAYMENT STATUS": { hi: "भुगतान स्थिति", gu: "ચુકવણી સ્થિતિ" },
  CONTACT: { hi: "संपर्क", gu: "સંપર્ક" },
  "All statuses": { hi: "सभी स्थितियां", gu: "બધી સ્થિતિઓ" },
  "All customer types": { hi: "सभी ग्राहक प्रकार", gu: "બધા ગ્રાહક પ્રકાર" },
  "All assignees": { hi: "सभी सौंपे गए सदस्य", gu: "બધા સોંપાયેલ સભ્યો" },
  "Search by name, phone, city...": {
    hi: "नाम, फ़ोन, शहर से खोजें...",
    gu: "નામ, ફોન, શહેર દ્વારા શોધો...",
  },
  "Search by name, phone, city…": {
    hi: "नाम, फ़ोन, शहर से खोजें…",
    gu: "નામ, ફોન, શહેર દ્વારા શોધો…",
  },
  "Interior Designer": { hi: "इंटीरियर डिजाइनर", gu: "ઇન્ટિરિયર ડિઝાઇનર" },
  "Part Paid": { hi: "आंशिक भुगतान", gu: "અંશતઃ ચૂકવેલ" },
  "Fully Paid": { hi: "पूर्ण भुगतान", gu: "સંપૂર્ણ ચૂકવેલ" },
  Assign: { hi: "सौंपें", gu: "સોંપો" },
  "The customer is not updated with the current status. Click to send WhatsApp notification.": {
    hi: "ग्राहक को वर्तमान स्थिति से अपडेट नहीं किया गया है। व्हाट्सएप अधिसूचना भेजने के लिए क्लिक करें।",
    gu: "ગ્રાહકને વર્તમાન સ્થિતિ વિશે અપડેટ કરવામાં આવ્યા નથી. WhatsApp સૂચના મોકલવા ક્લિક કરો.",
  },
  "Customer updated": { hi: "ग्राहक अपडेट है", gu: "ગ્રાહક અપડેટ છે" },
  "No phone": { hi: "फ़ोन नहीं", gu: "ફોન નથી" },

  // Payments & Disbursements
  "Payments & Disbursements": { hi: "भुगतान एवं संवितरण", gu: "ચુકવણી અને વિતરણ" },
  "Customer receipts, supplier payments, and application partner disbursements under Money Flow.": {
    hi: "मनी फ्लो के तहत ग्राहक रसीदें, विक्रेता बिल भुगतान और एप्लिकेशन पार्टनर संवितरण।",
    gu: "મની ફ્લો હેઠળ ગ્રાહક રસીદો, સપ્લાયર બિલ ચુકવણી અને એપ્લિકેશન પાર્ટનર ચુકવણી.",
  },
  "Record Customer Payment": { hi: "ग्राहक भुगतान दर्ज करें", gu: "ગ્રાહક ચુકવણી નોંધો" },
  "Record Supplier Payment": { hi: "सप्लायर भुगतान दर्ज करें", gu: "સપ્લાયર ચુકવણી નોંધો" },
  "Record Write-Off": { hi: "राइट-ऑफ दर्ज करें", gu: "રાઇટ-ઓફ નોંધો" },
  "BOB CURRENT ACCOUNT": { hi: "बैंक ऑफ बड़ौदा चालू खाता", gu: "બેંક ઓફ બરોડા ચાલુ ખાતું" },
  "UPI PERSONAL - RISHI": { hi: "व्यक्तिगत UPI - ऋषि", gu: "વ્યક્તિગત UPI - ઋષિ" },
  "UPI PERSONAL - RAMAN": { hi: "व्यक्तिगत UPI - रमन", gu: "વ્યક્તિગત UPI - રમન" },
  "TOTAL COLLECTIONS": { hi: "कुल वसूली", gu: "કુલ વસૂલાત" },
  "All Accounts": { hi: "सभी खाते", gu: "બધા ખાતાઓ" },
  "Personal UPI": { hi: "व्यक्तिगत UPI", gu: "વ્યક્તિગત UPI" },
  "Bank / UPI": { hi: "बैंक / UPI", gu: "બેંક / UPI" },
  "Filter & Assign (Rishi / Raman)": {
    hi: "फ़िल्टर करें और सौंपें (ऋषि / रमन)",
    gu: "ફિલ્ટર કરો અને સોંપો (ઋષિ / રમન)",
  },
  "Search customer payment or reference": {
    hi: "ग्राहक भुगतान या संदर्भ खोजें",
    gu: "ગ્રાહક ચુકવણી અથવા સંદર્ભ શોધો",
  },
  "RECEIPT #": { hi: "रसीद क्र.", gu: "રસીદ નં." },
  CUSTOMER: { hi: "ग्राहक", gu: "ગ્રાહક" },
  INVOICE: { hi: "चालान", gu: "ઇન્વૉઇસ" },
  METHOD: { hi: "तरीका", gu: "પદ્ધતિ" },
  REFERENCE: { hi: "संदर्भ", gu: "સંદર્ભ" },
  Cash: { hi: "नकद", gu: "રોકડ" },
  "UPI Personal - Rishi": { hi: "व्यक्तिगत UPI - ऋषि", gu: "વ્યક્તિગત UPI - ઋષિ" },
  "UPI Personal - Raman": { hi: "व्यक्तिगत UPI - रमन", gu: "વ્યક્તિગત UPI - રમન" },

  // Dashboard Greetings & Cards
  "Shhh... the CNC machines are dreaming. What are you crafting tonight?": {
    hi: "शांति... सीएनसी मशीनें विश्राम में हैं। आज क्या बना रहे हैं?",
    gu: "શાંતિ... CNC મશીનો વિશ્રામમાં છે. આજે શું બનાવી રહ્યા છો?",
  },
  "50L PROFIT GOAL": { hi: "₹५० लाख लाभ लक्ष्य", gu: "₹૫૦ લાખ નફા લક્ષ્યાંક" },
  "REVENUE PIPELINE": { hi: "राजस्व पाइपलाइन", gu: "મહેસૂલ પાઇપલાઇન" },
  "OVERDUE COLLECTIONS": { hi: "अतिदेय वसूली", gu: "બાકી વસૂલાત" },
  "Orders for Production": { hi: "उत्पादन के लिए आदेश", gu: "ઉત્પાદન માટે ઓર્ડર" },
  "Need Stock Slabs": { hi: "स्टॉक स्लैब की आवश्यकता", gu: "સ્ટોક સ્લેબની જરૂર છે" },
  "PAIN POINTS RADAR": { hi: "मुख्य बिंदु रडार", gu: "મુખ્ય મુદ્દા રડાર" },
  "Critical Action Hub": { hi: "त्वरित कार्रवाई हब", gu: "ઝડપી કાર્યવાહી હબ" },
  "Delivery deadline pending": { hi: "डिलीवरी की समय सीमा लंबित", gu: "ડિલિવરીની અંતિમ મુદત બાકી" },
  "Invoice payment overdue": { hi: "चालान भुगतान अतिदेय है", gu: "ઇન્વૉઇસ ચુકવણી બાકી છે" },
  "has no salesperson assigned": {
    hi: "को कोई विक्रेता नहीं सौंपा गया है",
    gu: "ને કોઈ વેચાણકર્તા સોંપાયેલ નથી",
  },

  // GST Filing & Rules
  "Automated GST liability calculations from Sales & Purchase Invoices, Rule 88A set-off, Form PMT-06 payment challan, and 1-click GSTR-1/3B filing.":
    {
      hi: "बिक्री और खरीद चालानों से स्वचालित जीएसटी देनदारी गणना, नियम 88A समायोजन, फॉर्म PMT-06 चालान, और 1-क्लिक फाइलिंग।",
      gu: "વેચાણ અને ખરીદી ઇન્વૉઇસમાંથી આપોઆપ GST જવાબદારી ગણતરી, નિયમ 88A સેટ-ઓફ, ફોર્મ PMT-06 ચલણ અને 1-ક્લિક ફાઇલિંગ.",
    },
  "Select Period": { hi: "अवधि चुनें", gu: "સમયગાળો પસંદ કરો" },
  "Overview & Set-off": { hi: "अवलोकन एवं समायोजन", gu: "ઓવરવ્યૂ અને સેટ-ઓફ" },
  "1-Click Filing (GSTR-1 & 3B)": {
    hi: "1-क्लिक फाइलिंग (GSTR-1 और 3B)",
    gu: "1-ક્લિક ફાઇલિંગ (GSTR-1 અને 3B)",
  },
  "Latest GST News": { hi: "ताज़ा जीएसटी समाचार", gu: "તાજા GST સમાચાર" },
  "Statutory Set-Off Matrix (Rule 88A / Circular 98/17/2019)": {
    hi: "वैधानिक समायोजन मैट्रिक्स (नियम 88A / परिपत्र 98/17/2019)",
    gu: "કાયદાકીય સેટ-ઓફ મેટ્રિક્સ (નિયમ 88A / પરિપત્ર 98/17/2019)",
  },
  "How Input Tax Credit from stone purchases and expenses offsets Output GST liability": {
    hi: "पत्थर खरीद और खर्च से इनपुट टैक्स क्रेडिट कैसे आउटपुट जीएसटी देयता को समायोजित करता है",
    gu: "પથ્થર ખરીદી અને ખર્ચમાંથી ઇનપુટ ટેક્સ ક્રેડિટ કેવી રીતે આઉટપુટ GST જવાબદારીને સેટ-ઓફ કરે છે",
  },
  "Tax Head": { hi: "कर मद", gu: "કર શીર્ષક" },
  "Output Liability": { hi: "आउटपुट देयता", gu: "આઉટપુટ જવાબદારી" },
  "ITC Utilized": { hi: "प्रयुक्त ITC", gu: "વપરાયેલ ITC" },
  "Net Cash Payable": { hi: "शुद्ध नकद देय", gu: "ચોખ્ખી રોકડ ચૂકવવાપાત્ર" },
  "Closing ITC": { hi: "अंतिम ITC", gu: "અંતિમ ITC" },
  "Rule 88A Netting": { hi: "नियम 88A समायोजन", gu: "નિયમ 88A સેટ-ઓફ" },
  "Closing ITC Balance": { hi: "अंतिम ITC शेष", gu: "આખરી ITC સિલક" },
  "Challan Due": { hi: "चालान देय", gu: "ચલણ બાકી" },
  "NIL Cash": { hi: "शून्य नकद देय", gu: "શૂન્ય રોકડ" },
  "Next Period": { hi: "अगली अवधि", gu: "આગામી સમયગાળો" },

  // HR & Application Partners & Fleet
  "HR OPERATIONS": { hi: "एचआर संचालन", gu: "HR સંચાલન" },
  "Cycle Month:": { hi: "वेतन चक्र माह:", gu: "પગાર ચક્ર મહિનો:" },
  "Disbursed by Account:": { hi: "खाते द्वारा संवितरित:", gu: "ખાતા દ્વારા વિતરિત:" },
  "Other:": { hi: "अन्य:", gu: "અન્ય:" },
  "Search employee...": { hi: "कर्मचारी खोजें...", gu: "કર્મચારી શોધો..." },
  "All Staff": { hi: "सभी कर्मचारी", gu: "બધા કર્મચારીઓ" },
  "Pending Full": { hi: "पूर्ण लंबित", gu: "સંપૂર્ણ બાકી" },
  Pay: { hi: "भुगतान करें", gu: "ચૂકવો" },
  "+ Pay": { hi: "+ भुगतान करें", gu: "+ ચૂકવો" },
  "Ledger ->": { hi: "लेजर ->", gu: "લેજર ->" },
  "Registered installation masters, dry cladding contractors, supervisors, and site execution teams.":
    {
      hi: "पंजीकृत स्थापना मास्टर्स, ड्राई क्लैडिंग ठेकेदार, सुपरवाइजर और साइट निष्पादन टीमें।",
      gu: "નોંધાયેલ ઇન્સ્ટોલેશન માસ્ટર્સ, ડ્રાય ક્લેડિંગ કોન્ટ્રાક્ટરો, સુપરવાઇઝરો અને સાઇટ એક્ઝિક્યુશન ટીમો.",
    },
  "Search by firm name, supervisor, phone, skill, or city…": {
    hi: "फर्म का नाम, सुपरवाइजर, फोन, कौशल या शहर से खोजें…",
    gu: "પેઢીનું નામ, સુપરવાઇઝર, ફોન, કુશળતા અથવા શહેર દ્વારા શોધો…",
  },
  "Search team, category, ref #, customer…": {
    hi: "टीम, श्रेणी, संदर्भ #, ग्राहक खोजें…",
    gu: "ટીમ, શ્રેણી, સંદર્ભ #, ગ્રાહક શોધો…",
  },
  "Manage automated SMS, WhatsApp, and email templates for customer communications.": {
    hi: "ग्राहक संचार के लिए स्वचालित एसएमएस, व्हाट्सएप और ईमेल टेम्पलेट प्रबंधित करें।",
    gu: "ગ્રાહક સંચાર માટે સ્વચાલિત SMS, WhatsApp અને ઇમેઇલ ટેમ્પલેટ મેનેજ કરો.",
  },
  "Carting agencies, truck freight providers, vehicle fleets, and inward shipment logistics.": {
    hi: "कार्टिंग एजेंसियां, ट्रक माल ढुलाई प्रदाता, वाहन बेड़े और आवक शिपमेंट रसद।",
    gu: "કાર્ટિંગ એજન્સીઓ, ટ્રક નૂર પ્રદાતાઓ, વાહનોના કાફલા અને આવક શિપમેન્ટ લોજિસ્ટિક્સ.",
  },
  "Payment settlements, advances, and direct customer payments recorded for application, artwork, and transport partners.":
    {
      hi: "एप्लिकेशन, आर्टवर्क और ट्रांसपोर्ट पार्टनर्स के लिए दर्ज भुगतान निपटान, अग्रिम और प्रत्यक्ष ग्राहक भुगतान।",
      gu: "એપ્લિકેશન, આર્ટવર્ક અને ટ્રાન્સપોર્ટ પાર્ટનર્સ માટે નોંધાયેલ ચુકવણી પતાવટ, એડવાન્સ અને સીધી ગ્રાહક ચુકવણી.",
    },

  "New Application Partner": { hi: "नया एप्लिकेशन पार्टनर", gu: "નવો એપ્લિકેશન પાર્ટનર" },
  "Edit Application Partner": {
    hi: "एप्लिकेशन पार्टनर संपादित करें",
    gu: "એપ્લિકેશન પાર્ટનર સંપાદિત કરો",
  },
  "New Transport Partner": { hi: "नया ट्रांसपोर्ट पार्टनर", gu: "નવો ટ્રાન્સપોર્ટ પાર્ટનર" },
  "Edit Transport Partner": {
    hi: "ट्रांसपोर्ट पार्टनर संपादित करें",
    gu: "ટ્રાન્સપોર્ટ પાર્ટનર સંપાદિત કરો",
  },
  "Supervisors, application masters, fixing contractors, and dry cladding teams.": {
    hi: "सुपरवाइजर, एप्लिकेशन मास्टर्स, फिक्सिंग ठेकेदार और ड्राई क्लैडिंग टीमें।",
    gu: "સુપરવાઇઝર, એપ્લિકેશન માસ્ટર્સ, ફિક્સિંગ કોન્ટ્રાક્ટરો અને ડ્રાય ક્લેડિંગ ટીમો.",
  },
  "Carting agencies, truck freight, pickup vehicles, and heavy logistics.": {
    hi: "कार्टिंग एजेंसियां, ट्रक फ्रेट, पिकअप वाहन और भारी लॉजिस्टिक्स।",
    gu: "કાર્ટિંગ એજન્સીઓ, ટ્રક નૂર, પીકઅપ વાહનો અને ભારે લોજિસ્ટિક્સ.",
  },
  "Agency / Company / Team Name": {
    hi: "एजेंसी / कंपनी / टीम का नाम",
    gu: "એજન્સી / કંપની / ટીમનું નામ",
  },
  "Agency / Company / Team Name *": {
    hi: "एजेंसी / कंपनी / टीम का नाम *",
    gu: "એજન્સી / કંપની / ટીમનું નામ *",
  },
  "Master Mason / Supervisor / Contact Person": {
    hi: "मास्टर कारीगर / सुपरवाइजर / संपर्क व्यक्ति",
    gu: "માસ્ટર કારીગર / સુપરવાઇઝર / સંપર્ક વ્યક્તિ",
  },
  "Master Mason / Supervisor / Contact Person *": {
    hi: "मास्टर कारीगर / सुपरवाइजर / संपर्क व्यक्ति *",
    gu: "માસ્ટર કારીગર / સુપરવાઇઝર / સંપર્ક વ્યક્તિ *",
  },
  "Mobile / WhatsApp Phone (Optional)": {
    hi: "मोबाइल / व्हाट्सएप फ़ोन (वैकल्पिक)",
    gu: "મોબાઇલ / વ્હોટ્સએપ ફોન (વૈકલ્પિક)",
  },
  "Email Address": { hi: "ईमेल पता", gu: "ઇમેઇલ સરનામું" },
  "Operational City / Base Hub": { hi: "परिचालन शहर / बेस हब", gu: "ઓપરેશનલ શહેર / બેઝ હબ" },
  "GSTIN / Tax ID": { hi: "जीएसटीआईएन / टैक्स आईडी", gu: "GSTIN / ટેક્સ આઈડી" },
  "APPLICATION SKILLS & SPECIALIZATIONS": {
    hi: "एप्लिकेशन कौशल एवं विशेषज्ञताएं",
    gu: "એપ્લિકેશન કૌશલ્ય અને વિશેષતાઓ",
  },
  "Application Skills & Specializations": {
    hi: "एप्लिकेशन कौशल एवं विशेषज्ञताएं",
    gu: "એપ્લિકેશન કૌશલ્ય અને વિશેષતાઓ",
  },
  "Select all that apply": { hi: "लागू होने वाले सभी चुनें", gu: "લાગુ પડતા તમામ પસંદ કરો" },
  "Dry Cladding": { hi: "ड्राई क्लैडिंग", gu: "ડ્રાય ક્લેડિંગ" },
  "Wet Cladding": { hi: "वेट क्लैडिंग", gu: "વેટ ક્લેડિંગ" },
  "Stone Flooring": { hi: "स्टोन फ्लोरिंग", gu: "સ્ટોન ફ્લોરિંગ" },
  "Inlay & Mosaics": { hi: "इनले और मोज़ेक", gu: "ઇનલે અને મોઝેઇક" },
  "Murals & CNC Fixing": { hi: "म्यूरल्स और सीएनसी फिक्सिंग", gu: "મ્યુરલ્સ અને સીએનસી ફિક્સિંગ" },
  "High-Elevation Cladding": { hi: "हाई-एलिवेशन क्लैडिंग", gu: "હાઇ-એલિવેશન ક્લેડિંગ" },
  "Stone Polishing": { hi: "स्टोन पॉलिशिंग", gu: "સ્ટોન પોલિશિંગ" },
  "Substrate Waterproofing": { hi: "सब्सट्रेट वॉटरप्रूफिंग", gu: "સબસ્ટ્રેટ વૉટરપ્રૂફિંગ" },
  "Interlocking Ledger": { hi: "इंटरलॉकिंग लेजर", gu: "ઇન્ટરલોકિંગ લેજર" },
  "Assigned Vehicle / Transport (Optional)": {
    hi: "असाइन किया गया वाहन / परिवहन (वैकल्पिक)",
    gu: "સોંપાયેલ વાહન / પરિવહન (વૈકલ્પિક)",
  },
  "Daily Capacity (sqft / day)": {
    hi: "दैनिक क्षमता (वर्ग फुट / दिन)",
    gu: "દૈનિક ક્ષમતા (ચોરસ ફૂટ / દિવસ)",
  },
  "Address / Workshop / Yard Location": {
    hi: "पता / कार्यशाला / यार्ड स्थान",
    gu: "સરનામું / વર્કશોપ / યાર્ડ સ્થાન",
  },
  "Create Partner": { hi: "पार्टनर बनाएं", gu: "પાર્ટનર બનાવો" },
  "Update Partner": { hi: "पार्टनर अपडेट करें", gu: "પાર્ટનર અપડેટ કરો" },
  "Tata Ace (Chhota Hathi)": { hi: "टाटा ऐस (छोटा हाथी)", gu: "ટાટા એસ (છોટા હાથી)" },
  "Pickup Bolero (Maxi Truck)": {
    hi: "पिकअप बोलेरो (मैक्सी ट्रक)",
    gu: "પિકઅપ બોલેરો (મેક્સી ટ્રક)",
  },
  "14ft Eicher (4-6 MT)": {
    hi: "१४ फीट आयशर (४-६ मीट्रिक टन)",
    gu: "૧૪ ફૂટ આઇશર (૪-૬ મેટ્રિક ટન)",
  },
  "17ft Truck (8-10 MT)": {
    hi: "१७ फीट ट्रक (८-१० मीट्रिक टन)",
    gu: "૧૭ ફૂટ ટ્રક (૮-૧૦ મેટ્રિક ટન)",
  },
  "22ft 6-Wheeler": { hi: "२२ फीट ६-पहिया", gu: "૨૨ ફૂટ ૬-વ્હીલર" },
  "28ft Multi-Axle": { hi: "२८ फीट मल्टी-एक्सल", gu: "૨૮ ફૂટ મલ્ટી-એક્સલ" },
  "32ft Trailer (25-35 MT)": {
    hi: "३२ फीट ट्रेलर (२५-३५ मीट्रिक टन)",
    gu: "૩૨ ફૂટ ટ્રેલર (૨૫-૩૫ મેટ્રિક ટન)",
  },
  "Crane / Hydraulic Unloader": {
    hi: "क्रेन / हाइड्रोलिक अनलोडर",
    gu: "ક્રેન / હાઇડ્રોલિક અનલોડર",
  },
  "New Customer": { hi: "नया ग्राहक", gu: "નવો ગ્રાહક" },
  "Edit Customer": { hi: "ग्राहक संपादित करें", gu: "ગ્રાહક સંપાદિત કરો" },
  "Tap to select a customer contact directly from your phone's address book": {
    hi: "अपने फ़ोन की पता पुस्तिका से सीधे ग्राहक संपर्क चुनने के लिए टैप करें",
    gu: "તમારા ફોનની એડ્રેસ બુકમાંથી સીધો ગ્રાહક સંપર્ક પસંદ કરવા માટે ટેપ કરો",
  },
  "Reflect in Customer List As (Dropdown selector)": {
    hi: "ग्राहक सूची में इस प्रकार दिखाएं (ड्रॉपडाउन चयनकर्ता)",
    gu: "ગ્રાહક યાદીમાં આ રીતે દર્શાવો (ડ્રોપડાઉન પસંદગીકાર)",
  },
  "Name of the person who referred them": {
    hi: "संदर्भ देने वाले व्यक्ति का नाम",
    gu: "સંદર્ભ આપનાર વ્યક્તિનું નામ",
  },
  "10 digits or +country code": { hi: "१० अंक या +देश कोड", gu: "૧૦ અંક અથવા +દેશ કોડ" },
  "Select country code & enter mobile number": {
    hi: "देश का कोड चुनें और मोबाइल नंबर दर्ज करें",
    gu: "દેશનો કોડ પસંદ કરો અને મોબાઇલ નંબર દાખલ કરો",
  },
  "Enter Different Number": { hi: "अलग नंबर दर्ज करें", gu: "બીજો નંબર દાખલ કરો" },
  "Select WhatsApp...": { hi: "व्हाट्सएप चुनें...", gu: "WhatsApp પસંદ કરો..." },
  "WhatsApp number (+country code)": {
    hi: "व्हाट्सएप नंबर (+देश कोड)",
    gu: "WhatsApp નંબર (+દેશ કોડ)",
  },
  "Add multiple contacts with name, phone number, and designation manually": {
    hi: "नाम, फ़ोन नंबर और पदनाम के साथ कई संपर्क मैन्युअल रूप से जोड़ें",
    gu: "નામ, ફોન નંબર અને હોદ્દા સાથે મેન્યુઅલી બહુવિધ સંપર્કો ઉમેરો",
  },
  "+ Add a contact": { hi: "+ संपर्क जोड़ें", gu: "+ સંપર્ક ઉમેરો" },
  "Add a contact": { hi: "संपर्क जोड़ें", gu: "સંપર્ક ઉમેરો" },
  "Contact Name *": { hi: "संपर्क नाम *", gu: "સંપર્ક નામ *" },
  "No additional contacts yet. Click + Add a contact to add site engineers, architects, managers, etc.":
    {
      hi: "अभी कोई अतिरिक्त संपर्क नहीं है। साइट इंजीनियर, आर्किटेक्ट, मैनेजर आदि जोड़ने के लिए + संपर्क जोड़ें पर क्लिक करें।",
      gu: "હજુ સુધી કોઈ વધારાના સંપર્કો નથી. સાઇટ એન્જિનિયર, આર્કિટેક્ટ, મેનેજર વગેરે ઉમેરવા માટે + સંપર્ક ઉમેરો પર ક્લિક કરો.",
    },
  "Italian Marble Slabs": { hi: "इटैलियन मार्बल स्लैब्स", gu: "ઇટાલિયન માર્બલ સ્લેબ્સ" },
  "Indian Marble Slabs": { hi: "इंडियन मार्बल स्लैब्स", gu: "ઇન્ડિયન માર્બલ સ્લેબ્સ" },
  "Granite Slabs": { hi: "ग्रेनाइट स्लैब्स", gu: "ગ્રેનાઇટ સ્લેબ્સ" },
  "Limestone Slabs": { hi: "लाइमस्टोन स्लैब्स", gu: "લાઇમસ્ટોન સ્લેબ્સ" },
  Cobblestone: { hi: "कोबलस्टोन", gu: "કોબલસ્ટોન" },
  Pebblestone: { hi: "पेबलस्टोन", gu: "પેબલસ્ટોન" },
  Boulders: { hi: "बोल्डर्स", gu: "બોલ્ડર્સ" },
  Sculptures: { hi: "मूर्तियां और शिल्प", gu: "મૂર્તિઓ અને શિલ્પ" },
  "Custom Stone Basins": { hi: "कस्टम स्टोन बेसिन", gu: "કસ્ટમ સ્ટોન બેસિન" },
  "Agate Stone Articles": { hi: "एगेट स्टोन आर्टिकल्स", gu: "અકીક (એગેટ) સ્ટોન આર્ટિકલ્સ" },
  Waterfall: { hi: "वॉटरफॉल (झरना)", gu: "વૉટરફૉલ (ઝરણું)" },
  "Temple Work Handcrafting": { hi: "मंदिर कार्य हस्तशिल्प", gu: "મંદિર કાર્ય હસ્તકલા" },
  "Stone Artwork": { hi: "स्टोन आर्टवर्क", gu: "સ્ટોન આર્ટવર્ક" },
  "Sandstone Slabs": { hi: "सैंडस्टोन स्लैब्स", gu: "સેન્ડસ્ટોન સ્લેબ્સ" },
  "STOS WhatsApp CRM Workspace": {
    hi: "स्टॉस व्हाट्सएप सीआरएम वर्कस्पेस",
    gu: "સ્ટોસ વ્હોટ્સએપ CRM વર્કસ્પેસ",
  },
  "Libromi-style Native CRM Mini App beside conversations": {
    hi: "बातचीत के साथ लिब्रोमी-शैली सीआरएम मिनी ऐप",
    gu: "વાતચીત સાથે લિબ્રોમી-શૈલી CRM મિની એપ",
  },
  "Collapse CRM Panel": { hi: "सीआरएम पैनल समेटें", gu: "CRM પેનલ સંકોચો" },
  "Expand CRM Panel": { hi: "सीआरएम पैनल खोलें", gu: "CRM પેનલ વિસ્તૃત કરો" },
  "Open in WhatsApp": { hi: "व्हाट्सएप में खोलें", gu: "WhatsApp માં ખોલો" },
  "Unregistered Inbound Contact": {
    hi: "अपंजीकृत इनकमिंग संपर्क",
    gu: "અણનોંધાયેલ ઇનકમિંગ સંપર્ક",
  },
  "1-Click Create Lead / Customer": {
    hi: "१-क्लिक लीड / ग्राहक बनाएं",
    gu: "૧-ક્લિક લીડ / ગ્રાહક બનાવો",
  },
  "Stone Product Master": { hi: "स्टोन उत्पाद मास्टर", gu: "સ્ટોન ઉત્પાદન માસ્ટર" },
  "Attach Catalog PDF": { hi: "कैटलॉग पीडीएफ संलग्न करें", gu: "કેટલોગ PDF જોડો" },
  "Insert Spec": { hi: "विशिष्टता डालें", gu: "વિશિષ્ટતા દાખલ કરો" },
  "Gone Quiet (>3d)": { hi: "शांत (>३ दिन)", gu: "શાંત (>૩ દિવસ)" },
  "Matching STOS records...": {
    hi: "स्टॉस रिकॉर्ड्स मिला रहे हैं...",
    gu: "સ્ટોસ રેકોર્ડ્સ મેળવી રહ્યાં છીએ...",
  },
  "Disbursed by Account: Other: ₹5,000": {
    hi: "खाते द्वारा संवितरित: अन्य: ₹५,०००",
    gu: "ખાતા દ્વારા વિતરિત: અન્ય: ₹૫,૦૦૦",
  },
  "Office Support": { hi: "कार्यालय सहायता", gu: "ઓફિસ સપોર્ટ" },
  "+ Record Payment / Advance": {
    hi: "+ भुगतान / अग्रिम दर्ज करें",
    gu: "+ ચુકવણી / એડવાન્સ નોંધો",
  },
  ACTION: { hi: "कार्रवाई", gu: "પગલાં" },
  "+ New from SO": { hi: "+ बिक्री आदेश से नया", gu: "+ વેચાણ ઓર્ડર પરથી નવું" },
  "New Template": { hi: "नया टेम्पलेट", gu: "નવું ટેમ્પલેટ" },
  "+ New Template": { hi: "+ नया टेम्पलेट", gu: "+ નવું ટેમ્પલેટ" },
  "Search natural stone (e.g. Gwalior Mint, Agra Red, Teakwood)...": {
    hi: "प्राकृतिक पत्थर खोजें (उदा. ग्वालियर मिंट, आगरा रेड, टीकवुड)...",
    gu: "કુદરતી પથ્થર શોધો (દા.ત. ગ્વાલિયર મિન્ટ, આગ્રા રેડ, ટીકવુડ)...",
  },
  "e.g. Sompura Stone Fixing Works, Ahmedabad": {
    hi: "उदा. सोमपुरा स्टोन फिक्सिंग वर्क्स, अहमदाबाद",
    gu: "દા.ત. સોમપુરા સ્ટોન ફિક્સિંગ વર્ક્સ, અમદાવાદ",
  },
  "e.g. Rajesh Bhai Sompura": { hi: "उदा. राजेश भाई सोमपुरा", gu: "દા.ત. રાજેશ ભાઈ સોમપુરા" },
  "e.g. Ahmedabad, Surat, Makrana, Udaipur": {
    hi: "उदा. अहमदाबाद, सूरत, मकराना, उदयपुर",
    gu: "દા.ત. અમદાવાદ, સુરત, મકરાણા, ઉદયપુર",
  },
  "15-character GSTIN (Optional)": {
    hi: "१५-अंकीय जीएसटीआईएन (वैकल्पिक)",
    gu: "૧૫-અંકનું GSTIN (વૈકલ્પિક)",
  },
  "e.g. Bolero Maxi Truck (GJ-01-XX-1234)": {
    hi: "उदा. बोलेरो मैक्सी ट्रक (GJ-01-XX-1234)",
    gu: "દા.ત. બોલેરો મેક્સી ટ્રક (GJ-01-XX-1234)",
  },
  "Full address, godown or workshop location": {
    hi: "पूरा पता, गोदाम या कार्यशाला का स्थान",
    gu: "સંપૂર્ણ સરનામું, ગોડાઉન અથવા વર્કશોપનું સ્થાન",
  },
  "e.g. Ramesh Patel": { hi: "उदा. रमेश पटेल", gu: "દા.ત. રમેશ પટેલ" },
  "e.g. ABC Developers LLP": {
    hi: "उदा. एबीसी डेवलपर्स एलएलपी",
    gu: "દા.ત. એબીસી ડેવલપર્સ એલએલપી",
  },
  "e.g. ABC Developers LLP or Ramesh Patel": {
    hi: "उदा. एबीसी डेवलपर्स एलएलपी या रमेश पटेल",
    gu: "દા.ત. એબીસી ડેવલપર્સ એલએલપી અથવા રમેશ પટેલ",
  },
  "e.g. Vikram Sharma": { hi: "उदा. विक्रम शर्मा", gu: "દા.ત. વિક્રમ શર્મા" },
  "Type your WhatsApp message (Enter to send, Shift+Enter for newline)...": {
    hi: "अपना व्हाट्सएप संदेश लिखें (भेजने के लिए Enter, नई लाइन के लिए Shift+Enter)...",
    gu: "તમારો WhatsApp સંદેશ લખો (મોકલવા માટે Enter, નવી લાઇન માટે Shift+Enter)...",
  },
};

// ============================================================================
// COMPREHENSIVE WORD-LEVEL INDIC LEXICON (For Dynamic Phrase Decomposition)
// ============================================================================
export const INDIC_WORD_LEXICON: Record<string, { hi: string; gu: string }> = {
  // Actions & Verbs
  new: { hi: "नया", gu: "નવું" },
  edit: { hi: "संपादित करें", gu: "સંપાદિત કરો" },
  delete: { hi: "हटाएं", gu: "કાઢી નાખો" },
  remove: { hi: "हटाएं", gu: "દૂર કરો" },
  save: { hi: "सहेजें", gu: "સાચવો" },
  cancel: { hi: "रद्द करें", gu: "રદ કરો" },
  close: { hi: "बंद करें", gu: "બંધ કરો" },
  add: { hi: "जोड़ें", gu: "ઉમેરો" },
  create: { hi: "बनाएं", gu: "બનાવો" },
  view: { hi: "देखें", gu: "જુઓ" },
  open: { hi: "खोलें", gu: "ખોલો" },
  call: { hi: "कॉल करें", gu: "કૉલ કરો" },
  search: { hi: "खोजें", gu: "શોધો" },
  filter: { hi: "फ़िल्टर", gu: "ફિલ્ટર" },
  clear: { hi: "साफ़ करें", gu: "સાફ કરો" },
  apply: { hi: "लागू करें", gu: "લાગુ કરો" },
  submit: { hi: "जमा करें", gu: "સબમિટ કરો" },
  download: { hi: "डाउनलोड करें", gu: "ડાઉનલોડ કરો" },
  upload: { hi: "अपलोड करें", gu: "અપલોડ કરો" },
  share: { hi: "साझा करें", gu: "શેર કરો" },
  export: { hi: "निर्यात करें", gu: "નિકાસ કરો" },
  import: { hi: "आयात करें", gu: "આયાત કરો" },
  print: { hi: "प्रिंट करें", gu: "પ્રિન્ટ કરો" },
  copy: { hi: "कॉपी करें", gu: "કૉપિ કરો" },
  pay: { hi: "भुगतान करें", gu: "ચૂકવો" },
  paid: { hi: "भुगतान किया", gu: "ચૂકવેલ" },
  pending: { hi: "लंबित", gu: "બાકી" },
  due: { hi: "देय", gu: "ચૂકવવાપાત્ર" },
  active: { hi: "सक्रिय", gu: "સક્રિય" },
  status: { hi: "स्थिति", gu: "સ્થિતિ" },
  type: { hi: "प्रकार", gu: "પ્રકાર" },
  name: { hi: "नाम", gu: "નામ" },
  phone: { hi: "फ़ोन", gu: "ફોન" },
  mobile: { hi: "मोबाइल", gu: "મોબાઇલ" },
  email: { hi: "ईमेल", gu: "ઇમેઇલ" },
  address: { hi: "पता", gu: "સરનામું" },
  city: { hi: "शहर", gu: "શહેર" },
  state: { hi: "राज्य", gu: "રાજ્ય" },
  date: { hi: "दिनांक", gu: "તારીખ" },
  time: { hi: "समय", gu: "સમય" },
  amount: { hi: "राशि", gu: "રકમ" },
  balance: { hi: "शेष", gu: "સિલક" },
  total: { hi: "कुल", gu: "કુલ" },
  details: { hi: "विवरण", gu: "વિગતો" },
  notes: { hi: "नोट्स", gu: "નોંધો" },
  optional: { hi: "वैकल्पिक", gu: "વૈકલ્પિક" },
  required: { hi: "आवश्यक", gu: "જરૂરી" },
  customer: { hi: "ग्राहक", gu: "ગ્રાહક" },
  customers: { hi: "ग्राहक", gu: "ગ્રાહકો" },
  vendor: { hi: "विक्रेता", gu: "વેચનાર" },
  vendors: { hi: "विक्रेता", gu: "વેચનારાઓ" },
  supplier: { hi: "आपूर्तिकर्ता", gu: "સપ્લાયર" },
  suppliers: { hi: "आपूर्तिकर्ता", gu: "સપ્લાયર્સ" },
  partner: { hi: "पार्टनर", gu: "પાર્ટનર" },
  partners: { hi: "पार्टनर्स", gu: "પાર્ટનર્સ" },
  team: { hi: "टीम", gu: "ટીમ" },
  teams: { hi: "टीमें", gu: "ટીમો" },
  firm: { hi: "फर्म", gu: "પેઢી" },
  company: { hi: "कंपनी", gu: "કંપની" },
  project: { hi: "प्रोजेक्ट", gu: "પ્રોજેક્ટ" },
  projects: { hi: "प्रोजेक्ट्स", gu: "પ્રોજેક્ટ્સ" },
  order: { hi: "ऑर्डर", gu: "ઓર્ડર" },
  orders: { hi: "ऑर्डर", gu: "ઓર્ડર" },
  invoice: { hi: "चालान", gu: "ઇન્વૉઇસ" },
  invoices: { hi: "चालान", gu: "ઇન્વૉઇસ" },
  quote: { hi: "कोटेशन", gu: "ક્વોટેશન" },
  quotes: { hi: "कोटेशन", gu: "ક્વોટેશન" },
  bill: { hi: "बिल", gu: "બિલ" },
  bills: { hi: "बिल", gu: "બિલ" },
  receipt: { hi: "रसीद", gu: "રસીદ" },
  receipts: { hi: "रसीदें", gu: "રસીદો" },
  payment: { hi: "भुगतान", gu: "ચુકવણી" },
  payments: { hi: "भुगतान", gu: "ચુકવણીઓ" },
  cash: { hi: "नकद", gu: "રોકડ" },
  bank: { hi: "बैंक", gu: "બેંક" },
  ledger: { hi: "लेजर", gu: "લેજર" },
  ledgers: { hi: "लेजर", gu: "લેજર" },
  account: { hi: "खाता", gu: "ખાતું" },
  accounts: { hi: "खाते", gu: "ખાતાઓ" },
  tax: { hi: "कर", gu: "ટેક્સ" },
  gst: { hi: "जीएसटी", gu: "GST" },
  material: { hi: "सामग्री", gu: "સામગ્રી" },
  materials: { hi: "सामग्री", gu: "સામગ્રી" },
  stone: { hi: "स्टोन", gu: "સ્ટોન" },
  stones: { hi: "पत्थर", gu: "પથ્થરો" },
  marble: { hi: "मार्बल", gu: "માર્બલ" },
  granite: { hi: "ग्रेनाइट", gu: "ગ્રેનાઇટ" },
  sandstone: { hi: "सैंडस्टोन", gu: "સેન્ડસ્ટોન" },
  limestone: { hi: "लाइमस्टोन", gu: "લાઇમસ્ટોન" },
  slabs: { hi: "स्लैब्स", gu: "સ્લેબ્સ" },
  slab: { hi: "स्लैब", gu: "સ્લેબ" },
  tiles: { hi: "टाइल्स", gu: "ટાઇલ્સ" },
  finish: { hi: "फिनिश", gu: "ફિનિશ" },
  finishes: { hi: "फिनिश", gu: "ફિનિશ" },
  size: { hi: "आकार", gu: "કદ" },
  sizes: { hi: "आकार", gu: "માપો" },
  thickness: { hi: "मोटाई", gu: "જાડાઈ" },
  quantity: { hi: "मात्रा", gu: "જથ્થો" },
  rate: { hi: "दर", gu: "ભાવ" },
  discount: { hi: "छूट", gu: "વળતર" },
  vehicle: { hi: "वाहन", gu: "વાહન" },
  vehicles: { hi: "वाहन", gu: "વાહનો" },
  truck: { hi: "ट्रक", gu: "ટ્રક" },
  trucks: { hi: "ट्रक", gu: "ટ્રકો" },
  freight: { hi: "भाड़ा", gu: "ભાડું" },
  transport: { hi: "परिवहन", gu: "પરિવહન" },
  dispatch: { hi: "डिस्पैच", gu: "ડિસ્પેચ" },
  dispatches: { hi: "डिस्पैच", gu: "ડિસ્પેચ" },
  installation: { hi: "स्थापना", gu: "ઇન્સ્ટોલેશન" },
  installations: { hi: "साइट स्थापनाएं", gu: "સાઇટ ઇન્સ્ટોલેશન" },
  labor: { hi: "मजदूरी", gu: "મજૂરી" },
  salary: { hi: "वेतन", gu: "પગાર" },
  salaries: { hi: "वेतन", gu: "પગાર" },
  advance: { hi: "अग्रिम", gu: "એડવાન્સ" },
  advances: { hi: "अग्रिम", gu: "એડવાન્સિસ" },
  employee: { hi: "कर्मचारी", gu: "કર્મચારી" },
  employees: { hi: "कर्मचारी", gu: "કર્મચારીઓ" },
  attendance: { hi: "उपस्थिति", gu: "હાજરી" },
  leave: { hi: "छुट्टी", gu: "રજા" },
  leaves: { hi: "छुट्टियां", gu: "રજાઓ" },
  report: { hi: "रिपोर्ट", gu: "રિપોર્ટ" },
  reports: { hi: "रिपोर्ट्स", gu: "રિપોર્ટ્સ" },
  analytics: { hi: "विश्लेषण", gu: "વિશ્લેષણ" },
  settings: { hi: "सेटिंग्स", gu: "સેટિંગ્સ" },
  communication: { hi: "संचार", gu: "સંચાર" },
  workspace: { hi: "वर्कस्पेस", gu: "વર્કસ્પેસ" },
  template: { hi: "टेम्पलेट", gu: "ટેમ્પલેટ" },
  templates: { hi: "टेम्पलेट्स", gu: "ટેમ્પલેટ્સ" },
  catalog: { hi: "कैटलॉग", gu: "કેટલોગ" },
  spec: { hi: "विनिर्देश", gu: "સ્પેક" },
  specs: { hi: "विनिर्देश", gu: "સ્પેક્સ" },
  contact: { hi: "संपर्क", gu: "સંપર્ક" },
  contacts: { hi: "संपर्क", gu: "સંપર્કો" },
  person: { hi: "व्यक्ति", gu: "વ્યક્તિ" },
  directory: { hi: "निर्देशिका", gu: "ડિરેક્ટરી" },
  cladding: { hi: "क्लैडिंग", gu: "ક્લેડિંગ" },
  flooring: { hi: "फ्लोरिंग", gu: "ફ્લોરિંગ" },
  dry: { hi: "ड्राई", gu: "ડ્રાય" },
  wet: { hi: "वेट", gu: "વેટ" },
  inlay: { hi: "इनले", gu: "ઇનલે" },
  mosaics: { hi: "मोज़ेक", gu: "મોઝેઇક" },
  mural: { hi: "म्यूरल", gu: "મ્યુરલ" },
  murals: { hi: "म्यूरल्स", gu: "મ્યુરલ્સ" },
  fixing: { hi: "फिक्सिंग", gu: "ફિક્સિંગ" },
  high: { hi: "उच्च", gu: "ઉચ્ચ" },
  elevation: { hi: "एलिवेशन", gu: "એલિવેશન" },
  polishing: { hi: "पॉलिशिंग", gu: "પોલિશિંગ" },
  waterproofing: { hi: "वॉटरप्रूफिंग", gu: "વૉટરપ્રૂફિંગ" },
  substrate: { hi: "सब्सट्रेट", gu: "સબસ્ટ્રેટ" },
  interlocking: { hi: "इंटरलॉकिंग", gu: "ઇન્ટરલોકિંગ" },
  cobblestone: { hi: "कोबलस्टोन", gu: "કોબલસ્ટોન" },
  pebblestone: { hi: "पेबलस्टोन", gu: "પેબલસ્ટોન" },
  boulder: { hi: "बोल्डर", gu: "બોલ્ડર" },
  boulders: { hi: "बोल्डर्स", gu: "બોલ્ડર્સ" },
  sculpture: { hi: "मूर्ति / शिल्प", gu: "મૂર્તિ / શિલ્પ" },
  sculptures: { hi: "मूर्तियां और शिल्प", gu: "મૂર્તિઓ અને શિલ્પ" },
  basin: { hi: "बेसिन", gu: "બેસિન" },
  basins: { hi: "बेसिन", gu: "બેસિન" },
  agate: { hi: "एगेट (अकीक)", gu: "અકીક (એગેટ)" },
  waterfall: { hi: "वॉटरफॉल (झरना)", gu: "વૉટરફૉલ (ઝરણું)" },
  temple: { hi: "मंदिर", gu: "મંદિર" },
  mandir: { hi: "मंदिर", gu: "મંદિર" },
  handcrafting: { hi: "हस्तशिल्प", gu: "હસ્તકલા" },
  work: { hi: "कार्य", gu: "કામ" },
  smart: { hi: "स्मार्ट", gu: "સ્માર્ટ" },
  custom: { hi: "कस्टम", gu: "કસ્ટમ" },
  manual: { hi: "मैन्युअल", gu: "મેન્યુઅલ" },
  manually: { hi: "मैन्युअल रूप से", gu: "મેન્યુઅલી" },
  multiple: { hi: "एकाधिक", gu: "બહુવિધ" },
  additional: { hi: "अतिरिक्त", gu: "વધારાના" },
  designation: { hi: "पदनाम", gu: "હોદ્દો" },
  phonebook: { hi: "फ़ोनबुक", gu: "ફોનબુક" },
  reflect: { hi: "दर्शाएं", gu: "દર્શાવો" },
  list: { hi: "सूची", gu: "યાદી" },
  selector: { hi: "चयनकर्ता", gu: "પસંદગીકાર" },
  dropdown: { hi: "ड्रॉपडाउन", gu: "ડ્રોપડાઉન" },
  select: { hi: "चुनें", gu: "પસંદ કરો" },
  choose: { hi: "चुनें", gu: "પસંદ કરો" },
  all: { hi: "सभी", gu: "બધા" },
  only: { hi: "केवल", gu: "માત્ર" },
  both: { hi: "दोनों", gu: "બંને" },
  present: { hi: "उपस्थित", gu: "હાજર" },
  else: { hi: "अन्यथा", gu: "અન્યથા" },
  supervisor: { hi: "सुपरवाइजर", gu: "સુપરવાઇઝર" },
  supervisors: { hi: "सुपरवाइजर", gu: "સુપરવાઇઝરો" },
  master: { hi: "कारीगर", gu: "કારીગર" },
  masters: { hi: "कारीगर", gu: "કારીગરો" },
  contractor: { hi: "ठेकेदार", gu: "કોન્ટ્રાક્ટર" },
  contractors: { hi: "ठेकेदार", gu: "કોન્ટ્રાક્ટરો" },
  agency: { hi: "एजेंसी", gu: "એજન્સી" },
  agencies: { hi: "एजेंसियां", gu: "એજન્સીઓ" },
  capacity: { hi: "क्षमता", gu: "ક્ષમતા" },
  daily: { hi: "दैनिक", gu: "દૈનિક" },
  monthly: { hi: "मासिक", gu: "માસિક" },
  annual: { hi: "वार्षिक", gu: "વાર્ષિક" },
  operations: { hi: "संचालन", gu: "કામગીરી" },
  pool: { hi: "पूल", gu: "પૂલ" },
  intermediate: { hi: "मध्यवर्ती", gu: "મધ્યવર્તી" },
  ends: { hi: "समाप्त", gu: "સમાપ્ત" },
  settlement: { hi: "निपटान", gu: "સેટલમેન્ટ" },
  settled: { hi: "निपटारा हुआ", gu: "ચૂકતે" },
  cleared: { hi: "चुकता", gu: "પૂરું" },
  full: { hi: "पूर्ण", gu: "સંપૂર્ણ" },
  part: { hi: "आंशिक", gu: "અંશતઃ" },
  support: { hi: "सहायता", gu: "સહાય" },
  office: { hi: "कार्यालय", gu: "ઓફિસ" },
  hub: { hi: "हब", gu: "હબ" },
  yard: { hi: "यार्ड", gu: "યાર્ડ" },
  workshop: { hi: "कार्यशाला", gu: "વર્કશોપ" },
  location: { hi: "स्थान", gu: "સ્થળ" },
  assigned: { hi: "सौंपा गया", gu: "સોંપેલ" },
  unassigned: { hi: "अनअसाइन किया गया", gu: "અણસોંપાયેલ" },
  salesperson: { hi: "विक्रेता", gu: "સેલ્સપર્સન" },
  radar: { hi: "रडार", gu: "રડાર" },
  points: { hi: "बिंदु", gu: "મુદ્દા" },
  pain: { hi: "समस्या", gu: "મુખ્ય" },
  critical: { hi: "महत्वपूर्ण", gu: "મહત્વપૂર્ણ" },
  action: { hi: "कार्रवाई", gu: "પગલાં" },
  goal: { hi: "लक्ष्य", gu: "ધ્યેય" },
  profit: { hi: "लाभ", gu: "નફો" },
  revenue: { hi: "राजस्व", gu: "આવક" },
  pipeline: { hi: "पाइपलाइन", gu: "પાઇપલાઇન" },
  overdue: { hi: "अतिदेय", gu: "બાકી" },
  collections: { hi: "वसूली", gu: "વસૂલાત" },
  collection: { hi: "वसूली", gu: "વસૂલાત" },
  inbound: { hi: "इनबाउंड", gu: "ઇનબાઉન્ડ" },
  outbound: { hi: "आउटबाउंड", gu: "આઉટબાઉન્ડ" },
  unregistered: { hi: "अपंजीकृत", gu: "અણનોંધાયેલ" },
  message: { hi: "संदेश", gu: "સંદેશ" },
  messages: { hi: "संदेश", gu: "સંદેશાઓ" },
  chat: { hi: "चैट", gu: "ચેટ" },
  chats: { hi: "चैट्स", gu: "ચેટ્સ" },
  unread: { hi: "अपठित", gu: "ન વંચાયેલ" },
  read: { hi: "पढ़ा हुआ", gu: "વંચાયેલ" },
  sync: { hi: "सिंक", gu: "સમન્વય" },
  synced: { hi: "सिंक किया गया", gu: "સમન્વયિત" },
  code: { hi: "कोड", gu: "કોડ" },
  channel: { hi: "चैनल", gu: "ચેનલ" },
  category: { hi: "श्रेणी", gu: "શ્રેણી" },
  categories: { hi: "श्रेणियां", gu: "શ્રેણીઓ" },
  and: { hi: "और", gu: "અને" },
  or: { hi: "या", gu: "અથવા" },
  for: { hi: "के लिए", gu: "માટે" },
  with: { hi: "के साथ", gu: "સાથે" },
  by: { hi: "द्वारा", gu: "દ્વારા" },
  to: { hi: "को", gu: "તરફ" },
  from: { hi: "से", gu: "તરફથી" },
  in: { hi: "में", gu: "માં" },
  on: { hi: "पर", gu: "પર" },
  at: { hi: "पर", gu: "ખાતે" },
  as: { hi: "के रूप में", gu: "તરીકે" },
  if: { hi: "यदि", gu: "જો" },
  after: { hi: "के बाद", gu: "પછી" },
  before: { hi: "से पहले", gu: "પહેલાં" },
  during: { hi: "के दौरान", gu: "દરમિયાન" },
  under: { hi: "के तहत", gu: "હેઠળ" },
  across: { hi: "के बीच", gu: "માટે" },
  per: { hi: "प्रति", gu: "પ્રતિ" },
  day: { hi: "दिन", gu: "દિવસ" },
  month: { hi: "माह", gu: "મહિનો" },
  year: { hi: "वर्ष", gu: "વર્ષ" },
  cycle: { hi: "चक्र", gu: "ચક્ર" },
  sqft: { hi: "वर्ग फुट", gu: "ચોરસ ફૂટ" },
  italian: { hi: "इटैलियन", gu: "ઇટાલિયન" },
  indian: { hi: "इंडियन", gu: "ઇન્ડિયન" },
};

// ============================================================================
// DYNAMIC PATTERN TRANSLATORS
// ============================================================================

/**
 * Translates a single text string into Hindi or Gujarati.
 */
export function autoTranslate(text: string, targetLang?: string): string {
  if (!text) return text;
  const lang = targetLang || getActiveLanguage();
  if (lang.startsWith("en")) return text;

  const isHi = lang.startsWith("hi");
  const isGu = lang.startsWith("gu");
  if (!isHi && !isGu) return text;

  const trimmed = text.trim();
  if (!trimmed) return text;

  // 1. Direct dictionary match
  if (INDIC_DICTIONARY[trimmed]) {
    return isHi ? INDIC_DICTIONARY[trimmed].hi : INDIC_DICTIONARY[trimmed].gu;
  }

  // Case-insensitive direct match
  const lower = trimmed.toLowerCase();
  for (const [key, val] of Object.entries(INDIC_DICTIONARY)) {
    if (key.toLowerCase() === lower) {
      return isHi ? val.hi : val.gu;
    }
  }

  // 2. Pattern: "+ <Action>" (e.g. "+ Add Application Partner")
  if (/^\+\s+(.*)$/.test(trimmed)) {
    const actionPart = trimmed.replace(/^\+\s+/, "");
    const transAction = autoTranslate(actionPart, lang);
    return `+ ${transAction}`;
  }

  // 3. Pattern: "<Label> (<Count>)" (e.g. "All Partners (11)", "Salary Balances & Month-End Due (1)")
  const counterMatch = trimmed.match(/^(.*?)\s*\((\d+)\)$/);
  if (counterMatch) {
    const base = counterMatch[1].trim();
    const count = counterMatch[2];
    const transBase = autoTranslate(base, lang);
    const indicCount = toIndicDigits(count, lang);
    return `${transBase} (${indicCount})`;
  }

  // 4. Pattern: Personal Transfer summary flows "In: +₹5,000", "Out: -₹5,000"
  if (/^In:\s*(\+.*)$/i.test(trimmed)) {
    const amt = trimmed.replace(/^In:\s*/i, "");
    return toIndicDigits(isHi ? `आवक: ${amt}` : `આવક: ${amt}`, lang);
  }
  if (/^Out:\s*(-.*)$/i.test(trimmed)) {
    const amt = trimmed.replace(/^Out:\s*/i, "");
    return toIndicDigits(isHi ? `जावक: ${amt}` : `જાવક: ${amt}`, lang);
  }

  // 5. Pattern: "Across <N> active employees"
  const acrossEmpMatch = trimmed.match(/^Across\s+(\d+)\s+active employees$/i);
  if (acrossEmpMatch) {
    const cnt = toIndicDigits(acrossEmpMatch[1], lang);
    return isHi ? `${cnt} सक्रिय कर्मचारियों में` : `${cnt} સક્રિય કર્મચારીઓમાં`;
  }

  // 6. Pattern: "Balance liability for <Month> <Year>"
  const balLiabMatch = trimmed.match(/^Balance liability for\s+(.*)$/i);
  if (balLiabMatch) {
    const period = autoTranslate(balLiabMatch[1].trim(), lang);
    return isHi ? `${period} के लिए शेष देनदारी` : `${period} માટે બાકી જવાબદારી`;
  }

  // 7. Pattern: "<N> pending due"
  const pendDueMatch = trimmed.match(/^(\d+)\s+pending due$/i);
  if (pendDueMatch) {
    const cnt = toIndicDigits(pendDueMatch[1], lang);
    return isHi ? `${cnt} भुगतान लंबित` : `${cnt} ચુકવણી બાકી`;
  }

  // 8. Pattern: "<N> fully settled / cleared"
  const settledMatch = trimmed.match(/^(\d+)\s+fully settled\s*\/\s*cleared$/i);
  if (settledMatch) {
    const cnt = toIndicDigits(settledMatch[1], lang);
    return isHi ? `${cnt} पूर्णतः चुकता / शून्य` : `${cnt} પૂર્ણપણે પતાવટ થયેલ`;
  }

  // 9. Pattern: "Due on the <X> of every month"
  const dueDayMatch = trimmed.match(/^Due on the\s+(\d+)(st|nd|rd|th)?\s+of every month$/i);
  if (dueDayMatch) {
    const day = toIndicDigits(dueDayMatch[1], lang);
    return isHi ? `प्रत्येक माह की ${day} तारीख को देय` : `દર મહિનાની ${day} તારીખે બાકી`;
  }

  // 10. Pattern: "Total: ₹<Amt>" or "कुल: ₹<Amt>"
  if (/^(Total|कुल|કુલ):\s*(₹?[\d,]+)$/i.test(trimmed)) {
    const match = trimmed.match(/^(Total|कुल|કુલ):\s*(₹?[\d,]+)$/i);
    if (match) {
      const amt = toIndicDigits(match[2], lang);
      return isHi ? `कुल: ${amt}` : `કુલ: ${amt}`;
    }
  }

  // 11. Pattern: Month + Year (e.g. "October 2026", "November 2026")
  const monthYearMatch = trimmed.match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i,
  );
  if (monthYearMatch) {
    const m = monthYearMatch[1].toLowerCase();
    const yr = toIndicDigits(monthYearMatch[2], lang);
    const monthsHi: Record<string, string> = {
      january: "जनवरी",
      february: "फ़रवरी",
      march: "मार्च",
      april: "अप्रैल",
      may: "मई",
      june: "जून",
      july: "जुलाई",
      august: "अगस्त",
      september: "सितंबर",
      october: "अक्टूबर",
      november: "नवंबर",
      december: "दिसंबर",
    };
    const monthsGu: Record<string, string> = {
      january: "જાન્યુઆરી",
      february: "ફેબ્રુઆરી",
      march: "માર્ચ",
      april: "એપ્રિલ",
      may: "મે",
      june: "જૂન",
      july: "જુલાઈ",
      august: "ઓગસ્ટ",
      september: "સપ્ટેમ્બર",
      october: "ઓક્ટોબર",
      november: "નવેમ્બર",
      december: "ડિસેમ્બર",
    };
    const mTrans = isHi ? (monthsHi[m] ?? m) : (monthsGu[m] ?? m);
    return `${mTrans} ${yr}`;
  }

  // 12. Pattern: Growth / Financial / Notification phrases
  if (
    /^Site installations auto-generated from Supply \+ Installation sales orders\.?$/i.test(trimmed)
  ) {
    return isHi
      ? "सप्लाई + इंस्टॉलेशन बिक्री आदेशों से स्वचालित रूप से उत्पन्न साइट स्थापनाएं।"
      : "સપ્લાય + ઇન્સ્ટોલેશન વેચાણ ઓર્ડર પરથી આપોઆપ જનરેટ થયેલ સાઇટ ઇન્સ્ટોલેશન.";
  }

  if (
    /^Registered installation masters, dry cladding contractors, supervisors, and site execution teams\.?$/i.test(
      trimmed,
    )
  ) {
    return isHi
      ? "पंजीकृत स्थापना मास्टर्स, ड्राई क्लैडिंग ठेकेदार, सुपरवाइजर और साइट निष्पादन टीमें।"
      : "નોંધાયેલ ઇન્સ્ટોલેશન માસ્ટર્સ, ડ્રાય ક્લેડિંગ કોન્ટ્રાક્ટરો, સુપરવાઇઝરો અને સાઇટ એક્ઝિક્યુશન ટીમો.";
  }

  if (
    /^Rental liabilities, equipment loans, recurring monthly obligations, and payments registry\.?$/i.test(
      trimmed,
    )
  ) {
    return isHi
      ? "किराया देनदारियां, उपकरण ऋण, आवर्ती मासिक दायित्व और भुगतान रजिस्ट्री।"
      : "ભાડાની જવાબદારીઓ, સાધન લોન, પુનરાવર્તિત માસિક જવાબદારીઓ અને ચુકવણી રજિસ્ટ્રી.";
  }

  if (/^Automated GST liability calculations from Sales & Purchase Invoices.*?$/i.test(trimmed)) {
    return isHi
      ? "बिक्री और खरीद चालानों से स्वचालित जीएसटी देनदारी गणना, नियम 88A समायोजन, फॉर्म PMT-06 चालान, और 1-क्लिक फाइलिंग।"
      : "વેચાણ અને ખરીદી ઇન્વૉઇસમાંથી આપોઆપ GST જવાબદારી ગણતરી, નિયમ 88A સેટ-ઓફ, ફોર્મ PMT-06 ચલણ અને 1-ક્લિક ફાઇલિંગ.";
  }

  if (
    /^Record intermediate salary payments, advances, and track how much net salary needs to be paid.*?$/i.test(
      trimmed,
    )
  ) {
    return isHi
      ? "माह के दौरान वेतन भुगतान, अग्रिम दर्ज करें और माह समाप्त होने पर देय शुद्ध वेतन को ट्रैक करें।"
      : "મહિના દરમિયાન પગાર ચૂકવણી, એડવાન્સ નોંધો અને મહિનો પૂરો થતાં ચૂકવવાપાત્ર ચોખ્ખો પગાર ટ્રેક કરો.";
  }

  // 14. Pattern: "No fixed date"
  if (/^No fixed date$/i.test(trimmed)) {
    return isHi ? "कोई निश्चित तारीख नहीं" : "કોઈ નિશ્ચિત તારીખ નથી";
  }

  // 15. Pattern: "Turnover: ₹..." & "Inward: ₹..."
  if (/^Turnover:\s*(.*)$/i.test(trimmed)) {
    const amt = trimmed.replace(/^Turnover:\s*/i, "");
    return toIndicDigits(isHi ? `टर्नओवर: ${amt}` : `ટર્નઓવર: ${amt}`, lang);
  }
  if (/^Inward:\s*(.*)$/i.test(trimmed)) {
    const amt = trimmed.replace(/^Inward:\s*/i, "");
    return toIndicDigits(isHi ? `आवक: ${amt}` : `આવક: ${amt}`, lang);
  }

  // 16. Pattern: "<N> Invoices", "<N> Bills", "<N> Orders"
  const invCountMatch = trimmed.match(/^(\d+)\s+Invoices$/i);
  if (invCountMatch) {
    const cnt = toIndicDigits(invCountMatch[1], lang);
    return isHi ? `${cnt} चालान` : `${cnt} ઇન્વૉઇસ`;
  }
  const billCountMatch = trimmed.match(/^(\d+)\s+Bills$/i);
  if (billCountMatch) {
    const cnt = toIndicDigits(billCountMatch[1], lang);
    return isHi ? `${cnt} बिल` : `${cnt} બિલ`;
  }
  const orderCountMatch = trimmed.match(/^(\d+)\s+Orders?$/i);
  if (orderCountMatch) {
    const cnt = toIndicDigits(orderCountMatch[1], lang);
    return isHi ? `${cnt} ऑर्डर` : `${cnt} ઓર્ડર`;
  }
  const quoteActiveMatch = trimmed.match(/^(\d+)\s+quote\(s\)\s+active$/i);
  if (quoteActiveMatch) {
    const cnt = toIndicDigits(quoteActiveMatch[1], lang);
    return isHi ? `${cnt} कोटेशन सक्रिय` : `${cnt} ક્વોટેશન સક્રિય`;
  }

  // 17. Pattern: Dashboard greetings "Yo, Nocturnal!! <name> 🦉"
  const nocturnalMatch = trimmed.match(/^Yo,\s*Nocturnal!!\s*(.*?)\s*🦉?$/i);
  if (nocturnalMatch) {
    const person = nocturnalMatch[1];
    return isHi ? `नमस्ते, ${person}!! 🦉` : `નમસ્તે, ${person}!! 🦉`;
  }

  // 18. Pattern: Compound delimiters: " · ", " | "
  if (trimmed.includes(" · ")) {
    const parts = trimmed.split(" · ");
    const translatedParts = parts.map((p) => autoTranslate(p.trim(), lang));
    return translatedParts.join(" · ");
  }
  if (trimmed.includes(" | ")) {
    const parts = trimmed.split(" | ");
    const translatedParts = parts.map((p) => autoTranslate(p.trim(), lang));
    return translatedParts.join(" | ");
  }

  // 19. Pattern: Compound delimiters " / "
  if (trimmed.includes(" / ")) {
    const parts = trimmed.split(" / ");
    const translatedParts = parts.map((p) => autoTranslate(p.trim(), lang));
    return translatedParts.join(" / ");
  }

  // 20. Pattern: "e.g. <example>"
  if (/^e\.g\.\s+/i.test(trimmed)) {
    const examplePart = trimmed.replace(/^e\.g\.\s+/i, "");
    const transEx = autoTranslate(examplePart, lang);
    return isHi ? `उदा. ${transEx}` : `દા.ત. ${transEx}`;
  }

  // 21. Word-by-word intelligent lexicon tokenizer
  if (/[a-zA-Z]/.test(trimmed)) {
    const replaced = trimmed.replace(/\b[A-Za-z]+(?:'[a-z]+)?\b/g, (token) => {
      const lower = token.toLowerCase();
      if (INDIC_WORD_LEXICON[lower]) {
        return isHi ? INDIC_WORD_LEXICON[lower].hi : INDIC_WORD_LEXICON[lower].gu;
      }
      return token;
    });

    if (replaced !== trimmed) {
      return toIndicDigits(replaced, lang);
    }
  }

  // Fallback: If it contains Latin digits, ensure digits are localized
  return toIndicDigits(text, lang);
}

// ============================================================================
// i18next postProcessor: indicAutoTranslate
// ============================================================================
export const indicAutoTranslate: PostProcessorModule = {
  type: "postProcessor",
  name: "indicAutoTranslate",
  process(value: string, key: string, _options: unknown, translator: { language?: string }) {
    if (!value) return value;
    const lang = translator?.language || getActiveLanguage();
    if (lang.startsWith("en")) return value;

    // If value equals key (untranslated) or is an English default, auto-translate it!
    const translated = autoTranslate(value, lang);
    return toIndicDigits(translated, lang);
  },
};

// ============================================================================
// RECURSIVE REACT NODE TRANSLATOR
// ============================================================================
export function translateNode(node: React.ReactNode, lang?: string): React.ReactNode {
  if (node == null || typeof node === "boolean") return node;

  if (typeof node === "string" || typeof node === "number") {
    return autoTranslate(String(node), lang);
  }

  if (Array.isArray(node)) {
    return React.Children.map(node, (child) => translateNode(child, lang));
  }

  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode; [key: string]: unknown };
    if (!props || !props.children) return node;

    return React.cloneElement(
      node as React.ReactElement<{ children?: React.ReactNode }>,
      undefined,
      React.Children.map(props.children, (child) => translateNode(child, lang)),
    );
  }

  return node;
}
