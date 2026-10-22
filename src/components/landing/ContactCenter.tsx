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

import { useMemo } from "react";
import { Phone, Mail, MapPin, Star, ExternalLink, MessageCircle, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSiteSettingsValue } from "@/lib/site-settings/use-site-settings";
import { getLandingTexts, getLocalizedReviews } from "@/lib/i18n/landing-i18n";

const GOOGLE_BUSINESS_URL = "https://share.google/0J6h6joQLwo1hVTWJ";

export function ContactCenter({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.substring(0, 2) || "en";
  const texts = getLandingTexts(currentLang);

  const settings = useSiteSettingsValue();
  const localizedReviews = useMemo(
    () => getLocalizedReviews(settings.reviews, currentLang),
    [settings.reviews, currentLang],
  );
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
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-2xs">
                <MapPin className="h-5 w-5" />
              </span>
              <span>{texts.contact.title}</span>
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">{texts.contact.subtitle}</p>
          </div>

          {/* Google Verified Rating Pill */}
          <a
            href={GOOGLE_BUSINESS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-foreground transition-all shadow-xs self-start md:self-auto group cursor-pointer"
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
            <span className="text-xs text-muted-foreground font-semibold border-l border-primary/30 pl-3">
              {texts.contact.googleVerified}
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
                <h3 className="text-sm font-bold text-foreground">
                  {texts.contact.connectWhatsapp}
                </h3>
                <p className="text-[11px] text-muted-foreground">{texts.contact.chatAtelier}</p>
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
                    <div className="text-[10px] text-muted-foreground">
                      {texts.contact.tapToChat}
                    </div>
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
                    <div className="text-[10px] text-muted-foreground">
                      {texts.contact.tapToChat}
                    </div>
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
                    {texts.contact.showroomTitle}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {texts.contact.experienceCenter}
                  </p>
                </div>
              </div>

              <p className="text-xs text-foreground leading-relaxed font-medium">
                {texts.contact.experienceCenterAddress}
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
                  <span>{texts.contact.getDirections}</span>
                  <ExternalLink className="h-3.5 w-3.5 ml-1 opacity-70" />
                </a>
              </Button>
            </div>
          </div>

          {/* Card 3: Email & Studio Timings */}
          <div className="p-6 rounded-3xl border border-border/80 bg-card space-y-4 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-2xs">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {texts.contact.emailCorrespondence}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {texts.contact.emailInquiries}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl border border-border/70 bg-muted/30">
                <span className="text-[11px] text-muted-foreground block mb-0.5">
                  {texts.contact.officialInquiries}
                </span>
                <a
                  href="mailto:info@stonetech.in"
                  className="text-xs font-bold text-primary hover:underline font-mono inline-flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>info@stonetech.in</span>
                </a>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>{texts.contact.studioHours}</span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                asChild
                variant="outline"
                size="default"
                className="w-full gap-2 text-xs font-semibold h-10 border-border/80 hover:border-primary/60 hover:text-primary"
              >
                <a href="mailto:info@stonetech.in">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  <span>{texts.contact.sendRfq}</span>
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
              <span>{texts.contact.reviewsTitle}</span>
            </span>
            <Badge
              variant="outline"
              className="text-[11px] text-primary border-primary/40 bg-primary/5"
            >
              {texts.contact.topRated}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {localizedReviews.map((rev, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border border-border/70 bg-card space-y-2.5 shadow-2xs hover:border-primary/50 hover:shadow-xs transition-all"
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
