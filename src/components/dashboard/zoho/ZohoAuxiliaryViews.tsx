import {
  Bell,
  Sparkles,
  BookOpen,
  MessageSquare,
  Phone,
  ExternalLink,
  CheckCircle,
  CheckCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAnnouncements } from "./announcements-state";

export function AnnouncementsView() {
  const { announcements, unreadCount, markAsRead, markAllAsRead } = useAnnouncements();

  const handleMarkAll = () => {
    markAllAsRead();
    toast.success("All announcements marked as read");
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <span>System & Company Announcements</span>
          {unreadCount > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              {unreadCount} unread
            </span>
          )}
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5"
          onClick={handleMarkAll}
          disabled={unreadCount === 0}
        >
          <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
          {unreadCount === 0 ? "All Read" : "Mark All as Read"}
        </Button>
      </div>

      <div className="space-y-3">
        {announcements.map((item) => (
          <Card
            key={item.id}
            onClick={() => {
              if (item.unread) {
                markAsRead(item.id);
                toast.info(`Marked announcement as read`);
              }
            }}
            className={cn(
              "border border-border/80 shadow-xs transition-all",
              item.unread
                ? "bg-cyan-50/20 dark:bg-cyan-950/10 border-cyan-200/80 ring-1 ring-cyan-500/20 cursor-pointer"
                : "opacity-90",
            )}
          >
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {item.category}
                  </span>
                  {item.unread && (
                    <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" title="Unread" />
                  )}
                  <CardTitle className="text-sm font-semibold text-foreground">
                    {item.title}
                  </CardTitle>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{item.date}</span>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-1 text-xs text-muted-foreground leading-relaxed flex items-center justify-between gap-3">
              <span>{item.body}</span>
              {item.unread && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(item.id);
                    toast.info(`Marked announcement as read`);
                  }}
                  className="shrink-0 text-[11px] font-semibold text-cyan-700 hover:text-cyan-900 hover:underline dark:text-cyan-400"
                >
                  Mark as read
                </button>
              )}
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
          <div className="h-8 w-8 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 flex items-center justify-center">
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
