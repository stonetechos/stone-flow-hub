/**
 * ContactCenter — Broad Page Footer Section for Stone Tech OS.
 *
 * Displays:
 * - "How to reach Us?"
 * - WhatsApp direct chat buttons (+91 77420 90866 & +91 97844 52998)
 * - Email us at info@stonetech.in
 * - Showroom Location: E-02, Ground Floor, in front of The Festival Residency,
 *   SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat, Pin Code: 380060
 * - Google Business direct link: https://share.google/0J6h6joQLwo1hVTWJ
 * - Real 4.9 Google Verified Rating
 * - Highlighted 5-star customer and architect feedback cards
 */

import { Phone, Mail, MapPin, Star, ExternalLink, MessageCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSiteSettingsValue } from "@/lib/site-settings/use-site-settings";

const GOOGLE_BUSINESS_URL = "https://share.google/0J6h6joQLwo1hVTWJ";

export function ContactCenter({ className }: { className?: string }) {
  const settings = useSiteSettingsValue();
  const REVIEWS = settings.reviews;
  const googleRating = settings.google_rating;

  return (
    <section
      id="contact-us"
      className={`py-16 sm:py-20 bg-gradient-to-b from-background via-muted/20 to-muted/40 border-t border-border/80 scroll-mt-20 ${
        className ?? ""
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Header Row with Title, Subtitle, and Google Business Rating Pill */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/70 pb-6">
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-400 shadow-2xs">
                <MapPin className="h-5 w-5" />
              </span>
              <span>How to reach Us?</span>
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Connect directly with our stone specialists, request factory dry-lay guidance, or
              visit our Ahmedabad experience center.
            </p>
          </div>

          {/* Google Verified Rating Pill */}
          <a
            href={GOOGLE_BUSINESS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 transition-all shadow-xs self-start md:self-auto group"
            title="View Stone Tech on Google Business"
          >
            <div className="flex items-center gap-1.5 font-black text-sm">
              <span>{googleRating}</span>
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                ))}
              </div>
            </div>
            <span className="text-xs text-muted-foreground font-semibold border-l border-amber-300/40 pl-3">
              Google Verified Business
            </span>
            <ExternalLink className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
          </a>

        </div>

        {/* 3-Column Broad Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Direct WhatsApp Lines */}
          <div className="p-6 rounded-3xl border border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-950 dark:bg-emerald-950/20 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-xs">
                <MessageCircle className="h-5 w-5 fill-current" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Connect Directly on WhatsApp</h3>
                <p className="text-[11px] text-muted-foreground">
                  Direct chat with our atelier team
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <a
                href="https://wa.me/917742090866?text=Hi%20Stone%20Tech,%20I'd%20like%20to%20inquire%20about%20natural%20stone%20finishes"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 rounded-2xl border border-emerald-300/80 bg-background/90 hover:bg-emerald-100/50 dark:border-emerald-800 dark:bg-card dark:hover:bg-emerald-950/40 transition-all shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                      +91 77420 90866
                    </div>
                    <div className="text-[10px] text-muted-foreground">Tap to chat on WhatsApp</div>
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-emerald-600 opacity-60 group-hover:opacity-100 transition-opacity" />
              </a>

              <a
                href="https://wa.me/919784452998?text=Hi%20Stone%20Tech,%20I'd%20like%20to%20inquire%20about%20natural%20stone%20finishes"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 rounded-2xl border border-emerald-300/80 bg-background/90 hover:bg-emerald-100/50 dark:border-emerald-800 dark:bg-card dark:hover:bg-emerald-950/40 transition-all shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                      +91 97844 52998
                    </div>
                    <div className="text-[10px] text-muted-foreground">Tap to chat on WhatsApp</div>
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-emerald-600 opacity-60 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
          </div>

          {/* Card 2: Showroom & Experience Center */}
          <div className="p-6 rounded-3xl border border-border/80 bg-card space-y-4 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 shadow-2xs">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Showroom &amp; Studio Location
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Ahmedabad Experience Center</p>
                </div>
              </div>

              <p className="text-xs text-foreground leading-relaxed font-medium">
                <span className="font-bold">E-02, Ground Floor</span>, in front of The Festival
                Residency, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat, Pin Code:{" "}
                <span className="font-bold font-mono">380060</span>
              </p>
            </div>

            <div className="pt-2">
              <Button
                asChild
                size="default"
                className="w-full gap-2 text-xs font-bold h-10 bg-primary"
              >
                <a href={GOOGLE_BUSINESS_URL} target="_blank" rel="noopener noreferrer">
                  <MapPin className="h-4 w-4 text-rose-400" />
                  <span>Get Directions on Google Maps</span>
                  <ExternalLink className="h-3.5 w-3.5 ml-1 opacity-70" />
                </a>
              </Button>
            </div>
          </div>

          {/* Card 3: Email & Studio Timings */}
          <div className="p-6 rounded-3xl border border-border/80 bg-card space-y-4 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 shadow-2xs">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Email Correspondence</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Architectural inquiries &amp; tenders
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl border border-border/70 bg-muted/30">
                <span className="text-[11px] text-muted-foreground block mb-0.5">
                  Official Inquiries:
                </span>
                <a
                  href="mailto:info@stonetech.in"
                  className="text-xs font-bold text-primary hover:underline font-mono inline-flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>info@stonetech.in</span>
                </a>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>Studio Hours: Mon – Sat, 10:00 AM – 7:30 PM</span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                asChild
                variant="outline"
                size="default"
                className="w-full gap-2 text-xs font-semibold h-10"
              >
                <a href="mailto:info@stonetech.in">
                  <Mail className="h-3.5 w-3.5 text-amber-600" />
                  <span>Send Architectural RFQ via Email</span>
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Highlighted 5-Star Comments Scattered in a 3-Card Row */}
        <div className="space-y-4 pt-4 border-t border-border/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              <span>Client Feedback &amp; 5-Star Reviews:</span>
            </span>
            <Badge
              variant="outline"
              className="text-[11px] text-amber-700 dark:text-amber-400 border-amber-400/40"
            >
              5.0 ★ Top Rated Atelier
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {REVIEWS.map((rev, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border border-border/70 bg-card space-y-2.5 shadow-2xs hover:border-amber-400/50 hover:shadow-xs transition-all"
              >
                <div className="flex items-center gap-1">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  "{rev.quote}"
                </p>
                <div className="text-xs font-semibold text-foreground pt-1 border-t border-border/50">
                  <span>{rev.author}</span>
                  <span className="text-muted-foreground font-normal ml-1.5">• {rev.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
