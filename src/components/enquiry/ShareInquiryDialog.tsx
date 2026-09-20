import { useState } from "react";
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Camera,
  Calendar,
  Layers,
  MapPin,
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
import { useSiteSettingsValue } from "@/lib/site-settings/use-site-settings";

interface ShareInquiryDialogProps {
  trigger?: React.ReactNode;
}

export function ShareInquiryDialog({ trigger }: ShareInquiryDialogProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const siteSettings = useSiteSettingsValue();

  const getShareUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}`;
    }
    return "https://www.stonetech.in";
  };

  const shareUrl = getShareUrl();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Inquiry link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy link. Please copy manually.");
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Namaste! Please choose your preferred stone products (Stone Veneer, Wall Cladding, Floor Inlay, etc.), select your required completion date, and upload your site photos/drawings directly here:\n\n${shareUrl}\n\nOur team will immediately share customized swatches & factory estimates on WhatsApp!`,
  );
  const whatsappUrl = `https://api.whatsapp.com/send?text=${whatsappMessage}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-semibold">
            <Share2 className="h-3.5 w-3.5 text-primary" />
            <span>Share Inquiry Link</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Share2 className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-bold">Customer Lead Generation Link</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Share this link via WhatsApp, SMS, or social media. Customers can select materials,
            upload up to 10 photos, and pick their required date from a live calendar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Link Copy Box */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Public Inquiry URL
            </label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="h-9 font-mono text-xs bg-muted/40 selection:bg-primary/20"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                type="button"
                size="sm"
                variant={copied ? "default" : "secondary"}
                onClick={handleCopy}
                className="h-9 px-3 shrink-0 gap-1 text-xs font-medium"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              asChild
              className="h-9 text-xs font-semibold bg-[#25D366] hover:bg-[#1EBE5D] text-white gap-1.5"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageSquare className="h-3.5 w-3.5 fill-current" />
                <span>Send on WhatsApp</span>
              </a>
            </Button>
            <Button asChild variant="outline" className="h-9 text-xs font-semibold gap-1.5">
              <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Form Page</span>
              </a>
            </Button>
          </div>

          {/* Feature highlights of this link */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                What customers experience on this page:
              </span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300"
              >
                Lead Capture Ready
              </Badge>
            </div>

            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Select from 10 Master Stone Products (Veneers, Cladding, Inlays, etc.)</span>
              </li>
              <li className="flex items-center gap-2">
                <Camera className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span>Upload up to 10 site photos, architectural CAD, or concept sketches</span>
              </li>
              <li className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                <span>Live calendar date picker starting from today (+7, +15, +30 chips)</span>
              </li>
              <li className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>WhatsApp number capture for smart auto-response & estimate delivery</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                <span>
                  Google Verified Business {siteSettings.google_rating} rating &amp; direct Maps
                  showroom route
                </span>
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
