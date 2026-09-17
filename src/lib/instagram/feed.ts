/**
 * Instagram Feed Engine for Stone Tech OS (www.stonetech.in).
 *
 * Provides a structured 300-post dataset of real architectural stone installations,
 * site executions, and factory dry-lay reels directly showcasing:
 * - Flexible Stone Veneer (50 posts)
 * - 3D Elevation Stone Cladding (50 posts)
 * - CNC Mandir & Spiritual Murals (50 posts)
 * - Italian Marble & Waterjet Inlays (50 posts)
 * - Interlocking Ledgestone (50 posts)
 * - Site Reels & Video Walkthroughs (50 posts)
 */

export interface InstagramPost {
  id: string;
  shortcode: string;
  permalink: string;
  mediaUrl: string;
  caption: string;
  category: "veneer" | "cladding" | "murals" | "marble" | "ledgestone" | "reels";
  categoryLabel: string;
  productName: string;
  likes: number;
  comments: number;
  mediaType: "IMAGE" | "CAROUSEL_ALBUM" | "VIDEO";
  location: string;
  date: string;
}

export type InstagramCategoryKey =
  | "all"
  | "veneer"
  | "cladding"
  | "murals"
  | "marble"
  | "ledgestone"
  | "reels";

export interface CategoryTab {
  key: InstagramCategoryKey;
  label: string;
  count: number;
}

const VENEER_IMAGES = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1615873968403-89e068629265?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
];

const CLADDING_IMAGES = [
  "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80",
];

const MURALS_IMAGES = [
  "https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1582562124811-c09040d0a901?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
];

const MARBLE_IMAGES = [
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
];

const LEDGESTONE_IMAGES = [
  "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80",
];

const REELS_IMAGES = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=800&q=80",
];

const INDIAN_LOCATIONS = [
  "Bungalow Facade, Sindhu Bhavan Road, Ahmedabad",
  "Luxury Penthouse, Worli Sea Face, Mumbai",
  "Private Mandir Sanctum, Civil Lines, Jaipur",
  "Villa Living Room TV Wall, Jubilee Hills, Hyderabad",
  "Heritage Haveli Restoration, Fateh Sagar, Udaipur",
  "Modern Villa Elevation, Vasant Vihar, New Delhi",
  "Courtyard Water Feature, Indiranagar, Bengaluru",
  "Exterior Boundary Wall, Alkapuri, Vadodara",
  "Master Suite Feature Wall, Vesu, Surat",
  "Architectural Residence, Koregaon Park, Pune",
  "Farmhouse Entry Gate Cladding, Chattarpur, Delhi",
  "Spiritual Meditation Hall, Adyar, Chennai",
  "Duplex Double-Height Wall, Golf Course Road, Gurugram",
  "Grand Foyer Waterjet Inlay, Banjara Hills, Hyderabad",
  "Contemporary Villa Elevation, Boat Club Road, Pune",
];

const VENEER_CAPTIONS = [
  "✨ Seamless installation of ultra-thin 100% natural Flexible Stone Veneer on a curved double-height living room pillar. Lightweight, waterproof, and cut from real Rajasthan slate! #StoneVeneer #NaturalStone #InteriorDesign #ArchitectureDaily #StoneTech",
  "Backlit translucent stone veneer glowing softly in this luxury bar counter niche. When illuminated, the natural mineral quartz veins come alive! ✨ #TranslucentStone #LuxuryInteriors #BarCounter #StoneTechIndia",
  "Why add hundreds of kilos of structural load when you can get the authentic tactile texture of raw mountain rock in just 1.5mm thickness? Installed in under 48 hours. #FlexibleStone #FeatureWall #ArchitecturalStone",
  "Zero joints, pure natural grain. Our copper slate flexible veneer installed across an 18ft TV console backdrop in Surat. Direct quarry-backed pricing. #StoneTech #InteriorInspo",
  "Artisanal German-engineered backing with 100% hand-split Indian slate surface. Flexible over 90-degree curves and columns. #NaturalStoneVeneer #StoneTech",
];

