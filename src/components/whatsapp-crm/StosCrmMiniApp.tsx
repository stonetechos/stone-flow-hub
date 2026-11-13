import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  UserPlus,
  ExternalLink,
  FileText,
  Building2,
  Phone,
  Sparkles,
  Layers,
  ChevronRight,
  Plus,
  MessageSquare,
  Clock,
  Send,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatInr } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { openWhatsappToContact } from "@/lib/whatsapp";
import { StoneCatalogPicker } from "./StoneCatalogPicker";
import { CreateLeadFromWhatsappDialog } from "./CreateLeadFromWhatsappDialog";
import type { MatchedCustomerContext } from "./useWhatsappCrmContext";

interface StosCrmMiniAppProps {
  phone: string;
  contactName: string;
  crmContext: MatchedCustomerContext;
  onInsertToChat: (text: string) => void;
  onAttachCatalogPdf: () => void;
}

export function StosCrmMiniApp({
  phone,
  contactName,
  crmContext,
  onInsertToChat,
  onAttachCatalogPdf,
}: StosCrmMiniAppProps) {
  const qc = useQueryClient();
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showNoteForm, setShowNoteForm] = useState(false);

  const { customer, enquiries, quotes, ledgerSummary, isLoading } = crmContext;

  // Add note to activity_log mutation
  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!customer?.id || !noteText.trim()) return;
      const { error } = await supabase.from("activity_log").insert({
        entity_type: "customer",
        entity_id: customer.id,
        action: "note_added",
        summary: noteText.trim(),
        details: { note: noteText.trim(), source: "whatsapp_crm_inbox" },
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note saved to customer activity history");
      setNoteText("");
      setShowNoteForm(false);
      void qc.invalidateQueries({ queryKey: ["activity"] });
    },
    onError: (err) => {
      toast.error(`Failed to save note: ${err.message}`);
    },
  });

  const handleShareQuoteOnWhatsapp = (quote: { quote_no: string; total: number; id: string }) => {
    const text = `Namaste ${customer?.name || "Sir"},\nHere are the details for your quotation *${quote.quote_no}*:\n• Total Amount: *${formatInr(quote.total)}* (incl. GST)\n• Valid for: 15 Days\n\n📄 You can review your verified digital quotation online or download the softcopy here:\nhttps://stonetech.in/quotes/${quote.id}\n\nPlease let us know if you need any adjustments to dimensions or finishes.`;
    onInsertToChat(text);
    toast.success(`Quotation ${quote.quote_no} details populated into message composer!`);
  };

  if (isLoading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full text-muted-foreground text-xs gap-2">
        <Clock className="h-5 w-5 animate-spin text-primary" />
        <span>Matching STOS records...</span>
      </div>
    );
  }

  // UNMATCHED / NEW CONTACT STATE
  if (!customer) {
    return (
      <div className="p-4 flex flex-col gap-4 text-xs h-full overflow-y-auto">
        <Card className="border-dashed border-amber-500/50 bg-amber-50/40 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <HelpCircle className="h-4 w-4 shrink-0" />
              <CardTitle className="text-xs font-semibold">Unregistered Inbound Contact</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              No matching customer found in STOS for{" "}
              <strong className="text-foreground">{phone}</strong>. Create a lead with one click to
              link this chat to the CRM.
            </p>
            <Button
              size="sm"
              className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
              onClick={() => setCreateLeadOpen(true)}
            >
              <UserPlus className="h-3.5 w-3.5" />
              1-Click Create Lead / Customer
            </Button>
          </CardContent>
        </Card>

        {/* Stone Catalog Quick-Picker available even for new numbers */}
        <StoneCatalogPicker onInsertText={onInsertToChat} onAttachCatalogPdf={onAttachCatalogPdf} />

        <CreateLeadFromWhatsappDialog
          open={createLeadOpen}
          onOpenChange={setCreateLeadOpen}
          phone={phone}
          defaultName={contactName !== phone ? contactName : ""}
        />
      </div>
    );
  }

  // MATCHED EXISTING CUSTOMER WORKSPACE
  return (
    <div className="p-3 flex flex-col gap-3 text-xs h-full overflow-y-auto">
      {/* 1. Customer Overview Card */}
      <Card className="border-primary/20 bg-card">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-foreground truncate">{customer.name}</h3>
                {customer.customer_type && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1 py-0 shrink-0 font-normal capitalize"
                  >
                    {customer.customer_type.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                <Building2 className="h-3 w-3 shrink-0" />
                {customer.company_name || customer.city || "Ahmedabad"}
              </p>
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0 text-muted-foreground"
              asChild
            >
              <Link
                to="/customers/$customerId"
                params={{ customerId: customer.id }}
                title="Open full customer record"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {/* Balance / Ledger Snippet */}
          {ledgerSummary && (
            <div className="grid grid-cols-3 gap-1 pt-2 border-t text-center text-[10px]">
              <div className="p-1 rounded bg-muted/50">
                <span className="text-muted-foreground block text-[9px]">Invoiced</span>
                <span className="font-semibold text-foreground">
                  {formatInr(ledgerSummary.totalDebit)}
                </span>
              </div>
              <div className="p-1 rounded bg-muted/50">
                <span className="text-muted-foreground block text-[9px]">Received</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatInr(ledgerSummary.totalCredit)}
                </span>
              </div>
              <div className="p-1 rounded bg-muted/50">
                <span className="text-muted-foreground block text-[9px]">Due</span>
                <span
                  className={`font-bold ${ledgerSummary.balance > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}
                >
                  {formatInr(ledgerSummary.balance)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Quotations / Estimation Studio Section */}
      <Card className="bg-card">
        <CardHeader className="p-2.5 pb-1 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-primary" />
            Quotations ({quotes.length})
          </CardTitle>
          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1" asChild>
            <Link to="/quotes/new" search={{ customerId: customer.id } as never}>
              <Plus className="h-3 w-3" /> New Quote
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-2.5 pt-1 space-y-1.5">
          {quotes.slice(0, 3).map((q) => (
            <div
              key={q.id}
              className="flex items-center justify-between p-1.5 rounded border bg-background/60 text-[11px] gap-2"
            >
              <div className="min-w-0">
                <span className="font-medium text-foreground">{q.quote_no}</span>
                <span className="text-[10px] text-muted-foreground block">
                  {formatInr(q.total)} · <span className="capitalize">{q.status}</span>
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] px-1.5 gap-1 text-emerald-700 dark:text-emerald-400"
                  onClick={() => handleShareQuoteOnWhatsapp(q)}
                  title="Insert quote details into WhatsApp chat"
                >
                  <Send className="h-3 w-3" /> Share
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" asChild>
                  <Link to="/quotes/$quoteId" params={{ quoteId: q.id }}>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}

          {quotes.length === 0 && (
            <p className="text-[11px] text-muted-foreground py-2 text-center">
              No quotations yet. Create one with Estimation Studio.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 3. Open Enquiries / Leads */}
      <Card className="bg-card">
        <CardHeader className="p-2.5 pb-1 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary" />
            Enquiries / Leads ({enquiries.length})
          </CardTitle>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5" asChild>
            <Link to="/enquiries">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-2.5 pt-1 space-y-1.5">
          {enquiries.slice(0, 3).map((enq) => (
            <div key={enq.id} className="p-1.5 rounded border bg-background/60 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground truncate">
                  {enq.requirement || enq.enquiry_no}
                </span>
                <Badge variant="secondary" className="text-[9px] px-1 py-0 capitalize">
                  {enq.stage.replace(/_/g, " ")}
                </Badge>
              </div>
              {enq.budget_inr && (
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  Est. Budget: {formatInr(enq.budget_inr)}
                </span>
              )}
            </div>
          ))}
          {enquiries.length === 0 && (
            <p className="text-[11px] text-muted-foreground py-1 text-center">
              No active enquiries.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 4. Stone Catalog Accordion Toggle */}
      <div>
        <Button
          size="sm"
          variant="outline"
          className="w-full justify-between h-8 text-xs font-semibold"
          onClick={() => setShowCatalog(!showCatalog)}
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Natural Stone Catalog Quick-Picker
          </span>
          <span>{showCatalog ? "▲" : "▼"}</span>
        </Button>
        {showCatalog && (
          <div className="mt-2">
            <StoneCatalogPicker
              onInsertText={onInsertToChat}
              onAttachCatalogPdf={onAttachCatalogPdf}
            />
          </div>
        )}
      </div>

      {/* 5. Quick Activity & Note Logger */}
      <Card className="bg-card">
        <CardContent className="p-2.5 space-y-2">
          {!showNoteForm ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-[11px] gap-1"
                onClick={() => setShowNoteForm(true)}
              >
                <MessageSquare className="h-3 w-3" /> Add Internal Note
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-[11px] gap-1"
                onClick={() => {
                  openWhatsappToContact(phone, "");
                }}
              >
                <Phone className="h-3 w-3" /> Direct Call/App
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                placeholder="Write internal note (invisible to customer)..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="text-xs min-h-[50px]"
                autoFocus
              />
              <div className="flex justify-end gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px]"
                  onClick={() => setShowNoteForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-6 text-[10px]"
                  disabled={!noteText.trim() || addNoteMutation.isPending}
                  onClick={() => addNoteMutation.mutate()}
                >
                  Save Note
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateLeadFromWhatsappDialog
        open={createLeadOpen}
        onOpenChange={setCreateLeadOpen}
        phone={phone}
        defaultName={customer.name}
      />
    </div>
  );
}
