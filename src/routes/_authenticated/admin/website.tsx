import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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

function WebsiteAdminPage() {
  const roles = useRoles();
  const canManage = roles.isSuperAdmin || roles.isAdmin;

  const [activeTab, setActiveTab] = useState<"products" | "content" | "navigation">("products");

  if (roles.isReady && !canManage) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="Website CMS"
          subtitle="Public website content, product catalogue uploading, and navigation controls."
        />
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center space-y-3">
          <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-foreground">
            Super Admin &amp; Admin Restricted Access
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Only Admins can edit public website landing page matter, manage catalogue uploading, and
            alter navigation tabs.
          </p>
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
              Website CMS
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manage public products, add new categories, edit landing page copy, and customize
            software navigation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex">
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
              <span>View Public Website</span>
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
            <span>Products &amp; Categories</span>
          </TabsTrigger>

          <TabsTrigger
            value="content"
            className="text-xs font-semibold flex items-center justify-center gap-1.5 py-2"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Landing Page Matter</span>
          </TabsTrigger>

          <TabsTrigger
            value="navigation"
            className="text-xs font-semibold flex items-center justify-center gap-1.5 py-2"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Navigation Tabs</span>
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
