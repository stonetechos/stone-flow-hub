import fs from 'fs';
import path from 'path';

// 1. Patch dashboard.tsx
const dbPath = path.resolve('src/routes/_authenticated/dashboard.tsx');
let dbContent = fs.readFileSync(dbPath, 'utf-8');

// CopilotDock
dbContent = dbContent.replace(
  /health\.band === "strong"\s*\n\s*\?\s*t\("dashboard\.aiCopilotDesc"\)\s*\n\s*:\s*health\.band === "steady"\s*\n\s*\?\s*"Steady day\. A few items want attention\."\s*\n\s*:\s*"Several risks are open\. Address them first\."/gm,
  'health.band === "strong" ? t("dashboard.aiCopilotDescStrong") : health.band === "steady" ? t("dashboard.aiCopilotDescSteady") : t("dashboard.aiCopilotDescWeak")'
);

dbContent = dbContent.replace(
  /<MiniStat label="Cash today" value=\{"₹" \+ formatMoney\(kpis\.collectionsTodayInr\)\} \/>/g,
  '<MiniStat label={t("dashboard.cashToday")} value={"₹" + formatMoney(kpis.collectionsTodayInr)} />'
);

dbContent = dbContent.replace(
  /<MiniStat label="To approve" value=\{String\(kpis\.pendingQuotes\)\} \/>/g,
  '<MiniStat label={t("dashboard.toApprove")} value={String(kpis.pendingQuotes)} />'
);

dbContent = dbContent.replace(
  /<MiniStat label="Overdue" value=\{String\(kpis\.overdueFollowups\)\} \/>/g,
  '<MiniStat label={t("dashboard.overdue")} value={String(kpis.overdueFollowups)} />'
);

