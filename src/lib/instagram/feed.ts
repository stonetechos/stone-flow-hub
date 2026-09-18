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
  isLivePost?: boolean;
  carouselImages?: string[];
  currentCarouselIndex?: number;
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
import seededPosts from "@/data/instagram-posts.json";

/**
 * Authentic Live Instagram Posts directly synced from @stonetech.ahmedabad
 * via GitHub Actions and Meta Instagram Graph API (src/data/instagram-posts.json).
 */
export const INSTAGRAM_POSTS: InstagramPost[] = seededPosts as InstagramPost[];
export const INSTAGRAM_POSTS_300: InstagramPost[] = INSTAGRAM_POSTS;

export const CATEGORY_TABS: CategoryTab[] = [
  { key: "all", label: "All Works", count: INSTAGRAM_POSTS.length },
];
