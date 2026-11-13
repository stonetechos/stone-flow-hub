import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, Sparkles, Building2, MapPin, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCustomer } from "@/lib/customers/api";
import { createEnquiry } from "@/lib/enquiries/api";
import { normalizeWhatsappPhone } from "@/lib/whatsapp";
import { toUserMessage } from "@/lib/errors";

interface CreateLeadFromWhatsappDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string;
  defaultName?: string;
  initialMessage?: string;
  onCreated?: (customerId: string) => void;
}

const CATEGORY_MAP: Record<
  string,
  "architect" | "interior_designer" | "builder" | "contractor" | "individual" | "company"
> = {
  Architect: "architect",
  "Interior Designer": "interior_designer",
  "Builder / Developer": "builder",
  Contractor: "contractor",
  "Individual Homeowner": "individual",
  "Commercial Project": "company",
};

const CATEGORIES = Object.keys(CATEGORY_MAP);

export function CreateLeadFromWhatsappDialog({
  open,
  onOpenChange,
  phone,
  defaultName = "",
  initialMessage = "",
  onCreated,
}: CreateLeadFromWhatsappDialogProps) {
  const qc = useQueryClient();
  const normalizedPhone = normalizeWhatsappPhone(phone);

  const [name, setName] = useState(defaultName);
  const [companyName, setCompanyName] = useState("");
  const [city, setCity] = useState("Ahmedabad");
  const [category, setCategory] = useState<string>("Architect");
  const [notes, setNotes] = useState(initialMessage);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Customer name is required");

      const mappedType = CATEGORY_MAP[category] || "individual";

      // 1. Create customer
      const newCustomer = await createCustomer({
        name: name.trim(),
        mobile: normalizedPhone,
        whatsapp: normalizedPhone,
        city: city.trim() || "Ahmedabad",
        customer_type: mappedType,
        material_interests: [],
        notes: companyName.trim() ? `Firm: ${companyName.trim()}` : undefined,
      });

      // 2. Create lead enquiry
      try {
        await createEnquiry({
          customer_id: newCustomer.id,
          customer_name: name.trim(),
          mobile: normalizedPhone,
          requirement: notes.trim() || `Inquired via WhatsApp for ${category} project`,
          source: "WhatsApp",
          priority: "normal",
        });
      } catch (err) {
        console.warn("Enquiry creation skipped or optional:", err);
      }

      return newCustomer;
    },
    onSuccess: (newCust) => {
      toast.success(`Customer ${newCust.name} created and linked to WhatsApp!`);
      void qc.invalidateQueries({ queryKey: ["customers"] });
      void qc.invalidateQueries({ queryKey: ["enquiries"] });
      void qc.invalidateQueries({ queryKey: ["whatsapp-crm-context"] });
      onOpenChange(false);
      onCreated?.(newCust.id);
    },
    onError: (err) => {
      toast.error(toUserMessage(err));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <UserPlus className="h-5 w-5" />
            <DialogTitle>1-Click Create Lead from WhatsApp</DialogTitle>
          </div>
          <DialogDescription>
            Instantly enroll this WhatsApp contact into Stone Tech OS CRM and create their initial
            enquiry.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2 text-xs">
          <div className="grid gap-1.5">
            <Label className="text-xs">Full Name *</Label>
            <Input
              placeholder="e.g. Ar. Mehul Panchal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Phone className="h-3 w-3 text-muted-foreground" /> WhatsApp Number
              </Label>
              <Input
                value={normalizedPhone ? `+${normalizedPhone}` : phone}
                disabled
                className="h-8 text-xs bg-muted text-muted-foreground"
              />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground" /> City / Location
              </Label>
              <Input
                placeholder="Ahmedabad"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Building2 className="h-3 w-3 text-muted-foreground" /> Firm / Company Name
              </Label>
              <Input
                placeholder="e.g. Studio Vista Architecture"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-muted-foreground" /> Category
              </Label>
              <Select value={category} onValueChange={(val) => setCategory(val as never)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">Initial Stone Requirement / Message Notes</Label>
            <Textarea
              placeholder="e.g. Inquired about Gwalior Mint 30mm for 2,400 sq.ft elevation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !name.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {mutation.isPending ? "Creating..." : "Save Customer & Link Chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
