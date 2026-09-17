/**
 * Dynamic Instagram Project Gallery for Stone Tech OS (www.stonetech.in).
 *
 * Replaces the static stone collections catalog with an authentic, high-converting
 * 300-post Instagram showcase featuring real-world stone installations:
 * - Flexible Stone Veneers
 * - 3D Wall Claddings
 * - CNC Mandir & Jaali Murals
 * - Waterjet Italian Marble Inlays
 * - Interlocking Ledgestone
 * - Factory Dry-Lay & Site Walkthrough Reels
 */

import { useState, useMemo } from "react";
import {
  Camera,
  Heart,
  MessageCircle,
  ExternalLink,
  Layers,
  Play,
  MapPin,
  Calendar,
  Sparkles,
  ChevronDown,
  X,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  INSTAGRAM_POSTS_300,
  CATEGORY_TABS,
  type InstagramPost,
  type InstagramCategoryKey,
} from "@/lib/instagram/feed";
import { cn } from "@/lib/utils";

const BATCH_SIZE = 12;

interface InstagramGalleryProps {
  onSelectProduct?: (productName: string) => void;
}

export function InstagramGallery({ onSelectProduct }: InstagramGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<InstagramCategoryKey>("all");
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [activeModalPost, setActiveModalPost] = useState<InstagramPost | null>(null);

  // Filter posts based on tab
  const filteredPosts = useMemo(() => {
    if (selectedCategory === "all") return INSTAGRAM_POSTS_300;
    return INSTAGRAM_POSTS_300.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  // Current paginated slice
  const displayedPosts = useMemo(() => {
    return filteredPosts.slice(0, visibleCount);
  }, [filteredPosts, visibleCount]);

  const hasMore = visibleCount < filteredPosts.length;

  const handleTabChange = (key: InstagramCategoryKey) => {
    setSelectedCategory(key);
    setVisibleCount(BATCH_SIZE); // reset pagination on category switch
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredPosts.length));
  };

  const handleInquireFromPost = (post: InstagramPost) => {
    setActiveModalPost(null);
    if (onSelectProduct) {
      onSelectProduct(post.productName);
    }
  };

  return (
    <section id="instagram-feed" className="py-16 sm:py-24 border-b border-border/60 scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Header & Official Instagram Profile Strip */}
        <div className="flex flex-col items-center text-center space-y-4 max-w-3xl mx-auto">
          <Badge
            variant="outline"
            className="text-xs uppercase tracking-widest text-pink-600 border-pink-500/30 bg-pink-500/10 font-bold gap-1.5 px-3 py-1"
          >
            <Camera className="h-3.5 w-3.5 text-pink-600" />
            <span>Official Instagram Showcase</span>
          </Badge>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            Real Executed Sites &amp; Installations from Our Instagram
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Browse through our archive of 300+ real-world architectural projects: natural flexible
            stone veneers, 3D exterior claddings, CNC temple sanctums, and palatial marble inlays.
          </p>

          {/* Instagram Account Profile Pill */}
          <div className="inline-flex flex-wrap items-center justify-center gap-3 p-2 pr-3 rounded-full border border-border/80 bg-background/95 shadow-xs text-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-xs">
              <Camera className="h-4 w-4" />
            </div>
            <div className="text-left font-sans">
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <span>@stonetech.in</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded-full dark:bg-blue-950 dark:text-blue-300">
                  ✓ Verified Atelier
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                300+ Live Posts • 50k+ Followers
              </div>
            </div>
            <a
              href="https://www.instagram.com/stonetech.in"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 inline-flex items-center gap-1 font-bold text-pink-600 hover:text-pink-700 bg-pink-50 dark:bg-pink-950/40 px-3 py-1.5 rounded-full border border-pink-200 dark:border-pink-900 transition-colors"
            >
              <span>Follow on Instagram</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Category Filter Tabs Bar */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 gap-2 scrollbar-none">
          {CATEGORY_TABS.map((tab) => {
            const isActive = selectedCategory === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  "shrink-0 text-xs font-bold px-3.5 py-2 rounded-xl transition-all border",
                  isActive
                    ? "bg-stone-900 text-white border-stone-900 shadow-sm dark:bg-stone-100 dark:text-stone-950"
                    : "bg-background text-muted-foreground border-border/80 hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                    isActive
                      ? "bg-white/20 text-white dark:bg-black/20 dark:text-stone-950"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 300 Instagram Posts Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {displayedPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => setActiveModalPost(post)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-pink-500/40 hover:shadow-md aspect-square flex flex-col justify-end"
            >
              {/* Image thumbnail */}
              <img
                src={post.mediaUrl}
                alt={post.caption}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Media Type Icon (Top Right) */}
              <div className="absolute top-2.5 right-2.5 z-10">
                {post.mediaType === "VIDEO" && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-xs shadow-xs">
                    <Play className="h-3 w-3 fill-current ml-0.5" />
                  </span>
                )}
                {post.mediaType === "CAROUSEL_ALBUM" && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-xs shadow-xs">
                    <Layers className="h-3 w-3" />
                  </span>
                )}
              </div>

              {/* Category Pill (Top Left) */}
              <div className="absolute top-2.5 left-2.5 z-10">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/70 text-white/90 backdrop-blur-xs shadow-xs">
                  {post.categoryLabel}
                </span>
              </div>

              {/* Dark Gradient Overlay for text legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

              {/* Interactive Hover Action / Likes Strip */}
              <div className="relative z-10 p-3 text-white space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5 fill-pink-500 text-pink-500" />
                    <span>{post.likes.toLocaleString()}</span>
                  </span>
                  <span className="flex items-center gap-1 text-white/80">
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>{post.comments}</span>
                  </span>
                </div>

                <div className="truncate text-xs font-semibold text-white/95">{post.location}</div>

                <div className="text-[10px] text-white/70 truncate flex items-center gap-1 pt-0.5">
                  <MapPin className="h-2.5 w-2.5 shrink-0 text-amber-400" />
                  <span className="truncate">{post.productName} Installation</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Pagination Strip */}
        {hasMore && (
          <div className="text-center pt-4 space-y-2">
            <Button
              type="button"
              onClick={handleLoadMore}
              variant="outline"
              size="lg"
              className="gap-2 font-bold text-xs h-11 px-6 border-border hover:bg-muted shadow-xs"
            >
              <span>Load More Posts</span>
              <span className="text-muted-foreground font-mono font-normal">
                (Showing {displayedPosts.length} of {filteredPosts.length})
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
            <div className="text-[11px] text-muted-foreground">
              Direct live photography from active construction sites across India
            </div>
          </div>
        )}
      </div>

      {/* Post Detail Lightbox Dialog */}
      <Dialog open={!!activeModalPost} onOpenChange={(open) => !open && setActiveModalPost(null)}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-border/80">
          {activeModalPost && (
            <div className="flex flex-col md:flex-row max-h-[85vh]">
              {/* Media Preview Column */}
              <div className="relative bg-black md:w-1/2 flex items-center justify-center min-h-[280px] md:min-h-[420px]">
                <img
                  src={activeModalPost.mediaUrl}
                  alt={activeModalPost.caption}
                  className="h-full w-full object-cover max-h-[460px]"
                />
                {activeModalPost.mediaType === "VIDEO" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
                      <Play className="h-5 w-5 fill-current ml-0.5" />
                    </div>
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <Badge className="bg-black/75 text-white border-0 text-[10px] font-bold backdrop-blur-xs">
                    {activeModalPost.categoryLabel}
                  </Badge>
                </div>
              </div>

              {/* Details & Inquire CTA Column */}
              <div className="md:w-1/2 p-5 flex flex-col justify-between space-y-4 overflow-y-auto">
                <div className="space-y-3.5">
                  <DialogHeader className="text-left space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white text-[10px]">
                          <Camera className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <DialogTitle className="text-xs font-bold text-foreground">
                            @stonetech.in
                          </DialogTitle>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5 text-amber-600" />
                            <span>{activeModalPost.location}</span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{activeModalPost.date}</span>
                      </span>
                    </div>
                  </DialogHeader>

                  <div className="border-t border-border/70 pt-3">
                    <DialogDescription className="text-xs text-foreground/90 leading-relaxed max-h-[160px] overflow-y-auto whitespace-pre-line font-sans">
                      {activeModalPost.caption}
                    </DialogDescription>
                  </div>

                  {/* Likes & Engagement */}
                  <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground pt-1 border-t border-border/70">
                    <span className="flex items-center gap-1 text-pink-600">
                      <Heart className="h-4 w-4 fill-current" />
                      <span>{activeModalPost.likes.toLocaleString()} likes</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      <span>{activeModalPost.comments} comments</span>
                    </span>
                  </div>
                </div>

                {/* Direct Lead Conversion CTA */}
                <div className="space-y-2 pt-2 border-t border-border/80">
                  <Button
                    type="button"
                    onClick={() => handleInquireFromPost(activeModalPost)}
                    className="w-full h-11 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-md"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Inquire About This Look (Free Estimate)</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <a
                      href={activeModalPost.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>View on Instagram</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <ShieldCheck className="h-3 w-3" />
                      <span>Our staff follows up directly</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
