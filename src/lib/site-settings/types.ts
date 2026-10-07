/** Represents an installed wall application where a cladding product is used. */
export interface CladdingWallApplication {
  url: string;
  title: string;
  spaceType: string; // e.g. "Exterior Elevation", "Living Room TV Wall", "Entrance Foyer", "Courtyard"
  description?: string;
}

/** Represents a cladding product item on the homepage showcase. */
export interface CladdingProductItem {
  id: string;
  name: string;
  category: string; // e.g. "Natural Sandstone", "Textured Stone Panel", "Stone Veneer", "Teakwood Ledgestone"
  tagline: string;
  materialImage: string; // Clickable thumbnail / sample photo of the cladding material
  wallImages: CladdingWallApplication[]; // Photos of walls where installed
  suitableWalls: string[]; // Badges, e.g. ["Exterior Facades", "TV Accent Walls", "Balcony"]
  description?: string;
  dimensions?: string;
  finish?: string;
}

/** Represents a single customer review stored in the `reviews` setting. */
export interface SiteReview {
  quote: string;
  author: string;
  role: string;
  rating: number;
}

/** All known site_settings keys with their parsed value types. */
export interface SiteSettings {
  google_rating: string;
  reviews: SiteReview[];
  estimate_card_heading: string;
  estimate_card_subtext: string;
  cladding_products: CladdingProductItem[];
}

