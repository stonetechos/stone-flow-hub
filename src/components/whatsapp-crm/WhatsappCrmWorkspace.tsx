import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, PanelRightClose, PanelRightOpen, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { WhatsappConversationList } from "./WhatsappConversationList";
import { WhatsappChatArea } from "./WhatsappChatArea";
import { StosCrmMiniApp } from "./StosCrmMiniApp";
import { StoneCatalogPicker } from "./StoneCatalogPicker";
import { useWhatsappCrmContext } from "./useWhatsappCrmContext";
import type { WhatsappConversation, WhatsappMessage } from "./types";

// Seed active conversations representing realistic Stone Tech sales interactions
const SEED_CONVERSATIONS: WhatsappConversation[] = [
  {
    id: "conv-1",
    phone: "919825012345",
    contactName: "Ar. Mehul Panchal",
    companyName: "Studio Vista Architects",
    lastMessage: "Please share the rate for 30mm Gwalior Mint Sandstone and Agra Red.",
    lastMessageAt: "10:45 AM",
    unreadCount: 2,
    leadStage: "qualified",
    assignedTo: "Rishi",
    isGoneQuiet: false,
    tags: ["Architect", "Elevation Cladding"],
  },
  {
    id: "conv-2",
    phone: "919879567890",
    contactName: "Jigar Patel",
    companyName: "Patel Villas & Developers",
    lastMessage: "Quotation QUO-000025 looks good. Can we dispatch the first 500 sq.ft tomorrow?",
    lastMessageAt: "Yesterday",
    unreadCount: 0,
    leadStage: "quoted",
    assignedTo: "Rishi",
    isGoneQuiet: false,
    tags: ["Builder", "Site Delivery"],
  },
  {
    id: "conv-3",
    phone: "917742090866",
    contactName: "Karan Desai (New Lead)",
    lastMessage: "Hi, need natural stone CNC panels for a home mandir. Do you do custom carving?",
    lastMessageAt: "Nov 10",
    unreadCount: 1,
    leadStage: "new",
    assignedTo: "Unassigned",
    isGoneQuiet: true,
    tags: ["Mandir", "CNC"],
  },
  {
    id: "conv-4",
    phone: "919426011223",
    contactName: "Rakesh Shah",
    companyName: "Shah Stones & Marble",
    lastMessage: "Payment for invoice INV-000104 has been transferred via RTGS.",
    lastMessageAt: "Nov 08",
    unreadCount: 0,
    leadStage: "won",
    assignedTo: "Accounts",
    isGoneQuiet: true,
    tags: ["Dealer", "Ledger"],
  },
];

const INITIAL_MESSAGES: Record<string, WhatsappMessage[]> = {
  "conv-1": [
    {
      id: "m-1",
      conversationId: "conv-1",
      sender: "customer",
      text: "Namaste Stone Tech team! We are designing a 4-storey luxury private residence at Bopal, Ahmedabad.",
      timestamp: "10:30 AM",
      status: "read",
    },
    {
      id: "m-2",
      conversationId: "conv-1",
      sender: "team",
      text: "Namaste Mehulbhai! Thank you for thinking of Stone Tech. Which natural stone texture or finish are you envisioning for the facade?",
      timestamp: "10:35 AM",
      status: "read",
    },
    {
      id: "m-3",
      conversationId: "conv-1",
      sender: "customer",
      text: "Please share the rate for 30mm Gwalior Mint Sandstone and Agra Red.",
      timestamp: "10:45 AM",
      status: "read",
    },
  ],
  "conv-2": [
    {
      id: "m-20",
      conversationId: "conv-2",
      sender: "team",
      text: "Namaste Jigar bhai! Here is your verified quotation QUO-000025 for 1,200 sq.ft Dholpur Beige Sandstone.",
      timestamp: "Yesterday, 3:15 PM",
      status: "read",
      attachment: {
        type: "pdf",
        title: "StoneTech_Quotation_QUO-000025.pdf",
        url: "/catalogues/StoneTech_NaturalStone_WallCl_Options_26-27.pdf",
      },
    },
    {
      id: "m-21",
      conversationId: "conv-2",
      sender: "customer",
      text: "Quotation QUO-000025 looks good. Can we dispatch the first 500 sq.ft tomorrow?",
      timestamp: "Yesterday, 4:20 PM",
      status: "read",
    },
  ],
  "conv-3": [
    {
      id: "m-30",
      conversationId: "conv-3",
      sender: "customer",
      text: "Hi, need natural stone CNC panels for a home mandir. Do you do custom carving?",
      timestamp: "Nov 10, 11:15 AM",
      status: "delivered",
    },
  ],
  "conv-4": [
    {
      id: "m-40",
      conversationId: "conv-4",
      sender: "customer",
      text: "Payment for invoice INV-000104 has been transferred via RTGS.",
      timestamp: "Nov 08, 2:10 PM",
      status: "read",
    },
  ],
};

