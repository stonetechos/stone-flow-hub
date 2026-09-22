import fs from 'fs';
import path from 'path';

const enPath = path.resolve('src/lib/i18n/locales/en.json');
const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

enData.dashboard = {
  ...enData.dashboard,
  revenuePipeline: "Revenue pipeline",
  outstandingReceivables: "Outstanding receivables",
  productionWorkload: "Production workload",
  orderBacklog: "Order backlog",
  greeting: {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening"
  },
  aiCopilotDescStrong: "The business is running strong. Focus on growth.",
  aiCopilotDescSteady: "Steady day. A few items want attention.",
  aiCopilotDescWeak: "Several risks are open. Address them first.",
  cashToday: "Cash today",
  toApprove: "To approve",
  overdue: "Overdue",
  quotesInPlay: "{{count}} quote(s) in play",
  pendingCollections: "{{count}} pending collection(s)",
  urgentTasks: "{{count}} urgent task(s) on your list.",
  dispatchesToday: "{{count}} dispatch(es) today",
  briefQuiet: "Everything is quiet. Production is operating normally.",
  briefNoUrgent: "No urgent tasks. A good moment to plan next week."
};

enData.crm = {
  leadsTitle: "Visitor Inquiries & CRM Leads",
  leadsSubtitle: "Live web visitor requests submitted through www.stonetech.in",
  totalLeads: "TOTAL WEB LEADS",
  newUncontacted: "NEW UNCONTACTED",
  inDiscussion: "IN DISCUSSION / QUOTING",
  ordersWon: "ORDERS WON",
  copyLink: "Copy Website Link",
  viewFull: "View Full CRM Pipeline",
  recentInquiries: "Recent Inquiries ({{count}} of {{total}})",
  whatsappAvailable: "Direct 1-Click WhatsApp Chat Available",
  whatsapp: "WhatsApp",
  details: "Details",
  noWhatsapp: "No WhatsApp",
  urgent: "Urgent: {{days}}d left",
  pastDate: "Past date",
  neededIn: "Needed in {{days}}d",
  target: "Target: {{date}}",
  photos: "📷 {{count}} photo(s)",
  prospectiveClient: "Prospective Client",
  inquiries: "inquiries",
  awaitingReply: "awaiting reply",
  active: "active",
  converted: "converted"
};

fs.writeFileSync(enPath, JSON.stringify(enData, null, 2));
console.log("en locale updated!");