// pickHeadline
dbContent = dbContent.replace(
  /function pickHeadline\(k: DashboardKpis\): HeadlineMetric \{/g,
  'function pickHeadline(k: DashboardKpis, t: any): HeadlineMetric {'
);

dbContent = dbContent.replace(
  /label: "Outstanding receivables",/g,
  'label: t("dashboard.outstandingReceivables"),'
);
dbContent = dbContent.replace(
  /context: `\$\{k\.overdueFollowups\} pending collection\$\{k\.overdueFollowups === 1 \? "" : "s"\}`,/g,
  'context: t("dashboard.pendingCollections", { count: k.overdueFollowups }),'
);

dbContent = dbContent.replace(
  /label: "Production workload",/g,
  'label: t("dashboard.productionWorkload"),'
);
dbContent = dbContent.replace(
  /context: `\$\{k\.overdueTasks\} urgent task\$\{k\.overdueTasks === 1 \? "" : "s"\} on your list\.`,/g,
  'context: t("dashboard.urgentTasks", { count: k.overdueTasks }),'
);

dbContent = dbContent.replace(
  /label: "Order backlog",/g,
  'label: t("dashboard.orderBacklog"),'
);
dbContent = dbContent.replace(
  /context: `\$\{k\.deliveriesToday\} dispatch\$\{k\.deliveriesToday === 1 \? "" : "es"\} today`,/g,
  'context: t("dashboard.dispatchesToday", { count: k.deliveriesToday }),'
);

dbContent = dbContent.replace(
  /label: "Revenue pipeline",/g,
  'label: t("dashboard.revenuePipeline"),'
);
dbContent = dbContent.replace(
  /context: `\$\{k\.pendingQuotes\} quote\$\{k\.pendingQuotes === 1 \? "" : "s"\} in play`,/g,
  'context: t("dashboard.quotesInPlay", { count: k.pendingQuotes }),'
);

// Executive brief strings
dbContent = dbContent.replace(
  /return \["Everything is quiet\. Production is operating normally\."\];/g,
  'return [t("dashboard.briefQuiet")];'
);
dbContent = dbContent.replace(
  /brief\.push\("No urgent tasks\. A good moment to plan next week\."\);/g,
  'brief.push(t("dashboard.briefNoUrgent"));'
);

// We need to pass `t` to pickHeadline and buildBrief
dbContent = dbContent.replace(
  /const headline = pickHeadline\(kpis\);/g,
  'const headline = pickHeadline(kpis, t);'
);
dbContent = dbContent.replace(
  /function buildBrief\(kpis: DashboardKpis\): string\[\] \{/g,
  'function buildBrief(kpis: DashboardKpis, t: any): string[] {'
);
dbContent = dbContent.replace(
  /const brief = buildBrief\(kpis\);/g,
  'const brief = buildBrief(kpis, t);'
);

fs.writeFileSync(dbPath, dbContent);


// 2. Patch WebsiteLeadsDashboardCard.tsx
const cardPath = path.resolve('src/components/dashboard/WebsiteLeadsDashboardCard.tsx');
let cardContent = fs.readFileSync(cardPath, 'utf-8');

if (!cardContent.includes('useTranslation')) {
  cardContent = cardContent.replace(
    /import \{ useQuery \} from "@tanstack\/react-query";/g,
    'import { useQuery } from "@tanstack/react-query";\nimport { useTranslation } from "react-i18next";'
  );
  
  cardContent = cardContent.replace(
    /export function WebsiteLeadsDashboardCard\(\) \{/g,
    'export function WebsiteLeadsDashboardCard() {\n  const { t } = useTranslation();'
  );
}

// Subtitles
cardContent = cardContent.replace(
  /Visitor Inquiries & CRM Leads/g,
  '{t("crm.leadsTitle")}'
);
cardContent = cardContent.replace(
  /Live web visitor requests submitted through www\.stonetech\.in/g,
  '{t("crm.leadsSubtitle")}'
);

cardContent = cardContent.replace(
  /TOTAL WEB LEADS/g,
  '{t("crm.totalLeads")}'
);
cardContent = cardContent.replace(
  /inquiries<\/span>/g,
  '{t("crm.inquiries")}</span>'
);

cardContent = cardContent.replace(
  /NEW UNCONTACTED/g,
  '{t("crm.newUncontacted")}'
);
cardContent = cardContent.replace(
  /awaiting reply<\/span>/g,
  '{t("crm.awaitingReply")}</span>'
);

cardContent = cardContent.replace(
  /IN DISCUSSION \/ QUOTING/g,
  '{t("crm.inDiscussion")}'
);
cardContent = cardContent.replace(
  /active<\/span>/g,
  '{t("crm.active")}</span>'
);

cardContent = cardContent.replace(
  /ORDERS WON/g,
  '{t("crm.ordersWon")}'
);
cardContent = cardContent.replace(
  /converted<\/span>/g,
  '{t("crm.converted")}</span>'
);

cardContent = cardContent.replace(
  /Copy www\.stonetech\.in Link/g,
  '{t("crm.copyLink")}'
);
cardContent = cardContent.replace(
  /View Full CRM Pipeline/g,
  '{t("crm.viewFull")}'
);

cardContent = cardContent.replace(
  /Recent Inquiries \(\{leads\.slice\(0, 5\)\.length\} of \{leads\.length\}\)/g,
  '{t("crm.recentInquiries", { count: leads.slice(0, 5).length, total: leads.length })}'
);
cardContent = cardContent.replace(
  /Direct 1-Click WhatsApp Chat Available/g,
  '{t("crm.whatsappAvailable")}'
);

cardContent = cardContent.replace(
  /const customerName = lead\.customer\?\.name \|\| "Prospective Client";/g,
  'const customerName = lead.customer?.name || t("crm.prospectiveClient");'
);

cardContent = cardContent.replace(
  /<Clock className="h-2\.5 w-2\.5" \/> Urgent: \{diffDays\}d left/g,
  '<Clock className="h-2.5 w-2.5" /> {t("crm.urgent", { days: diffDays })}'
);

cardContent = cardContent.replace(
  /Past date\n/g,
  '{t("crm.pastDate")}\n'
);

cardContent = cardContent.replace(
  /Needed in \{diffDays\}d\n/g,
  '{t("crm.neededIn", { days: diffDays })}\n'
);

cardContent = cardContent.replace(
  /Target: \{new Date\(lead\.required_delivery_date\)\.toLocaleDateString\(\)\}/g,
  '{t("crm.target", { date: new Date(lead.required_delivery_date).toLocaleDateString() })}'
);

cardContent = cardContent.replace(
  /📷 \{photoCount\} photo\{photoCount > 1 \? "s" : ""\}/g,
  '{t("crm.photos", { count: photoCount })}'
);

cardContent = cardContent.replace(
  /<span>WhatsApp<\/span>/g,
  '<span>{t("crm.whatsapp")}</span>'
);

cardContent = cardContent.replace(
  /<span className="text-xs text-slate-400">No WhatsApp<\/span>/g,
  '<span className="text-xs text-slate-400">{t("crm.noWhatsapp")}</span>'
);

cardContent = cardContent.replace(
  /<span>Details<\/span>/g,
  '<span>{t("crm.details")}</span>'
);

fs.writeFileSync(cardPath, cardContent);

console.log("Components patched!");
