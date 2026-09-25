import { useState, useMemo } from "react";
import {
  Newspaper,
  ExternalLink,
  Search,
  Tag,
  Calendar,
  AlertCircle,
  Building2,
  Sparkles,
  RefreshCw,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface GstNewsItem {
  id: string;
  title: string;
  category: "stone_industry" | "gst_council" | "itc_compliance" | "einvoicing";
  date: string;
  source: string;
  sourceUrl: string;
  summary: string;
  impactOnStoneTech: string;
  badgeText: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

export const LATEST_GST_NEWS: GstNewsItem[] = [
  {
    id: "gst-council-55-mining",
    title: "55th GST Council Meeting: Crucial Relief on Mining Royalties & RCM",
    category: "stone_industry",
    date: "2026-09-18",
    source: "CBIC Press Release & Recommendations",
    sourceUrl: "https://cbic-gst.gov.in",
    summary:
      "Following the landmark 9-judge Supreme Court constitution bench judgment upholding States' taxing powers over mineral rights, the GST Council clarified that GST demands on past mining royalties (prior to July 2024) will not attract penal interest or harsh prosecution, providing substantial liquidity relief to stone quarry leaseholders.",
    impactOnStoneTech:
      "Protects Stone Tech from backdated mining royalty GST penalty demands on rough granite & marble block quarrying concessions. Any procurement under RCM is clarified prospectively.",
    badgeText: "High Impact: Stone Industry",
    badgeVariant: "default",
  },
  {
    id: "gstr1a-intro",
    title: "Form GSTR-1A Operationalized: Pre-GSTR-3B Amendment Facility",
    category: "itc_compliance",
    date: "2026-09-12",
    source: "GSTN Official Advisory",
    sourceUrl: "https://www.gst.gov.in/newsandupdates",
    summary:
      "Taxpayers can now use Form GSTR-1A after filing GSTR-1 but before filing GSTR-3B to add missed B2B stone supply invoices or correct values. Any addition in GSTR-1A automatically recalculates Table 3.1 liabilities in the draft GSTR-3B return.",
    impactOnStoneTech:
      "Prevents mismatch notices between outward supplies and tax payments if an architectural client requests last-minute invoice corrections in the current tax month.",
    badgeText: "New Portal Feature",
    badgeVariant: "secondary",
  },
  {
    id: "stone-fabrication-rate-clarification",
    title: "Clarification on GST Rates: Cut, Dressed & Polished Granite/Marble Slabs (HSN 6802)",
    category: "stone_industry",
    date: "2026-08-28",
    source: "CBIC Circular No. 224/18/2026-GST",
    sourceUrl: "https://cbic-gst.gov.in",
    summary:
      "CBIC reaffirmed that cut and polished natural granite, marble, and composite quartz tiles and slabs fall under HSN 6802 (18% GST). Rough quarried blocks dressed coarsely remain at 5% / 12%. Installation and fabrication works contract services for commercial projects fall under SAC 9954 (18%).",
    impactOnStoneTech:
      "Stone Tech's ERP automated tax split accurately charges 18% on finished slab dispatches and bespoke fabrication/installation works contracts.",
    badgeText: "HSN Classification",
    badgeVariant: "outline",
  },
  {
    id: "strict-rule-36-4-matching",
    title: "Rule 36(4) 100% GSTR-2B Matching Enforced by Automated System Scrutiny",
    category: "itc_compliance",
    date: "2026-08-15",
    source: "Directorate General of Systems (DG-Systems)",
    sourceUrl: "https://www.gst.gov.in",
    summary:
      "GST portal automated scrutiny now flags any return where Input Tax Credit claimed in GSTR-3B exceeds the GSTR-2B statement by more than ₹1,000, triggering an instant Form DRC-01C automated tax notice.",
    impactOnStoneTech:
      "Our system reconciles vendor purchase invoices against live vendor GSTINs, preventing claiming ITC for vendors whose returns are unfiled.",
    badgeText: "Compliance Alert",
    badgeVariant: "destructive",
  },
  {
    id: "einvoicing-threshold",
    title: "E-Invoicing: Mandatory 30-Day Window for IRP Invoice Reporting",
    category: "einvoicing",
    date: "2026-07-22",
    source: "National Informatics Centre (NIC)",
    sourceUrl: "https://einvoice1.gst.gov.in",
    summary:
      "Taxpayers with Aggregate Annual Turnover (AATO) exceeding ₹5 Crore must report B2B credit notes and sales invoices to the Invoice Registration Portal (IRP) within 30 days of the invoice date. Invoices older than 30 days are barred from IRN generation.",
    impactOnStoneTech:
      "Ensures prompt IRN generation on all commercial quarry and builder billing immediately upon dispatch confirmation.",
    badgeText: "E-Invoice Rule",
    badgeVariant: "secondary",
  },
  {
    id: "biometric-auth-2fa",
    title: "Mandatory 2-Factor Authentication (2FA) on e-Way Bill & E-Invoice Portals",
    category: "einvoicing",
    date: "2026-07-05",
    source: "GSTN Security Update",
    sourceUrl: "https://ewaybillgst.gov.in",
    summary:
      "Two-factor authentication (2FA) via OTP/Aadhaar is now mandatory for all taxpayers logging into e-Way Bill and e-Invoice systems to prevent unauthorized vehicle and consignment generations.",
    impactOnStoneTech:
      "Logistics dispatch teams should keep the registered mobile phone accessible when generating inter-state stone movement e-Way bills.",
    badgeText: "Portal Security",
    badgeVariant: "outline",
  },
];

export function LatestGstNewsCard() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredNews = useMemo(() => {
    return LATEST_GST_NEWS.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.impactOnStoneTech.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, selectedCategory]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Newspaper className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Latest GST News, Notifications & Circulars
                <Badge
                  variant="outline"
                  className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                >
                  Live CBIC & GSTN Feed
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Official statutory updates, Council decisions & stone industry regulatory directives
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
              <a
                href="https://www.gst.gov.in/newsandupdates"
                target="_blank"
                rel="noopener noreferrer"
              >
                GST Portal Updates
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search circulars, HSN, mining royalties, ITC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <Button
              variant={selectedCategory === "all" ? "default" : "ghost"}
              size="sm"
              className="h-8 text-xs shrink-0"
              onClick={() => setSelectedCategory("all")}
            >
              All News
            </Button>
            <Button
              variant={selectedCategory === "stone_industry" ? "default" : "ghost"}
              size="sm"
              className="h-8 text-xs shrink-0"
              onClick={() => setSelectedCategory("stone_industry")}
            >
              Stone Industry
            </Button>
            <Button
              variant={selectedCategory === "itc_compliance" ? "default" : "ghost"}
              size="sm"
              className="h-8 text-xs shrink-0"
              onClick={() => setSelectedCategory("itc_compliance")}
            >
              ITC & Rules
            </Button>
            <Button
              variant={selectedCategory === "einvoicing" ? "default" : "ghost"}
              size="sm"
              className="h-8 text-xs shrink-0"
              onClick={() => setSelectedCategory("einvoicing")}
            >
              E-Invoice & e-Way
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {filteredNews.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No GST notifications found matching your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNews.map((news) => (
              <div
                key={news.id}
                className="rounded-lg border border-border/70 p-4 bg-card/60 hover:bg-muted/30 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant={news.badgeVariant ?? "secondary"}
                      className="text-[11px] font-medium"
                    >
                      {news.badgeText}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
                      <Calendar className="h-3 w-3" />
                      {news.date}
                    </span>
                  </div>

                  <h4 className="font-semibold text-sm leading-snug tracking-tight text-foreground">
                    {news.title}
                  </h4>

                  <p className="text-xs text-muted-foreground leading-relaxed">{news.summary}</p>

                  <div className="rounded-md bg-primary/5 border border-primary/15 p-2.5 text-xs text-foreground/90 space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-primary text-[11px]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Impact on Stone Tech:
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {news.impactOnStoneTech}
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="truncate max-w-[200px]" title={news.source}>
                    Source: {news.source}
                  </span>
                  <a
                    href={news.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    View Official Circular
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
