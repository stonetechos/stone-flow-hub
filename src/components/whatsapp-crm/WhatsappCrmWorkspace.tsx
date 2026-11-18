import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MessageSquare, PanelRightClose, PanelRightOpen, RefreshCw } from "lucide-react";
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
    phone: "919879123456",
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

function formatChatTime(dateStr?: string | null): string {
  if (!dateStr) return "Active";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
    }
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) {
      return d.toLocaleDateString("en-IN", { weekday: "short" });
    }
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  } catch {
    return "Recent";
  }
}

function mapEnquiryLeadStage(stage?: string | null): WhatsappConversation["leadStage"] {
  if (!stage) return "new";
  if (stage === "new_lead") return "new";
  if (stage === "customer_quotation_sent" || stage === "quoted") return "quoted";
  if (stage === "customer_approved" || stage === "production" || stage === "dispatch") return "won";
  return "qualified";
}

export function WhatsappCrmWorkspace() {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<WhatsappConversation[]>(SEED_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState<string>("conv-1");
  const [messagesMap, setMessagesMap] =
    useState<Record<string, WhatsappMessage[]>>(INITIAL_MESSAGES);
  const [crmPanelOpen, setCrmPanelOpen] = useState(true);
  const [stonePickerOpen, setStonePickerOpen] = useState(false);
  const [stagedText, setStagedText] = useState("");

  // 1. Query all open CRM leads / enquiries from STOS
  const { data: openEnquiries } = useQuery({
    queryKey: ["enquiries", "whatsapp-command-center"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enquiries")
        .select(
          `
          id,
          enquiry_no,
          requirement,
          stage,
          budget_inr,
          assigned_to,
          created_at,
          customer_id,
          customer:customers!enquiries_customer_id_fkey(
            id,
            name,
            primary_phone,
            whatsapp,
            company_name,
            customer_type
          )
        `,
        )
        .not("stage", "in", '("completed","lost","cancelled")')
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.warn("Could not fetch open enquiries for WhatsApp command center:", error.message);
        return [];
      }
      return data ?? [];
    },
  });

  // 2. Query all active CRM customers from STOS with contact numbers
  const { data: realCustomers } = useQuery({
    queryKey: ["customers", "whatsapp-command-center"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, primary_phone, whatsapp, customer_type, company_name, updated_at")
        .or("primary_phone.not.is.null,whatsapp.not.is.null")
        .order("updated_at", { ascending: false })
        .limit(100);

      if (error) {
        console.warn("Could not fetch customers for WhatsApp command center:", error.message);
        return [];
      }
      return data ?? [];
    },
  });

  // Merge live open CRM leads, active customers, and seed chats into conversation list
  const mergedConversations = useMemo(() => {
    const list: WhatsappConversation[] = [];
    const seenPhones = new Set<string>();

    // A. Add all open leads from CRM enquiries first
    if (openEnquiries && openEnquiries.length > 0) {
      for (const enq of openEnquiries) {
        const cust = enq.customer as {
          id: string;
          name: string;
          primary_phone?: string | null;
          whatsapp?: string | null;
          company_name?: string | null;
          customer_type?: string | null;
        } | null;

        const rawPhone = cust?.whatsapp || cust?.primary_phone || "";
        const digits = rawPhone.replace(/\D/g, "");
        if (digits.length >= 10) {
          const key10 = digits.slice(-10);
          if (!seenPhones.has(key10)) {
            seenPhones.add(key10);
            const stageLabel = (enq.stage || "new_lead").replace(/_/g, " ");
            const isStale =
              Date.now() - new Date(enq.created_at).getTime() > 3 * 24 * 60 * 60 * 1000;
            list.push({
              id: `enq-${enq.id}`,
              phone: digits.length === 10 ? `91${digits}` : digits,
              contactName: cust?.name || "Prospective Lead",
              companyName: cust?.company_name || undefined,
              lastMessage: enq.requirement ? enq.requirement : `Open Lead (${enq.enquiry_no})`,
              lastMessageAt: formatChatTime(enq.created_at),
              unreadCount: enq.stage === "new_lead" ? 1 : 0,
              leadStage: mapEnquiryLeadStage(enq.stage),
              assignedTo: enq.assigned_to ? String(enq.assigned_to) : "Sales",
              isGoneQuiet: isStale,
              tags: [enq.enquiry_no, stageLabel],
            });
          }
        }
      }
    }

    // B. Add remaining active CRM customers who have phone numbers
    if (realCustomers && realCustomers.length > 0) {
      for (const cust of realCustomers) {
        const rawPhone = cust.whatsapp || cust.primary_phone || "";
        const digits = rawPhone.replace(/\D/g, "");
        if (digits.length >= 10) {
          const key10 = digits.slice(-10);
          if (!seenPhones.has(key10)) {
            seenPhones.add(key10);
            list.push({
              id: `cust-${cust.id}`,
              phone: digits.length === 10 ? `91${digits}` : digits,
              contactName: cust.name,
              companyName: cust.company_name || undefined,
              lastMessage: "Customer record synced from STOS CRM",
              lastMessageAt: formatChatTime(cust.updated_at),
              unreadCount: 0,
              leadStage: "qualified",
              assignedTo: "Sales",
              isGoneQuiet: false,
              tags: [cust.customer_type ? cust.customer_type.replace(/_/g, " ") : "Client"],
            });
          }
        }
      }
    }

    // C. Include seed demo conversations if their phone isn't already in CRM
    for (const seed of conversations) {
      const key10 = seed.phone.replace(/\D/g, "").slice(-10);
      if (!seenPhones.has(key10)) {
        seenPhones.add(key10);
        list.push(seed);
      }
    }

    return list;
  }, [openEnquiries, realCustomers, conversations]);

  const activeConv = useMemo(() => {
    return mergedConversations.find((c) => c.id === activeConvId) ?? mergedConversations[0];
  }, [mergedConversations, activeConvId]);

  const activeMessages = useMemo(() => {
    if (messagesMap[activeConv.id]) {
      return messagesMap[activeConv.id];
    }
    const snippet = activeConv.lastMessage || "Natural stone architectural requirement";
    return [
      {
        id: `init-${activeConv.id}`,
        conversationId: activeConv.id,
        sender: "customer" as const,
        text:
          snippet.startsWith("Namaste") || snippet.startsWith("Hi")
            ? snippet
            : `Namaste Stone Tech! Inquiring regarding: ${snippet}`,
        timestamp: activeConv.lastMessageAt || "Recent",
        status: "read" as const,
      },
    ];
  }, [messagesMap, activeConv]);

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

  const handleAttachCatalogPdf = (
    type: "stone" | "glass_bricks" | "hollow_glass_bricks" | "stone_veneer" = "stone",
  ) => {
    if (type === "glass_bricks") {
      const text = `Namaste! Here is our verified *Stone Tech 2026 Solid Glass Bricks Architectural Catalog* (PDF, 34 Pages):\nhttps://stonetech.in/catalogues/StoneTech_Solid_Glass_Bricks_Catalogue_2026.pdf\n\nIt features our complete luxury collection of Super Clear, Bubble, Wave, Rock finish, and colored crystal solid glass bricks for luminous architectural partitions and facade installations.`;
      handleInsertToChat(text);
    } else if (type === "hollow_glass_bricks") {
      const text = `Namaste! Here is our verified *Stone Tech 2026 Hollow & Architectural Glass Bricks Catalog* (PDF, 49 Pages):\nhttps://stonetech.in/catalogues/StoneTech_Glass_Bricks_Catalogue_2026.pdf\n\nIt features our full collection of Clear (Seaview, Sahara, New Wavy, Bubbles, Clarity, Ice) and In-Color / Colored glass blocks engineered with dual-cavity thermal insulation and the VetroKwik™ dry-interlocking system.`;
      handleInsertToChat(text);
    } else if (type === "stone_veneer") {
      const text = `Namaste! Here is our verified *Stone Tech 2026 Ultra-Thin Flexible Stone Veneer Architectural Catalog* (PDF, 106 Pages):\nhttps://stonetech.in/catalogues/StoneTech_Stone_Veneer_Catalogue_2026.pdf\n\nIt features our complete master collection of 98 unique natural stone patterns across Slate, Sandstone, Marble, and Limestone with flexible fiberglass resin backing (~1.5 kg/m²) for curved columns, feature walls, and luxury furniture.`;
      handleInsertToChat(text);
    } else {
      const text = `Namaste! Here is our verified *Stone Tech 2026 Architectural Wall Cladding & Natural Stone Catalog* (PDF, 71 Pages):\nhttps://stonetech.in/catalogues/StoneTech_NaturalStone_WallCl_Options_26-27.pdf\n\nIt features our complete range of Agra Red, Gwalior Mint, Dholpur Sandstone, Travertine, and bespoke CNC reliefs.`;
      handleInsertToChat(text);
    }
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
            {t("communication.workspaceTitle", "STOS WhatsApp CRM Workspace")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            onClick={() => setStonePickerOpen(true)}
          >
            <span className="hidden sm:inline">
              {t("communication.stoneCatalog", "Stone Catalog")}
            </span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => setCrmPanelOpen(!crmPanelOpen)}
            title={
              crmPanelOpen
                ? t("communication.collapseCrm", "Collapse CRM Panel")
                : t("communication.expandCrm", "Expand CRM Panel")
            }
          >
            {crmPanelOpen ? (
              <>
                <PanelRightClose className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t("communication.hideCrm", "Hide CRM")}</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t("communication.showCrm", "Show CRM")}</span>
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
              {t("communication.stoneCatalogModal", "Natural Stone Product Catalog")}
            </DialogTitle>
          </DialogHeader>
          <StoneCatalogPicker
            onInsertText={(text) => {
              handleInsertToChat(text);
              setStonePickerOpen(false);
            }}
            onAttachCatalogPdf={(type) => {
              handleAttachCatalogPdf(type);
              setStonePickerOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