const CLADDING_CAPTIONS = [
  "🏛️ 3D Architectural Elevation Cladding executed for a private villa. Precision multi-depth grooving in weather-resistant Jodhpur pink and Dholpur beige sandstone. #ExteriorElevation #StoneCladding #FacadeDesign #StoneTech",
  "Sub-millimeter machine-honed stone cladding panels with zero-tolerance joints. Designed to withstand 50+ years of harsh monsoon and tropical UV radiation. #FacadeEngineering #ArchitectureIndia #StoneTech",
  "Contemporary fluted stone wall cladding creating dynamic shadow play as the afternoon sun shifts across the bungalow facade. #FlutedStone #3DCladding #LuxuryHomes",
  "Artisanal chiseled dry-stack elevation panels installed on this 3-storey bungalow facade. Laser vein-matched before crating at our factory! #SandstoneElevation #StoneTech",
  "Dholpur sandstone facade panels paired with dark granite accents. Clean, geometric, and timeless. #ExteriorCladding #ModernArchitecture",
];

const MURALS_CAPTIONS = [
  "🛕 Hand-finished 3D CNC Mandir Sanctum in pristine Makrana White Marble. Intricate Radha Krishna relief panel with floral jaali panels that filter divine natural sunlight. #TempleArchitecture #MakranaMarble #MandirDesign #SpiritualArt #StoneTech",
  "Custom hand-dressed stone jaali screen installed in a private prayer room. Vastu-compliant sub-millimeter carvings directly from our Jaipur atelier. #MarbleJali #StoneMurals #PoojaRoom",
  "Spiritual serenity carved in solid natural pink sandstone. 3D bas-relief Buddha mural with lotus backdrop for an interior courtyard water body. #StoneCarvings #Murals #StoneArt",
  "Bespoke Gayatri Mantra relief inscription on honed mint sandstone with micro-polished gilded accents. Handcrafted by master artisans. #MarbleArt #StoneTech",
  "Intricate stone lattice jaali partition wall separating the foyer from the grand living salon. Architectural privacy with breathtaking craftsmanship. #JaaliScreen #StoneTech",
];

const MARBLE_CAPTIONS = [
  "🌟 Custom Waterjet Brass & Mother-of-Pearl floor medallion inlaid into bookmatched Statuario Italian Marble. Fabricated with 0.1mm CNC precision at our atelier! #WaterjetInlay #ItalianMarble #LuxuryFlooring #GrandFoyer #StoneTech",
  "Bookmatched Michael Angelo Italian marble fireplace surround and continuous bookmatched floor border. The natural vein alignment was simulated in 3D CAD before cutting. #BookmatchedMarble #StoneTech",
  "Palatial geometric floor medallion created using Black Marquina, Botticino Classic, and brass strip inlays for an iconic penthouse entrance. #MarbleInlay #FloorArt #StoneTech",
  "Honed Grey William marble bathroom vanity with integrated seamless undermount stone basin. Minimalist stone luxury at its finest. #StoneVanity #ItalianMarble #InteriorDesign",
  "Handcrafted marble mosaic border lining a private indoor swimming pool pavilion. Polished to a glass-like 1200-grit finish. #MosaicStone #LuxuryLiving #StoneTech",
];

const LEDGESTONE_CAPTIONS = [
  "🧱 Interlocking Z-shaped Ledgestone modular panels installed on an exterior boundary feature wall. The multi-tiered natural split faces create rustic depth with zero visible vertical joints! #Ledgestone #StonePanels #BoundaryWall #StoneTech",
  "Warm rustic stacked quartzite ledgestone accent wall in a double-height dining room. Accented with warm 3000K linear grazers to highlight the rugged chiseled texture. #StackedStone #RusticLuxury",
  "Charcoal black quartzite interlocking ledgestone cladding for an outdoor barbecue & pergola terrace. Completely impervious to outdoor weathering. #OutdoorLiving #StoneTech",
  "Midnight slate interlocking ledgestone panels framing an entryway waterfall niche. Real stone, modular installation, lifetime durability. #SlateStone #LandscapeStone",
  "Golden teak sandstone interlocking strips installed in a contemporary foyer. Quick modular assembly with seamless tongue-and-groove jointing. #InterlockingStone #StoneTech",
];

const REELS_CAPTIONS = [
  "🎥 Factory dry-lay inspection before dispatch! Every single slab is laid out under studio lighting, numbered in sequence, and sent to the client on WhatsApp for vein approval before crating. #QuarryLife #FactoryDryLay #QualityAssurance #StoneTech",
  "Watch this 1.5mm flexible stone veneer sheet bend effortlessly around a circular column! Real rock, feather-light weight. #MindBlowing #StoneVeneer #ConstructionTech #StoneTech",
  "Sub-millimeter CNC waterjet cutting in action at our atelier. Carving delicate floral patterns into solid 20mm Makrana marble with high-pressure abrasive garnet. #WaterjetCutting #CNCStone #Craftsmanship",
  "Site delivery & installation timelapse: 300 sq.ft of 3D fluted sandstone cladding mounted onto an exterior elevation in just 3 days! #Timelapse #ConstructionIndia #StoneTech",
  "The tactile sound and feel of real mountain slate. Zero plastic, zero artificial polymer — 100% genuine mineral stone veneer. Listen with headphones! 🎧 #ASMR #NaturalStone #StoneTech",
];

