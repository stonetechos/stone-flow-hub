export interface WhatsappConversation {
  id: string;
  phone: string;
  contactName: string;
  companyName?: string;
  avatarUrl?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  assignedTo?: string;
  leadStage?: "new" | "qualified" | "quoted" | "won" | "unregistered";
  isGoneQuiet?: boolean;
  tags?: string[];
}

export interface WhatsappMessage {
  id: string;
  conversationId: string;
  sender: "customer" | "team";
  senderName?: string;
  text: string;
  timestamp: string;
  status: "pending" | "sent" | "delivered" | "read";
  attachment?: {
    type: "pdf" | "image";
    title: string;
    url: string;
    size?: string;
  };
}
