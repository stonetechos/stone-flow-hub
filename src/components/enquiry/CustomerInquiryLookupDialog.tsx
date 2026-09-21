import { useState } from "react";
import {
  Search,
  Phone,
  Calendar,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CountryCodeSelect } from "@/components/forms/inputs/CountryCodeSelect";
import {
  lookupCustomerEnquiriesServerFn,
  type CustomerInquirySummary,
} from "@/lib/enquiries/public-inquiry.functions";

interface CustomerInquiryLookupDialogProps {
  trigger?: React.ReactNode;
}

export function CustomerInquiryLookupDialog({ trigger }: CustomerInquiryLookupDialogProps) {
  const [open, setOpen] = useState(false);
  const [countryCode, setCountryCode] = useState("+91");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [inquiries, setInquiries] = useState<CustomerInquirySummary[]>([]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = whatsapp.replace(/\D/g, "");
    if (digits.length < 6) {
      toast.error("Please enter a valid WhatsApp number to check status.");
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const res = await lookupCustomerEnquiriesServerFn({
        data: {
          country_code: countryCode,
          whatsapp: digits,
        },
      });
      setInquiries(res.inquiries);
      if (res.inquiries.length === 0) {
        toast.info("No existing inquiries found for this WhatsApp number.");
      }
    } catch (err) {
      console.error("Lookup error:", err);
      toast.error("Failed to check inquiry status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs shrink-0">
            <Search className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Track My Inquiry</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              <Phone className="h-4 w-4 fill-current" />
            </div>
            <DialogTitle className="text-base font-bold">Track Your Stone Inquiry</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Enter your WhatsApp number to view your quotations, estimates, and project timeline.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleLookup} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 fill-current" /> Enter WhatsApp Number:
            </label>
            <div className="flex items-center">
              <CountryCodeSelect value={countryCode} onChange={setCountryCode} />
              <Input
                required
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="98765 43210"
                className="h-10 text-sm font-medium rounded-l-none border-l-0"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-10 text-xs font-bold gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking your inquiries...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span>Find My Active Inquiries</span>
              </>
            )}
          </Button>
        </form>

        {/* Results Section */}
        {searched && (
          <div className="mt-4 space-y-3 pt-3 border-t border-border">
            {inquiries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-2">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-xs font-semibold">No inquiries found for this number</p>
                <p className="text-[11px] text-muted-foreground">
                  If you just submitted your inquiry, please allow 1-2 minutes or chat directly with
                  our sales team on WhatsApp.
                </p>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="mt-2 text-xs bg-[#25D366] text-white hover:bg-[#1EBE5D] border-0"
                >
                  <a
                    href={`https://api.whatsapp.com/send?phone=917742090866&text=Hi%20Stone%20Tech%20Team,%20checking%20status%20for%20number%20${countryCode}${whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Send className="h-3.5 w-3.5 mr-1" /> WhatsApp Direct Help
                  </a>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Found {inquiries.length} Active Inquiry(s)</span>
                  <span className="text-[11px] text-muted-foreground">
                    Client: {inquiries[0]?.customer_name}
                  </span>
                </div>

                {inquiries.map((inq) => (
                  <div
                    key={inq.enquiry_no}
                    className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="font-mono font-bold text-xs text-foreground">
                          {inq.enquiry_no}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-[11px] font-semibold">
                        {inq.stage_label}
                      </Badge>
                    </div>

                    {inq.requirement && (
                      <p className="text-xs text-muted-foreground line-clamp-2 bg-background/50 p-2 rounded-lg border border-border/50">
                        {inq.requirement}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground/80" />
                        <span>Logged: {new Date(inq.created_at).toLocaleDateString()}</span>
                      </div>
                      {inq.required_delivery_date && (
                        <div className="flex items-center gap-1.5 text-primary font-medium">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Needed by: {inq.required_delivery_date}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      asChild
                      size="sm"
                      className="w-full h-8 text-xs bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold gap-1.5"
                    >
                      <a
                        href={`https://api.whatsapp.com/send?phone=917742090866&text=Hi%20Stone%20Tech%20Team,%20inquiring%20about%20reference%20${inq.enquiry_no}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Send className="h-3 w-3 fill-current" />
                        <span>WhatsApp Specialist for Reference #{inq.enquiry_no}</span>
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
