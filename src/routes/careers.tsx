import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Briefcase,
  MapPin,
  Clock,
  Banknote,
  GraduationCap,
  Sparkles,
  Share2,
  Check,
  Send,
  Building2,
  ChevronRight,
  ArrowLeft,
  Copy,
  ExternalLink,
  Phone,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACTIVE_JOB_POSTINGS, type JobPosting } from "@/lib/careers/types";
import { JobApplicationForm } from "@/components/careers/JobApplicationForm";
import { toast } from "sonner";

export const Route = createFileRoute("/careers")({
  validateSearch: (search: Record<string, unknown>) => ({
    role: typeof search.role === "string" ? search.role : undefined,
    source: typeof search.source === "string" ? search.source : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Careers & Job Openings at Stone Tech — Gota, Ahmedabad" },
      {
        name: "description",
        content:
          "We are actively hiring Data Entry Executives and Field Sales Executives at our Gota, Ahmedabad stone atelier. Apply directly online.",
      },
      {
        property: "og:title",
        content: "We're Hiring! Career Opportunities at Stone Tech (Ahmedabad)",
      },
      {
        property: "og:description",
        content:
          "Openings for Data Entry Executive (₹12k-15k) and Field Sales Executive (₹15k-18k + Fuel + Incentives). Apply directly.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://stonetech.in/careers" },
    ],
  }),
  component: CareersPage,
});

