import { useState, useRef, useEffect } from "react";
import {
  Send,
  ExternalLink,
  Phone,
  Sparkles,
  FileText,
  CheckCheck,
  Check,
  Clock,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { openWhatsappToContact } from "@/lib/whatsapp";
import type { WhatsappConversation, WhatsappMessage } from "./types";

interface WhatsappChatAreaProps {
  conversation: WhatsappConversation;
  messages: WhatsappMessage[];
  onSendMessage: (text: string) => void;
  onOpenStonePicker: () => void;
  onAttachCatalogPdf: () => void;
  insertedText?: string;
}

const TEMPLATES = [
  {
    title: "Intro & 2026 Stone Catalog",
    text: "Namaste! Thank you for reaching out to Stone Tech — Architectural Stone Atelier. We specialize in natural stone wall claddings, bespoke CNC panels, and Italian marble surfaces. You can download our latest 2026 Architectural Catalog here:\nhttps://stonetech.in/catalogues/StoneTech_NaturalStone_WallCl_Options_26-27.pdf\n\nHow may we assist your project today?",
  },
  {
    title: "Quarry & Mandir Experience Visit",
    text: "Namaste! We would love to host you and your team at our Ahmedabad Stone Atelier and Experience Centre to review live full-scale mockup panels and natural textures. What day this week works best for a visit?",
  },
  {
    title: "Quotation Follow-up",
    text: "Namaste! Just checking in regarding the quotation we prepared for your stone requirement. Have you had a chance to review the specifications and quantities? Happy to adjust finishes or stone types as per your design intent.",
  },
  {
    title: "Payment / Statement Reminder",
    text: "Namaste! Sharing your verified account statement from Stone Tech. Please review the pending ledger balance. Kindly let us know once the transfer is processed so our accounts team can share the official tax receipt.",
  },
];

export function WhatsappChatArea({
  conversation,
  messages,
  onSendMessage,
  onOpenStonePicker,
  onAttachCatalogPdf,
  insertedText,
}: WhatsappChatAreaProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync external text insertions (e.g. from quote or stone picker)
  useEffect(() => {
    if (insertedText) {
      setInputText((prev) => (prev ? `${prev}\n\n${insertedText}` : insertedText));
    }
  }, [insertedText]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    // Also trigger assisted open in WhatsApp
    openWhatsappToContact(conversation.phone, inputText.trim());
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/20">
      {/* 1. Chat Header */}
      <div className="p-3 border-b bg-background flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-full bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/20">
            {conversation.contactName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-xs text-foreground truncate flex items-center gap-1.5">
              <span>{conversation.contactName}</span>
              {conversation.companyName && (
                <span className="text-[11px] text-muted-foreground font-normal">
                  ({conversation.companyName})
                </span>
              )}
            </h3>
            <p className="text-[11px] text-muted-foreground font-mono truncate">
              {conversation.phone}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
            <a href={`tel:${conversation.phone}`} title="Call Phone">
              <Phone className="h-3 w-3" /> Call
            </a>
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
            onClick={() => openWhatsappToContact(conversation.phone, "")}
            title="Launch WhatsApp Web or Desktop App"
          >
            <ExternalLink className="h-3 w-3" /> Open in WhatsApp
          </Button>
        </div>
      </div>

      {/* 2. Message History Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.sender === "team";

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 text-xs shadow-xs ${
                  isMe
                    ? "bg-emerald-700 text-white dark:bg-emerald-600 rounded-br-xs"
                    : "bg-white text-foreground border dark:bg-slate-900 rounded-bl-xs"
                }`}
              >
                {/* Text Content */}
                <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                {/* Optional Attachment Card */}
                {msg.attachment && (
                  <div
                    className={`mt-2 p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                      isMe
                        ? "bg-emerald-800/60 border-emerald-600/60 text-white"
                        : "bg-muted border-border text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-amber-300" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{msg.attachment.title}</p>
                        <span className="text-[10px] opacity-80">
                          {msg.attachment.type.toUpperCase()} · Verified STOS File
                        </span>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" asChild>
                      <a href={msg.attachment.url} target="_blank" rel="noreferrer" download>
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                )}

                {/* Footer: Timestamp and Status Receipt */}
                <div
                  className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                    isMe ? "text-emerald-100/80" : "text-muted-foreground"
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {isMe && (
                    <span>
                      {msg.status === "read" ? (
                        <CheckCheck className="h-3 w-3 text-cyan-300 inline" />
                      ) : msg.status === "delivered" ? (
                        <CheckCheck className="h-3 w-3 inline" />
                      ) : msg.status === "sent" ? (
                        <Check className="h-3 w-3 inline" />
                      ) : (
                        <Clock className="h-3 w-3 inline" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Composer Toolbar & Input Area */}
      <div className="p-3 border-t bg-background space-y-2">
        {/* Quick actions strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] gap-1 text-amber-700 dark:text-amber-400 border-amber-500/40"
            onClick={onOpenStonePicker}
          >
            <Sparkles className="h-3.5 w-3.5" /> Insert Stone Specs
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] gap-1 text-emerald-700 dark:text-emerald-400 border-emerald-500/40"
            onClick={onAttachCatalogPdf}
          >
            <FileText className="h-3.5 w-3.5" /> Share Catalog PDF
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1">
                ⚡ Templates
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {TEMPLATES.map((tpl) => (
                <DropdownMenuItem
                  key={tpl.title}
                  onClick={() => setInputText(tpl.text)}
                  className="text-xs cursor-pointer"
                >
                  {tpl.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Textarea & Send button */}
        <div className="flex items-end gap-2">
          <Textarea
            placeholder="Type your WhatsApp message (Enter to send, Shift+Enter for newline)..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[60px] max-h-36 text-xs resize-none"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="h-9 w-9 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
            title="Send Message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
