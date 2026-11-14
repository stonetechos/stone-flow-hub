import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { WebsiteProductsBackend } from "@/components/admin/WebsiteProductsBackend";
import { WebsiteLandingContentEditor } from "@/components/admin/WebsiteLandingContentEditor";
import { SidebarTabsBackend } from "@/components/admin/SidebarTabsBackend";
import { useRoles } from "@/hooks/use-roles";
import {
  Globe,
  PackageSearch,
  FileText,
  Sliders,
  ShieldAlert,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/website")({
  ssr: false,
  component: WebsiteAdminPage,
});

const PAGE_TEXTS = {
  en: {
    title: "Website CMS",
    subtitle:
      "Manage public products, add new categories, edit landing page copy, and customize software navigation.",
    viewPublic: "View Public Website",
    tabProducts: "Products & Categories",
    tabLanding: "Landing Page Matter",
    tabNavigation: "Navigation Tabs",
    restrictedTitle: "Super Admin & Admin Restricted Access",
    restrictedDesc:
      "Only Admins can edit public website landing page matter, manage catalogue uploading, and alter navigation tabs.",
  },
  hi: {
    title: "वेबसाइट CMS",
    subtitle:
      "सार्वजनिक उत्पादों का प्रबंधन करें, नई श्रेणियां जोड़ें, लैंडिंग पेज सामग्री संपादित करें और सॉफ्टवेयर नेविगेशन को अनुकूलित करें।",
    viewPublic: "सार्वजनिक वेबसाइट देखें",
    tabProducts: "उत्पाद एवं श्रेणियां",
    tabLanding: "लैंडिंग पेज सामग्री",
    tabNavigation: "नेविगेशन टैब्स",
    restrictedTitle: "सुपर एडमिन एवं एडमिन प्रतिबंधित पहुंच",
    restrictedDesc:
      "केवल व्यवस्थापक ही सार्वजनिक वेबसाइट लैंडिंग सामग्री संपादित कर सकते हैं, कैटलॉग अपलोड प्रबंधित कर सकते हैं और नेविगेशन टैब बदल सकते हैं।",
  },
  gu: {
    title: "વેબસાઇટ CMS",
    subtitle:
      "જાહેર ઉત્પાદનોનું સંચાલન કરો, નવી શ્રેણીઓ ઉમેરો, લેન્ડિંગ પૃષ્ઠ લખાણ સંપાદિત કરો અને સૉફ્ટવેર નેવિગેશન કસ્ટમાઇઝ કરો.",
    viewPublic: "જાહેર વેબસાઇટ જુઓ",
    tabProducts: "ઉત્પાદનો અને શ્રેણીઓ",
    tabLanding: "લેન્ડિંગ પેજ લખાણ",
    tabNavigation: "નેવિગેશન ટૅબ્સ",
    restrictedTitle: "સુપર એડમિન અને એડમિન પ્રતિબંધિત ઍક્સેસ",
    restrictedDesc:
      "ફક્ત એડમિન જ જાહેર વેબસાઇટ સામગ્રી સંપાદિત કરી શકે છે, કેટલોગ અપલોડનું સંચાલન કરી શકે છે અને નેવિગેશન ટેબ બદલી શકે છે.",
  },
};

function WebsiteAdminPage() {
  const roles = useRoles();
  const canManage = roles.isSuperAdmin || roles.isAdmin;
  const { i18n } = useTranslation();
  const lang = (i18n.language?.substring(0, 2) || "en") as "en" | "hi" | "gu";
  const t = PAGE_TEXTS[lang] || PAGE_TEXTS.en;

  const [activeTab, setActiveTab] = useState<"products" | "content" | "navigation">("products");

  if (roles.isReady && !canManage) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <PageHeader title={t.title} subtitle={t.subtitle} />
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center space-y-3">
          <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-foreground">{t.restrictedTitle}</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">{t.restrictedDesc}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Globe className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              {t.title}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex">
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
              <span>{t.viewPublic}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
        </div>
      </div>

      {/* Main Tabs Control */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "products" | "content" | "navigation")}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3 max-w-2xl bg-muted/80 p-1 rounded-xl">
          <TabsTrigger
            value="products"
            className="text-xs font-semibold flex items-center justify-center gap-1.5 py-2"
          >
            <PackageSearch className="h-3.5 w-3.5" />
            <span>{t.tabProducts}</span>
          </TabsTrigger>

          <TabsTrigger
            value="content"
            className="text-xs font-semibold flex items-center justify-center gap-1.5 py-2"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{t.tabLanding}</span>
          </TabsTrigger>

          <TabsTrigger
            value="navigation"
            className="text-xs font-semibold flex items-center justify-center gap-1.5 py-2"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>{t.tabNavigation}</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PRODUCTS & CATEGORIES */}
        <TabsContent value="products" className="space-y-4">
          <WebsiteProductsBackend />
        </TabsContent>

        {/* TAB 2: LANDING PAGE MATTER */}
        <TabsContent value="content" className="space-y-4">
          <WebsiteLandingContentEditor />
        </TabsContent>

        {/* TAB 3: SIDEBAR TABS & NAVIGATION */}
        <TabsContent value="navigation" className="space-y-4">
          <SidebarTabsBackend />
        </TabsContent>
      </Tabs>
    </div>
  );
}
