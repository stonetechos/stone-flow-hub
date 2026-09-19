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
};
