/**
 * ContactCenter — "How to reach Us?" Section for Stone Tech OS.
 *
 * Displays direct WhatsApp chat links, email, full physical showroom location,
 * Google Maps / Google My Business direction link, real 4.9 Google rating,
 * and highlighted 5-star customer testimonials scattered around the section.
 */

import { Phone, Mail, MapPin, Star, ExternalLink, MessageCircle, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const REVIEWS = [
  {
    quote:
      "Exceptional craftsmanship on our villa's fluted stone elevation. The dry-lay matching and sub-millimeter tolerances delivered by Stone Tech were impeccable.",
    author: "Ar. Mihir Patel",
    role: "Principal Architect, Ahmedabad",
    rating: 5,
  },
  {
    quote:
      "Visited their SG Business Hub showroom in Gota. The CNC mandir murals and flexible stone veneers exceeded our expectations. Extremely prompt WhatsApp coordination.",
    author: "Bhavin Shah",
    role: "Homeowner, Gota, Ahmedabad",
    rating: 5,
  },
  {
    quote:
      "Direct Rajasthan quarry sourcing with 3-year warranty and zero transit breakage. The most reliable natural stone partner for our luxury residences.",
    author: "Pooja Mehta",
    role: "Luxury Interior Designer",
    rating: 5,
  },
];

export function ContactCenter({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-3xl border border-border/80 bg-gradient-to-br from-amber-500/5 via-card to-stone-100/50 dark:from-amber-950/20 dark:via-card dark:to-stone-900/30 p-5 sm:p-6 shadow-sm space-y-6 ${
        className ?? ""
      }`}
    >
      {/* Header with Title & Real Google Rating */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 block mb-1">
            Direct Atelier &amp; Studio Access
          </span>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 shadow-2xs">
              <MapPin className="h-4 w-4" />
            </span>
            <span>How to reach Us?</span>
          </h3>
        </div>

        {/* Real 4.9 Google Verified Rating Pill */}
        <a
          href="https://maps.google.com/?q=Stone+Tech+SG+Business+Hub+Vasant+Nagar+Gota+Ahmedabad+Gujarat+380060"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 transition-colors self-start sm:self-auto shadow-2xs"
          title="View Google My Business Reviews"
        >
          <div className="flex items-center gap-1 font-black text-xs">
            <span>4.9</span>
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-amber-500 text-amber-500" />
              ))}
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold border-l border-amber-300/40 pl-2">
            Google Verified
          </span>
          <ExternalLink className="h-3 w-3 opacity-70" />
        </a>
      </div>

      {/* Primary Contact Channels: WhatsApp & Email */}
      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
          <span>Connect Directly on WhatsApp:</span>
        </span>

        {/* Two WhatsApp Quick-Connect Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <a
            href="https://wa.me/917742090866?text=Hi%20Stone%20Tech,%20I'd%20like%20to%20inquire%20about%20natural%20stone%20finishes"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-2xl border border-emerald-300/80 bg-emerald-50/60 hover:bg-emerald-100/70 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 transition-all shadow-2xs group"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-xs">
                <Phone className="h-4 w-4 fill-current" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                  +91 77420 90866
                </div>
                <div className="text-[10px] text-muted-foreground">Tap to chat on WhatsApp</div>
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity" />
          </a>

          <a
            href="https://wa.me/919784452998?text=Hi%20Stone%20Tech,%20I'd%20like%20to%20inquire%20about%20natural%20stone%20finishes"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-2xl border border-emerald-300/80 bg-emerald-50/60 hover:bg-emerald-100/70 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 transition-all shadow-2xs group"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-xs">
                <Phone className="h-4 w-4 fill-current" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                  +91 97844 52998
                </div>
                <div className="text-[10px] text-muted-foreground">Tap to chat on WhatsApp</div>
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>

        {/* Email Direct */}
        <div className="pt-1">
          <a
            href="mailto:info@stonetech.in"
            className="inline-flex items-center gap-2 p-2.5 px-3.5 rounded-xl border border-border/80 bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors shadow-2xs"
          >
            <Mail className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span className="text-muted-foreground">Email us:</span>
            <span className="font-bold text-foreground hover:underline">info@stonetech.in</span>
          </a>
        </div>
      </div>

      {/* Showroom Physical Address & Google Maps Location */}
      <div className="space-y-3 pt-2 border-t border-border/70">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-rose-500" />
          <span>Showroom &amp; Experience Center:</span>
        </span>

        <div className="p-3.5 rounded-2xl border border-border/80 bg-background space-y-2.5 shadow-2xs">
          <p className="text-xs text-foreground leading-relaxed font-medium">
            <span className="font-bold">E-02, Ground Floor</span>, in front of The Festival
            Residency, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat, Pin Code:{" "}
            <span className="font-bold font-mono">380060</span>
          </p>

          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-8 text-xs font-bold gap-1.5 border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300"
          >
            <a
              href="https://maps.google.com/?q=Stone+Tech+SG+Business+Hub+Vasant+Nagar+Gota+Ahmedabad+Gujarat+380060"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MapPin className="h-3.5 w-3.5 text-rose-500" />
              <span>Get Directions on Google Maps</span>
              <ExternalLink className="h-3 w-3 ml-0.5 opacity-70" />
            </a>
          </Button>
        </div>
      </div>

      {/* Highlighted 5-Star Comments Scattered Around Section */}
      <div className="space-y-2.5 pt-2 border-t border-border/70">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            <span>Client Feedback &amp; 5-Star Reviews:</span>
          </span>
          <Badge
            variant="outline"
            className="text-[10px] text-amber-700 dark:text-amber-400 border-amber-400/40"
          >
            5.0 ★ Top Rated
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {REVIEWS.map((rev, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl border border-border/70 bg-background/90 space-y-1.5 shadow-2xs hover:border-amber-400/50 transition-colors"
            >
              <div className="flex items-center gap-1">
                {[...Array(rev.rating)].map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-amber-500 text-amber-500" />
                ))}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed italic">"{rev.quote}"</p>
              <div className="text-[11px] font-semibold text-foreground pt-0.5">
                <span>{rev.author}</span>
                <span className="text-muted-foreground font-normal ml-1.5">• {rev.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
