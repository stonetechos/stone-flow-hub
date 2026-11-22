import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  UploadCloud,
  FileText,
  ExternalLink,
  Smartphone,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Trash2,
  Users,
  Copy,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { parseWhatsappChatExport, extractContactFromFilename } from "./whatsapp-chat-parser";
import type { WhatsappConversation, WhatsappMessage } from "./types";
import { OFFICIAL_STONE_TECH_WHATSAPP } from "./device-session";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportConversation: (conv: WhatsappConversation, messages: WhatsappMessage[]) => void;
  onClearDemoData?: () => void;
  onSyncCrmContacts?: () => void;
}

export function WhatsappOneTimeSyncDialog({
  open,
  onOpenChange,
  onImportConversation,
  onClearDemoData,
  onSyncCrmContacts,
}: Props) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"import" | "web-dock" | "crm-sync">("import");
  const [rawText, setRawText] = useState("");
  const [contactName, setContactName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [parsedPreview, setParsedPreview] = useState<{
    count: number;
    preview: string;
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Auto extract name/phone from filename
    const meta = extractContactFromFilename(file.name);
    if (meta.name) setContactName(meta.name);
    if (meta.phone) setPhoneNumber(meta.phone);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        previewChat(content, meta.name, meta.phone);
      }
    };
    reader.readAsText(file);
  };

  const previewChat = (content: string, name?: string, phone?: string) => {
    const dummyId = "preview";
    const res = parseWhatsappChatExport(content, dummyId, name, phone);
    if (res.messageCount > 0) {
      if (!contactName && res.contactName) setContactName(res.contactName);
      if (!phoneNumber && res.phone) setPhoneNumber(res.phone);
      const firstFew = res.messages
        .slice(0, 3)
        .map((m) => `${m.sender === "team" ? "Stone Tech" : res.contactName}: ${m.text}`)
        .join("\n");
      setParsedPreview({
        count: res.messageCount,
        preview: firstFew,
      });
      toast.success(`Parsed ${res.messageCount} messages from export!`);
    } else {
      setParsedPreview(null);
      toast.error("Could not find standard WhatsApp timestamp headers in the text.");
    }
  };

  const handleExecuteSync = () => {
    if (!rawText.trim()) {
      toast.error("Please upload a WhatsApp chat export file or paste the chat text.");
      return;
    }

    const cleanName = contactName.trim() || "WhatsApp Client";
    const digits = phoneNumber.replace(/\D/g, "");
    const cleanPhone =
      digits.length >= 10 ? (digits.length === 10 ? `91${digits}` : digits) : "919800000000";

    const newConvId = `conv-imported-${Date.now()}`;
    const result = parseWhatsappChatExport(rawText, newConvId, cleanName, cleanPhone);

    if (result.messages.length === 0) {
      toast.error("No valid messages found to import.");
      return;
    }

    const lastMsg = result.messages[result.messages.length - 1];

    const newConv: WhatsappConversation = {
      id: newConvId,
      phone: cleanPhone,
      contactName: cleanName,
      lastMessage: lastMsg?.text.slice(0, 80) || "Imported WhatsApp conversation",
      lastMessageAt: lastMsg?.timestamp || "Just now",
      unreadCount: 0,
      leadStage: "qualified",
      assignedTo: "Rishi",
      isGoneQuiet: false,
      tags: ["Imported Chat", "Synced"],
    };

    onImportConversation(newConv, result.messages);
    toast.success(
      `Successfully synced ${result.messageCount} messages with ${cleanName} into STOS CRM!`,
    );
    onOpenChange(false);

    // Reset state
    setRawText("");
    setContactName("");
    setPhoneNumber("");
    setParsedPreview(null);
  };

  const handleLaunchWebDock = () => {
    const width = 1180;
    const height = 820;
    const left = Math.max(0, (window.screen.width - width) / 2);
    const top = Math.max(0, (window.screen.height - height) / 2);

    const win = window.open(
      "https://web.whatsapp.com",
      "STOS_WhatsApp_Web_Dock",
      `width=${width},height=${height},top=${top},left=${left},menubar=no,toolbar=no,status=no,resizable=yes,scrollbars=yes`,
    );

    if (win) {
      win.focus?.();
      toast.success(
        "WhatsApp Web Dock launched! Scan QR code once to keep session permanently logged in.",
      );
    } else {
      toast.error("Pop-up blocked by browser. Please allow pop-ups for stonetech.in.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden sm:rounded-2xl">
        <DialogHeader className="p-5 pb-3 bg-gradient-to-r from-emerald-800 to-teal-900 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs">
                <Zap className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  <span>WhatsApp One-Time Synchronisation Center</span>
                  <Badge className="bg-emerald-500/30 text-emerald-100 border-emerald-400/30 text-[10px]">
                    {OFFICIAL_STONE_TECH_WHATSAPP}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-emerald-100/80 text-xs mt-0.5">
                  Synchronize your real chats, messages, and customer conversations into STOS CRM
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            className="space-y-4"
          >
            <TabsList className="grid grid-cols-3 bg-muted/60 p-1 rounded-xl text-xs">
              <TabsTrigger
                value="import"
                className="gap-1.5 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs font-semibold"
              >
                <UploadCloud className="h-3.5 w-3.5 text-emerald-600" />
                <span>Import Chat Export</span>
              </TabsTrigger>
              <TabsTrigger
                value="web-dock"
                className="gap-1.5 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs font-semibold"
              >
                <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
                <span>Launch Web Dock</span>
              </TabsTrigger>
              <TabsTrigger
                value="crm-sync"
                className="gap-1.5 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs font-semibold"
              >
                <Users className="h-3.5 w-3.5 text-emerald-600" />
                <span>CRM Contacts Sync</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: ONE-TIME CHAT IMPORT */}
            <TabsContent value="import" className="space-y-4 pt-1 text-xs">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-950 dark:text-emerald-200 text-xs">
                  <Smartphone className="h-4 w-4 text-emerald-600" />
                  <span>How to export & sync a chat from your phone (30 Seconds):</span>
                </div>
                <ol className="list-decimal pl-4 space-y-1 text-emerald-900/90 dark:text-emerald-300/90 text-[11px] leading-relaxed">
                  <li>
                    Open WhatsApp on your phone (<b>{OFFICIAL_STONE_TECH_WHATSAPP}</b>)
                  </li>
                  <li>Open the conversation with the customer or architect</li>
                  <li>
                    Tap <b>⋮ (More)</b> → <b>Export Chat</b> → select <b>Without Media</b>
                  </li>
                  <li>
                    AirDrop / send the <code>.txt</code> file to your Mac, then select it below.
                  </li>
                </ol>
              </div>

              {/* Upload Zone */}
              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".txt,.zip"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-emerald-300 dark:border-emerald-800 rounded-xl p-5 text-center bg-slate-50/50 dark:bg-slate-900/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all cursor-pointer space-y-1.5"
                >
                  <UploadCloud className="h-8 w-8 text-emerald-600 mx-auto" />
                  <p className="font-bold text-foreground text-xs">
                    Click to select exported WhatsApp chat (<code>.txt</code>)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Or drop the file here. Works with iOS and Android chat exports.
                  </p>
                </div>
              </div>

              {/* Optional Contact Name & Phone */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Customer / Architect Name:
                  </Label>
                  <Input
                    placeholder="e.g. Ar. Mehul Panchal"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Phone / WhatsApp Number:
                  </Label>
                  <Input
                    placeholder="e.g. +91 98250 12345"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Parsed Preview Card */}
              {parsedPreview && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-300">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Ready to sync {parsedPreview.count} messages</span>
                    </span>
                    <Badge className="bg-emerald-600 text-white text-[10px]">Validated</Badge>
                  </div>
                  <pre className="text-[10px] text-muted-foreground bg-white dark:bg-slate-950 p-2 rounded border max-h-20 overflow-y-auto whitespace-pre-wrap font-mono">
                    {parsedPreview.preview}
                  </pre>
                </div>
              )}

              {/* Raw text paste fallback */}
              <div className="space-y-1">
                <details className="text-[11px] text-muted-foreground cursor-pointer">
                  <summary className="font-semibold text-primary hover:underline">
                    Or paste raw exported chat text directly...
                  </summary>
                  <div className="pt-2">
                    <Textarea
                      placeholder="Paste exported WhatsApp text here: e.g. [22/11/26, 10:30 AM] Customer: Hello..."
                      value={rawText}
                      onChange={(e) => {
                        setRawText(e.target.value);
                        if (e.target.value.length > 20) {
                          previewChat(e.target.value, contactName, phoneNumber);
                        }
                      }}
                      className="text-[11px] font-mono h-20"
                    />
                  </div>
                </details>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleExecuteSync}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs cursor-pointer"
                  disabled={!rawText.trim()}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Sync Chat to STOS CRM
                </Button>
              </div>
            </TabsContent>

            {/* TAB 2: OFFICIAL WHATSAPP WEB LIVE DOCK */}
            <TabsContent value="web-dock" className="space-y-4 pt-1 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ExternalLink className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-foreground">
                      Official WhatsApp Web Live Dock
                    </h4>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Launch WhatsApp Web in an independent, distraction-free companion window. Once
                      you scan the QR code once on <code>web.whatsapp.com</code>, Safari/Chrome
                      keeps your business session permanently active without needing the MacBook
                      desktop app.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Connected Business Line: <b>{OFFICIAL_STONE_TECH_WHATSAPP}</b>
                  </span>
                  <Button
                    size="sm"
                    onClick={handleLaunchWebDock}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Launch WhatsApp Web Dock
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 space-y-1 dark:border-indigo-900/40 dark:bg-indigo-950/20 text-[11px]">
                <div className="font-bold text-indigo-950 dark:text-indigo-200">
                  How the Web Dock & STOS Work Together:
                </div>
                <p className="text-indigo-900/80 dark:text-indigo-300/80 leading-relaxed">
                  You can keep the WhatsApp Web Dock open alongside STOS. Whenever you click{" "}
                  <b>Attach Catalog PDF</b> or <b>Share Quotation</b> inside STOS, it formats the
                  client message and dispatches it directly through your logged-in WhatsApp session!
                </p>
              </div>
            </TabsContent>

            {/* TAB 3: CRM CONTACTS SYNC & DATA CLEANUP */}
            <TabsContent value="crm-sync" className="space-y-4 pt-1 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-foreground">
                      Synchronize with STOS Customers & Enquiries
                    </h4>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Pull all registered customers, architects, builders, and active quotation
                      leads from the STOS database into the WhatsApp conversation stream.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Matches customers by mobile and WhatsApp contact numbers.
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onSyncCrmContacts?.();
                      toast.success("Synchronized real CRM customers into WhatsApp workspace!");
                      onOpenChange(false);
                    }}
                    className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 font-bold text-xs gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Sync CRM Directory
                  </Button>
                </div>
              </div>

              {/* Clear sample conversations card */}
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20 flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-rose-950 dark:text-rose-200 text-xs">
                    Clear Sample / Demo Conversations
                  </h5>
                  <p className="text-[11px] text-rose-900/80 dark:text-rose-300/80 mt-0.5">
                    Hide the placeholder conversations (Ar. Mehul Panchal, Jigar Patel) so only your
                    real customer chats appear.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClearDemoData?.();
                    toast.info("Sample conversations removed from workspace.");
                    onOpenChange(false);
                  }}
                  className="border-rose-300 text-rose-700 hover:bg-rose-100/60 dark:text-rose-300 text-xs font-semibold gap-1.5 shrink-0 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  Clear Demo Chats
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