export function WhatsappCrmWorkspace() {
  const [conversations, setConversations] = useState<WhatsappConversation[]>(SEED_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState<string>("conv-1");
  const [messagesMap, setMessagesMap] =
    useState<Record<string, WhatsappMessage[]>>(INITIAL_MESSAGES);
  const [crmPanelOpen, setCrmPanelOpen] = useState(true);
  const [stonePickerOpen, setStonePickerOpen] = useState(false);
  const [stagedText, setStagedText] = useState("");

  // Also query real customers from STOS to allow adding them as chats
  const { data: realCustomers } = useQuery({
    queryKey: ["customers", "whatsapp-quick-sync"],
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("id,name,primary_phone,whatsapp,customer_type,company_name")
        .not("primary_phone", "is", null)
        .limit(10);
      return data ?? [];
    },
  });

  // Merge real customers who have phone numbers into conversation list if not already present
  const mergedConversations = useMemo(() => {
    if (!realCustomers || realCustomers.length === 0) return conversations;
    const existingPhones = new Set(conversations.map((c) => c.phone.slice(-10)));
    const additional: WhatsappConversation[] = [];

    for (const cust of realCustomers) {
      const phoneDigits = (cust.whatsapp || cust.primary_phone || "").replace(/\D/g, "");
      if (phoneDigits.length >= 10 && !existingPhones.has(phoneDigits.slice(-10))) {
        existingPhones.add(phoneDigits.slice(-10));
        additional.push({
          id: `cust-${cust.id}`,
          phone: phoneDigits,
          contactName: cust.name,
          companyName: cust.company_name || undefined,
          lastMessage: "Customer record synced from STOS.",
          lastMessageAt: "Synced",
          unreadCount: 0,
          leadStage: "qualified",
          assignedTo: "Sales",
          isGoneQuiet: false,
          tags: [cust.customer_type ? cust.customer_type.replace(/_/g, " ") : "Client"],
        });
      }
    }

    return [...conversations, ...additional];
  }, [conversations, realCustomers]);

  const activeConv = useMemo(() => {
    return mergedConversations.find((c) => c.id === activeConvId) ?? mergedConversations[0];
  }, [mergedConversations, activeConvId]);

  const activeMessages = useMemo(() => {
    return (
      messagesMap[activeConv.id] ?? [
        {
          id: `init-${activeConv.id}`,
          conversationId: activeConv.id,
          sender: "customer",
          text: `Namaste Stone Tech! Inquiring regarding architectural natural stone supply.`,
          timestamp: "Recent",
          status: "read",
        },
      ]
    );
  }, [messagesMap, activeConv.id]);

  // STOS Customer context hook: automatically matches customer by phone number
  const crmContext = useWhatsappCrmContext(activeConv?.phone);

  const handleSendMessage = (text: string) => {
    const newMsg: WhatsappMessage = {
      id: `m-${Date.now()}`,
      conversationId: activeConv.id,
      sender: "team",
      text,
      timestamp: "Just now",
      status: "sent",
    };

    setMessagesMap((prev) => ({
      ...prev,
      [activeConv.id]: [...(prev[activeConv.id] ?? []), newMsg],
    }));

    // Update last message in conversation list
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConv.id
          ? { ...c, lastMessage: text, lastMessageAt: "Just now", unreadCount: 0 }
          : c,
      ),
    );
  };

  const handleAttachCatalogPdf = () => {
    const text = `Namaste! Here is our verified *Stone Tech 2026 Architectural Wall Cladding & Natural Stone Catalog* (PDF, 71 Pages):\nhttps://stonetech.in/catalogues/StoneTech_NaturalStone_WallCl_Options_26-27.pdf\n\nIt features our complete range of Agra Red, Gwalior Mint, Dholpur Sandstone, Travertine, and bespoke CNC reliefs.`;
    handleInsertToChat(text);
  };

  const handleInsertToChat = (text: string) => {
    setStagedText(text);
    // Reset after triggering so future insertions can occur
    setTimeout(() => setStagedText(""), 200);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[580px] bg-background border rounded-xl overflow-hidden shadow-xs">
      {/* Subheader / Status Bar */}
      <div className="px-4 py-2 bg-muted/40 border-b flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            STOS WhatsApp CRM Workspace
          </span>
          <span className="text-muted-foreground hidden sm:inline">
            · Libromi-style Native CRM Mini App beside conversations
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            onClick={() => setStonePickerOpen(true)}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="hidden sm:inline">Stone Catalog</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => setCrmPanelOpen(!crmPanelOpen)}
            title={crmPanelOpen ? "Collapse CRM Panel" : "Expand CRM Panel"}
          >
            {crmPanelOpen ? (
              <>
                <PanelRightClose className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Hide CRM</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Show CRM</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 3-Column Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Conversations List (280px - 320px) */}
        <div className="w-72 sm:w-80 shrink-0 h-full">
          <WhatsappConversationList
            conversations={mergedConversations}
            activeId={activeConv.id}
            onSelectConversation={(c) => setActiveConvId(c.id)}
          />
        </div>

        {/* Center Column: Live Chat Area (flex-1) */}
        <div className="flex-1 h-full min-w-0 border-r">
          <WhatsappChatArea
            conversation={activeConv}
            messages={activeMessages}
            onSendMessage={handleSendMessage}
            onOpenStonePicker={() => setStonePickerOpen(true)}
            onAttachCatalogPdf={handleAttachCatalogPdf}
            insertedText={stagedText}
          />
        </div>

        {/* Right Column: STOS CRM Mini App (340px - 400px) */}
        {crmPanelOpen && (
          <div className="w-80 lg:w-96 shrink-0 h-full bg-background transition-all">
            <StosCrmMiniApp
              phone={activeConv.phone}
              contactName={activeConv.contactName}
              crmContext={crmContext}
              onInsertToChat={handleInsertToChat}
              onAttachCatalogPdf={handleAttachCatalogPdf}
            />
          </div>
        )}
      </div>

      {/* Standalone Stone Catalog Dialog */}
      <Dialog open={stonePickerOpen} onOpenChange={setStonePickerOpen}>
        <DialogContent className="max-w-xl p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" /> Natural Stone Product Catalog
            </DialogTitle>
          </DialogHeader>
          <StoneCatalogPicker
            onInsertText={(text) => {
              handleInsertToChat(text);
              setStonePickerOpen(false);
            }}
            onAttachCatalogPdf={() => {
              handleAttachCatalogPdf();
              setStonePickerOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
