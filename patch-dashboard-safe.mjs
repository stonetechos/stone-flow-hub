import fs from 'fs';
import path from 'path';

const p = path.resolve('src/routes/_authenticated/dashboard.tsx');
let content = fs.readFileSync(p, 'utf-8');

// Inject hook into OperationalRadar
content = content.replace(
  /function OperationalRadar\(\{([^}]*)\}: \{([^}]*)\}\) \{/,
  (m, p1, p2) => "function OperationalRadar({" + p1 + "}: {" + p2 + "}) {\\n  const { t } = useTranslation();"
);

// Inject hook into BusinessHealthGrid
content = content.replace(
  /function BusinessHealthGrid\(\{ kpis \}: \{ kpis: DashboardKpis \}\) \{/,
  'function BusinessHealthGrid({ kpis }: { kpis: DashboardKpis }) {\\n  const { t } = useTranslation();'
);

// Inject hook into QuickActions
content = content.replace(
  /function QuickActions\(\) \{/,
  'function QuickActions() {\\n  const { t } = useTranslation();'
);

// Replace Radar strings
content = content.replace(
  /\`\\\$\\{kpis\\.overdueFollowups\\} overdue follow-up\\\$\\{kpis\\.overdueFollowups === 1 \\? "" : "s"\\}\`/g,
  't("dashboard.radar.overdueFollowups", { count: kpis.overdueFollowups })'
);
content = content.replace(
  /\`₹\\\$\\{formatMoney\\(kpis\\.outstandingInr\\)\\} receivables at risk\`/g,
  't("dashboard.radar.receivablesRisk", { amount: formatMoney(kpis.outstandingInr) })'
);
content = content.replace(
  /sub: "Urgent task"/g,
  'sub: t("dashboard.radar.urgentTask")'
);
content = content.replace(
  /\`\\\$\\{kpis\\.pendingQuotes\\} quote\\\$\\{kpis\\.pendingQuotes === 1 \\? "" : "s"\\} awaiting response\`/g,
  't("dashboard.radar.quotesAwaiting", { count: kpis.pendingQuotes })'
);
content = content.replace(
  /\`\\\$\\{kpis\\.ordersToStart\\} sales order\\\$\\{kpis\\.ordersToStart === 1 \\? "" : "s"\\} to start\`/g,
  't("dashboard.radar.ordersToStart", { count: kpis.ordersToStart })'
);
content = content.replace(
  /\`\\\$\\{kpis\\.pendingRfqs\\} RFQ\\\$\\{kpis\\.pendingRfqs === 1 \\? "" : "s"\\} pending vendor reply\`/g,
  't("dashboard.radar.rfqsPending", { count: kpis.pendingRfqs })'
);
content = content.replace(
  /\`\\\$\\{kpis\\.todayFollowups\\} follow-up\\\$\\{kpis\\.todayFollowups === 1 \\? "" : "s"\\} today\`/g,
  't("dashboard.radar.todayFollowups", { count: kpis.todayFollowups })'
);
content = content.replace(
  /\`\\\$\\{kpis\\.deliveriesToday\\} dispatch\\\$\\{kpis\\.deliveriesToday === 1 \\? "" : "es"\\} today\`/g,
  't("dashboard.radar.dispatchesToday", { count: kpis.deliveriesToday })'
);
content = content.replace(
  /nextFollowup\\.notes\\?\\.slice\\(0, 60\\) \\?\\? "Scheduled follow-up"/g,
  'nextFollowup.notes?.slice(0, 60) ?? t("dashboard.radar.scheduledFollowup")'
);
content = content.replace(
  /\`₹\\\$\\{formatMoney\\(kpis\\.collectionsTodayInr\\)\\} collected\`/g,
  't("dashboard.radar.collected", { amount: formatMoney(kpis.collectionsTodayInr) })'
);
content = content.replace(
  /\`₹\\\$\\{formatMoney\\(kpis\\.salesTodayInr\\)\\} invoiced\`/g,
  't("dashboard.radar.invoiced", { amount: formatMoney(kpis.salesTodayInr) })'
);
content = content.replace(
  /\`\\\$\\{doneTasks\\} task\\\$\\{doneTasks === 1 \\? "" : "s"\\} closed\`/g,
  't("dashboard.radar.tasksClosed", { count: doneTasks })'
);
content = content.replace(
  /label: "Open calendar"/g,
  'label: t("dashboard.radar.openCalendar")'
);

// Replace Grid strings
content = content.replace(/label: "Receivables",/g, 'label: t("dashboard.grid.receivables"),');
content = content.replace(/label: "Collected this month",/g, 'label: t("dashboard.grid.collectedMonth"),');
content = content.replace(/label: "Collected today",/g, 'label: t("dashboard.grid.collectedToday"),');
content = content.replace(/label: "Sales invoiced today",/g, 'label: t("dashboard.grid.salesInvoicedToday"),');
content = content.replace(/label: "Revenue in pipeline",/g, 'label: t("dashboard.grid.revenuePipeline"),');

content = content.replace(/label: "Sales orders to start",/g, 'label: t("dashboard.grid.salesOrdersStart"),');
content = content.replace(/label: "Dispatches today",/g, 'label: t("dashboard.grid.dispatchesToday"),');
content = content.replace(/label: "Active installations",/g, 'label: t("dashboard.grid.activeInstallations"),');

// Replace Pipeline strings
content = content.replace(/label: "Active enquiries"/g, 'label: t("dashboard.grid.activeEnquiries")');
content = content.replace(/label: "Quotes to approve"/g, 'label: t("dashboard.grid.quotesToApprove")');
content = content.replace(/label: "Orders to start"/g, 'label: t("dashboard.grid.ordersToStart")');
content = content.replace(/label: "Enquiry → quote"/g, 'label: t("dashboard.grid.enquiryToQuote")');
content = content.replace(/label: "Avg\. quote value"/g, 'label: t("dashboard.grid.avgQuoteValue")');
content = content.replace(/label: "Pipeline value"/g, 'label: t("dashboard.grid.pipelineValue")');

// Replace Quick Actions strings
content = content.replace(/label: "Customer"/g, 'label: t("dashboard.actions.customer")');
content = content.replace(/label: "Enquiry"/g, 'label: t("dashboard.actions.enquiry")');
content = content.replace(/label: "Quote"/g, 'label: t("dashboard.actions.quote")');
content = content.replace(/label: "Sales order"/g, 'label: t("dashboard.actions.salesOrder")');
content = content.replace(/label: "Purchase order"/g, 'label: t("dashboard.actions.purchaseOrder")');
content = content.replace(/label: "Receipt"/g, 'label: t("dashboard.actions.receipt")');
content = content.replace(/label: "Dispatch"/g, 'label: t("dashboard.actions.dispatch")');

content = content.replace(/label: "Orders queued for production"/g, 'label: t("dashboard.ordersQueued")');

fs.writeFileSync(p, content);
console.log("Dashboard components translated safely");
