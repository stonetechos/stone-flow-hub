import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, UserCheck, AlertCircle, MessageCircle, Clock, Plus, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toIndicDigits } from "@/lib/format";
import type { WhatsappConversation } from "./types";

interface WhatsappConversationListProps {
  conversations: WhatsappConversation[];
  activeId: string | null;
  onSelectConversation: (conv: WhatsappConversation) => void;
  onOpenNewChat?: () => void;
  onOpenSync?: () => void;
}

export function WhatsappConversationList({
  conversations,
  activeId,
  onSelectConversation,
  onOpenNewChat,
  onOpenSync,
}: WhatsappConversationListProps) {
  const { t } = useTranslation();
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
        <div className="flex items-center justify-between gap-1.5 pb-0.5">
          <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
            <span>Chats</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              {filtered.length}
            </Badge>
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenNewChat}
              className="h-6 px-2 text-[10.5px] font-semibold gap-1 text-[#015474] border-[#c9d1d4] hover:bg-[#e0f1f5] cursor-pointer"
              title="Start a new WhatsApp chat with any customer"
            >
              <Plus className="h-3 w-3" />
              <span>New</span>
            </Button>
            <Button
              size="sm"
              onClick={onOpenSync}
              className="h-6 px-2 text-[10.5px] font-bold gap-1 bg-[#006788] hover:bg-[#00597b] text-white cursor-pointer shadow-2xs"
              title="Open WhatsApp One-Time Synchronisation Center"
            >
              <Zap className="h-3 w-3" />
              <span>One-Time Sync</span>
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("communication.searchChats", "Search chats, numbers, firms...")}
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
            {t("communication.filterAll", "All")}
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
            {t("communication.filterUnread", "Unread")}
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
            {t("communication.filterLeads", "Leads")}
          </button>
          <button
            onClick={() => setFilter("gone-quiet")}
            className={cn(
              "px-2 py-0.5 rounded-full whitespace-nowrap transition-colors flex items-center gap-1",
              filter === "gone-quiet"
                ? "bg-[#015474] text-white font-semibold"
                : "bg-[#e0f1f5] text-[#015474] hover:bg-[#e0f1f5]/80 border border-[#c9d1d4]",
            )}
          >
            <AlertCircle className="h-3 w-3 text-[#006788]" />
            {t("communication.filterGoneQuiet", "Gone Quiet (>3d)")}
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
                isSelected && "bg-accent/70 border-l-4 border-l-[#006788]",
              )}
            >
              {/* Avatar circle */}
              <div className="h-9 w-9 rounded-full bg-[#e0f1f5] text-[#015474] font-bold text-xs flex items-center justify-center shrink-0 border border-[#c9d1d4]">
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
                    <Badge className="bg-[#006788] hover:bg-[#00597b] text-white text-[9px] px-1.5 py-0 h-4 min-w-[16px] flex items-center justify-center rounded-full shrink-0">
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
                      className="text-[9px] px-1 py-0 border-[#c9d1d4] text-[#015474] bg-[#e0f1f5]"
                    >
                      <Clock className="h-2.5 w-2.5 mr-0.5 text-[#006788]" /> Gone Quiet
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
