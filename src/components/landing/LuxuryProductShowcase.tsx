import { useState, useMemo } from "react";
import {
  Sparkles,
  Layers,
  ArrowRight,
  Phone,
  Gem,
  Check,
  Compass,
  Palette,
  ShieldCheck,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface LuxuryProductItem {
  id: string;
  name: string;
  category: "all" | "facade" | "sacred" | "surfaces" | "exotic";
  categoryLabel: string;
  tagline: string;
  luxurySubtitle: string;
  description: string;
  badge: string;
  specs: {
    thickness: string;
    dimensions: string;
    weight?: string;
    finishes: string[];
    applications: string[];
    quarryOrigin: string;
  };
  highlights: string[];
  popular?: boolean;
}

const LUXURY_PRODUCTS: LuxuryProductItem[] = [
  {
    id: "stone_veneer",
    name: "Stone Veneer",
    category: "facade",
    categoryLabel: "Flexible & Lightweight",
    tagline:
      "Ultra-thin, flexible natural slate & quartzite sheets for walls, ceilings & furniture",
    luxurySubtitle: "1.5–2mm Cleaved Natural Stone · Malleable Over Curves & High Ceilings",
    description:
      "Genuine cleaved natural slate and quartzite split into ultra-thin leaves and reinforced with aerospace-grade fiberglass-polyester resin. Retains the organic cleft texture, tactile richness, and geological age of natural quarry stone while weighing under 1.8 kg/sq.m. Bends seamlessly over convex columns, concave ceilings, elevator cages, and luxury bespoke cabinetry without requiring structural retrofitting.",
    badge: "Architectural Innovation",
    popular: true,
    specs: {
      thickness: "1.5 mm – 2.0 mm ultra-slim profile",
      dimensions: "1220 × 610 mm · Jumbo 2440 × 1220 mm sheets",
      weight: "Approx. 1.5 – 1.8 kg / sq.m",
      finishes: ["Natural 3D Riven", "Translucent (Backlightable)", "Nano-Sealed Matte"],
      applications: [
        "Curved Architectural Columns",
        "Living Room TV Accents",
        "Ceiling Soffits",
        "Bespoke Wardrobe & Door Wrapping",
      ],
      quarryOrigin: "Deoli & Kund Slate Belts, Rajasthan",
    },
    highlights: [
      "100% natural quarry stone face",
      "Flexible around circular pillars down to 50mm radius",
      "Translucent variant illuminates with LED backlighting",
      "Installs with standard structural polymer adhesives",
    ],
  },
  {
    id: "custom_stone_cladding",
    name: "Custom Stone Cladding",
    category: "facade",
    categoryLabel: "Exterior & Facades",
    tagline: "Exterior elevation facades & interior 3D textured accent feature walls",
    luxurySubtitle: "Thermal-Mass Hand-Dressed Masonry · Timeless Monumental Stature",
    description:
      "Engineered solid-body sandstone, limestone, and granite cladding tiles sculpted to deliver deep shadow lines and dimensional architectural drama. Sourced directly from certified Rajasthan quarries, each block is calibrated to tight sub-millimeter tolerances to ensure weatherproofing, zero thermal cracking, and enduring elegance across extreme monsoon, desert, and coastal climates.",
    badge: "Heritage Elevation",
    popular: true,
    specs: {
      thickness: "20 mm – 75 mm depth relief",
      dimensions: "Custom modular coursing · 300×150 up to 1200×600 mm",
      finishes: [
        "Hand-Chiseled Rockface",
        "Bush Hammered",
        "Shot Blasted",
        "Splitface",
        "Antique Sandstone",
      ],
      applications: [
        "Bungalow & Villa Elevation Facades",
        "Double-Height Atrium Walls",
        "Grand Compound Boundaries",
        "Courtyard Waterfalls",
      ],
      quarryOrigin: "Dholpur, Kandla, Jodhpur & Gwalior Quarries",
    },
    highlights: [
      "Zero thermal discoloration & UV impervious",
      "Dry or wet mechanical anchoring options",
      "Deep relief provides natural solar shading & acoustics",
      "Pre-graded in matching vein and tone batches",
    ],
  },
  {
    id: "interlocking_panels",
    name: "Interlocking Panels",
    category: "facade",
    categoryLabel: "Modular Wall Facades",
    tagline: "Seamless 3D textured ledgestone & interlocking elevation panels",
    luxurySubtitle: "Mortarless Z-Lock Precision · Monolithic Stacked-Stone Aesthetic",
    description:
      "Stepped, staggered natural stone strips bonded into modular interlocking Z-shaped units. The finger-jointed configuration masks vertical grout lines entirely, producing a continuous, seamless expanse of raw organic masonry that commands visual focus in residential pavilions and corporate reception spaces.",
    badge: "Seamless Masonry",
    popular: true,
    specs: {
      thickness: "15 mm – 35 mm multi-plane relief",
      dimensions: "600 × 150 mm · 600 × 200 mm interlocking Z-modules",
      finishes: ["Splitface Ledgestone", "Multi-Layered Honed", "Rustic Quartzite"],
      applications: [
        "Foyer Focal Walls",
        "Fireplace Surrounds",
        "Balcony & Terrace Features",
        "Exterior Boundary Accents",
      ],
      quarryOrigin: "North Indian Slate & Quartzite Formations",
    },
    highlights: [
      "Zero visible vertical joints after installation",
      "Rapid dry-wall & masonry application",
      "Natural multi-tonal light reflection",
      "Pre-cured factory assembly with high-shear epoxy",
    ],
  },
  {
    id: "stone_murals_carvings",
    name: "Stone Murals & Carvings",
    category: "sacred",
    categoryLabel: "Spiritual & Fine Art",
    tagline: "CNC 3D carved temple mandirs, artistic jaalis & stone wall sculptures",
    luxurySubtitle: "5-Axis CNC Precision Paired with Master Artisan Hand-Detailing",
    description:
      "Transcendent devotional masterworks and artistic bas-relief murals carved into solid sandstone, pristine Makrana marble, and exotic limestones. Combines computerized 5-axis sculpting with the nuanced touch of third-generation Rajasthani carvers to deliver immaculate deities, sanctum mandapams, fluted columns, and geometric jaali screens.",
    badge: "Bespoke Masterpiece",
    popular: true,
    specs: {
      thickness: "30 mm to 100 mm monolithic relief",
      dimensions: "Monolithic panels up to 10 × 6 ft · Custom panelling",
      finishes: ["Fine Chiseled", "Honed Satin", "Gold Leaf Accenting", "Sandblasted Relief"],
      applications: [
        "Bespoke Home Mandirs",
        "Temple Sanctums & Gokhlas",
        "Double-Height Spiritual Walls",
        "Lattice Jaali Partitions",
      ],
      quarryOrigin: "Makrana White (Rajasthan) & Dholpur Pink/Beige",
    },
    highlights: [
      "Deep 3D undercuts and divine iconography",
      "CAD-to-stone precision matching client blueprints",
      "Pure marble options resistant to sacred oils & smoke",
      "Factory trial dry-assembly prior to packaging",
    ],
  },
  {
    id: "stone_mosaics_inlay",
    name: "Stone Mosaics & Inlay",
    category: "sacred",
    categoryLabel: "Haute Inlay Craft",
    tagline: "Waterjet geometric medallions, floral floor inlays & brass borders",
    luxurySubtitle: "Sub-Millimeter Waterjet Cuts · Pure Brass & Semi-Precious Accents",
    description:
      "A tribute to royal Pietra Dura art reimagined through modern precision engineering. High-pressure abrasive waterjets cut contrasting Italian marbles, exotic granites, and natural brass strips to tolerances under 0.2mm, assembling museum-quality floor medallions, floral borders, and geometric carpets for majestic entryways.",
    badge: "Haute Inlay",
    specs: {
      thickness: "18 mm – 20 mm flooring standard",
      dimensions: "Custom floor medallions from 3 ft to 15 ft diameter",
      finishes: ["Mirror High-Gloss Polish", "Honed Silk", "Brushed Brass Borders"],
      applications: [
        "Grand Entrance Foyers",
        "Palatial Living Room Carpets",
        "Master Ensuite Medallions",
        "Hotel & Ballroom Centerpieces",
      ],
      quarryOrigin: "Italian Statuario, Carrara, Makrana White & Forest Green",
    },
    highlights: [
      "Seamless flush fit with zero joint offset (<0.2mm)",
      "Solid pure brass and mother-of-pearl integration",
      "Supplied on heavy fiberglass mesh for effortless alignment",
      "Fully polished and sealed with industrial stain barrier",
    ],
  },
  {
    id: "marble_granite_flooring",
    name: "Custom Flooring",
    category: "surfaces",
    categoryLabel: "Flooring & Large Slabs",
    tagline: "Imported Italian marble, premium granites & dry-lay vein matching",
    luxurySubtitle: "Curated Single-Block Slabs · Guaranteed Diamond Bookmatching",
    description:
      "Exclusive first-choice slab selection from Carrara, Tuscany, and South Indian granite ranges. We execute comprehensive dry-lay layout staging in our factory, photographing and numbering every individual slab so that natural veins converge into breathtaking diamond, butterfly, and continuous river patterns before arriving on your site.",
    badge: "Curated Slabs",
    specs: {
      thickness: "18 mm – 20 mm calibrated",
      dimensions: "Jumbo slabs up to 3200 × 1950 mm · Cut-to-size formats",
      finishes: ["Mirror Polish", "Leathered / River-Washed", "Satin Honed"],
      applications: [
        "Bungalow Living & Dining Pavilions",
        "Penthouse Master Suites",
        "Hotel Corridors & Lobbies",
        "Monumental Staircases",
      ],
      quarryOrigin: "Carrara & Tuscany (Italy), Bangalore & Udaipur (India)",
    },
    highlights: [
      "Consecutive slab numbering for flawless vein continuation",
      "Factory dry-lay video approval sent to WhatsApp",
      "Resin-reinforced back netting for zero transit cracking",
      "High chemical resistance & superior scratch resilience",
    ],
  },
  {
    id: "table_tops_countertops",
    name: "Table Tops & Countertops",
    category: "surfaces",
    categoryLabel: "Monolithic Furnishings",
    tagline: "Luxury dining tables, kitchen waterfall islands & stone vanity counters",
    luxurySubtitle: "Seamless 45° Mitred Waterfall Edges · Permanent Anti-Etch Sealing",
    description:
      "Monolithic solid stone dining surfaces, executive boardroom desks, and culinary waterfall kitchen islands. Hand-finished with 45-degree bookmatched mitred drop edges to simulate heavy single-block density while maintaining refined ergonomics. Treated with food-safe nano-penetrating sealants that resist citrus, turmeric, wine, and oil etching.",
    badge: "Fine Monoliths",
    specs: {
      thickness: "20 mm solid slab with 40mm – 80mm built-up mitred apron",
      dimensions: "Custom lengths up to 3.4 meters seamless",
      finishes: ["Deep Gloss Polish", "Tactile Leathered", "Velvet Honed"],
      applications: [
        "8–14 Seater Luxury Dining Tables",
        "Kitchen Waterfall Center Islands",
        "Bathroom Vanity Counters",
        "Executive Boardroom Desks",
      ],
      quarryOrigin: "Exotic Brazilian Quartzite & Italian Calacatta",
    },
    highlights: [
      "Precision 45° mitred edge with vein wrapping",
      "Pre-cut CNC undermount sink and hob recesses",
      "Thermal resistance against hot cookware & steam",
      "Factory pre-sealed with food-grade nano barrier",
    ],
  },
  {
    id: "agate_semi_precious",
    name: "Agate & Semi-Precious Slabs",
    category: "exotic",
    categoryLabel: "Translucent Gemstones",
    tagline: "Backlit translucent luxury quartz slabs for bar counters & entry foyers",
    luxurySubtitle: "Natural Wild Agate & Honey Onyx · Ethereal Ambient Illumination",
    description:
      "The pinnacle of interior luxury. Individually hand-sorted gemstones—wild blue agate, golden tiger-eye, amethyst crystal, and banded honey onyx—bonded with optical-grade crystal resin into radiant solid slabs. When integrated with diffused LED panels, the mineral crystal matrices glow with mesmerizing warmth, depth, and prestige.",
    badge: "Haute Joaillerie Stone",
    specs: {
      thickness: "15 mm – 20 mm translucent composite",
      dimensions: "Slabs up to 2800 × 1500 mm · Custom cut pieces",
      finishes: ["Jewelers Mirror Polish", "Scratch-Resistant Resin Seal"],
      applications: [
        "Illuminated Cocktail & Bar Counters",
        "Feature Reception Portals",
        "Master Powder Room Walls",
        "Prestige Bedhead Accents",
      ],
      quarryOrigin: "Madagascar & India Agate Formations, Iranian Honey Onyx",
    },
    highlights: [
      "High light-transmission index for uniform backlighting",
      "Genuine semi-precious quartz crystal gems",
      "Zero porosity surface that never stains or absorbs wine",
      "Custom LED lighting diffuser kits available on request",
    ],
  },
  {
    id: "stepping_stones_landscaping",
    name: "Stepping Stones & Landscape",
    category: "exotic",
    categoryLabel: "Outdoor & Landscapes",
    tagline: "Natural garden cobbles, flagstones, pavers & water feature boulders",
    luxurySubtitle: "Non-Slip R11/R12 Natural Formations · Weather-Impervious Architecture",
    description:
      "Hand-cleft irregular crazy pavers, calibrated garden stepping flagstones, granite driveway cobbles, and monolith water feature boulders. Specially prepared to endure heavy vehicular loads, standing swimming pool moisture, and extreme solar heat while aging gracefully with a distinguished natural patina.",
    badge: "Organic Landscape",
    specs: {
      thickness: "25 mm to 50 mm heavy-duty calibrated",
      dimensions: "Natural organic crazy shapes · Calibrated 300×300 to 900×600 mm",
      finishes: ["Natural Cleft", "Flamed Anti-Slip", "Tumbled Antique", "Waterjet Gripped"],
      applications: [
        "Villa Garden Pathways",
        "Swimming Pool Coping & Decks",
        "Courtyard Crazy Paving",
        "Heavy-Duty Driveway Cobbles",
      ],
      quarryOrigin: "Kotah, Kandla Grey, Tandur & Bangalore Granite",
    },
    highlights: [
      "Natural R11–R12 slip rating even when submerged",
      "High flexural strength for heavy vehicular traffic",
      "Chlorine and salt-water resistant for pool decks",
      "Tough hand-cleft edges blend organically into greenery",
    ],
  },
  {
    id: "pu_decorative_panels",
    name: "PU Decorative Panels",
    category: "facade",
    categoryLabel: "Featherweight Accents",
    tagline: "Ultra-lightweight, quick-mount high-definition faux stone replica panels",
    luxurySubtitle: "High-Density Polyurethane Tech · 1/10th Weight of Solid Stone",
    description:
      "Engineered high-density structural polyurethane cast from authentic weathered rockfaces and ashlar blocks. Weighs only 3.5 kg/sq.m with Class-B fire resistance and 100% moisture immunity. Allows instantaneous transformation of light gypsum partitions, plywood surfaces, and high-rise apartment walls where structural load restrictions prevent heavy stone masonry.",
    badge: "Modern Lightweight",
    specs: {
      thickness: "30 mm to 80 mm deep 3D relief",
      dimensions: "1200 × 600 mm · 2400 × 1200 mm high-speed panels",
      weight: "Approx. 3.2 – 3.8 kg / sq.m",
      finishes: ["Nordic White Rockface", "Charcoal Slate", "Weathered Sandstone"],
      applications: [
        "Apartment Drywall Feature Walls",
        "Fast-Track Restaurant & Retail Fitouts",
        "High-Rise Ceiling Accents",
        "Moist Basement Renovations",
      ],
      quarryOrigin: "Precision Molded High-Density PU with UV Acrylic Coat",
    },
    highlights: [
      "Ultra-lightweight — mounts directly to drywall with screws",
      "Zero stone cutting dust or wet masonry mess on site",
      "Thermal & acoustic insulation built into panel core",
      "Moisture-proof & pest-resistant for interior applications",
    ],
  },
];

interface LuxuryProductShowcaseProps {
  onSelectProduct?: (productName: string) => void;
  selectedProducts?: string[];
}

export function LuxuryProductShowcase({
  onSelectProduct,
  selectedProducts = [],
}: LuxuryProductShowcaseProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "facade" | "sacred" | "surfaces" | "exotic"
  >("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = [
    { key: "all", label: "All Collections", count: LUXURY_PRODUCTS.length },
    {
      key: "facade",
      label: "Facades & Veneers",
      count: LUXURY_PRODUCTS.filter((p) => p.category === "facade").length,
    },
    {
      key: "sacred",
      label: "Mandirs & Inlays",
      count: LUXURY_PRODUCTS.filter((p) => p.category === "sacred").length,
    },
    {
      key: "surfaces",
      label: "Floors & Monoliths",
      count: LUXURY_PRODUCTS.filter((p) => p.category === "surfaces").length,
    },
    {
      key: "exotic",
      label: "Gemstones & Outdoors",
      count: LUXURY_PRODUCTS.filter((p) => p.category === "exotic").length,
    },
  ];

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "all") return LUXURY_PRODUCTS;
    return LUXURY_PRODUCTS.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="mt-8 space-y-6">
      {/* Luxury Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-300">
              <Gem className="h-3 w-3 fill-amber-400" />
              The Architectural Atelier Portfolio
            </span>
            <span className="text-[11px] font-medium text-stone-400">
              Direct Mine Sourcing · Sub-Millimeter Tolerances
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Curated Natural Stone Collections
          </h2>

          <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
            From rare translucent agates and precision 5-axis CNC mandir sanctums to flexible
            cleaved stone veneers and bookmatched Italian marble slabs. Engineered for villas,
            estates, and sacred architecture.
          </p>

          {/* Quick Filter Navigation Tabs */}
          <div className="pt-2 flex flex-wrap items-center gap-1.5">
            {categories.map((c) => {
              const isSelected = selectedCategory === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setSelectedCategory(c.key as typeof selectedCategory)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isSelected
                      ? "bg-amber-500 text-stone-950 shadow-md font-bold"
                      : "bg-stone-800/80 text-stone-300 hover:bg-stone-800 hover:text-white border border-stone-700/60"
                  }`}
                >
                  {c.label} ({c.count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Luxury Product Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5">
        {filteredProducts.map((product) => {
          const isExpanded = expandedId === product.id;
          const isSelected = selectedProducts.includes(product.name);

          return (
            <div
              key={product.id}
              className={cn(
                "group relative rounded-2xl border bg-card/90 backdrop-blur-xs p-5 sm:p-6 shadow-sm hover:shadow-lg transition-all duration-300 ring-1 ring-black/5 dark:ring-white/5 space-y-4",
                isSelected
                  ? "border-emerald-500/80 ring-2 ring-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10"
                  : "border-border/80 hover:border-amber-500/50",
              )}
            >
              {/* Top Row: Category Tag, Badge, and Action Link */}
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
                    >
                      {product.categoryLabel}
                    </Badge>
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      {product.badge}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300/90">
                    {product.luxurySubtitle}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onSelectProduct?.(product.name)}
                    className={cn(
                      "h-8 text-xs font-bold shadow-2xs gap-1.5 px-3 cursor-pointer transition-all",
                      isSelected
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400/40"
                        : "bg-amber-600 hover:bg-amber-700 text-white",
                    )}
                  >
                    {isSelected ? (
                      <>
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                        <span>Selected for Estimate</span>
                      </>
                    ) : (
                      <>
                        <span>Select for Estimate</span>
                        <ArrowRight className="h-3 w-3" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {product.description}
              </p>

              {/* Architectural Highlights Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                {product.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-foreground/90">
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-tight">{h}</span>
                  </div>
                ))}
              </div>

              {/* Technical Specifications Accordion / Drawer */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => toggleExpand(product.id)}
                  className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  <span>
                    {isExpanded ? "Hide Technical Specifications" : "View Technical Specifications"}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isExpanded && (
                  <div className="mt-3 rounded-xl border border-border/80 bg-muted/40 p-4 space-y-3 text-xs animate-in fade-in-50 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="font-bold text-muted-foreground block text-[11px] uppercase tracking-wider">
                          Standard Thickness &amp; Formats
                        </span>
                        <p className="font-semibold text-foreground mt-0.5">
                          {product.specs.thickness}
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          {product.specs.dimensions}
                        </p>
                        {product.specs.weight && (
                          <p className="text-muted-foreground text-[11px]">
                            Weight: {product.specs.weight}
                          </p>
                        )}
                      </div>

                      <div>
                        <span className="font-bold text-muted-foreground block text-[11px] uppercase tracking-wider">
                          Quarry &amp; Regional Origin
                        </span>
                        <p className="font-semibold text-foreground mt-0.5">
                          {product.specs.quarryOrigin}
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          Mine-direct certification with zero distributor markups
                        </p>
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-muted-foreground block text-[11px] uppercase tracking-wider mb-1">
                        Available Surface Finishes
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {product.specs.finishes.map((f, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-[10px] px-2 py-0.5 bg-background border"
                          >
                            {f}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-muted-foreground block text-[11px] uppercase tracking-wider mb-1">
                        Recommended Architectural Applications
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {product.specs.applications.map((app, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-[10px] px-2 py-0.5 bg-amber-50/50 text-amber-900 border-amber-200 dark:bg-amber-950/20 dark:text-amber-200 dark:border-amber-900"
                          >
                            {app}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Quick Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
                <span className="text-[11px] text-muted-foreground">
                  Need a bespoke sample box or dry-lay proof for this product?
                </span>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://api.whatsapp.com/send?phone=917742090866&text=${encodeURIComponent(
                      `Hi Stone Tech Team, I am interested in inquiring about ${product.name} (${product.luxurySubtitle}). Please share specifications and catalog.`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    <Phone className="h-3 w-3 fill-current" />
                    <span>Inquire on WhatsApp</span>
                    <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                  </a>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectProduct?.(product.name)}
                    className={cn(
                      "h-7 text-xs font-bold px-2 cursor-pointer transition-colors",
                      isSelected
                        ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-extrabold"
                        : "text-amber-600 hover:text-amber-700 hover:bg-amber-500/10",
                    )}
                  >
                    {isSelected ? "View in Estimate Form →" : "Get Estimate →"}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
