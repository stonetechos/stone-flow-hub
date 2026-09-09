import {
  Bell,
  Sparkles,
  BookOpen,
  MessageSquare,
  Phone,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AnnouncementsView() {
  const announcements = [
    {
      id: "1",
      title: "New Zoho Books Dashboard Integration Live",
      date: "Today",
      category: "System Update",
      body: "The executive dashboard has been updated to provide full parity with Zoho Books, including real-time Receivables, Payables, Monthly Cash Flow, and Accrual vs Cash sales & expense tracking.",
      unread: true,
    },
    {
      id: "2",
      title: "HR Operations & Payroll Migration Complete",
      date: "Today",
      category: "Operations",
      body: "HR Operations and Workforce Intelligence have been merged into 4 cohesive hubs: Employees, Attendance & Leave, Payroll, and Workforce Intelligence.",
      unread: false,
    },
    {
      id: "3",
      title: "GST E-Way Bill & Dispatch Protocol",
      date: "01 Sep 2026",
      category: "Compliance",
      body: "All outward stone dispatches exceeding ₹50,000 must include the validated E-Way Bill number and vehicle registration before vehicle gate clearance.",
      unread: false,
    },
  ];

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <span>System & Company Announcements</span>
        </h2>
        <Button variant="outline" size="sm" className="text-xs">
          Mark All as Read
        </Button>
      </div>

      <div className="space-y-3">
        {announcements.map((item) => (
          <Card key={item.id} className="border border-border/80 shadow-xs">
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {item.category}
                  </span>
                  {item.unread && (
                    <span className="h-2 w-2 rounded-full bg-rose-500" title="Unread" />
                  )}
                  <CardTitle className="text-sm font-semibold text-foreground">
                    {item.title}
                  </CardTitle>
                </div>
                <span className="text-xs text-muted-foreground">{item.date}</span>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-1 text-xs text-muted-foreground leading-relaxed">
              {item.body}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function HelpView() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span>Stone Tech OS Support & Help Centre</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Guides, documentation, and technical support for STOS enterprise operations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border border-border/80 p-4 space-y-2">
          <div className="h-8 w-8 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <BookOpen className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">User Manual</h3>
          <p className="text-xs text-muted-foreground">
            Complete walkthrough of sales quotations, purchase orders, dispatch workflows, and
            inventory tracking.
          </p>
        </Card>

        <Card className="border border-border/80 p-4 space-y-2">
          <div className="h-8 w-8 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">Shortcuts & Search</h3>
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">Cmd + K</kbd>{" "}
            anywhere to quickly search customers, invoices, and stone varieties.
          </p>
        </Card>

        <Card className="border border-border/80 p-4 space-y-2">
          <div className="h-8 w-8 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Phone className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">Support Desk</h3>
          <p className="text-xs text-muted-foreground">
            Direct access to Vedora Vision technical team for custom reports, data migration, and
            assistance.
          </p>
        </Card>
      </div>
    </div>
  );
}
