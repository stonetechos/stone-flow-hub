import { useState } from "react";
import { MessageSquarePlus, User, Phone, FileText } from "lucide-react";
import { toast } from "sonner";
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
import type { WhatsappConversation, WhatsappMessage } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateChat: (conv: WhatsappConversation, initialMessage?: WhatsappMessage) => void;
}

export function CreateNewWhatsappChatDialog({ open, onOpenChange, onCreateChat }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [initialNote, setInitialNote] = useState("");

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Please enter a customer or contact name");
      return;
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    const cleanPhone = digits.length === 10 ? `91${digits}` : digits;
    const convId = `conv-manual-${Date.now()}`;

    const newConv: WhatsappConversation = {
      id: convId,
      phone: cleanPhone,
      contactName: name.trim(),
      companyName: company.trim() || undefined,
      lastMessage: initialNote.trim() || "New WhatsApp Chat started",
      lastMessageAt: "Just now",
      unreadCount: 0,
      leadStage: "qualified",
      assignedTo: "Rishi",
      isGoneQuiet: false,
      tags: ["Direct Chat"],
    };

    let initialMsg: WhatsappMessage | undefined;
    if (initialNote.trim()) {
      initialMsg = {
        id: `msg-${convId}-1`,
        conversationId: convId,
        sender: "team",
        text: initialNote.trim(),
        timestamp: "Just now",
        status: "read",
      };
    }

    onCreateChat(newConv, initialMsg);
    toast.success(`Started new WhatsApp chat with ${name.trim()}!`);
    onOpenChange(false);

    setName("");
    setPhone("");
    setCompany("");
    setInitialNote("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden sm:rounded-2xl">
        <DialogHeader className="p-5 pb-3 bg-gradient-to-r from-[#015474] to-[#00597b] text-white">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-xs">
              <MessageSquarePlus className="h-4 w-4 text-[#e0f1f5]" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                New WhatsApp Conversation
              </DialogTitle>
              <DialogDescription className="text-[#e0f1f5]/85 text-xs mt-0.5">
                Open a direct WhatsApp CRM channel with an architect or client
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-3.5 text-xs">
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" /> Contact Name:
            </Label>
            <Input
              placeholder="e.g. Ar. Pratik Mehta"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" /> WhatsApp Mobile Number:
            </Label>
            <Input
              placeholder="e.g. 98250 91234 or +91 98250 91234"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground">
              Company / Firm Name (Optional):
            </Label>
            <Input
              placeholder="e.g. Studio Elements Architects"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" /> Initial Note or Requirement (Optional):
            </Label>
            <Textarea
              placeholder="e.g. Inquiring for 400 sq.ft Rainbow Sandstone wall cladding for villa exterior..."
              value={initialNote}
              onChange={(e) => setInitialNote(e.target.value)}
              className="text-xs h-18 resize-none"
            />
          </div>

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
              onClick={handleCreate}
              className="bg-[#006788] hover:bg-[#00597b] text-white font-bold text-xs gap-1.5 shadow-xs cursor-pointer"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              Start Conversation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