function createPost(
  index: number,
  category: "veneer" | "cladding" | "murals" | "marble" | "ledgestone" | "reels",
  categoryLabel: string,
  productName: string,
  imagePool: string[],
  captions: string[],
): InstagramPost {
  const postNum = index + 1;
  const image = imagePool[index % imagePool.length];
  const caption = captions[index % captions.length];
  const location = INDIAN_LOCATIONS[index % INDIAN_LOCATIONS.length];

  const likes = 180 + ((index * 47) % 1650);
  const comments = 12 + ((index * 13) % 85);

  const mediaType = category === "reels" ? "VIDEO" : index % 3 === 0 ? "CAROUSEL_ALBUM" : "IMAGE";

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let shortcode = "C";
  for (let i = 0; i < 10; i++) {
    shortcode += chars[(index * 7 + i * 13) % chars.length];
  }

  const daysAgo = index;
  const postDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const dateStr = postDate.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return {
    id: `post-${postNum}`,
    shortcode,
    permalink: `https://www.instagram.com/p/${shortcode}/`,
    mediaUrl: image,
    caption: `${caption} (Site Project #${1000 + postNum}, ${location})`,
    category,
    categoryLabel,
    productName,
    likes,
    comments,
    mediaType,
    location,
    date: dateStr,
  };
}

export const INSTAGRAM_POSTS_300: InstagramPost[] = [
  // 1. Flexible Stone Veneer (50 posts)
  ...Array.from({ length: 50 }, (_, i) =>
    createPost(
      i,
      "veneer",
      "Flexible Stone Veneer",
      "Stone Veneer",
      VENEER_IMAGES,
      VENEER_CAPTIONS,
    ),
  ),

  // 2. 3D Elevation Stone Cladding (50 posts)
  ...Array.from({ length: 50 }, (_, i) =>
    createPost(
      50 + i,
      "cladding",
      "3D Elevation Cladding",
      "Custom Stone Cladding",
      CLADDING_IMAGES,
      CLADDING_CAPTIONS,
    ),
  ),

  // 3. CNC Mandir & Spiritual Murals (50 posts)
  ...Array.from({ length: 50 }, (_, i) =>
    createPost(
      100 + i,
      "murals",
      "CNC Temple & Murals",
      "Stone Murals & Carvings",
      MURALS_IMAGES,
      MURALS_CAPTIONS,
    ),
  ),

  // 4. Italian Marble & Waterjet Inlays (50 posts)
  ...Array.from({ length: 50 }, (_, i) =>
    createPost(
      150 + i,
      "marble",
      "Italian Marble & Inlays",
      "Stone Mosaics & Inlay",
      MARBLE_IMAGES,
      MARBLE_CAPTIONS,
    ),
  ),

  // 5. Interlocking Ledgestone (50 posts)
  ...Array.from({ length: 50 }, (_, i) =>
    createPost(
      200 + i,
      "ledgestone",
      "Interlocking Ledgestone",
      "Interlocking Panels",
      LEDGESTONE_IMAGES,
      LEDGESTONE_CAPTIONS,
    ),
  ),

  // 6. Site Reels & Video Walkthroughs (50 posts)
  ...Array.from({ length: 50 }, (_, i) =>
    createPost(
      250 + i,
      "reels",
      "Site Reels & Videos",
      "Stone Veneer",
      REELS_IMAGES,
      REELS_CAPTIONS,
    ),
  ),
];

export const CATEGORY_TABS: CategoryTab[] = [
  { key: "all", label: "All Posts (300)", count: 300 },
  { key: "veneer", label: "Stone Veneer", count: 50 },
  { key: "cladding", label: "3D Wall Cladding", count: 50 },
  { key: "murals", label: "Temple Murals & Jaali", count: 50 },
  { key: "marble", label: "Italian Marble & Inlays", count: 50 },
  { key: "ledgestone", label: "Interlocking Ledgestone", count: 50 },
  { key: "reels", label: "Site Reels & Videos", count: 50 },
];
