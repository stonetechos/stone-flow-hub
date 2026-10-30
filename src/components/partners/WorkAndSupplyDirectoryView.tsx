import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Phone,
  MessageCircle,
  Copy,
  ExternalLink,
  MapPin,
  Building2,
  Sparkles,
  Factory,
  HardHat,
  FlaskConical,
  Truck,
  Wrench,
  User,
  Plus,
  LayoutGrid,
  List,
  Search,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { openWhatsappToContact } from "@/lib/whatsapp";
import {
  PARTNER_CATEGORIES,
  type AssociatedPerson,
  type AssociatedPartnerCategory,
} from "@/lib/partners/directory";
import { cn } from "@/lib/utils";

interface WorkAndSupplyDirectoryViewProps {
  people: AssociatedPerson[];
  isLoading: boolean;
  onAddPartner?: () => void;
  defaultCategory?: AssociatedPartnerCategory | "all";
}

export function WorkAndSupplyDirectoryView({
  people,
  isLoading,
  onAddPartner,
  defaultCategory = "all",
}: WorkAndSupplyDirectoryViewProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<AssociatedPartnerCategory | "all">(
    defaultCategory,
  );
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Compute counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: people.length };
    for (const key of Object.keys(PARTNER_CATEGORIES)) {
      counts[key] = 0;
    }
    for (const p of people) {
      if (counts[p.category] !== undefined) {
        counts[p.category]++;
      }
    }
    return counts;
  }, [people]);

  // Filter people by category and search
  const filtered = useMemo(() => {
    return people.filter((p) => {
      // Category filter
      if (selectedCategory !== "all" && p.category !== selectedCategory) {
        return false;
      }
      // Search filter
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.contactPerson.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.skills.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [people, selectedCategory, search]);

  const handleCopyPhone = async (phone: string, id: string) => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedId(id);
      toast.success(`Copied ${phone} to clipboard`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy phone");
    }
  };

  const handleOpenWhatsapp = (person: AssociatedPerson) => {
    if (!person.phone) {
      toast.error("No phone number available for this contact.");
      return;
    }
    const greeting = person.contactPerson ? `Hi ${person.contactPerson},` : "Hello,";
    const text = `${greeting}\n\nGreetings from Stone Tech!\n\nConnecting regarding natural stone work, material supply, and coordination.\n\nWarm regards,\nStone Tech`;
    openWhatsappToContact(person.phone, text);
  };

  const getCategoryIcon = (category: AssociatedPartnerCategory) => {
    switch (category) {
      case "artwork_partner":
        return <Sparkles className="h-3.5 w-3.5 text-violet-600" />;
      case "application_partner":
        return <HardHat className="h-3.5 w-3.5 text-blue-600" />;
      case "chemical_partner":
        return <FlaskConical className="h-3.5 w-3.5 text-amber-600" />;
      case "transport_partner":
        return <Truck className="h-3.5 w-3.5 text-sky-600" />;
      case "tooling_partner":
        return <Wrench className="h-3.5 w-3.5 text-slate-600" />;
      case "supplying_partner":
      default:
        return <Factory className="h-3.5 w-3.5 text-emerald-600" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Pills Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-1">
          <Button
            type="button"
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("all")}
            className="h-8 rounded-full text-xs font-semibold px-3 gap-1.5"
          >
            <span>All Associates</span>
            <span className="ml-1 rounded-full bg-black/10 dark:bg-white/20 px-1.5 py-0.2 text-[10px]">
              {categoryCounts.all ?? 0}
            </span>
          </Button>

          {(Object.keys(PARTNER_CATEGORIES) as AssociatedPartnerCategory[]).map((catKey) => {
            const config = PARTNER_CATEGORIES[catKey];
            const isSelected = selectedCategory === catKey;
            const count = categoryCounts[catKey] ?? 0;
            return (
              <Button
                key={catKey}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(catKey)}
                className={cn(
                  "h-8 rounded-full text-xs font-semibold px-3 gap-1.5 transition-all",
                  !isSelected && "hover:bg-slate-100/80",
                )}
              >
                {getCategoryIcon(catKey)}
                <span>{config.label}</span>
                <span className="ml-1 rounded-full bg-black/10 dark:bg-white/20 px-1.5 py-0.2 text-[10px]">
                  {count}
                </span>
              </Button>
            );
          })}
        </div>

        {/* View Switcher & Action */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
            <Button
              type="button"
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-7 w-7 p-0"
              title="Card Directory View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-7 w-7 p-0"
              title="Table View"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>

          {onAddPartner && (
            <Button
              size="sm"
              onClick={onAddPartner}
              className="h-8 gap-1.5 text-xs font-semibold shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Partner</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search associates by person, company, phone, city, skills…"
            className="pl-8 text-xs h-9"
          />
        </div>
        <p className="text-xs text-muted-foreground self-start sm:self-center">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> people &
          partners
        </p>
      </div>

      {/* Directory Content */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-14 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 mb-3">
            <User className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No associates found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {search
              ? "No people or partners matched your search query. Try clearing the filter."
              : "No associates have been registered in this category yet."}
          </p>
          {onAddPartner && (
            <Button size="sm" onClick={onAddPartner} className="mt-4 h-8 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              <span>Add First Associate</span>
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* People Directory Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((person) => {
            const hasPhone = Boolean(person.phone);
            const initials = person.contactPerson
              ? person.contactPerson
                  .split(" ")
                  .map((w) => w[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()
              : "ST";

            return (
              <div
                key={`${person.sourceType}-${person.id}`}
                className="group relative rounded-xl border bg-card p-4 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Avatar, Contact Person & Category */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-800 font-bold text-xs border shadow-2xs">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={person.linkUrl as string}
                          className="font-bold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1.5 truncate"
                          title={person.contactPerson}
                        >
                          <span className="truncate">{person.contactPerson}</span>
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-70 transition-opacity shrink-0" />
                        </Link>
                        <p
                          className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate"
                          title={person.name}
                        >
                          <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
                          <span className="truncate">{person.name}</span>
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10.5px] px-2 py-0.5 whitespace-nowrap shrink-0 border",
                        person.categoryBadgeTone,
                      )}
                    >
                      <span
                        className={cn("h-1.5 w-1.5 rounded-full mr-1.5 shrink-0", person.dotColor)}
                      />
                      {person.categoryLabel}
                    </Badge>
                  </div>

                  {/* Location & Code */}
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[140px]">{person.city}</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">#{person.code}</span>
                  </div>

                  {/* Capabilities / Products Chips */}
                  {person.skills.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1 max-h-14 overflow-hidden">
                      {person.skills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-md bg-slate-50 border border-slate-200/80 px-1.5 py-0.5 text-[10px] text-slate-700 font-medium truncate max-w-[180px]"
                        >
                          {skill}
                        </span>
                      ))}
                      {person.skills.length > 3 && (
                        <span className="text-[10px] text-muted-foreground font-semibold self-center px-1">
                          +{person.skills.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Direct Contact Actions */}
                <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {hasPhone ? (
                      <span className="font-mono text-xs font-semibold text-slate-800 tracking-wide truncate block">
                        {person.phone}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">
                        No phone recorded
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasPhone && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyPhone(person.phone, person.id)}
                          className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                          title="Copy phone"
                        >
                          {copiedId === person.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>

                        <a
                          href={`tel:${person.phone.replace(/[^0-9+]/g, "")}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors"
                          title={`Call ${person.contactPerson}`}
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleOpenWhatsapp(person)}
                          className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 font-semibold shadow-2xs"
                          title={`WhatsApp chat with ${person.contactPerson}`}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Detailed Table View */
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70">
                <TableHead className="w-20 font-mono text-xs">Code</TableHead>
                <TableHead className="min-w-[160px]">Contact Person</TableHead>
                <TableHead className="min-w-[180px]">Company / Firm</TableHead>
                <TableHead className="w-36">Category</TableHead>
                <TableHead className="w-32">City</TableHead>
                <TableHead className="w-40">Phone</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((person) => (
                <TableRow key={`${person.sourceType}-${person.id}`}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {person.code}
                  </TableCell>
                  <TableCell className="font-semibold text-xs">
                    <Link to={person.linkUrl as string} className="hover:underline text-foreground">
                      {person.contactPerson}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{person.name}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] px-2 py-0.5", person.categoryBadgeTone)}
                    >
                      <span
                        className={cn("h-1.5 w-1.5 rounded-full mr-1.5 shrink-0", person.dotColor)}
                      />
                      {person.categoryLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{person.city}</TableCell>
                  <TableCell className="font-mono text-xs">{person.phone || "—"}</TableCell>
                  <TableCell className="text-right">
                    {person.phone && (
                      <div className="inline-flex items-center gap-1 justify-end">
                        <a
                          href={`tel:${person.phone.replace(/[^0-9+]/g, "")}`}
                          className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-slate-100 text-slate-700"
                          title="Call"
                        >
                          <Phone className="h-3 w-3" />
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenWhatsapp(person)}
                          className="h-6 w-6 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          title="WhatsApp"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
