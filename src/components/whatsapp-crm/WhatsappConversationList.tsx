import { useState, useMemo } from "react";
import { Search, UserCheck, AlertCircle, MessageCircle, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WhatsappConversation } from "./types";

interface WhatsappConversationListProps {
  conversations: WhatsappConversation[];
  activeId: string | null;
  onSelectConversation: (conv: WhatsappConversation) => void;
}

export function WhatsappConversationList({
  conversations,
  activeId,
  onSelectConversation,
}: WhatsappConversationListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "leads" | "gone-quiet">("all");

  const filtered = useMemo(() => {
    let list = conversations;

    if (filter === "unread") {
      list = list.filter((c) => c.unreadCount > 0);
    } else if (filter === "leads") {
      list = list.filter((c) => c.leadStage && c.leadStage !== "unregistered");
    } else if (filter === "gone-quiet") {
      list = list.filter((c) => c.isGoneQuiet);
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (c) =>
        c.contactName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.companyName?.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q),
    );
  }, [conversations, filter, search]);

  return (
    <div className="flex flex-col h-full border-r bg-muted/20">
      {/* Top Search & Filter Bar */}
      <div className="p-2.5 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search chats, numbers, firms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px]">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "px-2 py-0.5 rounded-full whitespace-nowrap transition-colors",
              filter === "all"
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={cn(
              "px-2 py-0.5 rounded-full whitespace-nowrap transition-colors",
              filter === "unread"
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            Unread
          </button>
          <button
            onClick={() => setFilter("leads")}
            className={cn(
              "px-2 py-0.5 rounded-full whitespace-nowrap transition-colors",
              filter === "leads"
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            Leads
          </button>
          <button
            onClick={() => setFilter("gone-quiet")}
            className={cn(
              "px-2 py-0.5 rounded-full whitespace-nowrap transition-colors flex items-center gap-1",
              filter === "gone-quiet"
                ? "bg-amber-600 text-white font-semibold"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20",
            )}
          >
            <AlertCircle className="h-3 w-3" />
            Gone Quiet (&gt;3d)
          </button>
        </div>
      </div>

      {/* Conversation Item List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/60">
        {filtered.map((conv) => {
          const isSelected = conv.id === activeId;
          const initials = conv.contactName
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();

          return (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv)}
              className={cn(
                "p-3 flex items-start gap-2.5 cursor-pointer transition-colors relative hover:bg-accent/40",
                isSelected &&
                  "bg-accent/70 border-l-4 border-l-emerald-600 dark:border-l-emerald-400",
              )}
            >
              {/* Avatar circle */}
              <div className="h-9 w-9 rounded-full bg-emerald-700/10 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/20">
                {initials || "ST"}
              </div>

              {/* Conversation Metadata */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-xs text-foreground truncate">
                    {conv.contactName}
                  </span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {conv.lastMessageAt}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5 gap-1">
                  <span className="truncate">{conv.companyName || conv.phone}</span>
                  {conv.unreadCount > 0 && (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[9px] px-1.5 py-0 h-4 min-w-[16px] flex items-center justify-center rounded-full shrink-0">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground/90 truncate mt-1">
                  {conv.lastMessage}
                </p>

                {/* Tags / Indicators */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  {conv.isGoneQuiet && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/10"
                    >
                      <Clock className="h-2.5 w-2.5 mr-0.5" /> Gone Quiet
                    </Badge>
                  )}
                  {conv.leadStage && conv.leadStage !== "unregistered" && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 capitalize">
                      {conv.leadStage}
                    </Badge>
                  )}
                  {conv.assignedTo && (
                    <span className="text-[9px] text-muted-foreground ml-auto flex items-center gap-0.5">
                      <UserCheck className="h-2.5 w-2.5" /> {conv.assignedTo}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-xs">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No conversations found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