/** Hard-coded defaults — used as fallback when the DB is unavailable. */
export const SITE_SETTINGS_DEFAULTS: SiteSettings = {
  google_rating: "4.9",
  reviews: [
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
  ],
  estimate_card_heading: "Request for Estimate",
  estimate_card_subtext: "Get a personalised stone estimate — WhatsApp-ready in minutes.",
  cladding_products: [
    {
      id: "clad-red-indian-sandstone",
      name: "Red Indian Sandstone Butch Finish",
      category: "Natural Sandstone Cladding",
      tagline: "Rugged butch finish natural surface creating dramatic architectural shadows",
      materialImage:
        "https://scontent-sjc6-1.cdninstagram.com/v/t51.82787-15/772020675_18370113886229555_753949943061334743_n.heic?stp=dst-jpg_e35_tt6&_nc_cat=107&ig_cache_key=Mzk2MDYxMzg2MzMzODYzMTE2Mg%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=a54f6b&efg=eyJlZmdfdGFnIjoiYmVzdF9pbWFnZV91cmxnZW4uQ0FST1VTRUxfSVRFTS5DMyJ9&_nc_ohc=kAOM8dlLOl4Q7kNvwGedyZh&_nc_oc=Adpd-Nf2xoGSOSzX8mENXIlmYbqGZbD2ZTRN9I1HdQSytS7Qz7BS1NNOzBUA1OM7VA8&_nc_zt=23&_nc_ht=scontent-sjc6-1.cdninstagram.com&edm=ANo9K5cEAAAA&_nc_gid=n7XHaeEdAppM8jCvOzoBaw&_nc_tpa=Q5bMBQJt6IUliCbcx2I-0B3DXEPErruMX7pK5gXpSo4UUMK_xXGT_ixOd_lBuckAuKiVlkYxdca0HVgEKQ&oh=00_AQOEl_n_VLoogVlGnDnAvw8N2Vu6nSyMGFw59rjQHRMulQ&oe=6ACBC57F",
      dimensions: "Custom modular coursing · 300×150 up to 600×300 mm",
      finish: "Hand-dressed butch rockface on cleft natural sandstone",
      description:
        "Hand-chiseled solid sandstone tiles crafted to give high relief and deep shadow play. Delivers weather-resistant architectural luxury across extreme weather.",
      suitableWalls: [
        "Bungalow Exterior Elevation",
        "Compound Boundary Wall",
        "Courtyard Accent Facade",
      ],
      wallImages: [
        {
          url: "https://scontent-sjc6-1.cdninstagram.com/v/t51.82787-15/772020675_18370113886229555_753949943061334743_n.heic?stp=dst-jpg_e35_tt6&_nc_cat=107&ig_cache_key=Mzk2MDYxMzg2MzMzODYzMTE2Mg%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=a54f6b&efg=eyJlZmdfdGFnIjoiYmVzdF9pbWFnZV91cmxnZW4uQ0FST1VTRUxfSVRFTS5DMyJ9&_nc_ohc=kAOM8dlLOl4Q7kNvwGedyZh&_nc_oc=Adpd-Nf2xoGSOSzX8mENXIlmYbqGZbD2ZTRN9I1HdQSytS7Qz7BS1NNOzBUA1OM7VA8&_nc_zt=23&_nc_ht=scontent-sjc6-1.cdninstagram.com&edm=ANo9K5cEAAAA&_nc_gid=n7XHaeEdAppM8jCvOzoBaw&_nc_tpa=Q5bMBQJt6IUliCbcx2I-0B3DXEPErruMX7pK5gXpSo4UUMK_xXGT_ixOd_lBuckAuKiVlkYxdca0HVgEKQ&oh=00_AQOEl_n_VLoogVlGnDnAvw8N2Vu6nSyMGFw59rjQHRMulQ&oe=6ACBC57F",
          title: "Luxury Bungalow Elevation Facade",
          spaceType: "Exterior Elevation",
          description: "Full height facade wall clad in natural butch-finish Red Indian Sandstone.",
        },
        {
          url: "https://scontent-sjc3-1.cdninstagram.com/v/t51.82787-15/771939435_18370113895229555_4556163053868265558_n.heic?stp=dst-jpg_e35_tt6&_nc_cat=110&ig_cache_key=Mzk2MDYxMzg2NTE1ODkyMTk1OQ%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=a54f6b&efg=eyJlZmdfdGFnIjoiYmVzdF9pbWFnZV91cmxnZW4uQ0FST1VTRUxfSVRFTS5DMyJ9&_nc_ohc=rCmZS7FkZQMQ7kNvwGzDCDk&_nc_oc=AdrUT8GJXuNnWh5leJVkx8RkfkJUS1ru4XB9iAQP2_1tMukmyLJoiQgxtcSpPRhyf-M&_nc_zt=23&_nc_ht=scontent-sjc3-1.cdninstagram.com&edm=ANo9K5cEAAAA&_nc_gid=n7XHaeEdAppM8jCvOzoBaw&_nc_tpa=Q5bMBQLB7GrrAhEMdvjD38HACqdH9wLqrGy_qHlzxr0yidkirtv6W9Qkbm7gHBcrWPH5647_BOPbKDuZnA&oh=00_AQN6owsCJ2hadIb5Mn0V8tsw4yRVOp8279sPRXSe9R-M_w&oe=6ACBD029",
          title: "Architectural Entryway Pier & Corner Dressing",
          spaceType: "Entrance Gate Pier",
          description: "Interlocking corner masonry details executed with zero mortar bleeding.",
        },
      ],
    },
    {
      id: "clad-raw-stone-tv-panels",
      name: "Natural 3D Textured Stone Wall Panels",
      category: "Textured Interior Panels",
      tagline:
        "Sculpted mineral relief giving tactile authenticity and acoustic warmth to interiors",
      materialImage:
        "https://scontent-sjc6-1.cdninstagram.com/v/t51.82787-15/751761623_18366487102229555_5990262174363229615_n.heic?stp=dst-jpg_e35_tt6&_nc_cat=105&ig_cache_key=Mzk0MzM1MjI4NzIxOTU3ODAxNw%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=a54f6b&efg=eyJlZmdfdGFnIjoiYmVzdF9pbWFnZV91cmxnZW4uQ0FST1VTRUxfSVRFTS5DMyJ9&_nc_ohc=8x2qJm175WcQ7kNvwE5H-Jt&_nc_oc=Adq0gWk7a5i3L6P2eS8x6hX0g2F7K9I4jM1v2K9I4jM1v2K9I4jM1v2K&_nc_zt=23&_nc_ht=scontent-sjc6-1.cdninstagram.com&edm=ANo9K5cEAAAA&_nc_gid=n7XHaeEdAppM8jCvOzoBaw&oh=00_AQM4EaTsvO0RwmnRwxsZo2twJHl7jG25tC3MUKznkYbnZA&oe=6ACBBE0C",
      dimensions: "600×150 mm interlocking modular strips",
      finish: "3D Splitface & grooved tactile surface",
      description:
        "Natural stone panels engineered for TV media feature walls, double-height foyers, and master living areas. Integrates seamlessly with warm LED cove and downlights.",
      suitableWalls: ["Living Room TV Wall", "Double-Height Foyer", "Master Bedroom Bedhead Wall"],
      wallImages: [
        {
          url: "https://scontent-sjc6-1.cdninstagram.com/v/t51.82787-15/751761623_18366487102229555_5990262174363229615_n.heic?stp=dst-jpg_e35_tt6&_nc_cat=105&ig_cache_key=Mzk0MzM1MjI4NzIxOTU3ODAxNw%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=a54f6b&efg=eyJlZmdfdGFnIjoiYmVzdF9pbWFnZV91cmxnZW4uQ0FST1VTRUxfSVRFTS5DMyJ9&_nc_ohc=8x2qJm175WcQ7kNvwE5H-Jt&_nc_oc=Adq0gWk7a5i3L6P2eS8x6hX0g2F7K9I4jM1v2K9I4jM1v2K9I4jM1v2K&_nc_zt=23&_nc_ht=scontent-sjc6-1.cdninstagram.com&edm=ANo9K5cEAAAA&_nc_gid=n7XHaeEdAppM8jCvOzoBaw&oh=00_AQM4EaTsvO0RwmnRwxsZo2twJHl7jG25tC3MUKznkYbnZA&oe=6ACBBE0C",
          title: "Living Room Accent TV Wall",
          spaceType: "TV Feature Wall",
          description:
            "Installed on modern TV unit background wall with subtle warm graze lighting.",
        },
      ],
    },
    {
      id: "clad-rockface-teakwood",
      name: "Rockface Teakwood Stone Cubes",
      category: "Natural Ledgestone Cladding",
      tagline: "Evergreen warm wood-grain veins with hand-dressed rockface depth",
      materialImage:
        "https://scontent-sjc3-1.cdninstagram.com/v/t51.82787-15/657349116_18142242292493890_7173355028859306936_n.jpg?stp=dst-jpg_e35_tt6&_nc_cat=111&ig_cache_key=MjY5NTY2MzU3NTEzOTE4NjIxMQ%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=a54f6b&efg=eyJlZmdfdGFnIjoiYmVzdF9pbWFnZV91cmxnZW4uQ0FST1VTRUxfSVRFTS5DMyJ9&_nc_ohc=8yOVfXe77foQ7kNvwHvfWYi&_nc_oc=Adqi1umZXYnH6kSZS7qpv2RogdAkNQsSb98lxn0xEpcJdgyn7T7dxlcoz2nY_gmMfSQ&_nc_zt=23&_nc_ht=scontent-sjc3-1.cdninstagram.com&edm=ANo9K5cEAAAA&_nc_gid=1_SXiQz9qjVbmtWFSg_wkA&_nc_tpa=Q5bMBQKcTzXCFS6enbLZURaGt0jRYKoe52q8x9BvDYiq6ujq_1NuEH_NNUYW7gxfq-XNBsJqA7S3atRRcQ&oh=00_AQNlW95hcMmWbS9EAocCsSTK7oqEK52eRWBxXORaSX3Aqg&oe=6ACBB4E0",
      dimensions: "Modular interlocking cubes · 100×100 to 150×150 mm",
      finish: "Natural Teakwood Sandstone cleft & hand-dressed edges",
      description:
        "One of Stone Tech's all-time signature cladding products. Sourced from authentic Rajasthan teakwood sandstone formations featuring warm wood-grain striations.",
      suitableWalls: [
        "Villa Exterior Balcony & Porch",
        "Living Room Highlight Wall",
        "Landscape Water Body Wall",
      ],
      wallImages: [
        {
          url: "https://scontent-sjc3-1.cdninstagram.com/v/t51.82787-15/657349116_18142242292493890_7173355028859306936_n.jpg?stp=dst-jpg_e35_tt6&_nc_cat=111&ig_cache_key=MjY5NTY2MzU3NTEzOTE4NjIxMQ%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=a54f6b&efg=eyJlZmdfdGFnIjoiYmVzdF9pbWFnZV91cmxnZW4uQ0FST1VTRUxfSVRFTS5DMyJ9&_nc_ohc=8yOVfXe77foQ7kNvwHvfWYi&_nc_oc=Adqi1umZXYnH6kSZS7qpv2RogdAkNQsSb98lxn0xEpcJdgyn7T7dxlcoz2nY_gmMfSQ&_nc_zt=23&_nc_ht=scontent-sjc3-1.cdninstagram.com&edm=ANo9K5cEAAAA&_nc_gid=1_SXiQz9qjVbmtWFSg_wkA&_nc_tpa=Q5bMBQKcTzXCFS6enbLZURaGt0jRYKoe52q8x9BvDYiq6ujq_1NuEH_NNUYW7gxfq-XNBsJqA7S3atRRcQ&oh=00_AQNlW95hcMmWbS9EAocCsSTK7oqEK52eRWBxXORaSX3Aqg&oe=6ACBB4E0",
          title: "Bungalow Elevation Cube Masonry",
          spaceType: "Villa Exterior Elevation",
          description:
            "Applied on bungalow elevation in Kalol, Gujarat with organic dry-look texture.",
        },
        {
          url: "https://scontent-sjc6-1.cdninstagram.com/v/t51.82787-15/654020335_18098434879944060_7473166816252935443_n.jpg?stp=dst-jpg_e35_tt6&_nc_cat=107&ig_cache_key=MjY5NTY2MzU3NTE1NjAwNjE2OA%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=a54f6b&efg=eyJlZmdfdGFnIjoiYmVzdF9pbWFnZV91cmxnZW4uQ0FST1VTRUxfSVRFTS5DMyJ9&_nc_ohc=5bplBlGIvGIQ7kNvwGMk1lo&_nc_oc=AdpW5uIHR-D81jaqxg8tD7ej1PglfmNIcylVikQo8lu4YN_4GQX6OTGfIAPyIjfidw4&_nc_zt=23&_nc_ht=scontent-sjc6-1.cdninstagram.com&edm=ANo9K5cEAAAA&_nc_gid=1_SXiQz9qjVbmtWFSg_wkA&_nc_tpa=Q5bMBQL-NZl1rzl4kSgvBYTSLAOxnS_y9V9u7FmmWcju03DZNT1EwBuCwravCgipXXm3lAvW1ABuVu3EXA&oh=00_AQPCtn0VXzR2mol8dwfHgCq_S8Jab62JgC0fgio7j2q6Jg&oe=6ACBE5A9",
          title: "Balcony & Sit-out Privacy Wall",
          spaceType: "Balcony Feature Wall",
          description: "Textured teakwood cube cladding paired with lush green planters.",
        },
      ],
    },
    {
      id: "clad-black-slate-distinctive",
      name: "Black Slate 3D Stone Strips",
      category: "Natural Slate Cladding",
      tagline: "Bold charcoal & jet-black mineral cleft delivering modern brutalist luxury",
      materialImage:
        "https://scontent-sjc3-1.cdninstagram.com/v/t51.82787-15/746021216_18366101407229555_6965478787010170198_n.heic?stp=dst-jpg_e35_tt6&_nc_cat=106&ig_cache_key=Mzk0MTA0MzY5NzQ1NTY3MDcxNQ%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=a54f6b&efg=eyJlZmdfdGFnIjoiYmVzdF9pbWFnZV91cmxnZW4uQ0FST1VTRUxfSVRFTS5DMyJ9&_nc_ohc=6D3zcHSEsCsQ7kNvwEp1zEh&_nc_oc=Adr3gaDj5tOSrNp8CAweZYFRJhHJbQJYikhndyYOgns34JGgrt8F3pd4WYFbWy5xbjU&_nc_zt=23&_nc_ht=scontent-sjc3-1.cdninstagram.com&edm=ANo9K5cEAAAA&_nc_gid=n7XHaeEdAppM8jCvOzoBaw&_nc_tpa=Q5bMBQI0ptXt0aiomSmcK_gDAwAXQ0QjRqPvw_wvdYyRcwY732uAQxahQa6xpb4YOgcq5V4fM4s71D5HsQ&oh=00_AQPb171kn35Z5e8FtHOij5NhiKqEsQay0sDdFTuXq8dG2w&oe=6ACBE4FB",
      dimensions: "Multi-layered staggered thickness strips · 600×150 mm",
      finish: "Natural riven cleft slate · Zero artificial dye",
      description:
        "Deep charcoal black slate panels calibrated to tight tolerances. Highly durable against direct rain, sunlight, and humidity.",
      suitableWalls: [
        "Modern Villa Elevation",
        "Living Room Bar Backdrop",
        "Bathroom & Spa Feature Wall",
      ],
      wallImages: [
        {
          url: "https://scontent-sjc3-1.cdninstagram.com/v/t51.82787-15/746021216_18366101407229555_6965478787010170198_n.heic?stp=dst-jpg_e35_tt6&_nc_cat=106&ig_cache_key=Mzk0MTA0MzY5NzQ1NTY3MDcxNQ%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=a54f6b&efg=eyJlZmdfdGFnIjoiYmVzdF9pbWFnZV91cmxnZW4uQ0FST1VTRUxfSVRFTS5DMyJ9&_nc_ohc=6D3zcHSEsCsQ7kNvwEp1zEh&_nc_oc=Adr3gaDj5tOSrNp8CAweZYFRJhHJbQJYikhndyYOgns34JGgrt8F3pd4WYFbWy5xbjU&_nc_zt=23&_nc_ht=scontent-sjc3-1.cdninstagram.com&edm=ANo9K5cEAAAA&_nc_gid=n7XHaeEdAppM8jCvOzoBaw&_nc_tpa=Q5bMBQI0ptXt0aiomSmcK_gDAwAXQ0QjRqPvw_wvdYyRcwY732uAQxahQa6xpb4YOgcq5V4fM4s71D5HsQ&oh=00_AQPb171kn35Z5e8FtHOij5NhiKqEsQay0sDdFTuXq8dG2w&oe=6ACBE4FB",
          title: "Exterior Charcoal Facade Panel",
          spaceType: "Modern Villa Facade",
          description: "Staggered dimensional slate relief providing a bold, dramatic contrast.",
        },
        {
          url: "https://scontent-sjc6-1.cdninstagram.com/v/t51.82787-15/747127098_18366101416229555_4685457613028192803_n.heic?stp=dst-jpg_e35_tt6&_nc_cat=107&ig_cache_key=Mzk0MTA0MzY5OTAzMjc1MDEwNw%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=a54f6b&efg=eyJlZmdfdGFnIjoiYmVzdF9pbWFnZV91cmxnZW4uQ0FST1VTRUxfSVRFTS5DMyJ9&_nc_ohc=wdqO425gCcYQ7kNvwHngafd&_nc_oc=AdqcCAu03HRQiAQ4gYAu8-vsZTPywqLYLDIri9QshXsmVngIeeoaUuGeAMJ77DOEx2U&_nc_zt=23&_nc_ht=scontent-sjc6-1.cdninstagram.com&edm=ANo9K5cEAAAA&_nc_gid=n7XHaeEdAppM8jCvOzoBaw&_nc_tpa=Q5bMBQJy9E0G7XlWaIophmQLwjTsEn9h3Qmnj8v83Ujpn2eb_XOU4XJDR53C2OpMLR18_X5zDlJE0gWIFA&oh=00_AQNkGWGGjQu08w7oYJPAIRkr9-JXJSbsFQIYniKTW5NsxQ&oe=6ACBB73F",
          title: "Architectural Interior Accent Wall",
          spaceType: "Interior Accent Wall",
          description:
            "Installed on an interior living space wall with natural cleft shadow lines.",
        },
      ],
    },
  ],
};