function CareersPage() {
  const { role, source } = Route.useSearch();
  const [selectedJob, setSelectedJob] = useState<JobPosting>(() => {
    if (role) {
      const match = ACTIVE_JOB_POSTINGS.find((j) => j.id === role || j.slug === role);
      if (match) return match;
    }
    return ACTIVE_JOB_POSTINGS[0];
  });

  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (role) {
      const match = ACTIVE_JOB_POSTINGS.find((j) => j.id === role || j.slug === role);
      if (match) setSelectedJob(match);
    }
  }, [role]);

  const copyShareLink = (jobSlug?: string, sharePlatform?: string) => {
    const url = new URL("https://stonetech.in/careers");
    if (jobSlug) url.searchParams.set("role", jobSlug);
    if (sharePlatform) url.searchParams.set("source", sharePlatform);
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    toast.success(
      "Application link copied to clipboard! Ready to share on Instagram/Facebook/WhatsApp.",
    );
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const shareOnWhatsApp = (job: JobPosting) => {
    const shareUrl = encodeURIComponent(
      `https://stonetech.in/careers?role=${job.slug}&source=whatsapp`,
    );
    const text = encodeURIComponent(`${job.whatsappShareText}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const shareOnFacebook = (job: JobPosting) => {
    const shareUrl = encodeURIComponent(
      `https://stonetech.in/careers?role=${job.slug}&source=facebook`,
    );
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] dark:bg-slate-950 text-foreground flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>

            <Link to="/" className="flex items-center gap-2.5">
              <img
                src="/branding/stone-tech-logo.jpg"
                alt="Stone Tech Logo"
                className="h-9 w-9 rounded-full object-cover border border-border"
              />
              <div className="flex flex-col">
                <span className="text-base font-black tracking-tight uppercase text-foreground leading-tight">
                  STONE TECH
                </span>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                  Architectural Stone Atelier
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs h-8 sm:h-9 border-border bg-background"
            >
              <a
                href="https://api.whatsapp.com/send?phone=917742090866&text=Hi%20Stone%20Tech%20HR,%20I%20have%20an%20inquiry%20regarding%20job%20vacancies."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold"
              >
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">HR WhatsApp:</span> +91 77420 90866
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative overflow-hidden py-10 sm:py-14 border-b border-border/70 bg-gradient-to-b from-[#FAF8F4] to-[#F3EFEA] dark:from-slate-950 dark:to-slate-900">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <Badge
            variant="outline"
            className="px-3 py-1 text-xs font-bold tracking-wide uppercase bg-primary/10 text-primary border-primary/20"
          >
            We Are Hiring in Gota, Ahmedabad
          </Badge>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-bold text-foreground tracking-tight leading-tight">
            Build Your Career with Gujarat's Leading Architectural Stone Atelier
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Join our energetic team in Gota, Ahmedabad. We are currently offering 2 full-time career
            roles with transparent salaries, software &amp; AI tool training, fuel allowances, and
            performance growth.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#apply-form"
              className="h-10 px-5 rounded-lg bg-primary text-primary-foreground font-bold text-xs inline-flex items-center gap-2 shadow-sm hover:bg-primary/90 transition-all"
            >
              Apply Online Now <ChevronRight className="h-4 w-4" />
            </a>
            <Button
              variant="outline"
              size="default"
              onClick={() => copyShareLink(undefined, "share")}
              className="h-10 px-4 text-xs font-semibold gap-1.5 border-border bg-card"
            >
              {copiedLink ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              <span>{copiedLink ? "Link Copied!" : "Share Job Openings"}</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 space-y-10">
        {/* Job Openings Selector & Detailed Cards */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Current Active Openings ({ACTIVE_JOB_POSTINGS.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Select a role below to view complete KRAs, KPAs, and salary details.
              </p>
            </div>

            {/* Quick Share Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
                Share this role:
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareOnWhatsApp(selectedJob)}
                className="h-8 text-xs gap-1 border-border bg-card text-[#25D366] hover:text-[#1EBE5D]"
                title="Share on WhatsApp"
              >
                <Send className="h-3.5 w-3.5" /> WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareOnFacebook(selectedJob)}
                className="h-8 text-xs gap-1 border-border bg-card text-[#1877F2]"
                title="Share on Facebook"
              >
                <Share2 className="h-3.5 w-3.5" /> Facebook
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyShareLink(selectedJob.slug, "instagram")}
                className="h-8 text-xs gap-1 border-border bg-card"
                title="Copy link for Instagram Bio / Story"
              >
                <Copy className="h-3.5 w-3.5" /> Copy Link
              </Button>
            </div>
          </div>

          {/* Job Selection Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ACTIVE_JOB_POSTINGS.map((job) => {
              const isSelected = selectedJob.id === job.id;
              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative space-y-3.5 ${
                    isSelected
                      ? "border-primary bg-card shadow-md ring-2 ring-primary/20"
                      : "border-border/80 bg-card/60 hover:bg-card hover:border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 uppercase"
                        >
                          Urgent Requirement
                        </Badge>
                        <span className="text-xs text-muted-foreground">{job.department}</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-foreground mt-1">
                        {job.title}
                      </h3>
                    </div>

                    <div
                      className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span className="truncate">{job.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span>{job.timing}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Banknote className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="font-semibold text-foreground">{job.salaryText}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>{job.experience}</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {job.summary}
                  </p>

                  <div className="pt-2 flex items-center justify-between border-t border-border/60">
                    <span className="text-xs font-semibold text-primary">
                      {isSelected ? "Active View" : "Click to view full details"}
                    </span>
                    <a
                      href="#apply-form"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedJob(job);
                      }}
                      className="text-xs font-bold text-foreground hover:text-primary hover:underline"
                    >
                      Apply Now →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Job Information Box for Selected Role */}
          <Card className="border-border shadow-sm bg-card rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-border/70 p-5 sm:p-6 bg-muted/20">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary text-primary-foreground text-xs font-bold">
                      {selectedJob.department}
                    </Badge>
                    <span className="text-xs text-muted-foreground">• {selectedJob.type}</span>
                  </div>
                  <CardTitle className="text-xl sm:text-2xl font-bold text-foreground mt-1.5">
                    {selectedJob.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Base: {selectedJob.officeAddress}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
                  <div className="text-left sm:text-right pr-2">
                    <div className="text-xs text-muted-foreground">Compensation Package:</div>
                    <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedJob.salaryText}
                    </div>
                  </div>
                  <a
                    href="#apply-form"
                    className="h-10 px-5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
                  >
                    Apply for this Position ↓
                  </a>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-6">
              {/* Objective / Overview */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Role Overview &amp; Primary KRA:
                </h4>
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-xs text-foreground/90 leading-relaxed font-medium">
                  "{selectedJob.primaryKra}"
                </div>
              </div>

              {/* Detailed Key Result Areas (KRAs) */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Key Result Areas (KRAs):
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedJob.kras.map((kra, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl border border-border bg-background space-y-1"
                    >
                      <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px]">
                          {i + 1}
                        </span>
                        {kra.title}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-5">
                        {kra.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Performance Areas (KPAs) / Metrics */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Key Performance Areas (KPAs &amp; Success Metrics):
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {selectedJob.kpas.map((kpa, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-1"
                    >
                      <div className="text-[11px] font-semibold text-muted-foreground">
                        {kpa.metric}
                      </div>
                      <div className="text-xs font-bold text-foreground leading-snug">
                        {kpa.target}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills & Candidate Qualifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-border bg-background space-y-2.5">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Mandatory Skills &amp; Requirements:
                  </h4>
                  <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside">
                    {selectedJob.requiredSkills.map((skill, i) => (
                      <li key={i} className="leading-relaxed">
                        <span className="text-foreground/90 font-medium">{skill}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-border bg-background space-y-2.5">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Perks &amp; Why Stone Tech?
                  </h4>
                  <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside">
                    {selectedJob.perks.map((perk, i) => (
                      <li key={i} className="leading-relaxed">
                        <span className="text-foreground/90 font-medium">{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 2. Direct Application Form Container */}
        <div id="apply-form" className="scroll-mt-20 pt-4">
          <Card className="border-border shadow-md bg-card rounded-2xl overflow-hidden max-w-3xl mx-auto">
            <CardHeader className="border-b border-border/70 p-5 sm:p-6 bg-gradient-to-r from-primary/5 via-card to-background">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
                    Direct Candidate Application Form
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your details will directly reach our hiring team inside Stone Tech OS. We
                    usually review and respond within 24 hours.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
              <JobApplicationForm initialJob={selectedJob} source={source || "website"} />
            </CardContent>
          </Card>
        </div>

        {/* 3. Studio Location & Contact Reference */}
        <div className="p-6 rounded-2xl border border-border bg-card/60 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="space-y-1 text-center md:text-left">
            <div className="font-bold text-foreground flex items-center justify-center md:justify-start gap-1.5">
              <Building2 className="h-4 w-4 text-primary" /> Stone Tech Studio / Headquarters
            </div>
            <p>
              E-02, Ground Floor, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat 380060
            </p>
            <p>Working Hours: Monday to Saturday (10:00 AM – 7:30 PM)</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs h-9 border-border bg-background"
            >
              <a href="tel:+917742090866" className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-primary" /> Call Hiring Desk
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs h-9 border-border bg-background"
            >
              <a
                href="mailto:info@stonetech.in?subject=Job%20Application%20Inquiry"
                className="flex items-center gap-1"
              >
                <Mail className="h-3.5 w-3.5 text-primary" /> Email: info@stonetech.in
              </a>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/80 bg-background py-6 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} Stone Tech. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <Link to="/careers" className="hover:text-primary transition-colors font-semibold">
              Careers
            </Link>
            <a href="tel:+917742090866" className="hover:text-primary transition-colors">
              Support: +91 77420 90866
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
